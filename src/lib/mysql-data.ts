import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import { getPool, isMysqlConfigured } from '@/lib/db';
import { buildSlots, slotOverlapsReservation } from '@/lib/booking-slots';
import { applyOwnerClosedBlocksToSlots, isSlotBlockedForBooking } from '@/lib/owner-closed-slots';
import { koreaTodayYmd } from '@/lib/korea-time';
import {
  getDefaultSlotHourRangeForStore,
  getSlotHourRangeForStoreOnDate,
  isStoreClosedOnDate,
  readMinGroupHeadcount,
} from '@/lib/store-weekly-hours';
import {
  depositModeFromDb,
  parseDepositActiveMonthRangesJson,
  parseDepositTiersJson,
  resolveDepositForHeadcount,
  resolveDepositForHeadcountAndDate,
  type DepositActiveMonthRange,
  type DepositMode,
  type DepositTier,
} from '@/lib/deposit-tiers';
import { sortMenusForDisplay } from '@/lib/menu-order';
import {
  buildEffectiveStoreRow,
  fetchZonesByStoreId,
  fetchZonesByStoreIds,
  findZoneInStore,
  zoneRowToSummary,
  type ZoneRow,
} from '@/lib/zone-resolve';
import type {
  MenuItemData,
  ZoneCardEntry,
  ZoneDetailEntry,
} from '@/types';

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

function menuRowToItem(m: MenuRow): MenuItemData {
  const rec = m as Record<string, unknown>;
  const descRaw = rec.description;
  return {
    id: String(m.menuId ?? '').trim(),
    name: String(m.name ?? ''),
    price: parseInt(String(m.price ?? '0'), 10) || 0,
    category: String(m.category ?? ''),
    sortOrder: parseInt(String(rec.sortOrder ?? '0'), 10) || 0,
    isRequired: String(m.isRequired ?? '').toLowerCase() === 'true' || Number(m.isRequired) === 1,
    imageUrl: String(m.imageUrl ?? ''),
    description:
      descRaw != null && String(descRaw).trim() !== '' ? String(descRaw).trim() : null,
  };
}

function menusForStoreId(allMenus: MenuRow[], storeId: string): MenuItemData[] {
  return sortMenusForDisplay(
    allMenus
      .filter((m) => String(m.storeId ?? '').trim() === storeId)
      .map(menuRowToItem),
  );
}

function readStoreDepositOpts(store: StoreRow): {
  depositMode: DepositMode;
  depositUseTiers: boolean;
  depositTiers: DepositTier[];
  flatDepositAmount: number;
  depositActiveMonthRanges: DepositActiveMonthRange[];
} {
  const rec = store as Record<string, unknown>;
  const depositMode = depositModeFromDb(rec.depositUseTiers);
  const flat = parseInt(String(rec.depositAmount ?? '0'), 10) || 0;
  const tiers = parseDepositTiersJson(rec.depositTiersJson);
  const ranges = parseDepositActiveMonthRangesJson(rec.depositActiveMonthRangesJson);
  return {
    depositMode,
    depositUseTiers: depositMode === 'tiered',
    depositTiers: tiers,
    flatDepositAmount: flat,
    depositActiveMonthRanges: ranges,
  };
}

function todayYmdLocal(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function sortStoreRows(storeRows: StoreRow[]): StoreRow[] {
  return [...storeRows].sort((a, b) => {
    const ao = parseInt(String((a as Record<string, unknown>).sortOrder ?? '0'), 10);
    const bo = parseInt(String((b as Record<string, unknown>).sortOrder ?? '0'), 10);
    const oa = Number.isFinite(ao) ? ao : 0;
    const ob = Number.isFinite(bo) ? bo : 0;
    if (oa !== ob) return oa - ob;
    return String(a.name ?? '').localeCompare(String(b.name ?? ''), 'ko');
  });
}

async function fetchStoresMenusRules(): Promise<{
  stores: StoreRow[];
  menus: MenuRow[];
  rules: RuleRow[];
}> {
  assertConfigured();
  const pool = getPool();
  const [storeRows] = await pool.query<StoreRow[]>('SELECT * FROM store');
  const stores = sortStoreRows(storeRows);
  const [menus] = await pool.query<MenuRow[]>('SELECT * FROM menu');
  const [rules] = await pool.query<RuleRow[]>('SELECT * FROM rule');
  return { stores, menus, rules };
}

/** effective row(store+zone 머지) 기준으로 타임라인 생성. 휴무일이면 빈 배열. */
function buildTimelineForEffectiveRow(
  effectiveRow: Record<string, unknown>,
  date: string,
  confirmedReservations: { headcount: number; startTime: string; endTime: string }[],
): {
  timeline: import('@/types').TimeSlot[];
  slotStartHour: number;
  slotEndHour: number;
  crossesMidnight: boolean;
  closed: boolean;
  maxCapacity: number;
} {
  const cap = parseInt(String(effectiveRow.maxCapacity ?? '0'), 10) || 0;
  const range = getSlotHourRangeForStoreOnDate(effectiveRow, date);
  const { slotStartHour, slotEndHour, crossesMidnight, closed } = range;

  if (closed) {
    return {
      timeline: [],
      slotStartHour,
      slotEndHour,
      crossesMidnight,
      closed: true,
      maxCapacity: cap,
    };
  }

  const slots = buildSlots(
    cap,
    confirmedReservations,
    slotStartHour,
    slotEndHour,
    crossesMidnight,
  );
  const timeline = applyOwnerClosedBlocksToSlots(
    slots,
    date,
    effectiveRow.ownerClosedSlotsJson,
    undefined,
    { slotStartHour, slotEndHour, crossesMidnight },
  );

  return {
    timeline,
    slotStartHour,
    slotEndHour,
    crossesMidnight,
    closed: false,
    maxCapacity: cap,
  };
}

/** /api/data/all — 오늘(포함) 이후 확정 예약만 */
async function fetchActiveReservationsFromToday(): Promise<ReservationRow[]> {
  assertConfigured();
  const pool = getPool();
  const today = todayYmdLocal();
  const [reservations] = await pool.query<ReservationRow[]>(
    `SELECT reservationId, storeId, zoneId, headcount, \`date\`, startTime, endTime, status
     FROM reservation
     WHERE DATE(\`date\`) >= ?
       AND status IN ('CONFIRMED', 'DEPOSIT_CONFIRMED')`,
    [today],
  );
  return reservations;
}

async function fetchAllStoresMenusRulesReservations(): Promise<{
  stores: StoreRow[];
  menus: MenuRow[];
  rules: RuleRow[];
  reservations: ReservationRow[];
}> {
  const { stores, menus, rules } = await fetchStoresMenusRules();
  assertConfigured();
  const pool = getPool();
  const [reservations] = await pool.query<ReservationRow[]>('SELECT * FROM reservation');
  return { stores, menus, rules, reservations };
}

/** GET /api/stores 용 — Apps Script `handleGetStores` 와 동일한 페이로드 */
export async function getStoresFromMysql(date: string, headcount: number) {
  assertConfigured();
  const pool = getPool();
  const { stores, reservations } = await fetchAllStoresMenusRulesReservations();
  const zonesByStoreId = await fetchZonesByStoreIds(
    pool,
    stores.map((s) => String(s.storeId ?? '').trim()),
  );

  return stores.map((store) => {
    const sid = String(store.storeId ?? '').trim();
    const storeRec = store as Record<string, unknown>;
    const minGroupHeadcount = readMinGroupHeadcount(storeRec);
    const storeZones = zonesByStoreId.get(sid) ?? [];

    const confirmedAll = reservations.filter(
      (r) =>
        String(r.storeId ?? '').trim() === sid &&
        rowDateToYmd(r.date) === date &&
        (String(r.status ?? '').trim() === 'CONFIRMED' ||
          String(r.status ?? '').trim() === 'DEPOSIT_CONFIRMED'),
    );

    const depOpts = readStoreDepositOpts(store);
    const resolvedDeposit = resolveDepositForHeadcount(headcount, {
      depositMode: depOpts.depositMode,
      depositTiers: depOpts.depositTiers,
      flatDepositAmount: depOpts.flatDepositAmount,
    });

    // ── 동(zone) 운영 가게 ── zone마다 타임라인 따로 계산
    if (storeZones.length > 0) {
      const zonesEntries: ZoneCardEntry[] = storeZones.map((zone) => {
        const zid = String(zone.zoneId ?? '').trim();
        const effectiveRow = buildEffectiveStoreRow(storeRec, zone);
        const zoneRes = confirmedAll
          .filter((r) => String(r.zoneId ?? '').trim() === zid)
          .map((r) => ({
            headcount: parseInt(String(r.headcount ?? '0'), 10) || 0,
            startTime: String(r.startTime ?? '').trim(),
            endTime: String(r.endTime ?? '').trim(),
          }));
        const built = buildTimelineForEffectiveRow(effectiveRow, date, zoneRes);
        const summary = zoneRowToSummary(zone);
        return {
          zoneId: zid,
          name: summary.name,
          maxCapacity: built.maxCapacity,
          sortOrder: summary.sortOrder,
          timeline: built.timeline,
          slotStartHour: built.slotStartHour,
          slotEndHour: built.slotEndHour,
          closedOnDate: built.closed,
        };
      });

      // 카드 상단 요약: 첫 zone 기준(닫혀 있으면 두 번째 등)으로 슬롯·휴무 노출
      const firstOpen = zonesEntries.find((z) => !z.closedOnDate) ?? zonesEntries[0];
      const allClosed = zonesEntries.every((z) => z.closedOnDate);

      return {
        storeId: sid,
        name: store.name,
        maxCapacity: zonesEntries.reduce((acc, z) => acc + z.maxCapacity, 0),
        imageUrl: store.imageUrl || '',
        slotStartHour: firstOpen?.slotStartHour,
        slotEndHour: firstOpen?.slotEndHour,
        depositAmount: resolvedDeposit,
        depositMode: depOpts.depositMode,
        depositUseTiers: depOpts.depositUseTiers,
        depositTiers: depOpts.depositTiers,
        depositFlatAmount: depOpts.flatDepositAmount,
        timeline: firstOpen?.timeline ?? [],
        minOrderRules: [],
        minGroupHeadcount,
        closedOnDate: allClosed,
        zones: zonesEntries,
      };
    }

    // ── 단일 운영(zone 0개): 기존 로직과 동일 ──
    const confirmedRes = confirmedAll.map((r) => ({
      headcount: parseInt(String(r.headcount ?? '0'), 10) || 0,
      startTime: String(r.startTime ?? '').trim(),
      endTime: String(r.endTime ?? '').trim(),
    }));
    const built = buildTimelineForEffectiveRow(storeRec, date, confirmedRes);

    return {
      storeId: sid,
      name: store.name,
      maxCapacity: built.maxCapacity,
      imageUrl: store.imageUrl || '',
      slotStartHour: built.slotStartHour,
      slotEndHour: built.slotEndHour,
      depositAmount: resolvedDeposit,
      depositMode: depOpts.depositMode,
      depositUseTiers: depOpts.depositUseTiers,
      depositTiers: depOpts.depositTiers,
      depositFlatAmount: depOpts.flatDepositAmount,
      timeline: built.timeline,
      minOrderRules: [],
      minGroupHeadcount,
      closedOnDate: built.closed,
    };
  });
}

/** GET /api/stores/[id] 용 — 해당 가게·날짜만 조회 */
export async function getStoreDetailFromMysql(storeId: string, date: string) {
  assertConfigured();
  const id = storeId.trim();
  const dateYmd = date.trim().slice(0, 10);
  const pool = getPool();

  const [storeRows] = await pool.query<StoreRow[]>('SELECT * FROM store WHERE storeId = ? LIMIT 1', [
    id,
  ]);
  const store = storeRows[0];
  if (!store) {
    throw new ReservationDbError(404, '가게를 찾을 수 없습니다.');
  }

  const [storeMenus] = await pool.query<MenuRow[]>('SELECT * FROM menu WHERE storeId = ?', [id]);
  const storeZones = await fetchZonesByStoreId(pool, id);

  const confirmed: ReservationRow[] = dateYmd
    ? (
        await pool.query<ReservationRow[]>(
          `SELECT reservationId, storeId, zoneId, headcount, \`date\`, startTime, endTime, status
           FROM reservation
           WHERE storeId = ?
             AND DATE(\`date\`) = ?
             AND status IN ('CONFIRMED', 'DEPOSIT_CONFIRMED')`,
          [id, dateYmd],
        )
      )[0]
    : [];

  const storeRec = store as Record<string, unknown>;
  const minGroupHeadcount = readMinGroupHeadcount(storeRec);
  const ownerName =
    storeRec.ownerName != null && String(storeRec.ownerName).trim()
      ? String(storeRec.ownerName).trim()
      : null;
  const ownerBankAccount =
    storeRec.ownerBankAccount != null && String(storeRec.ownerBankAccount).trim()
      ? String(storeRec.ownerBankAccount).trim()
      : null;
  const depOpts = readStoreDepositOpts(store);
  const menusPayload = sortMenusForDisplay(storeMenus.map(menuRowToItem));

  // 동 운영 가게: zone 마다 슬롯 산출
  if (storeZones.length > 0) {
    const zonesPayload: ZoneDetailEntry[] = storeZones.map((zone) => {
      const zid = String(zone.zoneId ?? '').trim();
      const effectiveRow = buildEffectiveStoreRow(storeRec, zone);
      const zoneRes = confirmed
        .filter((r) => String(r.zoneId ?? '').trim() === zid)
        .map((r) => ({
          headcount: parseInt(String(r.headcount ?? '0'), 10) || 0,
          startTime: String(r.startTime ?? '').trim(),
          endTime: String(r.endTime ?? '').trim(),
        }));
      const built = buildTimelineForEffectiveRow(effectiveRow, date, zoneRes);
      const summary = zoneRowToSummary(zone);
      return {
        zoneId: zid,
        name: summary.name,
        maxCapacity: built.maxCapacity,
        sortOrder: summary.sortOrder,
        slotStartHour: built.slotStartHour,
        slotEndHour: built.slotEndHour,
        closedOnDate: built.closed,
        slots: built.timeline,
        availableTimes: built.timeline.filter((s) => s.isAvailable).map((s) => s.timeBlock),
        reservedTimes: built.timeline.filter((s) => !s.isAvailable).map((s) => s.timeBlock),
      };
    });

    // 첫 zone(or 첫 영업 zone) 기준으로 호환 필드 노출
    const first = zonesPayload.find((z) => !z.closedOnDate) ?? zonesPayload[0];
    const totalCap = zonesPayload.reduce((acc, z) => acc + z.maxCapacity, 0);

    return {
      store: {
        id,
        name: store.name,
        images: store.imageUrl ? [String(store.imageUrl)] : [],
        maxCapacity: totalCap,
        slotStartHour: first?.slotStartHour,
        slotEndHour: first?.slotEndHour,
        depositAmount: depOpts.flatDepositAmount,
        depositMode: depOpts.depositMode,
        depositUseTiers: depOpts.depositUseTiers,
        depositTiers: depOpts.depositTiers,
        minGroupHeadcount,
        ownerName,
        ownerBankAccount,
        closedOnDate: zonesPayload.every((z) => z.closedOnDate),
        availableTimes: first?.availableTimes ?? [],
        slots: first?.slots ?? [],
        minOrderRules: [],
        allowSameDayBooking: Number(storeRec.allowSameDayBooking ?? 0) === 1,
        menuNoticeText:
          storeRec.menuNoticeText != null && String(storeRec.menuNoticeText).trim()
            ? String(storeRec.menuNoticeText).trim()
            : null,
        depositActiveMonthRanges: depOpts.depositActiveMonthRanges,
        menuRequiredPeoplePerItem:
          storeRec.menuRequiredPeoplePerItem != null && storeRec.menuRequiredPeoplePerItem !== ''
            ? parseInt(String(storeRec.menuRequiredPeoplePerItem), 10) || null
            : null,
        zones: zonesPayload,
      },
      menus: menusPayload,
      slots: first?.slots ?? [],
      availableTimes: first?.availableTimes ?? [],
      reservedTimes: first?.reservedTimes ?? [],
      zones: zonesPayload,
    };
  }

  // 단일 운영
  const confirmedFlat = confirmed.map((r) => ({
    headcount: parseInt(String(r.headcount ?? '0'), 10) || 0,
    startTime: String(r.startTime ?? '').trim(),
    endTime: String(r.endTime ?? '').trim(),
  }));
  const built = buildTimelineForEffectiveRow(storeRec, date, confirmedFlat);

  return {
    store: {
      id,
      name: store.name,
      images: store.imageUrl ? [String(store.imageUrl)] : [],
      maxCapacity: built.maxCapacity,
      slotStartHour: built.slotStartHour,
      slotEndHour: built.slotEndHour,
      depositAmount: depOpts.flatDepositAmount,
      depositMode: depOpts.depositMode,
      depositUseTiers: depOpts.depositUseTiers,
      depositTiers: depOpts.depositTiers,
      minGroupHeadcount,
      ownerName,
      ownerBankAccount,
      closedOnDate: built.closed,
      availableTimes: built.timeline.filter((s) => s.isAvailable).map((s) => s.timeBlock),
      slots: built.timeline,
      minOrderRules: [],
      allowSameDayBooking: Number(storeRec.allowSameDayBooking ?? 0) === 1,
      menuNoticeText:
        storeRec.menuNoticeText != null && String(storeRec.menuNoticeText).trim()
          ? String(storeRec.menuNoticeText).trim()
          : null,
      depositActiveMonthRanges: depOpts.depositActiveMonthRanges,
      menuRequiredPeoplePerItem:
        storeRec.menuRequiredPeoplePerItem != null && storeRec.menuRequiredPeoplePerItem !== ''
          ? parseInt(String(storeRec.menuRequiredPeoplePerItem), 10) || null
          : null,
    },
    menus: menusPayload,
    slots: built.timeline,
    availableTimes: built.timeline.filter((s) => s.isAvailable).map((s) => s.timeBlock),
    reservedTimes: built.timeline.filter((s) => !s.isAvailable).map((s) => s.timeBlock),
  };
}

export interface CreateReservationPayload {
  storeId: string;
  /** 가게가 동(zone) 운영 중이면 필수. */
  zoneId?: string;
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
  const zoneIdInput = String(payload.zoneId ?? '').trim();
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
    const storeRec = store as Record<string, unknown>;

    // 동(zone) 검증: 가게에 zone이 있으면 zoneId 필수, 없으면 받아도 무시.
    const storeZones = await fetchZonesByStoreId(conn, storeId);
    let zone: ZoneRow | null = null;
    if (storeZones.length > 0) {
      if (!zoneIdInput) {
        await conn.rollback();
        throw new ReservationDbError(400, '예약할 동(zone)을 선택해주세요.');
      }
      zone = await findZoneInStore(conn, storeId, zoneIdInput);
      if (!zone) {
        await conn.rollback();
        throw new ReservationDbError(400, '선택한 동을 찾을 수 없습니다.');
      }
    }
    const effectiveRow = buildEffectiveStoreRow(storeRec, zone);
    const cap = parseInt(String(effectiveRow.maxCapacity ?? '0'), 10) || 0;
    const minGroup = readMinGroupHeadcount(effectiveRow);
    if (headcount < minGroup) {
      await conn.rollback();
      throw new ReservationDbError(
        400,
        `단체예약은 최소 ${minGroup}명 이상부터 가능합니다.`,
      );
    }
    if (isStoreClosedOnDate(effectiveRow, date)) {
      await conn.rollback();
      throw new ReservationDbError(400, '선택한 날짜는 휴무일입니다.');
    }

    // 당일 예약 허용 여부 (store 레벨; zone override 안 함)
    const allowSameDay =
      Number((store as Record<string, unknown>).allowSameDayBooking ?? 0) === 1;
    if (!allowSameDay) {
      const todayKr = koreaTodayYmd(new Date());
      if (date <= todayKr) {
        await conn.rollback();
        throw new ReservationDbError(
          400,
          date === todayKr
            ? '당일 예약은 받지 않는 가게입니다. 내일 이후 날짜를 선택해 주세요.'
            : '지나간 날짜에는 예약할 수 없습니다.',
        );
      }
    }

    const range = getSlotHourRangeForStoreOnDate(effectiveRow, date);
    if (range.closed) {
      await conn.rollback();
      throw new ReservationDbError(400, '선택한 날짜는 영업하지 않습니다.');
    }
    const slotStartHour = range.slotStartHour;
    const slotEndHour = range.slotEndHour;
    const crossesMidnight = range.crossesMidnight;

    // 같은 가게·zone·날짜의 확정 예약만 카운트
    const zoneSql = zone ? ' AND zoneId = ?' : '';
    const existingParams: unknown[] = zone ? [storeId, zone.zoneId, date] : [storeId, date];
    const [existingRows] = await conn.query<ReservationRow[]>(
      `SELECT * FROM reservation
       WHERE storeId = ?${zoneSql} AND date = ? AND status IN ('CONFIRMED','DEPOSIT_CONFIRMED')`,
      existingParams,
    );

    const ownerJson = effectiveRow.ownerClosedSlotsJson;
    const slots = applyOwnerClosedBlocksToSlots(
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
      ownerJson,
      undefined,
      { slotStartHour, slotEndHour, crossesMidnight },
    );

    const targetSlots = slots.filter((s) =>
      slotOverlapsReservation(s.timeBlock, startTime, endTime, crossesMidnight, slotStartHour, slotEndHour),
    );
    if (!targetSlots.length) {
      await conn.rollback();
      throw new ReservationDbError(400, '선택한 시간이 예약 가능한 슬롯에 없습니다.');
    }
    const blocked = targetSlots.some(
      (s) =>
        !s.isAvailable ||
        isSlotBlockedForBooking(s.timeBlock, date, ownerJson, undefined, {
          slotStartHour,
          slotEndHour,
          crossesMidnight,
        }),
    );
    if (blocked) {
      await conn.rollback();
      throw new ReservationDbError(400, '선택한 시간은 예약을 받지 않습니다.');
    }
    const minRemaining = Math.min(...targetSlots.map((s) => cap - s.currentHeadcount));
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

    // N명당 메뉴 1개 강제 (store.menuRequiredPeoplePerItem)
    const peoplePerItemRaw = (store as Record<string, unknown>).menuRequiredPeoplePerItem;
    const peoplePerItem =
      peoplePerItemRaw != null && peoplePerItemRaw !== ''
        ? Math.max(0, Math.floor(Number(peoplePerItemRaw)) || 0)
        : 0;
    if (peoplePerItem > 0) {
      const totalItemQty = selectedMenus.reduce(
        (sum, sm) => sum + (parseInt(String(sm.quantity ?? '0'), 10) || 0),
        0,
      );
      const requiredItemQty = Math.ceil(headcount / peoplePerItem);
      if (totalItemQty < requiredItemQty) {
        await conn.rollback();
        throw new ReservationDbError(
          400,
          `이 가게는 ${peoplePerItem}명당 메뉴 1개 이상을 주문해야 합니다. ` +
            `${headcount}명이면 메뉴 ${requiredItemQty}개 이상 필요(현재 ${totalItemQty}개).`,
        );
      }
    }

    const depOpts = readStoreDepositOpts(store);
    const depositAmount = resolveDepositForHeadcountAndDate(headcount, date, {
      depositMode: depOpts.depositMode,
      depositTiers: depOpts.depositTiers,
      flatDepositAmount: depOpts.flatDepositAmount,
      depositActiveMonthRanges: depOpts.depositActiveMonthRanges,
    });
    const createdAt = new Date().toISOString().slice(0, 19).replace('T', ' ');

    await conn.execute(
      `INSERT INTO reservation (
        reservationId, storeId, zoneId, userName, groupName, userPhone, userNote,
        headcount, date, startTime, endTime, menuItems, totalAmount, status, depositAmount, createdAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'PENDING', ?, ?)`,
      [
        reservationId,
        storeId,
        zone ? String(zone.zoneId) : null,
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

  const zid = String(r.zoneId ?? '').trim();
  return {
    reservationId: r.reservationId,
    storeId: sid,
    storeName: store ? store.name : sid,
    zoneId: zid || undefined,
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
  const pool = getPool();
  const [{ stores, menus }, reservations] = await Promise.all([
    fetchStoresMenusRules(),
    fetchActiveReservationsFromToday(),
  ]);
  const zonesByStoreId = await fetchZonesByStoreIds(
    pool,
    stores.map((s) => String(s.storeId ?? '').trim()),
  );

  const storeList = stores.map((store) => {
    const sid = String(store.storeId ?? '').trim();
    const cap = parseInt(String(store.maxCapacity ?? '0'), 10) || 0;
    const range = getDefaultSlotHourRangeForStore(store as Record<string, unknown>);
    const depOpts = readStoreDepositOpts(store);
    const rec = store as Record<string, unknown>;
    const storeZones = (zonesByStoreId.get(sid) ?? []).map((z) => zoneRowToSummary(z));
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
      menus: menusForStoreId(menus, sid),
      minOrderRules: [],
      ownerName:
        rec.ownerName != null && String(rec.ownerName).trim() ? String(rec.ownerName).trim() : null,
      ownerBankAccount:
        rec.ownerBankAccount != null && String(rec.ownerBankAccount).trim()
          ? String(rec.ownerBankAccount).trim()
          : null,
      ownerClosedSlotsJson:
        rec.ownerClosedSlotsJson != null && String(rec.ownerClosedSlotsJson).trim()
          ? String(rec.ownerClosedSlotsJson).trim()
          : null,
      closedWeekdaysJson:
        rec.closedWeekdaysJson != null && String(rec.closedWeekdaysJson).trim()
          ? String(rec.closedWeekdaysJson).trim()
          : null,
      allowSameDayBooking: Number(rec.allowSameDayBooking ?? 0) === 1,
      menuNoticeText:
        rec.menuNoticeText != null && String(rec.menuNoticeText).trim()
          ? String(rec.menuNoticeText).trim()
          : null,
      depositActiveMonthRangesJson:
        rec.depositActiveMonthRangesJson != null && String(rec.depositActiveMonthRangesJson).trim()
          ? String(rec.depositActiveMonthRangesJson).trim()
          : null,
      menuRequiredPeoplePerItem:
        rec.menuRequiredPeoplePerItem != null && rec.menuRequiredPeoplePerItem !== ''
          ? parseInt(String(rec.menuRequiredPeoplePerItem), 10) || null
          : null,
      zones: storeZones,
    };
  });

  const confirmedReservations = reservations.map((r) => {
      const zid = String(r.zoneId ?? '').trim();
      return {
        reservationId: r.reservationId,
        storeId: String(r.storeId ?? '').trim(),
        zoneId: zid || null,
        headcount: parseInt(String(r.headcount ?? '0'), 10) || 0,
        date: rowDateToYmd(r.date),
        startTime: String(r.startTime ?? '').trim(),
        endTime: String(r.endTime ?? '').trim(),
      };
    });

  return {
    stores: storeList,
    reservations: confirmedReservations,
  };
}
