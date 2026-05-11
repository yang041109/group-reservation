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

export function adminMysqlConfigured(): boolean {
  return isMysqlConfigured();
}

/** 로그인: storeId + 가게 이름 일치 시 depositAmount 반환 */
export async function adminVerifyStore(
  storeId: string,
  storeName: string,
): Promise<{ ok: true; depositAmount: number } | { ok: false; message: string }> {
  if (!isMysqlConfigured()) {
    return { ok: false, message: 'MySQL(MYSQL_*) 설정이 필요합니다.' };
  }
  try {
    const pool = getPool();
    const [rows] = await pool.query<StoreRow[]>(
      'SELECT name, depositAmount FROM store WHERE storeId = ? LIMIT 1',
      [storeId.trim()],
    );
    const row = rows[0];
    if (!row) {
      return { ok: false, message: '가게를 찾을 수 없습니다.' };
    }
    const dbName = String(row.name ?? '').trim();
    if (dbName !== storeName.trim()) {
      return { ok: false, message: '가게 이름이 일치하지 않습니다.' };
    }
    const dep = row.depositAmount;
    const depositAmount =
      typeof dep === 'bigint'
        ? Number(dep)
        : parseInt(String(dep ?? '0'), 10) || 0;

    return {
      ok: true,
      depositAmount,
    };
  } catch (e) {
    console.error('[adminVerifyStore]', e);
    return { ok: false, message: formatMysqlUserError(e) };
  }
}

function mapReservationRow(
  r: ReservationRow,
  storeId: string,
  storeName: string,
  menuById: Map<string, { name: string; price: number }>,
): Record<string, unknown> {
  const parsedMenus = parseMenuItemsJson(r.menuItems);
  const menuDetails = parsedMenus.map((sm) => {
    const mid = String(sm.menuId ?? '').trim();
    const menu = menuById.get(mid);
    return {
      menuId: sm.menuId,
      name: menu ? menu.name : sm.menuId,
      quantity: parseInt(String(sm.quantity ?? '0'), 10) || 0,
      priceAtTime: menu ? menu.price : 0,
    };
  });

  return {
    reservationId: r.reservationId,
    storeId,
    storeName,
    userName: r.userName || '',
    groupName: r.groupName || '',
    userPhone: r.userPhone || '',
    userNote: r.userNote || '',
    date: rowDateToYmd(r.date),
    startTime: String(r.startTime ?? '').trim(),
    endTime: String(r.endTime ?? '').trim(),
    headcount: parseInt(String(r.headcount ?? '0'), 10) || 0,
    totalAmount: parseInt(String(r.totalAmount ?? '0'), 10) || 0,
    depositAmount: parseInt(String(r.depositAmount ?? '0'), 10) || 0,
    status: String(r.status ?? 'PENDING').trim(),
    createdAt: r.createdAt,
    menus: menuDetails,
  };
}

/** 가게별 예약 목록 (status·date 선택 필터) — Apps Script getReservationsByStore 와 동일 envelope */
export async function adminListReservationsByStore(
  storeId: string,
  statusFilter: string | null,
  dateFilter: string | null,
): Promise<{ success: true; data: Record<string, unknown>[] } | { success: false; message: string }> {
  if (!isMysqlConfigured()) {
    return { success: false, message: 'MySQL(MYSQL_*) 설정이 필요합니다.' };
  }
  const sid = storeId.trim();
  if (!sid) {
    return { success: false, message: '가게 ID가 필요합니다.' };
  }

  try {
    const pool = getPool();
    const [stores] = await pool.query<StoreRow[]>('SELECT name FROM store WHERE storeId = ? LIMIT 1', [sid]);
    const storeName = stores[0] ? String(stores[0].name ?? '').trim() : sid;

    const [menus] = await pool.query<MenuRow[]>('SELECT menuId, name, price FROM menu WHERE storeId = ?', [sid]);
    const menuById = new Map<string, { name: string; price: number }>();
    for (const m of menus) {
      menuById.set(String(m.menuId ?? '').trim(), {
        name: String(m.name ?? ''),
        price: parseInt(String(m.price ?? '0'), 10) || 0,
      });
    }

    let sql = 'SELECT * FROM reservation WHERE storeId = ?';
    const params: unknown[] = [sid];
    if (statusFilter?.trim()) {
      sql += ' AND status = ?';
      params.push(statusFilter.trim());
    }
    if (dateFilter?.trim()) {
      sql += ' AND DATE(`date`) = ?';
      params.push(dateFilter.trim().slice(0, 10));
    }
    sql += ' ORDER BY `date`, startTime';

    const [resRows] = await pool.query<ReservationRow[]>(sql, params);
    const data = resRows.map((r) => mapReservationRow(r, sid, storeName, menuById));
    return { success: true, data };
  } catch (e) {
    console.error('[adminListReservationsByStore]', e);
    return { success: false, message: formatMysqlUserError(e) };
  }
}

export async function adminSetReservationStatus(
  reservationId: string,
  newStatus: string,
): Promise<
  | { success: true; data: { reservationId: string; status: string } }
  | { success: false; message: string }
> {
  if (!isMysqlConfigured()) {
    return { success: false, message: 'MySQL(MYSQL_*) 설정이 필요합니다.' };
  }
  const id = reservationId.trim();
  const status = newStatus.trim();
  if (!id || !status) {
    return { success: false, message: '예약 ID와 상태가 필요합니다.' };
  }

  try {
    const pool = getPool();
    const [header] = await pool.execute<ResultSetHeader>(
      'UPDATE reservation SET status = ? WHERE reservationId = ?',
      [status, id],
    );
    if (!header.affectedRows) {
      return { success: false, message: '예약을 찾을 수 없습니다.' };
    }
    return { success: true, data: { reservationId: id, status } };
  } catch (e) {
    console.error('[adminSetReservationStatus]', e);
    return { success: false, message: formatMysqlUserError(e) };
  }
}
