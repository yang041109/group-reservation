import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import { getPool, isMysqlConfigured } from '@/lib/db';
import {
  buildSlots,
  getSlotHourRangeFromStoreRow,
  slotOverlapsReservation,
} from '@/lib/booking-slots';
import {
  getDefaultSlotHourRangeForStore,
  getSlotHourRangeForStoreOnDate,
  isStoreClosedOnDate,
  readMinGroupHeadcount,
} from '@/lib/store-weekly-hours';
import {
  applyOwnerBookingToggleToSlots,
  isSlotOpenForOwnerToggle,
  readOwnerBookingToggle,
} from '@/lib/owner-booking-toggle';
import {
  depositModeFromDb,
  parseDepositTiersJson,
  resolveDepositForHeadcount,
  type DepositMode,
  type DepositTier,
} from '@/lib/deposit-tiers';
import type { MenuItemData, MinOrderRule } from '@/types';

export class ReservationDbError extends Error {
  constructor(
    public statusCode: number,
    public responseBody: string,
  ) {
    super(responseBody);
    this.name = 'ReservationDbError';
  }
}

function assertConfigured(): void {
  if (!isMysqlConfigured()) {
    throw new ReservationDbError(503, 'MySQL 연결 정보가 설정되지 않았습니다. MYSQL_* 환경 변수를 확인하세요.');
  }
}

function rowDateToYmd(d: unknown): string {
  if (d instanceof Date && !Number.isNaN(d.getTime())) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }
  return String(d ?? '').trim().slice(0, 10);
}

export function normalizePhoneDigits(p: string): string {
  let r = String(p || '')
    .replace(/[-\s']/g, '')
    .trim();
  if (r.length === 10 && !r.startsWith('0')) r = `0${r}`;
  return r;
}

type StoreRow = RowDataPacket & Record<string, unknown>;
type MenuRow = RowDataPacket & Record<string, unknown>;
type RuleRow = RowDataPacket & Record<string, unknown>;
type ReservationRow = RowDataPacket & Record<string, unknown>;

function readStoreDepositOpts(store: StoreRow): {
  depositMode: DepositMode;
  depositUseTiers: boolean;
  depositTiers: DepositTier[];
  flatDepositAmount: number;
} {
  const rec = store as Record<string, unknown>;
  const depositMode = depositModeFromDb(rec.depositUseTiers);
  const flat = parseInt(String(rec.depositAmount ?? '0'), 10) || 0;
  const tiers = parseDepositTiersJson(rec.depositTiersJson);
  return {
    depositMode,
    depositUseTiers: depositMode === 'tiered',
    depositTiers: tiers,
    flatDepositAmount: flat,
  };
}

async function fetchAllStoresMenusRulesReservations(): Promise<{
  stores: StoreRow[];
  menus: MenuRow[];
  rules: RuleRow[];
  reservations: ReservationRow[];
}> {
  assertConfigured();
  const pool = getPool();
  const [storeRows] = await pool.query<StoreRow[]>('SELECT * FROM store');
  const stores = [...storeRows].sort((a, b) => {
    const ao = parseInt(String((a as Record<string, unknown>).sortOrder ?? '0'), 10);
    const bo = parseInt(String((b as Record<string, unknown>).sortOrder ?? '0'), 10);
    const oa = Number.isFinite(ao) ? ao : 0;
    const ob = Number.isFinite(bo) ? bo : 0;
    if (oa !== ob) return oa - ob;
    return String(a.name ?? '').localeCompare(String(b.name ?? ''), 'ko');
  });
  const [menus] = await pool.query<MenuRow[]>('SELECT * FROM menu');
  const [rules] = await pool.query<RuleRow[]>('SELECT * FROM rule');
  const [reservations] = await pool.query<ReservationRow[]>('SELECT * FROM reservation');
  return { stores, menus, rules, reservations };
}

/** GET /api/stores 용 — Apps Script `handleGetStores` 와 동일한 페이로드 */
export async function getStoresFromMysql(date: string, headcount: number) {
  assertConfigured();
  const { stores, menus, rules, reservations } = await fetchAllStoresMenusRulesReservations();

  return stores.map((store) => {
    const sid = String(store.storeId ?? '').trim();
    const cap = parseInt(String(store.maxCapacity ?? '0'), 10) || 0;
    const storeRules = rules.filter((r) => String(r.storeId ?? '').trim() === sid);
    const range = getSlotHourRangeForStoreOnDate(store as Record<string, unknown>, date);
    const { slotStartHour, slotEndHour, crossesMidnight, closed } = range;
    const minGroupHeadcount = readMinGroupHeadcount(store as Record<string, unknown>);

    const confirmedRes = reservations.filter(
      (r) =>
        String(r.storeId ?? '').trim() === sid &&
        rowDateToYmd(r.date) === date &&
        (String(r.status ?? '').trim() === 'CONFIRMED' ||
          String(r.status ?? '').trim() === 'DEPOSIT_CONFIRMED'),
    );

    const timeline = closed
      ? []
      : applyOwnerBookingToggleToSlots(
          buildSlots(
            cap,
            confirmedRes.map((r) => ({
              headcount: parseInt(String(r.headcount ?? '0'), 10) || 0,
              startTime: String(r.startTime ?? '').trim(),
              endTime: String(r.endTime ?? '').trim(),
            })),
            slotStartHour,
            slotEndHour,
            crossesMidnight,
          ),
          date,
          readOwnerBookingToggle(store as Record<string, unknown>),
        );

    const depOpts = readStoreDepositOpts(store);
    const resolvedDeposit = resolveDepositForHeadcount(headcount, {
      depositMode: depOpts.depositMode,
      depositTiers: depOpts.depositTiers,
      flatDepositAmount: depOpts.flatDepositAmount,
    });
    return {
      storeId: sid,
      name: store.name,
      maxCapacity: cap,
      imageUrl: store.imageUrl || '',
      slotStartHour,
      slotEndHour,
      depositAmount: resolvedDeposit,
      depositMode: depOpts.depositMode,
      depositUseTiers: depOpts.depositUseTiers,
      depositTiers: depOpts.depositTiers,
      depositFlatAmount: depOpts.flatDepositAmount,
      timeline,
      minOrderRules: [],
      minGroupHeadcount,
      closedOnDate: closed,
    };
  });
}

/** GET /api/stores/[id] 용 */
export async function getStoreDetailFromMysql(storeId: string, date: string) {
  assertConfigured();
  const id = storeId.trim();
  const { stores, menus, rules, reservations } = await fetchAllStoresMenusRulesReservations();

  const store = stores.find((s) => String(s.storeId ?? '').trim() === id);
  if (!store) {
    throw new ReservationDbError(404, '가게를 찾을 수 없습니다.');
  }

  const storeMenus = menus.filter((m) => String(m.storeId ?? '').trim() === id);
  const storeRules = rules.filter((r) => String(r.storeId ?? '').trim() === id);
  const confirmed = reservations.filter(
    (r) =>
      String(r.storeId ?? '').trim() === id &&
      rowDateToYmd(r.date) === date &&
      (String(r.status ?? '').trim() === 'CONFIRMED' ||
        String(r.status ?? '').trim() === 'DEPOSIT_CONFIRMED'),
  );

  const cap = parseInt(String(store.maxCapacity ?? '0'), 10) || 0;
  const range = getSlotHourRangeForStoreOnDate(store as Record<string, unknown>, date);
  const { slotStartHour, slotEndHour, crossesMidnight, closed } = range;
  const minGroupHeadcount = readMinGroupHeadcount(store as Record<string, unknown>);
  const rec = store as Record<string, unknown>;
  const ownerName = rec.ownerName != null && String(rec.ownerName).trim() ? String(rec.ownerName).trim() : null;
  const ownerBankAccount =
    rec.ownerBankAccount != null && String(rec.ownerBankAccount).trim()
      ? String(rec.ownerBankAccount).trim()
      : null;

  const slots = closed
    ? []
    : applyOwnerBookingToggleToSlots(
        buildSlots(
          cap,
          confirmed.map((r) => ({
            headcount: parseInt(String(r.headcount ?? '0'), 10) || 0,
            startTime: String(r.startTime ?? '').trim(),
            endTime: String(r.endTime ?? '').trim(),
          })),
          slotStartHour,
          slotEndHour,
          crossesMidnight,
        ),
        date,
        readOwnerBookingToggle(store as Record<string, unknown>),
      );

  const menusPayload: MenuItemData[] = storeMenus.map((m) => ({
    id: String(m.menuId ?? '').trim(),
    name: String(m.name ?? ''),
    price: parseInt(String(m.price ?? '0'), 10) || 0,
    category: String(m.category ?? ''),
    isRequired: String(m.isRequired ?? '').toLowerCase() === 'true' || Number(m.isRequired) === 1,
    imageUrl: String(m.imageUrl ?? ''),
  }));

  const depOpts = readStoreDepositOpts(store);

  return {
    store: {
      id,
      name: store.name,
      images: store.imageUrl ? [String(store.imageUrl)] : [],
      maxCapacity: cap,
      slotStartHour,
      slotEndHour,
      depositAmount: depOpts.flatDepositAmount,
      depositMode: depOpts.depositMode,
      depositUseTiers: depOpts.depositUseTiers,
      depositTiers: depOpts.depositTiers,
      minGroupHeadcount,
      ownerName,
      ownerBankAccount,
      closedOnDate: closed,
      availableTimes: slots.filter((s) => s.isAvailable).map((s) => s.timeBlock),
      slots,
      minOrderRules: [],
    },
    menus: menusPayload,
    slots,
    availableTimes: slots.filter((s) => s.isAvailable).map((s) => s.timeBlock),
    reservedTimes: slots.filter((s) => !s.isAvailable).map((s) => s.timeBlock),
  };
}

export interface CreateReservationPayload {
  storeId: string;
  userName: string;
  groupName: string;
  userPhone: string;
  userNote: string;
  headcount: number;
  date: string;
  startTime: string;
  endTime: string;
  selectedMenus: { menuId: string; quantity: number }[];
  totalAmount: number;
}

export async function insertReservationValidated(
  payload: CreateReservationPayload,
  reservationId: string,
) {
  assertConfigured();
  const pool = getPool();
  const storeId = String(payload.storeId).trim();
  const date = String(payload.date).trim();
  const headcount = parseInt(String(payload.headcount), 10) || 0;
  const startTime = String(payload.startTime || '').trim();
  const endTime = String(payload.endTime || startTime).trim();
  const totalAmount = parseInt(String(payload.totalAmount), 10) || 0;

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const [storeRows] = await conn.query<StoreRow[]>('SELECT * FROM store WHERE storeId = ? LIMIT 1', [
      storeId,
    ]);
    const store = storeRows[0];
    if (!store) {
      await conn.rollback();
      throw new ReservationDbError(400, '가게를 찾을 수 없습니다.');
    }

    const cap = parseInt(String(store.maxCapacity ?? '0'), 10) || 0;
    const minGroup = readMinGroupHeadcount(store as Record<string, unknown>);
    if (headcount < minGroup) {
      await conn.rollback();
      throw new ReservationDbError(
        400,
        `단체예약은 최소 ${minGroup}명 이상부터 가능합니다.`,
      );
    }
    if (isStoreClosedOnDate(store as Record<string, unknown>, date)) {
      await conn.rollback();
      throw new ReservationDbError(400, '선택한 날짜는 휴무일입니다.');
    }

    const range = getSlotHourRangeForStoreOnDate(store as Record<string, unknown>, date);
    if (range.closed) {
      await conn.rollback();
      throw new ReservationDbError(400, '선택한 날짜는 영업하지 않습니다.');
    }
    const slotStartHour = range.slotStartHour;
    const slotEndHour = range.slotEndHour;
    const crossesMidnight = range.crossesMidnight;

    const [existingRows] = await conn.query<ReservationRow[]>(
      `SELECT * FROM reservation
       WHERE storeId = ? AND date = ? AND status IN ('CONFIRMED','DEPOSIT_CONFIRMED')`,
      [storeId, date],
    );

    const toggle = readOwnerBookingToggle(store as Record<string, unknown>);
    const slots = applyOwnerBookingToggleToSlots(
      buildSlots(
        cap,
        existingRows.map((r) => ({
          headcount: parseInt(String(r.headcount ?? '0'), 10) || 0,
          startTime: String(r.startTime ?? '').trim(),
          endTime: String(r.endTime ?? '').trim(),
        })),
        slotStartHour,
        slotEndHour,
        crossesMidnight,
      ),
      date,
      toggle,
    );

    const targetSlots = slots.filter((s) =>
      slotOverlapsReservation(s.timeBlock, startTime, endTime, crossesMidnight, slotStartHour, slotEndHour),
    );
    if (!targetSlots.length) {
      await conn.rollback();
      throw new ReservationDbError(400, '선택한 시간이 예약 가능한 슬롯에 없습니다.');
    }
    const openSlots = targetSlots.filter((s) =>
      isSlotOpenForOwnerToggle(s.timeBlock, date, toggle),
    );
    if (!openSlots.length || !openSlots.some((s) => s.isAvailable)) {
      await conn.rollback();
      throw new ReservationDbError(400, '선택한 시간은 현재 예약을 받지 않습니다.');
    }
    const minRemaining = Math.min(...openSlots.map((s) => cap - s.currentHeadcount));
    if (headcount > minRemaining) {
      await conn.rollback();
      throw new ReservationDbError(
        400,
        `해당 시간대 잔여 인원(${minRemaining}명)을 초과합니다.`,
      );
    }

    const [menuRows] = await conn.query<MenuRow[]>('SELECT * FROM menu WHERE storeId = ?', [storeId]);
    const requiredMenus = menuRows.filter(
      (m) => String(m.isRequired ?? '').toLowerCase() === 'true' || Number(m.isRequired) === 1,
    );
    const selectedMenus = payload.selectedMenus || [];
    for (const req of requiredMenus) {
      const mid = String(req.menuId ?? '').trim();
      const found = selectedMenus.find((sm) => String(sm.menuId).trim() === mid);
      if (!found || (parseInt(String(found.quantity), 10) || 0) < 1) {
        await conn.rollback();
        throw new ReservationDbError(400, `필수 메뉴 "${req.name}"을(를) 선택해주세요.`);
      }
    }

    const depOpts = readStoreDepositOpts(store);
    const depositAmount = resolveDepositForHeadcount(headcount, {
      depositMode: depOpts.depositMode,
      depositTiers: depOpts.depositTiers,
      flatDepositAmount: depOpts.flatDepositAmount,
    });
    const createdAt = new Date().toISOString().slice(0, 19).replace('T', ' ');

    await conn.execute(
      `INSERT INTO reservation (
        reservationId, storeId, userName, groupName, userPhone, userNote,
        headcount, date, startTime, endTime, menuItems, totalAmount, status, depositAmount, createdAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'PENDING', ?, ?)`,
      [
        reservationId,
        storeId,
        payload.userName || '',
        payload.groupName || '',
        payload.userPhone || '',
        payload.userNote || '',
        headcount,
        date,
        startTime,
        endTime,
        JSON.stringify(selectedMenus),
        totalAmount,
        depositAmount,
        createdAt,
      ],
    );

    await conn.commit();

    return {
      reservationId,
      status: 'PENDING' as const,
      totalAmount,
      depositAmount,
      createdAt,
    };
  } catch (e) {
    await conn.rollback();
    if (e instanceof ReservationDbError) throw e;
    console.error(e);
    throw new ReservationDbError(503, '예약 저장 중 오류가 발생했습니다.');
  } finally {
    conn.release();
  }
}

function parseMenuItemsJson(raw: unknown): { menuId: string; quantity: number }[] {
  if (raw == null) return [];
  if (Array.isArray(raw)) return raw as { menuId: string; quantity: number }[];
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
}

function mapReservationListItem(
  r: ReservationRow,
  stores: StoreRow[],
  menus: MenuRow[],
): Record<string, unknown> {
  const sid = String(r.storeId ?? '').trim();
  const store = stores.find((s) => String(s.storeId ?? '').trim() === sid);
  const parsedMenus = parseMenuItemsJson(r.menuItems);

  const menuDetails = parsedMenus.map((sm) => {
    const menu = menus.find(
      (m) =>
        String(m.storeId ?? '').trim() === sid && String(m.menuId ?? '').trim() === String(sm.menuId).trim(),
    );
    return {
      menuId: sm.menuId,
      name: menu ? menu.name : sm.menuId,
      quantity: parseInt(String(sm.quantity ?? '0'), 10) || 0,
      priceAtTime: menu ? parseInt(String(menu.price ?? '0'), 10) || 0 : 0,
    };
  });

  return {
    reservationId: r.reservationId,
    storeId: sid,
    storeName: store ? store.name : sid,
    date: rowDateToYmd(r.date),
    timeBlock: `${String(r.startTime ?? '').trim()} ~ ${String(r.endTime ?? '').trim()}`,
    headcount: parseInt(String(r.headcount ?? '0'), 10) || 0,
    totalAmount: parseInt(String(r.totalAmount ?? '0'), 10) || 0,
    depositAmount: parseInt(String(r.depositAmount ?? '0'), 10) || 0,
    status: r.status,
    createdAt: r.createdAt,
    menus: menuDetails,
    ownerRejectReason:
      r.ownerRejectReason != null && String(r.ownerRejectReason).trim()
        ? String(r.ownerRejectReason).trim()
        : undefined,
    ownerEditNotice:
      r.ownerEditNotice != null && String(r.ownerEditNotice).trim()
        ? String(r.ownerEditNotice).trim()
        : undefined,
  };
}

/** 전화번호 전체로 예약 목록 */
export async function listReservationsByPhoneMysql(userPhone: string) {
  assertConfigured();
  const phone = normalizePhoneDigits(userPhone);
  if (!phone) {
    throw new ReservationDbError(400, '전화번호를 입력해주세요.');
  }

  const { stores, menus, reservations } = await fetchAllStoresMenusRulesReservations();

  const matched = reservations.filter((r) => normalizePhoneDigits(String(r.userPhone ?? '')) === phone);

  return matched.map((r) => mapReservationListItem(r, stores, menus));
}

export async function listReservationsByNamePhone4Mysql(userName: string, phoneLast4: string) {
  assertConfigured();
  const name = userName.trim();
  const last4 = phoneLast4.trim();
  if (!name || !last4) {
    throw new ReservationDbError(400, '이름과 전화번호 뒷4자리를 입력해주세요.');
  }

  const { stores, menus, reservations } = await fetchAllStoresMenusRulesReservations();

  const matched = reservations.filter((r) => {
    const rName = String(r.userName ?? '').trim();
    const rPhone = normalizePhoneDigits(String(r.userPhone ?? ''));
    return rName === name && rPhone.slice(-4) === last4;
  });

  return matched.map((r) => mapReservationListItem(r, stores, menus));
}

export async function cancelReservationInMysql(reservationId: string) {
  assertConfigured();
  const pool = getPool();
  const id = reservationId.trim();
  if (!id) {
    throw new ReservationDbError(400, '예약 ID가 필요합니다.');
  }

  const [header] = await pool.execute<ResultSetHeader>(
    `UPDATE reservation SET status = 'CANCELED' WHERE reservationId = ? AND status <> 'CANCELED'`,
    [id],
  );
  const affected = header.affectedRows ?? 0;

  if (affected > 0) {
    return { reservationId: id, status: 'CANCELED' };
  }

  const [rows] = await pool.query<ReservationRow[]>(
    'SELECT status FROM reservation WHERE reservationId = ? LIMIT 1',
    [id],
  );
  if (!rows.length) {
    throw new ReservationDbError(400, '예약을 찾을 수 없습니다.');
  }
  throw new ReservationDbError(400, '이미 취소된 예약입니다.');
}

/** 클라이언트 SWR 캐시용 — Apps Script `handleGetAllData` */
export async function getAllDataFromMysql() {
  assertConfigured();
  const { stores, menus, rules, reservations } = await fetchAllStoresMenusRulesReservations();

  const storeList = stores.map((store) => {
    const sid = String(store.storeId ?? '').trim();
    const cap = parseInt(String(store.maxCapacity ?? '0'), 10) || 0;
    const range = getDefaultSlotHourRangeForStore(store as Record<string, unknown>);
    const depOpts = readStoreDepositOpts(store);
    const rec = store as Record<string, unknown>;
    return {
      storeId: sid,
      name: store.name,
      locationLabel:
        rec.locationLabel != null && String(rec.locationLabel).trim()
          ? String(rec.locationLabel).trim()
          : null,
      sortOrder: parseInt(String(rec.sortOrder ?? '0'), 10) || 0,
      maxCapacity: cap,
      minGroupHeadcount: readMinGroupHeadcount(rec),
      imageUrl: store.imageUrl || '',
      slotStartHour: range.slotStartHour,
      slotEndHour: range.slotEndHour,
      weeklyHoursJson:
        rec.weeklyHoursJson != null && String(rec.weeklyHoursJson).trim()
          ? String(rec.weeklyHoursJson)
          : null,
      closedDatesJson:
        rec.closedDatesJson != null && String(rec.closedDatesJson).trim()
          ? String(rec.closedDatesJson)
          : null,
      depositAmount: depOpts.flatDepositAmount,
      depositMode: depOpts.depositMode,
      depositUseTiers: depOpts.depositUseTiers,
      depositTiers: depOpts.depositTiers,
      menus: menus
        .filter((m) => String(m.storeId ?? '').trim() === sid)
        .map((m) => ({
          id: String(m.menuId ?? '').trim(),
          name: m.name,
          price: parseInt(String(m.price ?? '0'), 10) || 0,
          category: m.category || '',
          isRequired: String(m.isRequired ?? '').toLowerCase() === 'true' || Number(m.isRequired) === 1,
          imageUrl: m.imageUrl || '',
        })),
      minOrderRules: [],
      ownerName:
        rec.ownerName != null && String(rec.ownerName).trim() ? String(rec.ownerName).trim() : null,
      ownerBankAccount:
        rec.ownerBankAccount != null && String(rec.ownerBankAccount).trim()
          ? String(rec.ownerBankAccount).trim()
          : null,
      acceptingReservations:
        rec.acceptingReservations === undefined || rec.acceptingReservations === null
          ? true
          : Number(rec.acceptingReservations) === 1,
      acceptingReservationsAt:
        rec.acceptingReservationsAt != null && String(rec.acceptingReservationsAt).trim()
          ? String(rec.acceptingReservationsAt).trim()
          : null,
    };
  });

  const confirmedReservations = reservations
    .filter(
      (r) =>
        String(r.status ?? '').trim() === 'CONFIRMED' ||
        String(r.status ?? '').trim() === 'DEPOSIT_CONFIRMED',
    )
    .map((r) => ({
      reservationId: r.reservationId,
      storeId: String(r.storeId ?? '').trim(),
      headcount: parseInt(String(r.headcount ?? '0'), 10) || 0,
      date: rowDateToYmd(r.date),
      startTime: String(r.startTime ?? '').trim(),
      endTime: String(r.endTime ?? '').trim(),
    }));

  return {
    stores: storeList,
    reservations: confirmedReservations,
  };
}
