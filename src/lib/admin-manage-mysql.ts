import { randomUUID } from 'crypto';
import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import {
  depositModeFromDb,
  parseDepositTiersJson,
  serializeDepositTiersForDb,
  type DepositMode,
} from '@/lib/deposit-tiers';
import { suggestNextAutoMenuId } from '@/lib/auto-menu-id';
import { suggestNextAutoStoreId } from '@/lib/auto-store-id';
import { menuHasSortOrderColumn } from '@/lib/menu-schema-migrate';
import { buildSlots } from '@/lib/booking-slots';
import {
  applyOwnerClosedBlocksToSlots,
  ownerClosedBlockSet,
  serializeOwnerClosedSlotsForDb,
} from '@/lib/owner-closed-slots';
import { koreaTodayYmd } from '@/lib/korea-time';
import { readMinGroupHeadcount, getSlotHourRangeForStoreOnDate } from '@/lib/store-weekly-hours';
import { formatMysqlUserError, getPool, isMysqlConfigured } from '@/lib/db';
import type { DepositTier, TimeSlot } from '@/types';

type StoreRow = RowDataPacket & Record<string, unknown>;
type MenuRow = RowDataPacket & Record<string, unknown>;
type ReservationRow = RowDataPacket & Record<string, unknown>;

function rowDateToYmd(d: unknown): string {
  if (d instanceof Date && !Number.isNaN(d.getTime())) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }
  return String(d ?? '').trim().slice(0, 10);
}

export interface ManageStoreRow {
  storeId: string;
  name: string;
  category: string;
  locationLabel: string | null;
  maxCapacity: number;
  minGroupHeadcount: number;
  imageUrl: string | null;
  slotStartHour: number | null;
  slotEndHour: number | null;
  depositAmount: number;
  depositMode: DepositMode;
  /** @deprecated depositMode === 'tiered' */
  depositUseTiers: boolean;
  depositTiers: DepositTier[];
  ownerName: string | null;
  ownerBankAccount: string | null;
  weeklyHoursJson: string | null;
  closedDatesJson: string | null;
  description: string | null;
  adminAccessToken: string | null;
  /** 작을수록 고객 목록·관리 목록에서 앞에 표시 */
  sortOrder: number;
  ownerClosedSlotsJson: string | null;
}

function mapStoreRow(r: StoreRow): ManageStoreRow {
  const rec = r as Record<string, unknown>;
  const depositMode = depositModeFromDb(rec.depositUseTiers);
  return {
    storeId: String(r.storeId ?? '').trim(),
    name: String(r.name ?? '').trim(),
    category: String(r.category ?? '').trim(),
    locationLabel:
      rec.locationLabel != null && String(rec.locationLabel).trim()
        ? String(rec.locationLabel).trim()
        : null,
    maxCapacity: parseInt(String(r.maxCapacity ?? '0'), 10) || 0,
    minGroupHeadcount: readMinGroupHeadcount(rec),
    imageUrl: r.imageUrl != null && String(r.imageUrl).trim() ? String(r.imageUrl) : null,
    slotStartHour: r.slotStartHour != null ? Number(r.slotStartHour) : null,
    slotEndHour: r.slotEndHour != null ? Number(r.slotEndHour) : null,
    depositAmount: parseInt(String(r.depositAmount ?? '0'), 10) || 0,
    depositMode,
    depositUseTiers: depositMode === 'tiered',
    depositTiers: parseDepositTiersJson(rec.depositTiersJson),
    ownerName:
      rec.ownerName != null && String(rec.ownerName).trim() ? String(rec.ownerName).trim() : null,
    ownerBankAccount:
      rec.ownerBankAccount != null && String(rec.ownerBankAccount).trim()
        ? String(rec.ownerBankAccount).trim()
        : null,
    weeklyHoursJson:
      rec.weeklyHoursJson != null && String(rec.weeklyHoursJson).trim()
        ? String(rec.weeklyHoursJson)
        : null,
    closedDatesJson:
      rec.closedDatesJson != null && String(rec.closedDatesJson).trim()
        ? String(rec.closedDatesJson)
        : null,
    description: r.description != null && String(r.description).trim() ? String(r.description) : null,
    adminAccessToken:
      r.adminAccessToken != null && String(r.adminAccessToken).trim()
        ? String(r.adminAccessToken).trim()
        : null,
    sortOrder: parseInt(String((r as Record<string, unknown>).sortOrder ?? '0'), 10) || 0,
    ownerClosedSlotsJson:
      rec.ownerClosedSlotsJson != null && String(rec.ownerClosedSlotsJson).trim()
        ? String(rec.ownerClosedSlotsJson).trim()
        : null,
  };
}

export async function manageListStores(): Promise<
  | {
      success: true;
      data: ManageStoreRow[];
      suggestedStoreId: string;
    }
  | { success: false; message: string }
> {
  if (!isMysqlConfigured()) {
    return { success: false, message: 'MySQL(MYSQL_*) 설정이 필요합니다.' };
  }
  try {
    const pool = getPool();
    /** SELECT * — 예약금 구간 컬럼이 아직 없는 DB에서도 목록 조회가 되도록 명시 컬럼 나열을 쓰지 않음 */
    const [rows] = await pool.query<StoreRow[]>('SELECT * FROM store ORDER BY sortOrder ASC, name ASC');
    const data = rows.map(mapStoreRow);
    const suggestedStoreId = suggestNextAutoStoreId(data.map((s) => s.storeId));
    return { success: true, data, suggestedStoreId };
  } catch (e) {
    console.error('[manageListStores]', e);
    return { success: false, message: formatMysqlUserError(e) };
  }
}

export async function manageUpdateStore(
  storeId: string,
  patch: {
    name?: string;
    locationLabel?: string | null;
    description?: string | null;
    imageUrl?: string | null;
    sortOrder?: number;
    depositAmount?: number;
    depositUseTiers?: boolean | number;
    depositTiersJson?: string | null;
    minGroupHeadcount?: number;
    maxCapacity?: number;
    ownerName?: string | null;
    ownerBankAccount?: string | null;
    weeklyHoursJson?: string | null;
    closedDatesJson?: string | null;
    slotStartHour?: number | null;
    slotEndHour?: number | null;
    ownerClosedSlotsJson?: string | null;
  },
): Promise<{ success: true } | { success: false; message: string }> {
  if (!isMysqlConfigured()) {
    return { success: false, message: 'MySQL(MYSQL_*) 설정이 필요합니다.' };
  }
  const sid = storeId.trim();
  if (!sid) return { success: false, message: '가게 ID가 필요합니다.' };

  const sets: string[] = [];
  const params: (string | number | null)[] = [];
  if (patch.name !== undefined) {
    sets.push('name = ?');
    params.push(String(patch.name).trim());
  }
  if (patch.locationLabel !== undefined) {
    sets.push('locationLabel = ?');
    params.push(
      patch.locationLabel == null || patch.locationLabel === ''
        ? null
        : String(patch.locationLabel).trim(),
    );
  }
  if (patch.description !== undefined) {
    sets.push('description = ?');
    params.push(patch.description == null || patch.description === '' ? null : String(patch.description));
  }
  if (patch.imageUrl !== undefined) {
    sets.push('imageUrl = ?');
    params.push(patch.imageUrl == null || String(patch.imageUrl).trim() === '' ? null : String(patch.imageUrl));
  }
  if (patch.sortOrder !== undefined) {
    sets.push('sortOrder = ?');
    const n = Math.floor(Number(patch.sortOrder));
    params.push(Number.isFinite(n) && n >= 0 ? n : 0);
  }
  if (patch.depositAmount !== undefined) {
    sets.push('depositAmount = ?');
    const n = Math.floor(Number(patch.depositAmount));
    params.push(Number.isFinite(n) && n >= 0 ? n : 0);
  }
  if (patch.depositUseTiers !== undefined) {
    sets.push('depositUseTiers = ?');
    const v = patch.depositUseTiers;
    const n = typeof v === 'number' ? Math.floor(v) : v ? 1 : 0;
    params.push(Math.min(2, Math.max(0, n)));
  }
  if (patch.depositTiersJson !== undefined) {
    sets.push('depositTiersJson = ?');
    params.push(patch.depositTiersJson);
  }
  if (patch.minGroupHeadcount !== undefined) {
    sets.push('minGroupHeadcount = ?');
    const n = Math.floor(Number(patch.minGroupHeadcount));
    params.push(Number.isFinite(n) && n >= 1 ? n : 2);
  }
  if (patch.maxCapacity !== undefined) {
    sets.push('maxCapacity = ?');
    const n = Math.floor(Number(patch.maxCapacity));
    params.push(Number.isFinite(n) && n >= 0 ? n : 0);
  }
  if (patch.ownerName !== undefined) {
    sets.push('ownerName = ?');
    params.push(patch.ownerName == null || patch.ownerName === '' ? null : String(patch.ownerName).trim());
  }
  if (patch.ownerBankAccount !== undefined) {
    sets.push('ownerBankAccount = ?');
    params.push(
      patch.ownerBankAccount == null || patch.ownerBankAccount === ''
        ? null
        : String(patch.ownerBankAccount).trim(),
    );
  }
  if (patch.weeklyHoursJson !== undefined) {
    sets.push('weeklyHoursJson = ?');
    params.push(patch.weeklyHoursJson);
  }
  if (patch.closedDatesJson !== undefined) {
    sets.push('closedDatesJson = ?');
    params.push(patch.closedDatesJson);
  }
  if (patch.slotStartHour !== undefined) {
    sets.push('slotStartHour = ?');
    params.push(
      patch.slotStartHour == null ? null : Math.min(23, Math.max(0, Math.floor(patch.slotStartHour))),
    );
  }
  if (patch.slotEndHour !== undefined) {
    sets.push('slotEndHour = ?');
    params.push(
      patch.slotEndHour == null ? null : Math.min(23, Math.max(0, Math.floor(patch.slotEndHour))),
    );
  }
  if (patch.ownerClosedSlotsJson !== undefined) {
    sets.push('ownerClosedSlotsJson = ?');
    params.push(patch.ownerClosedSlotsJson);
  }
  if (!sets.length) {
    return { success: false, message: '수정할 필드가 없습니다.' };
  }
  params.push(sid);

  try {
    const pool = getPool();
    const [h] = await pool.execute<ResultSetHeader>(
      `UPDATE store SET ${sets.join(', ')} WHERE storeId = ?`,
      params,
    );
    if (!h.affectedRows) {
      return { success: false, message: '가게를 찾을 수 없습니다.' };
    }
    return { success: true };
  } catch (e) {
    const err = e as { errno?: number; message?: string };
    const msg = formatMysqlUserError(e);
    const tierColsMissing =
      err.errno === 1054 &&
      typeof err.message === 'string' &&
      (err.message.includes('depositUseTiers') || err.message.includes('depositTiersJson'));
    if (
      tierColsMissing &&
      (patch.depositUseTiers !== undefined || patch.depositTiersJson !== undefined)
    ) {
      const { depositUseTiers: _u, depositTiersJson: _j, ...rest } = patch;
      const restKeys = Object.keys(rest).filter((k) => rest[k as keyof typeof rest] !== undefined);
      if (restKeys.length === 0) {
        return {
          success: false,
          message:
            'DB에 예약금 구간 컬럼이 없습니다. 저장소의 docs/store-deposit-tiers.sql 을 실행한 뒤 인원 구간 예약금을 저장하세요.',
        };
      }
      return manageUpdateStore(sid, rest);
    }
    console.error('[manageUpdateStore]', e);
    return { success: false, message: msg };
  }
}

export async function manageCreateStore(input: {
  storeId: string;
  name: string;
  category?: string;
  maxCapacity?: number;
}): Promise<{ success: true; storeId: string } | { success: false; message: string }> {
  if (!isMysqlConfigured()) {
    return { success: false, message: 'MySQL(MYSQL_*) 설정이 필요합니다.' };
  }
  let storeId = String(input.storeId ?? '').trim();
  const name = String(input.name ?? '').trim();
  if (!name) return { success: false, message: '가게 이름을 입력하세요.' };
  const category = String(input.category ?? '').trim();
  const rawCap = Math.floor(Number(input.maxCapacity));
  const maxCap = Number.isFinite(rawCap) && rawCap > 0 ? rawCap : 80;

  try {
    const pool = getPool();

    for (let attempt = 0; attempt < 5; attempt++) {
      if (!storeId) {
        const [idRows] = await pool.query<RowDataPacket[]>('SELECT storeId FROM store');
        storeId = suggestNextAutoStoreId(idRows.map((r) => String(r.storeId ?? '')));
      }

      const [dup] = await pool.query<RowDataPacket[]>('SELECT 1 FROM store WHERE storeId = ? LIMIT 1', [storeId]);
      if (dup.length) {
        if (attempt < 4 && !String(input.storeId ?? '').trim()) {
          storeId = '';
          continue;
        }
        return { success: false, message: '이미 사용 중인 가게 ID입니다.' };
      }

      const [sr] = await pool.query<RowDataPacket[]>('SELECT COALESCE(MAX(sortOrder), 0) AS m FROM store');
      const nextSort = (parseInt(String(sr[0]?.m ?? '0'), 10) || 0) + 10;
      await pool.execute(
        `INSERT INTO store (
        storeId, name, category, maxCapacity, imageUrl, slotStartHour, slotEndHour,
        depositAmount, description, adminAccessToken, sortOrder
      ) VALUES (?, ?, ?, ?, NULL, 11, 20, 0, NULL, NULL, ?)`,
        [storeId, name, category || '', maxCap, nextSort],
      );
      return { success: true, storeId };
    }

    return { success: false, message: '가게 ID를 자동으로 정하지 못했습니다. 잠시 후 다시 시도하세요.' };
  } catch (e) {
    console.error('[manageCreateStore]', e);
    return { success: false, message: formatMysqlUserError(e) };
  }
}

export async function manageDeleteStore(
  storeId: string,
): Promise<{ success: true } | { success: false; message: string }> {
  if (!isMysqlConfigured()) {
    return { success: false, message: 'MySQL(MYSQL_*) 설정이 필요합니다.' };
  }
  const sid = storeId.trim();
  if (!sid) return { success: false, message: '가게 ID가 필요합니다.' };
  try {
    const pool = getPool();
    const [h] = await pool.execute<ResultSetHeader>('DELETE FROM store WHERE storeId = ?', [sid]);
    if (!h.affectedRows) {
      return { success: false, message: '가게를 찾을 수 없습니다.' };
    }
    return { success: true };
  } catch (e) {
    console.error('[manageDeleteStore]', e);
    return { success: false, message: formatMysqlUserError(e) };
  }
}

export interface ManageMenuRow {
  storeId: string;
  menuId: string;
  name: string;
  price: number;
  category: string;
  sortOrder: number;
  isRequired: boolean;
  imageUrl: string | null;
}

function mapMenuRow(r: MenuRow): ManageMenuRow {
  const ir = r.isRequired;
  const req =
    typeof ir === 'boolean'
      ? ir
      : String(ir).toLowerCase() === 'true' || Number(ir) === 1;
  return {
    storeId: String(r.storeId ?? '').trim(),
    menuId: String(r.menuId ?? '').trim(),
    name: String(r.name ?? '').trim(),
    price: parseInt(String(r.price ?? '0'), 10) || 0,
    category: String(r.category ?? '').trim(),
    sortOrder: parseInt(String((r as Record<string, unknown>).sortOrder ?? '0'), 10) || 0,
    isRequired: req,
    imageUrl: r.imageUrl != null && String(r.imageUrl).trim() ? String(r.imageUrl) : null,
  };
}

export async function manageListMenus(
  storeId: string,
): Promise<
  | { success: true; data: ManageMenuRow[]; suggestedMenuId: string }
  | { success: false; message: string }
> {
  if (!isMysqlConfigured()) {
    return { success: false, message: 'MySQL(MYSQL_*) 설정이 필요합니다.' };
  }
  const sid = storeId.trim();
  if (!sid) return { success: false, message: '가게 ID가 필요합니다.' };
  try {
    const pool = getPool();
    const hasSort = await menuHasSortOrderColumn(pool);
    const [rows] = await pool.query<MenuRow[]>(
      hasSort
        ? 'SELECT storeId, menuId, name, price, category, sortOrder, isRequired, imageUrl FROM menu WHERE storeId = ? ORDER BY sortOrder ASC, menuId ASC'
        : 'SELECT storeId, menuId, name, price, category, isRequired, imageUrl FROM menu WHERE storeId = ? ORDER BY menuId ASC',
      [sid],
    );
    const data = rows.map(mapMenuRow);
    const suggestedMenuId = suggestNextAutoMenuId(
      sid,
      data.map((m) => m.menuId),
    );
    return { success: true, data, suggestedMenuId };
  } catch (e) {
    console.error('[manageListMenus]', e);
    return { success: false, message: formatMysqlUserError(e) };
  }
}

export async function manageInsertMenu(
  storeId: string,
  body: {
    menuId?: string;
    name: string;
    price: number;
    category?: string;
    isRequired?: boolean;
    imageUrl?: string | null;
    description?: string | null;
  },
): Promise<{ success: true; data: { menuId: string } } | { success: false; message: string }> {
  if (!isMysqlConfigured()) {
    return { success: false, message: 'MySQL(MYSQL_*) 설정이 필요합니다.' };
  }
  const sid = storeId.trim();
  if (!sid) return { success: false, message: '가게 ID가 필요합니다.' };
  const name = String(body.name ?? '').trim();
  if (!name) return { success: false, message: '메뉴 이름이 필요합니다.' };
  const price = Math.max(0, parseInt(String(body.price ?? '0'), 10) || 0);
  let menuId = String(body.menuId ?? '').trim();
  const category = String(body.category ?? '').trim();
  const isReq = body.isRequired ? 1 : 0;
  const imageUrl =
    body.imageUrl == null || String(body.imageUrl).trim() === '' ? null : String(body.imageUrl).trim();
  const description =
    body.description == null || String(body.description).trim() === '' ? null : String(body.description).trim();

  try {
    const pool = getPool();

    for (let attempt = 0; attempt < 5; attempt++) {
      if (!menuId) {
        const [idRows] = await pool.query<RowDataPacket[]>(
          'SELECT menuId FROM menu WHERE storeId = ?',
          [sid],
        );
        menuId = suggestNextAutoMenuId(
          sid,
          idRows.map((r) => String(r.menuId ?? '')),
        );
      }

      const [dup] = await pool.query<RowDataPacket[]>(
        'SELECT 1 FROM menu WHERE storeId = ? AND menuId = ? LIMIT 1',
        [sid, menuId],
      );
      if (dup.length) {
        if (attempt < 4 && !String(body.menuId ?? '').trim()) {
          menuId = '';
          continue;
        }
        return { success: false, message: '이미 존재하는 menuId입니다. 다른 ID를 지정하세요.' };
      }

      const hasSort = await menuHasSortOrderColumn(pool);
      if (hasSort) {
        const [maxRows] = await pool.query<RowDataPacket[]>(
          'SELECT COALESCE(MAX(sortOrder), 0) AS m FROM menu WHERE storeId = ?',
          [sid],
        );
        const nextSort = (parseInt(String(maxRows[0]?.m ?? '0'), 10) || 0) + 10;
        await pool.execute(
          `INSERT INTO menu (storeId, menuId, name, price, category, sortOrder, isRequired, imageUrl, description) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [sid, menuId, name, price, category, nextSort, isReq, imageUrl, description],
        );
      } else {
        await pool.execute(
          `INSERT INTO menu (storeId, menuId, name, price, category, isRequired, imageUrl, description) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [sid, menuId, name, price, category, isReq, imageUrl, description],
        );
      }
      return { success: true, data: { menuId } };
    }

    return { success: false, message: '메뉴 ID를 자동으로 정하지 못했습니다. 잠시 후 다시 시도하세요.' };
  } catch (e) {
    const err = e as { code?: string };
    if (err.code === 'ER_DUP_ENTRY') {
      return { success: false, message: '이미 존재하는 menuId입니다. 다른 ID를 지정하세요.' };
    }
    console.error('[manageInsertMenu]', e);
    return { success: false, message: formatMysqlUserError(e) };
  }
}

export async function manageUpdateMenu(
  storeId: string,
  menuId: string,
  patch: {
    name?: string;
    price?: number;
    category?: string;
    isRequired?: boolean;
    imageUrl?: string | null;
    description?: string | null;
  },
): Promise<{ success: true } | { success: false; message: string }> {
  if (!isMysqlConfigured()) {
    return { success: false, message: 'MySQL(MYSQL_*) 설정이 필요합니다.' };
  }
  const sid = storeId.trim();
  const mid = menuId.trim();
  if (!sid || !mid) return { success: false, message: '가게 ID와 메뉴 ID가 필요합니다.' };

  const sets: string[] = [];
  const params: (string | number | null)[] = [];
  if (patch.name !== undefined) {
    sets.push('name = ?');
    params.push(String(patch.name).trim());
  }
  if (patch.price !== undefined) {
    sets.push('price = ?');
    params.push(Math.max(0, parseInt(String(patch.price), 10) || 0));
  }
  if (patch.category !== undefined) {
    sets.push('category = ?');
    params.push(String(patch.category ?? '').trim());
  }
  if (patch.isRequired !== undefined) {
    sets.push('isRequired = ?');
    params.push(patch.isRequired ? 1 : 0);
  }
  if (patch.imageUrl !== undefined) {
    sets.push('imageUrl = ?');
    params.push(patch.imageUrl == null || String(patch.imageUrl).trim() === '' ? null : String(patch.imageUrl));
  }
  if (patch.description !== undefined) {
    sets.push('description = ?');
    params.push(patch.description == null || String(patch.description).trim() === '' ? null : String(patch.description).trim());
  }
  if (!sets.length) {
    return { success: false, message: '수정할 필드가 없습니다.' };
  }
  params.push(sid, mid);

  try {
    const pool = getPool();
    const [h] = await pool.execute<ResultSetHeader>(
      `UPDATE menu SET ${sets.join(', ')} WHERE storeId = ? AND menuId = ?`,
      params,
    );
    if (!h.affectedRows) {
      return { success: false, message: '메뉴를 찾을 수 없습니다.' };
    }
    return { success: true };
  } catch (e) {
    console.error('[manageUpdateMenu]', e);
    return { success: false, message: formatMysqlUserError(e) };
  }
}

export async function manageDeleteMenu(
  storeId: string,
  menuId: string,
): Promise<{ success: true } | { success: false; message: string }> {
  if (!isMysqlConfigured()) {
    return { success: false, message: 'MySQL(MYSQL_*) 설정이 필요합니다.' };
  }
  const sid = storeId.trim();
  const mid = menuId.trim();
  if (!sid || !mid) return { success: false, message: '가게 ID와 메뉴 ID가 필요합니다.' };
  try {
    const pool = getPool();
    const [h] = await pool.execute<ResultSetHeader>(
      'DELETE FROM menu WHERE storeId = ? AND menuId = ?',
      [sid, mid],
    );
    if (!h.affectedRows) {
      return { success: false, message: '메뉴를 찾을 수 없습니다.' };
    }
    return { success: true };
  } catch (e) {
    console.error('[manageDeleteMenu]', e);
    return { success: false, message: formatMysqlUserError(e) };
  }
}

/** 메뉴 표시 순서 일괄 저장 (menuIds 순서대로 10, 20, 30…) */
export async function manageReorderMenus(
  storeId: string,
  orderedMenuIds: string[],
): Promise<{ success: true } | { success: false; message: string }> {
  if (!isMysqlConfigured()) {
    return { success: false, message: 'MySQL(MYSQL_*) 설정이 필요합니다.' };
  }
  const sid = storeId.trim();
  if (!sid) return { success: false, message: '가게 ID가 필요합니다.' };
  const ids = orderedMenuIds.map((id) => String(id).trim()).filter(Boolean);
  if (!ids.length) return { success: false, message: '메뉴 ID 목록이 비어 있습니다.' };

  try {
    const pool = getPool();
    const hasSort = await menuHasSortOrderColumn(pool);
    if (!hasSort) {
      return { success: true };
    }
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();
      for (let i = 0; i < ids.length; i++) {
        await conn.execute('UPDATE menu SET sortOrder = ? WHERE storeId = ? AND menuId = ?', [
          (i + 1) * 10,
          sid,
          ids[i],
        ]);
      }
      await conn.commit();
      return { success: true };
    } catch (e) {
      await conn.rollback();
      throw e;
    } finally {
      conn.release();
    }
  } catch (e) {
    console.error('[manageReorderMenus]', e);
    return { success: false, message: formatMysqlUserError(e) };
  }
}

// ── 동(zone) 관리 ────────────────────────────────────────

export interface ManageZoneRow {
  zoneId: string;
  storeId: string;
  name: string;
  sortOrder: number;
  maxCapacity: number;
  minGroupHeadcount: number | null;
  slotStartHour: number | null;
  slotEndHour: number | null;
  weeklyHoursJson: string | null;
  closedDatesJson: string | null;
  ownerClosedSlotsJson: string | null;
}

function mapZoneRow(r: RowDataPacket & Record<string, unknown>): ManageZoneRow {
  return {
    zoneId: String(r.zoneId ?? '').trim(),
    storeId: String(r.storeId ?? '').trim(),
    name: String(r.name ?? '').trim(),
    sortOrder: parseInt(String(r.sortOrder ?? '0'), 10) || 0,
    maxCapacity: parseInt(String(r.maxCapacity ?? '0'), 10) || 0,
    minGroupHeadcount:
      r.minGroupHeadcount != null ? parseInt(String(r.minGroupHeadcount), 10) || null : null,
    slotStartHour: r.slotStartHour != null ? Number(r.slotStartHour) : null,
    slotEndHour: r.slotEndHour != null ? Number(r.slotEndHour) : null,
    weeklyHoursJson:
      r.weeklyHoursJson != null && String(r.weeklyHoursJson).trim()
        ? String(r.weeklyHoursJson)
        : null,
    closedDatesJson:
      r.closedDatesJson != null && String(r.closedDatesJson).trim()
        ? String(r.closedDatesJson)
        : null,
    ownerClosedSlotsJson:
      r.ownerClosedSlotsJson != null && String(r.ownerClosedSlotsJson).trim()
        ? String(r.ownerClosedSlotsJson)
        : null,
  };
}

export async function manageListZones(
  storeId: string,
): Promise<{ success: true; data: ManageZoneRow[] } | { success: false; message: string }> {
  if (!isMysqlConfigured()) {
    return { success: false, message: 'MySQL(MYSQL_*) 설정이 필요합니다.' };
  }
  const sid = storeId.trim();
  if (!sid) return { success: false, message: '가게 ID가 필요합니다.' };
  try {
    const pool = getPool();
    const [rows] = await pool.query<(RowDataPacket & Record<string, unknown>)[]>(
      'SELECT * FROM zone WHERE storeId = ? ORDER BY sortOrder ASC, name ASC',
      [sid],
    );
    return { success: true, data: rows.map(mapZoneRow) };
  } catch (e) {
    console.error('[manageListZones]', e);
    return { success: false, message: formatMysqlUserError(e) };
  }
}

function generateZoneId(): string {
  return `zn_${randomUUID().replace(/-/g, '').slice(0, 16)}`;
}

export async function manageInsertZone(
  storeId: string,
  body: {
    name: string;
    maxCapacity: number;
    sortOrder?: number;
    minGroupHeadcount?: number | null;
    slotStartHour?: number | null;
    slotEndHour?: number | null;
    weeklyHoursJson?: string | null;
    closedDatesJson?: string | null;
  },
): Promise<{ success: true; data: { zoneId: string } } | { success: false; message: string }> {
  if (!isMysqlConfigured()) {
    return { success: false, message: 'MySQL(MYSQL_*) 설정이 필요합니다.' };
  }
  const sid = storeId.trim();
  if (!sid) return { success: false, message: '가게 ID가 필요합니다.' };
  const name = String(body.name ?? '').trim();
  if (!name) return { success: false, message: '동(zone) 이름이 필요합니다.' };
  if (name.length > 40) {
    return { success: false, message: '동 이름은 40자 이내로 입력해 주세요.' };
  }
  const maxCap = Math.max(1, Math.floor(Number(body.maxCapacity) || 0));
  if (maxCap < 1) {
    return { success: false, message: '최대 수용 인원은 1명 이상이어야 합니다.' };
  }

  try {
    const pool = getPool();
    // 이름 중복 확인
    const [dup] = await pool.query<RowDataPacket[]>(
      'SELECT 1 FROM zone WHERE storeId = ? AND name = ? LIMIT 1',
      [sid, name],
    );
    if (dup.length) {
      return { success: false, message: '같은 이름의 동이 이미 있습니다.' };
    }

    // sortOrder 자동 계산
    let sortOrder = Number(body.sortOrder);
    if (!Number.isFinite(sortOrder)) {
      const [maxRows] = await pool.query<RowDataPacket[]>(
        'SELECT COALESCE(MAX(sortOrder), 0) AS m FROM zone WHERE storeId = ?',
        [sid],
      );
      sortOrder = (parseInt(String(maxRows[0]?.m ?? '0'), 10) || 0) + 10;
    }

    const zoneId = generateZoneId();
    await pool.execute(
      `INSERT INTO zone (zoneId, storeId, name, sortOrder, maxCapacity,
        minGroupHeadcount, slotStartHour, slotEndHour, weeklyHoursJson, closedDatesJson)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        zoneId,
        sid,
        name,
        Math.floor(sortOrder),
        maxCap,
        body.minGroupHeadcount != null && Number.isFinite(Number(body.minGroupHeadcount))
          ? Math.max(1, Math.floor(Number(body.minGroupHeadcount)))
          : null,
        body.slotStartHour != null && Number.isFinite(Number(body.slotStartHour))
          ? Math.min(23, Math.max(0, Math.floor(Number(body.slotStartHour))))
          : null,
        body.slotEndHour != null && Number.isFinite(Number(body.slotEndHour))
          ? Math.min(23, Math.max(0, Math.floor(Number(body.slotEndHour))))
          : null,
        body.weeklyHoursJson ?? null,
        body.closedDatesJson ?? null,
      ],
    );
    return { success: true, data: { zoneId } };
  } catch (e) {
    console.error('[manageInsertZone]', e);
    return { success: false, message: formatMysqlUserError(e) };
  }
}

export async function manageUpdateZone(
  storeId: string,
  zoneId: string,
  patch: {
    name?: string;
    maxCapacity?: number;
    sortOrder?: number;
    minGroupHeadcount?: number | null;
    slotStartHour?: number | null;
    slotEndHour?: number | null;
    weeklyHoursJson?: string | null;
    closedDatesJson?: string | null;
    ownerClosedSlotsJson?: string | null;
  },
): Promise<{ success: true } | { success: false; message: string }> {
  if (!isMysqlConfigured()) {
    return { success: false, message: 'MySQL(MYSQL_*) 설정이 필요합니다.' };
  }
  const sid = storeId.trim();
  const zid = zoneId.trim();
  if (!sid || !zid) return { success: false, message: '가게 ID와 동 ID가 필요합니다.' };

  const sets: string[] = [];
  const params: (string | number | null)[] = [];
  if (patch.name !== undefined) {
    const name = String(patch.name).trim();
    if (!name) return { success: false, message: '동 이름은 비울 수 없습니다.' };
    if (name.length > 40) {
      return { success: false, message: '동 이름은 40자 이내로 입력해 주세요.' };
    }
    // 같은 가게 내 다른 zone과 이름 중복 확인
    try {
      const pool = getPool();
      const [dup] = await pool.query<RowDataPacket[]>(
        'SELECT 1 FROM zone WHERE storeId = ? AND name = ? AND zoneId <> ? LIMIT 1',
        [sid, name, zid],
      );
      if (dup.length) {
        return { success: false, message: '같은 이름의 동이 이미 있습니다.' };
      }
    } catch (e) {
      console.error('[manageUpdateZone dup check]', e);
      return { success: false, message: formatMysqlUserError(e) };
    }
    sets.push('name = ?');
    params.push(name);
  }
  if (patch.maxCapacity !== undefined) {
    const cap = Math.max(1, Math.floor(Number(patch.maxCapacity) || 0));
    if (cap < 1) return { success: false, message: '최대 수용 인원은 1명 이상이어야 합니다.' };
    sets.push('maxCapacity = ?');
    params.push(cap);
  }
  if (patch.sortOrder !== undefined) {
    sets.push('sortOrder = ?');
    params.push(Math.floor(Number(patch.sortOrder) || 0));
  }
  if (patch.minGroupHeadcount !== undefined) {
    sets.push('minGroupHeadcount = ?');
    params.push(
      patch.minGroupHeadcount == null
        ? null
        : Math.max(1, Math.floor(Number(patch.minGroupHeadcount) || 1)),
    );
  }
  if (patch.slotStartHour !== undefined) {
    sets.push('slotStartHour = ?');
    params.push(
      patch.slotStartHour == null
        ? null
        : Math.min(23, Math.max(0, Math.floor(Number(patch.slotStartHour) || 0))),
    );
  }
  if (patch.slotEndHour !== undefined) {
    sets.push('slotEndHour = ?');
    params.push(
      patch.slotEndHour == null
        ? null
        : Math.min(23, Math.max(0, Math.floor(Number(patch.slotEndHour) || 0))),
    );
  }
  if (patch.weeklyHoursJson !== undefined) {
    sets.push('weeklyHoursJson = ?');
    params.push(patch.weeklyHoursJson ?? null);
  }
  if (patch.closedDatesJson !== undefined) {
    sets.push('closedDatesJson = ?');
    params.push(patch.closedDatesJson ?? null);
  }
  if (patch.ownerClosedSlotsJson !== undefined) {
    sets.push('ownerClosedSlotsJson = ?');
    params.push(patch.ownerClosedSlotsJson ?? null);
  }
  if (!sets.length) {
    return { success: false, message: '수정할 필드가 없습니다.' };
  }
  params.push(sid, zid);

  try {
    const pool = getPool();
    const [h] = await pool.execute<ResultSetHeader>(
      `UPDATE zone SET ${sets.join(', ')} WHERE storeId = ? AND zoneId = ?`,
      params,
    );
    if (!h.affectedRows) {
      return { success: false, message: '동을 찾을 수 없습니다.' };
    }
    return { success: true };
  } catch (e) {
    console.error('[manageUpdateZone]', e);
    return { success: false, message: formatMysqlUserError(e) };
  }
}

export async function manageDeleteZone(
  storeId: string,
  zoneId: string,
): Promise<{ success: true } | { success: false; message: string }> {
  if (!isMysqlConfigured()) {
    return { success: false, message: 'MySQL(MYSQL_*) 설정이 필요합니다.' };
  }
  const sid = storeId.trim();
  const zid = zoneId.trim();
  if (!sid || !zid) return { success: false, message: '가게 ID와 동 ID가 필요합니다.' };
  try {
    const pool = getPool();
    const [h] = await pool.execute<ResultSetHeader>(
      'DELETE FROM zone WHERE storeId = ? AND zoneId = ?',
      [sid, zid],
    );
    if (!h.affectedRows) {
      return { success: false, message: '동을 찾을 수 없습니다.' };
    }
    return { success: true };
  } catch (e) {
    console.error('[manageDeleteZone]', e);
    return { success: false, message: formatMysqlUserError(e) };
  }
}

function newAdminToken(): string {
  return `adm_${randomUUID().replace(/-/g, '')}`;
}

export async function manageIssueAdminToken(
  storeId: string,
): Promise<{ success: true; data: { adminAccessToken: string } } | { success: false; message: string }> {
  if (!isMysqlConfigured()) {
    return { success: false, message: 'MySQL(MYSQL_*) 설정이 필요합니다.' };
  }
  const sid = storeId.trim();
  if (!sid) return { success: false, message: '가게 ID가 필요합니다.' };

  try {
    const pool = getPool();
    const [existingRows] = await pool.query<RowDataPacket[]>(
      'SELECT adminAccessToken FROM store WHERE storeId = ? LIMIT 1',
      [sid],
    );
    const existing = existingRows[0]?.adminAccessToken;
    if (existing != null && String(existing).trim()) {
      return { success: true, data: { adminAccessToken: String(existing).trim() } };
    }

    for (let i = 0; i < 12; i++) {
      const token = newAdminToken();
      if (token.length > 64) continue;
      try {
        const [h] = await pool.execute<ResultSetHeader>(
          'UPDATE store SET adminAccessToken = ? WHERE storeId = ?',
          [token, sid],
        );
        if (h.affectedRows) {
          return { success: true, data: { adminAccessToken: token } };
        }
        return { success: false, message: '가게를 찾을 수 없습니다.' };
      } catch (e) {
        const err = e as { code?: string };
        if (err.code === 'ER_DUP_ENTRY') continue;
        console.error('[manageIssueAdminToken]', e);
        return { success: false, message: formatMysqlUserError(e) };
      }
    }
    return { success: false, message: '고유 토큰 발급에 실패했습니다. 잠시 후 다시 시도하세요.' };
  } catch (e) {
    console.error('[manageIssueAdminToken]', e);
    return { success: false, message: formatMysqlUserError(e) };
  }
}

export interface ManageReservationListRow {
  reservationId: string;
  storeId: string;
  storeName: string;
  userName: string;
  groupName: string;
  userPhone: string;
  date: string;
  startTime: string;
  endTime: string;
  headcount: number;
  totalAmount: number;
  status: string;
  depositAmount: number;
  createdAt: string;
}

export async function manageListReservations(options: {
  storeId?: string | null;
  status?: string | null;
  limit: number;
  offset: number;
}): Promise<
  | {
      success: true;
      data: ManageReservationListRow[];
      total: number;
      depositSum: number;
    }
  | { success: false; message: string }
> {
  if (!isMysqlConfigured()) {
    return { success: false, message: 'MySQL(MYSQL_*) 설정이 필요합니다.' };
  }
  const limit = Math.min(500, Math.max(1, options.limit));
  const offset = Math.max(0, options.offset);
  const filterStore = options.storeId?.trim();
  const filterStatus = options.status?.trim().toUpperCase();

  try {
    const pool = getPool();
    const clauses: string[] = [];
    const params: (string | number)[] = [];
    if (filterStore) {
      clauses.push('r.storeId = ?');
      params.push(filterStore);
    }
    if (filterStatus) {
      clauses.push('r.status = ?');
      params.push(filterStatus);
    }
    const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
    const countParams = [...params];

    const [countRows] = await pool.query<RowDataPacket[]>(
      `SELECT COUNT(*) AS c, COALESCE(SUM(r.depositAmount), 0) AS depositSum FROM reservation r ${where}`,
      countParams,
    );
    const total = parseInt(String(countRows[0]?.c ?? '0'), 10) || 0;
    const depositSum = parseInt(String(countRows[0]?.depositSum ?? '0'), 10) || 0;

    const listParams: (string | number)[] = [...params, limit, offset];
    const [rows] = await pool.query<ReservationRow[]>(
      `SELECT r.*, IFNULL(s.name, r.storeId) AS storeName
       FROM reservation r
       LEFT JOIN store s ON s.storeId = r.storeId
       ${where}
       ORDER BY r.createdAt DESC, r.reservationId DESC
       LIMIT ? OFFSET ?`,
      listParams,
    );

    const data: ManageReservationListRow[] = rows.map((r) => ({
      reservationId: String(r.reservationId ?? '').trim(),
      storeId: String(r.storeId ?? '').trim(),
      storeName: String((r as Record<string, unknown>).storeName ?? r.storeId ?? '').trim(),
      userName: String(r.userName ?? '').trim(),
      groupName: String(r.groupName ?? '').trim(),
      userPhone: String(r.userPhone ?? '').trim(),
      date: rowDateToYmd(r.date),
      startTime: String(r.startTime ?? '').trim(),
      endTime: String(r.endTime ?? '').trim(),
      headcount: parseInt(String(r.headcount ?? '0'), 10) || 0,
      totalAmount: parseInt(String(r.totalAmount ?? '0'), 10) || 0,
      status: String(r.status ?? 'PENDING').trim(),
      depositAmount: parseInt(String(r.depositAmount ?? '0'), 10) || 0,
      createdAt:
        r.createdAt instanceof Date
          ? r.createdAt.toISOString().slice(0, 19).replace('T', ' ')
          : String(r.createdAt ?? '').trim(),
    }));

    return { success: true, data, total, depositSum };
  } catch (e) {
    console.error('[manageListReservations]', e);
    return { success: false, message: formatMysqlUserError(e) };
  }
}


/** 오늘 타임슬롯 (검색 카드와 동일 계산 + 사장님 마감 반영) */
export async function manageGetOwnerTodayTimeline(
  storeId: string,
  dateYmd?: string,
): Promise<
  | {
      success: true;
      date: string;
      closedOnDate: boolean;
      slotStartHour: number;
      slotEndHour: number;
      crossesMidnight: boolean;
      slots: TimeSlot[];
      ownerClosedBlocks: string[];
    }
  | { success: false; message: string }
> {
  if (!isMysqlConfigured()) {
    return { success: false, message: 'MySQL(MYSQL_*) 설정이 필요합니다.' };
  }
  const sid = storeId.trim();
  const date = (dateYmd ?? koreaTodayYmd()).trim().slice(0, 10);
  if (!sid) return { success: false, message: '가게 ID가 필요합니다.' };

  try {
    const pool = getPool();
    const [storeRows] = await pool.query<StoreRow[]>('SELECT * FROM store WHERE storeId = ? LIMIT 1', [
      sid,
    ]);
    const store = storeRows[0];
    if (!store) return { success: false, message: '가게를 찾을 수 없습니다.' };

    const rec = store as Record<string, unknown>;
    const range = getSlotHourRangeForStoreOnDate(rec, date);
    if (range.closed) {
      return {
        success: true,
        date,
        closedOnDate: true,
        slotStartHour: range.slotStartHour,
        slotEndHour: range.slotEndHour,
        crossesMidnight: range.crossesMidnight,
        slots: [],
        ownerClosedBlocks: [],
      };
    }

    const cap = parseInt(String(store.maxCapacity ?? '0'), 10) || 0;
    const [resRows] = await pool.query<ReservationRow[]>(
      `SELECT headcount, startTime, endTime FROM reservation
       WHERE storeId = ? AND date = ? AND status IN ('CONFIRMED','DEPOSIT_CONFIRMED')`,
      [sid, date],
    );

    const base = buildSlots(
      cap,
      resRows.map((r) => ({
        headcount: parseInt(String(r.headcount ?? '0'), 10) || 0,
        startTime: String(r.startTime ?? '').trim(),
        endTime: String(r.endTime ?? '').trim(),
      })),
      range.slotStartHour,
      range.slotEndHour,
      range.crossesMidnight,
    );

    const ownerJson = rec.ownerClosedSlotsJson;
    const slots = applyOwnerClosedBlocksToSlots(base, date, ownerJson, undefined, {
      slotStartHour: range.slotStartHour,
      slotEndHour: range.slotEndHour,
      crossesMidnight: range.crossesMidnight,
    });
    const ownerClosedBlocks = [...ownerClosedBlockSet(ownerJson, date)];

    return {
      success: true,
      date,
      closedOnDate: false,
      slotStartHour: range.slotStartHour,
      slotEndHour: range.slotEndHour,
      crossesMidnight: range.crossesMidnight,
      slots,
      ownerClosedBlocks,
    };
  } catch (e) {
    const err = e as { errno?: number; message?: string };
    if (
      err.errno === 1054 &&
      typeof err.message === 'string' &&
      err.message.includes('ownerClosedSlotsJson')
    ) {
      return {
        success: false,
        message:
          'DB에 ownerClosedSlotsJson 컬럼이 없습니다. docs/store-owner-closed-slots.sql 을 실행하세요.',
      };
    }
    console.error('[manageGetOwnerTodayTimeline]', e);
    return { success: false, message: formatMysqlUserError(e) };
  }
}

export async function manageSetOwnerClosedSlots(
  storeId: string,
  dateYmd: string,
  blocks: string[],
): Promise<{ success: true; ownerClosedSlotsJson: string } | { success: false; message: string }> {
  if (!isMysqlConfigured()) {
    return { success: false, message: 'MySQL(MYSQL_*) 설정이 필요합니다.' };
  }
  const sid = storeId.trim();
  const date = dateYmd.trim().slice(0, 10);
  if (!sid) return { success: false, message: '가게 ID가 필요합니다.' };

  const json = serializeOwnerClosedSlotsForDb(date, blocks);
  try {
    const pool = getPool();
    const [h] = await pool.execute<ResultSetHeader>(
      'UPDATE store SET ownerClosedSlotsJson = ? WHERE storeId = ?',
      [json, sid],
    );
    if (!h.affectedRows) {
      return { success: false, message: '가게를 찾을 수 없습니다.' };
    }
    return { success: true, ownerClosedSlotsJson: json };
  } catch (e) {
    const err = e as { errno?: number; message?: string };
    if (
      err.errno === 1054 &&
      typeof err.message === 'string' &&
      err.message.includes('ownerClosedSlotsJson')
    ) {
      return {
        success: false,
        message:
          'DB에 ownerClosedSlotsJson 컬럼이 없습니다. docs/store-owner-closed-slots.sql 을 실행하세요.',
      };
    }
    console.error('[manageSetOwnerClosedSlots]', e);
    return { success: false, message: formatMysqlUserError(e) };
  }
}

/** 단일 가게 정보 (사장님 설정 페이지용) */
export async function manageGetStoreById(
  storeId: string,
): Promise<
  | { success: true; data: ManageStoreRow }
  | { success: false; message: string }
> {
  if (!isMysqlConfigured()) {
    return { success: false, message: 'MySQL(MYSQL_*) 설정이 필요합니다.' };
  }
  const sid = storeId.trim();
  if (!sid) return { success: false, message: '가게 ID가 필요합니다.' };
  try {
    const pool = getPool();
    const [rows] = await pool.query<StoreRow[]>('SELECT * FROM store WHERE storeId = ? LIMIT 1', [sid]);
    if (!rows.length) return { success: false, message: '가게를 찾을 수 없습니다.' };
    return { success: true, data: mapStoreRow(rows[0]) };
  } catch (e) {
    console.error('[manageGetStoreById]', e);
    return { success: false, message: formatMysqlUserError(e) };
  }
}


const VALID_RESERVATION_STATUSES = [
  'PENDING',
  'CONFIRMED',
  'DEPOSIT_PENDING',
  'DEPOSIT_CONFIRMED',
  'CHECKED_IN',
  'NO_SHOW',
  'CANCELED',
] as const;

/** 운영자: 예약 상태 변경 */
export async function manageUpdateReservationStatus(
  reservationId: string,
  status: string,
): Promise<
  | { success: true; data: { reservationId: string; status: string } }
  | { success: false; message: string }
> {
  if (!isMysqlConfigured()) {
    return { success: false, message: 'MySQL(MYSQL_*) 설정이 필요합니다.' };
  }
  const id = reservationId.trim();
  const st = status.trim().toUpperCase();
  if (!id) return { success: false, message: '예약 ID가 필요합니다.' };
  if (!(VALID_RESERVATION_STATUSES as readonly string[]).includes(st)) {
    return {
      success: false,
      message: `유효하지 않은 상태입니다. 허용: ${VALID_RESERVATION_STATUSES.join(', ')}`,
    };
  }
  try {
    const pool = getPool();
    const [header] = await pool.execute<ResultSetHeader>(
      'UPDATE reservation SET status = ? WHERE reservationId = ?',
      [st, id],
    );
    if (!header.affectedRows) {
      return { success: false, message: '예약을 찾을 수 없습니다.' };
    }
    return { success: true, data: { reservationId: id, status: st } };
  } catch (e) {
    console.error('[manageUpdateReservationStatus]', e);
    return { success: false, message: formatMysqlUserError(e) };
  }
}

/** 운영자: 예약 영구 삭제 */
export async function manageDeleteReservation(
  reservationId: string,
): Promise<{ success: true } | { success: false; message: string }> {
  if (!isMysqlConfigured()) {
    return { success: false, message: 'MySQL(MYSQL_*) 설정이 필요합니다.' };
  }
  const id = reservationId.trim();
  if (!id) return { success: false, message: '예약 ID가 필요합니다.' };
  try {
    const pool = getPool();
    const [header] = await pool.execute<ResultSetHeader>(
      'DELETE FROM reservation WHERE reservationId = ?',
      [id],
    );
    if (!header.affectedRows) {
      return { success: false, message: '예약을 찾을 수 없습니다.' };
    }
    return { success: true };
  } catch (e) {
    console.error('[manageDeleteReservation]', e);
    return { success: false, message: formatMysqlUserError(e) };
  }
}
