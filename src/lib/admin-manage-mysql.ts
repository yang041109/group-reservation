import { randomUUID } from 'crypto';
import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import { parseDepositTiersJson } from '@/lib/deposit-tiers';
import { readMinGroupHeadcount } from '@/lib/store-weekly-hours';
import { formatMysqlUserError, getPool, isMysqlConfigured } from '@/lib/db';
import type { DepositTier } from '@/types';

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
  /** 인원 구간별 예약금 사용 여부 */
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
}

function mapStoreRow(r: StoreRow): ManageStoreRow {
  const rec = r as Record<string, unknown>;
  const rawUt = rec.depositUseTiers;
  const depositUseTiers =
    rawUt === true ||
    rawUt === 1 ||
    String(rawUt).toLowerCase() === 'true' ||
    Number(rawUt) === 1;
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
    depositUseTiers,
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
  };
}

export async function manageListStores(): Promise<
  { success: true; data: ManageStoreRow[] } | { success: false; message: string }
> {
  if (!isMysqlConfigured()) {
    return { success: false, message: 'MySQL(MYSQL_*) 설정이 필요합니다.' };
  }
  try {
    const pool = getPool();
    /** SELECT * — 예약금 구간 컬럼이 아직 없는 DB에서도 목록 조회가 되도록 명시 컬럼 나열을 쓰지 않음 */
    const [rows] = await pool.query<StoreRow[]>('SELECT * FROM store ORDER BY sortOrder ASC, name ASC');
    return { success: true, data: rows.map(mapStoreRow) };
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
    depositUseTiers?: boolean;
    depositTiersJson?: string | null;
    minGroupHeadcount?: number;
    ownerName?: string | null;
    ownerBankAccount?: string | null;
    weeklyHoursJson?: string | null;
    closedDatesJson?: string | null;
    slotStartHour?: number | null;
    slotEndHour?: number | null;
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
    params.push(patch.depositUseTiers ? 1 : 0);
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
}): Promise<{ success: true } | { success: false; message: string }> {
  if (!isMysqlConfigured()) {
    return { success: false, message: 'MySQL(MYSQL_*) 설정이 필요합니다.' };
  }
  const storeId = String(input.storeId ?? '').trim();
  const name = String(input.name ?? '').trim();
  if (!storeId) return { success: false, message: '가게 ID(storeId)를 입력하세요.' };
  if (!name) return { success: false, message: '가게 이름을 입력하세요.' };
  const category = String(input.category ?? '').trim();
  const rawCap = Math.floor(Number(input.maxCapacity));
  const maxCap = Number.isFinite(rawCap) && rawCap > 0 ? rawCap : 80;

  try {
    const pool = getPool();
    const [dup] = await pool.query<RowDataPacket[]>('SELECT 1 FROM store WHERE storeId = ? LIMIT 1', [storeId]);
    if (dup.length) {
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
    return { success: true };
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
    isRequired: req,
    imageUrl: r.imageUrl != null && String(r.imageUrl).trim() ? String(r.imageUrl) : null,
  };
}

export async function manageListMenus(
  storeId: string,
): Promise<{ success: true; data: ManageMenuRow[] } | { success: false; message: string }> {
  if (!isMysqlConfigured()) {
    return { success: false, message: 'MySQL(MYSQL_*) 설정이 필요합니다.' };
  }
  const sid = storeId.trim();
  if (!sid) return { success: false, message: '가게 ID가 필요합니다.' };
  try {
    const pool = getPool();
    const [rows] = await pool.query<MenuRow[]>(
      'SELECT storeId, menuId, name, price, category, isRequired, imageUrl FROM menu WHERE storeId = ? ORDER BY menuId',
      [sid],
    );
    return { success: true, data: rows.map(mapMenuRow) };
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
  const menuId =
    String(body.menuId ?? '').trim() ||
    `menu-${sid}-${Date.now().toString(36)}-${randomUUID().slice(0, 8)}`;
  const category = String(body.category ?? '').trim();
  const isReq = body.isRequired ? 1 : 0;
  const imageUrl =
    body.imageUrl == null || String(body.imageUrl).trim() === '' ? null : String(body.imageUrl).trim();

  try {
    const pool = getPool();
    await pool.execute(
      `INSERT INTO menu (storeId, menuId, name, price, category, isRequired, imageUrl) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [sid, menuId, name, price, category, isReq, imageUrl],
    );
    return { success: true, data: { menuId } };
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
