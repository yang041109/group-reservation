import { randomUUID } from 'crypto';
import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import { formatMysqlUserError, getPool, isMysqlConfigured } from '@/lib/db';

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
  maxCapacity: number;
  imageUrl: string | null;
  slotStartHour: number | null;
  slotEndHour: number | null;
  depositAmount: number;
  description: string | null;
  adminAccessToken: string | null;
}

function mapStoreRow(r: StoreRow): ManageStoreRow {
  return {
    storeId: String(r.storeId ?? '').trim(),
    name: String(r.name ?? '').trim(),
    category: String(r.category ?? '').trim(),
    maxCapacity: parseInt(String(r.maxCapacity ?? '0'), 10) || 0,
    imageUrl: r.imageUrl != null && String(r.imageUrl).trim() ? String(r.imageUrl) : null,
    slotStartHour: r.slotStartHour != null ? Number(r.slotStartHour) : null,
    slotEndHour: r.slotEndHour != null ? Number(r.slotEndHour) : null,
    depositAmount: parseInt(String(r.depositAmount ?? '0'), 10) || 0,
    description: r.description != null && String(r.description).trim() ? String(r.description) : null,
    adminAccessToken:
      r.adminAccessToken != null && String(r.adminAccessToken).trim()
        ? String(r.adminAccessToken).trim()
        : null,
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
    const [rows] = await pool.query<StoreRow[]>(
      'SELECT storeId, name, category, maxCapacity, imageUrl, slotStartHour, slotEndHour, depositAmount, description, adminAccessToken FROM store ORDER BY storeId',
    );
    return { success: true, data: rows.map(mapStoreRow) };
  } catch (e) {
    console.error('[manageListStores]', e);
    return { success: false, message: formatMysqlUserError(e) };
  }
}

export async function manageUpdateStore(
  storeId: string,
  patch: { name?: string; description?: string | null; imageUrl?: string | null },
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
  if (patch.description !== undefined) {
    sets.push('description = ?');
    params.push(patch.description == null || patch.description === '' ? null : String(patch.description));
  }
  if (patch.imageUrl !== undefined) {
    sets.push('imageUrl = ?');
    params.push(patch.imageUrl == null || String(patch.imageUrl).trim() === '' ? null : String(patch.imageUrl));
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
    console.error('[manageUpdateStore]', e);
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
  limit: number;
  offset: number;
}): Promise<
  { success: true; data: ManageReservationListRow[]; total: number } | { success: false; message: string }
> {
  if (!isMysqlConfigured()) {
    return { success: false, message: 'MySQL(MYSQL_*) 설정이 필요합니다.' };
  }
  const limit = Math.min(500, Math.max(1, options.limit));
  const offset = Math.max(0, options.offset);
  const filterStore = options.storeId?.trim();

  try {
    const pool = getPool();
    const where = filterStore ? 'WHERE r.storeId = ?' : '';
    const params: (string | number)[] = filterStore ? [filterStore] : [];
    const countParams = [...params];

    const [countRows] = await pool.query<RowDataPacket[]>(
      `SELECT COUNT(*) AS c FROM reservation r ${where}`,
      countParams,
    );
    const total = parseInt(String(countRows[0]?.c ?? '0'), 10) || 0;

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

    return { success: true, data, total };
  } catch (e) {
    console.error('[manageListReservations]', e);
    return { success: false, message: formatMysqlUserError(e) };
  }
}
