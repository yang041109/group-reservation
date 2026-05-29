import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import { getSlotHourRangeForStoreOnDate } from '@/lib/store-weekly-hours';
import { normalizeReservationDateTimes, normalizeTimeHHmm } from '@/lib/reservation-calendar-date';
import { formatMysqlUserError, getPool, isMysqlConfigured } from '@/lib/db';
import { ensureReservationOwnerColumns } from '@/lib/reservation-schema-migrate';
import { fetchZonesByStoreId, findZoneInStore } from '@/lib/zone-resolve';

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
  zoneNameById?: Map<string, string>,
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

  const zid = String(r.zoneId ?? '').trim();
  const zoneName = zid ? zoneNameById?.get(zid) ?? '' : '';

  return {
    reservationId: r.reservationId,
    storeId,
    storeName,
    zoneId: zid || undefined,
    zoneName: zoneName || undefined,
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
    ownerRejectReason: r.ownerRejectReason != null && String(r.ownerRejectReason).trim()
      ? String(r.ownerRejectReason).trim()
      : undefined,
    ownerEditNotice: r.ownerEditNotice != null && String(r.ownerEditNotice).trim()
      ? String(r.ownerEditNotice).trim()
      : undefined,
    createdAt: r.createdAt,
    menus: menuDetails,
  };
}

/** 슬롯·용량에 반영되는 상태(현재 진행 중인 확정 예약) */
const CALENDAR_CONFIRMED_STATUSES_SQL = "status IN ('CONFIRMED','DEPOSIT_CONFIRMED')";

/** 캘린더 표시용(과거 방문 완료/노쇼 포함) */
const CALENDAR_VISIBLE_STATUSES_SQL =
  "status IN ('CONFIRMED','DEPOSIT_CONFIRMED','CHECKED_IN','NO_SHOW')";

/** 가게별 예약 목록 (status·단일 date 또는 from~to 기간) */
export async function adminListReservationsByStore(
  storeId: string,
  statusFilter: string | null,
  dateFilter: string | null,
  rangeFrom: string | null = null,
  rangeTo: string | null = null,
  opts?: { calendarConfirmed?: boolean; calendarVisible?: boolean; zoneId?: string | null },
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

    const zones = await fetchZonesByStoreId(pool, sid);
    const zoneNameById = new Map<string, string>();
    for (const z of zones) {
      zoneNameById.set(String(z.zoneId ?? '').trim(), String(z.name ?? '').trim());
    }

    let sql = 'SELECT * FROM reservation WHERE storeId = ?';
    const params: unknown[] = [sid];
    const zoneFilter = opts?.zoneId?.trim();
    if (zoneFilter) {
      sql += ' AND zoneId = ?';
      params.push(zoneFilter);
    }
    if (statusFilter?.trim()) {
      sql += ' AND status = ?';
      params.push(statusFilter.trim());
    } else if (opts?.calendarVisible) {
      sql += ` AND ${CALENDAR_VISIBLE_STATUSES_SQL}`;
    } else if (opts?.calendarConfirmed) {
      sql += ` AND ${CALENDAR_CONFIRMED_STATUSES_SQL}`;
    }
    const rf = rangeFrom?.trim().slice(0, 10);
    const rt = rangeTo?.trim().slice(0, 10);
    if (rf && rt) {
      sql += ' AND DATE(`date`) >= ? AND DATE(`date`) <= ?';
      params.push(rf, rt);
    } else if (dateFilter?.trim()) {
      sql += ' AND DATE(`date`) = ?';
      params.push(dateFilter.trim().slice(0, 10));
    }
    sql += ' ORDER BY `date`, startTime';

    const [resRows] = await pool.query<ReservationRow[]>(sql, params);
    const data = resRows.map((r) => mapReservationRow(r, sid, storeName, menuById, zoneNameById));
    return { success: true, data };
  } catch (e) {
    console.error('[adminListReservationsByStore]', e);
    return { success: false, message: formatMysqlUserError(e) };
  }
}

/** 수락: 예약 행의 depositAmount 기준으로 입금 대기 vs 즉시 확정 (클라이언트 store.depositAmount 불필요) */
export async function adminAcceptReservation(
  reservationId: string,
): Promise<
  | { success: true; data: { reservationId: string; status: string } }
  | { success: false; message: string }
> {
  if (!isMysqlConfigured()) {
    return { success: false, message: 'MySQL(MYSQL_*) 설정이 필요합니다.' };
  }
  const id = reservationId.trim();
  if (!id) {
    return { success: false, message: '예약 ID가 필요합니다.' };
  }
  try {
    const pool = getPool();
    const [rows] = await pool.query<ReservationRow[]>(
      'SELECT status, depositAmount FROM reservation WHERE reservationId = ? LIMIT 1',
      [id],
    );
    const r = rows[0];
    if (!r) {
      return { success: false, message: '예약을 찾을 수 없습니다.' };
    }
    const st = String(r.status ?? '').trim();
    if (st !== 'PENDING') {
      return { success: false, message: '대기 중인 예약만 수락할 수 있습니다.' };
    }
    const dep = parseInt(String(r.depositAmount ?? '0'), 10) || 0;
    const newStatus = dep > 0 ? 'DEPOSIT_PENDING' : 'CONFIRMED';
    return adminSetReservationStatus(id, newStatus);
  } catch (e) {
    console.error('[adminAcceptReservation]', e);
    return { success: false, message: formatMysqlUserError(e) };
  }
}

const OWNER_REJECT_REASON_MAX = 500;

/** 대기(PENDING) 예약만 거절 가능. 사유는 예약 조회 화면에 노출됩니다. */
export async function adminRejectReservation(
  reservationId: string,
  reason: string,
): Promise<
  | { success: true; data: { reservationId: string; status: string } }
  | { success: false; message: string }
> {
  if (!isMysqlConfigured()) {
    return { success: false, message: 'MySQL(MYSQL_*) 설정이 필요합니다.' };
  }
  const id = reservationId.trim();
  const msg = reason.trim();
  if (!id) {
    return { success: false, message: '예약 ID가 필요합니다.' };
  }
  if (!msg) {
    return { success: false, message: '거절 사유를 입력해 주세요.' };
  }
  if (msg.length > OWNER_REJECT_REASON_MAX) {
    return { success: false, message: `거절 사유는 ${OWNER_REJECT_REASON_MAX}자 이내로 입력해 주세요.` };
  }
  try {
    const pool = getPool();
    await ensureReservationOwnerColumns(pool);
    const [header] = await pool.execute<ResultSetHeader>(
      `UPDATE reservation SET status = 'CANCELED', ownerRejectReason = ? WHERE reservationId = ? AND status = 'PENDING'`,
      [msg, id],
    );
    if (!header.affectedRows) {
      const [rows] = await pool.query<ReservationRow[]>(
        'SELECT status FROM reservation WHERE reservationId = ? LIMIT 1',
        [id],
      );
      if (!rows.length) {
        return { success: false, message: '예약을 찾을 수 없습니다.' };
      }
      return { success: false, message: '대기 중인 예약만 거절할 수 있습니다.' };
    }
    return { success: true, data: { reservationId: id, status: 'CANCELED' } };
  } catch (e) {
    console.error('[adminRejectReservation]', e);
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

/** 예약금 입금 확인 → 캘린더·슬롯에 반영되는 DEPOSIT_CONFIRMED 로만 전환 */
export async function adminConfirmDeposit(
  reservationId: string,
): Promise<
  | { success: true; data: { reservationId: string; status: string } }
  | { success: false; message: string }
> {
  if (!isMysqlConfigured()) {
    return { success: false, message: 'MySQL(MYSQL_*) 설정이 필요합니다.' };
  }
  const id = reservationId.trim();
  if (!id) {
    return { success: false, message: '예약 ID가 필요합니다.' };
  }
  try {
    const pool = getPool();
    const [header] = await pool.execute<ResultSetHeader>(
      `UPDATE reservation SET status = 'DEPOSIT_CONFIRMED' WHERE reservationId = ? AND status = 'DEPOSIT_PENDING'`,
      [id],
    );
    if (!header.affectedRows) {
      return {
        success: false,
        message: '입금 대기 상태가 아니거나 이미 처리된 예약입니다.',
      };
    }
    return { success: true, data: { reservationId: id, status: 'DEPOSIT_CONFIRMED' } };
  } catch (e) {
    console.error('[adminConfirmDeposit]', e);
    return { success: false, message: formatMysqlUserError(e) };
  }
}

/** 방문 완료 체크인: CONFIRMED 또는 DEPOSIT_CONFIRMED 만 → CHECKED_IN */
export async function adminCheckInReservation(
  reservationId: string,
): Promise<
  | { success: true; data: { reservationId: string; status: string } }
  | { success: false; message: string }
> {
  if (!isMysqlConfigured()) {
    return { success: false, message: 'MySQL(MYSQL_*) 설정이 필요합니다.' };
  }
  const id = reservationId.trim();
  if (!id) {
    return { success: false, message: '예약 ID가 필요합니다.' };
  }
  try {
    const pool = getPool();
    const [header] = await pool.execute<ResultSetHeader>(
      `UPDATE reservation SET status = 'CHECKED_IN' WHERE reservationId = ? AND status IN ('CONFIRMED','DEPOSIT_CONFIRMED')`,
      [id],
    );
    if (!header.affectedRows) {
      return { success: false, message: '확정된 예약만 방문 완료 처리할 수 있습니다.' };
    }
    return { success: true, data: { reservationId: id, status: 'CHECKED_IN' } };
  } catch (e) {
    console.error('[adminCheckInReservation]', e);
    return { success: false, message: formatMysqlUserError(e) };
  }
}

/** 노쇼 처리: CONFIRMED 또는 DEPOSIT_CONFIRMED 만 → NO_SHOW */
export async function adminMarkNoShow(
  reservationId: string,
): Promise<
  | { success: true; data: { reservationId: string; status: string } }
  | { success: false; message: string }
> {
  if (!isMysqlConfigured()) {
    return { success: false, message: 'MySQL(MYSQL_*) 설정이 필요합니다.' };
  }
  const id = reservationId.trim();
  if (!id) {
    return { success: false, message: '예약 ID가 필요합니다.' };
  }
  try {
    const pool = getPool();
    const [header] = await pool.execute<ResultSetHeader>(
      `UPDATE reservation SET status = 'NO_SHOW' WHERE reservationId = ? AND status IN ('CONFIRMED','DEPOSIT_CONFIRMED')`,
      [id],
    );
    if (!header.affectedRows) {
      return { success: false, message: '확정된 예약만 노쇼 처리할 수 있습니다.' };
    }
    return { success: true, data: { reservationId: id, status: 'NO_SHOW' } };
  } catch (e) {
    console.error('[adminMarkNoShow]', e);
    return { success: false, message: formatMysqlUserError(e) };
  }
}

/** 예약 시간 / 인원 수정 (확정 상태만 가능) */
export async function adminUpdateReservation(
  reservationId: string,
  patch: { startTime?: string; endTime?: string; headcount?: number; notice?: string },
): Promise<
  | { success: true; data: { reservationId: string } }
  | { success: false; message: string }
> {
  if (!isMysqlConfigured()) {
    return { success: false, message: 'MySQL(MYSQL_*) 설정이 필요합니다.' };
  }
  const id = reservationId.trim();
  if (!id) {
    return { success: false, message: '예약 ID가 필요합니다.' };
  }

  const sets: string[] = [];
  const values: (string | number | null)[] = [];

  if (patch.startTime !== undefined) {
    const t = patch.startTime.trim();
    if (!/^\d{2}:\d{2}(:\d{2})?$/.test(t)) {
      return { success: false, message: '시작 시간 형식이 올바르지 않습니다. (HH:MM)' };
    }
    sets.push('startTime = ?');
    values.push(t.length === 5 ? `${t}:00` : t);
  }

  if (patch.endTime !== undefined) {
    const t = patch.endTime.trim();
    if (!/^\d{2}:\d{2}(:\d{2})?$/.test(t)) {
      return { success: false, message: '종료 시간 형식이 올바르지 않습니다. (HH:MM)' };
    }
    sets.push('endTime = ?');
    values.push(t.length === 5 ? `${t}:00` : t);
  }

  if (patch.headcount !== undefined) {
    const n = Number(patch.headcount);
    if (!Number.isFinite(n) || n < 1 || n > 999) {
      return { success: false, message: '인원수는 1 이상 999 이하의 숫자여야 합니다.' };
    }
    sets.push('headcount = ?');
    values.push(Math.floor(n));
  }

  // 항상 안내 메시지 갱신 (제공되지 않으면 기본 문구 사용)
  if (sets.length > 0) {
    const notice = (patch.notice ?? '').trim();
    const finalNotice = notice || '사장님이 예약 정보를 수정했어요. 변경된 내용을 확인해 주세요.';
    if (finalNotice.length > 500) {
      return { success: false, message: '안내 메시지는 500자 이내로 입력해 주세요.' };
    }
    sets.push('ownerEditNotice = ?');
    values.push(finalNotice);
  }

  if (sets.length === 0) {
    return { success: false, message: '수정할 항목이 없습니다.' };
  }

  try {
    const pool = getPool();
    await ensureReservationOwnerColumns(pool);
    values.push(id);
    const [header] = await pool.execute<ResultSetHeader>(
      `UPDATE reservation SET ${sets.join(', ')} WHERE reservationId = ? AND status IN ('CONFIRMED','DEPOSIT_CONFIRMED','DEPOSIT_PENDING','PENDING')`,
      values,
    );
    if (!header.affectedRows) {
      return { success: false, message: '수정 가능한 예약을 찾을 수 없습니다.' };
    }
    return { success: true, data: { reservationId: id } };
  } catch (e) {
    console.error('[adminUpdateReservation]', e);
    return { success: false, message: formatMysqlUserError(e) };
  }
}

/**
 * 2일 이상 지난 CONFIRMED/DEPOSIT_CONFIRMED 예약을 자동으로 CHECKED_IN 처리.
 * - 예약 날짜 기준 (date 컬럼)
 * - 누구든 자유롭게 호출 가능 (idempotent). 사용자 조회·사장님 페이지 진입 시 가볍게 호출.
 * - 실패해도 호출자에 영향 없도록 조용히 무시.
 */
export async function autoCheckInPastReservations(): Promise<{
  ok: boolean;
  affected?: number;
  message?: string;
}> {
  if (!isMysqlConfigured()) {
    return { ok: false, message: 'MySQL not configured' };
  }
  try {
    const pool = getPool();
    const [header] = await pool.execute<ResultSetHeader>(
      `UPDATE reservation
        SET status = 'CHECKED_IN'
        WHERE status IN ('CONFIRMED','DEPOSIT_CONFIRMED')
          AND date < (CURRENT_DATE - INTERVAL 2 DAY)`,
    );
    return { ok: true, affected: header.affectedRows };
  } catch (e) {
    console.warn('[autoCheckInPastReservations]', e);
    return { ok: false, message: 'auto check-in failed' };
  }
}

/**
 * 확정 예약 직권 취소 (사유 필수)
 * - 사장님이 매장 사정으로 확정된 예약을 취소할 때 사용
 * - 거절과 동일하게 ownerRejectReason 컬럼에 사유 저장
 * - CONFIRMED, DEPOSIT_PENDING, DEPOSIT_CONFIRMED 만 직권 취소 가능
 */
export async function adminCancelConfirmedReservation(
  reservationId: string,
  reason: string,
): Promise<
  | { success: true; data: { reservationId: string; status: string } }
  | { success: false; message: string }
> {
  if (!isMysqlConfigured()) {
    return { success: false, message: 'MySQL(MYSQL_*) 설정이 필요합니다.' };
  }
  const id = reservationId.trim();
  const msg = reason.trim();
  if (!id) {
    return { success: false, message: '예약 ID가 필요합니다.' };
  }
  if (!msg) {
    return { success: false, message: '취소 사유를 입력해 주세요.' };
  }
  if (msg.length > OWNER_REJECT_REASON_MAX) {
    return { success: false, message: `취소 사유는 ${OWNER_REJECT_REASON_MAX}자 이내로 입력해 주세요.` };
  }
  try {
    const pool = getPool();
    await ensureReservationOwnerColumns(pool);
    const [header] = await pool.execute<ResultSetHeader>(
      `UPDATE reservation
        SET status = 'CANCELED', ownerRejectReason = ?
        WHERE reservationId = ?
          AND status IN ('CONFIRMED','DEPOSIT_PENDING','DEPOSIT_CONFIRMED')`,
      [msg, id],
    );
    if (!header.affectedRows) {
      const [rows] = await pool.query<ReservationRow[]>(
        'SELECT status FROM reservation WHERE reservationId = ? LIMIT 1',
        [id],
      );
      if (!rows.length) {
        return { success: false, message: '예약을 찾을 수 없습니다.' };
      }
      return { success: false, message: '확정된 예약만 직권 취소할 수 있습니다.' };
    }
    return { success: true, data: { reservationId: id, status: 'CANCELED' } };
  } catch (e) {
    console.error('[adminCancelConfirmedReservation]', e);
    return { success: false, message: formatMysqlUserError(e) };
  }
}


// ── 사장님이 직접 입력하는 예약 ────────────────────────────

/**
 * 사장님이 직접 입력하는 수동 예약/예약 차단
 * - mode 'phone'  : 전화로 받은 외부 예약 (CONFIRMED 로 바로 저장)
 * - mode 'block'  : 예약 차단 (CONFIRMED 로 저장 → 슬롯 잔여 인원에 반영)
 *
 * 두 경우 모두 reservation 테이블 한 곳에 저장돼서 일반 우르르 타임라인에 그대로 반영됨.
 * payload.userName 만 필수 (block 일 때는 자동 채움).
 */
export async function adminCreateManualReservation(
  storeId: string,
  mode: 'phone' | 'block',
  payload: {
    zoneId?: string;
    userName?: string;
    groupName?: string;
    userPhone?: string;
    userNote?: string;
    headcount?: number;
    date?: string;
    startTime?: string;
    endTime?: string;
  },
): Promise<
  | {
      success: true;
      data: { reservationId: string; status: string };
    }
  | { success: false; message: string }
> {
  if (!isMysqlConfigured()) {
    return { success: false, message: 'MySQL(MYSQL_*) 설정이 필요합니다.' };
  }
  const sid = storeId.trim();
  if (!sid) return { success: false, message: '가게 ID가 필요합니다.' };

  const date = (payload.date ?? '').trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return { success: false, message: '날짜 형식이 올바르지 않습니다. (YYYY-MM-DD)' };
  }

  const stRaw = (payload.startTime ?? '').trim();
  const etRaw = (payload.endTime ?? '').trim();
  if (!/^\d{2}:\d{2}(:\d{2})?$/.test(stRaw) || !/^\d{2}:\d{2}(:\d{2})?$/.test(etRaw)) {
    return { success: false, message: '시간 형식이 올바르지 않습니다. (HH:MM)' };
  }
  const normStart = normalizeTimeHHmm(stRaw);
  const normEnd = normalizeTimeHHmm(etRaw);

  let userName = (payload.userName ?? '').trim();
  if (mode === 'phone') {
    if (!userName) {
      return { success: false, message: '예약자명을 입력해 주세요.' };
    }
  } else {
    // block 모드: 예약자명 자동 (사장님 직접 처리한 시간이라는 것을 기록)
    userName = userName || '예약 차단';
  }

  if (userName.length > 80) {
    return { success: false, message: '예약자명은 80자 이내로 입력해 주세요.' };
  }

  const groupName = (payload.groupName ?? '').trim();
  const userPhone = (payload.userPhone ?? '').trim();
  const userNote = (payload.userNote ?? '').trim();
  const headcount = Math.max(1, Math.floor(Number(payload.headcount) || 1));

  const reservationId = `RSVM${Date.now()}${Math.floor(Math.random() * 1000)}`;
  const createdAt = new Date().toISOString().slice(0, 19).replace('T', ' ');

  try {
    const pool = getPool();

    const [storeRows] = await pool.query<StoreRow[]>('SELECT * FROM store WHERE storeId = ? LIMIT 1', [
      sid,
    ]);
    const storeRow = storeRows[0];
    if (!storeRow) {
      return { success: false, message: '가게를 찾을 수 없습니다.' };
    }
    const range = getSlotHourRangeForStoreOnDate(storeRow as Record<string, unknown>, date);
    const {
      date: calendarDate,
      startTime,
      endTime,
    } = normalizeReservationDateTimes(date, normStart, normEnd, range);
    const dbStart = startTime.length === 5 ? `${startTime}:00` : startTime;
    const dbEnd = endTime.length === 5 ? `${endTime}:00` : endTime;

    // 동 운영 가게면 zoneId 필수·유효성 확인
    const storeZones = await fetchZonesByStoreId(pool, sid);
    let zoneIdToSave: string | null = null;
    if (storeZones.length > 0) {
      const zid = (payload.zoneId ?? '').trim();
      if (!zid) {
        return { success: false, message: '예약할 동(zone)을 선택해 주세요.' };
      }
      const zoneRow = await findZoneInStore(pool, sid, zid);
      if (!zoneRow) {
        return { success: false, message: '선택한 동을 찾을 수 없습니다.' };
      }
      zoneIdToSave = String(zoneRow.zoneId);
    }

    await pool.execute<ResultSetHeader>(
      `INSERT INTO reservation (
        reservationId, storeId, zoneId, userName, groupName, userPhone, userNote,
        headcount, date, startTime, endTime, menuItems, totalAmount, status, depositAmount, createdAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'CONFIRMED', ?, ?)`,
      [
        reservationId,
        sid,
        zoneIdToSave,
        userName,
        groupName,
        userPhone,
        userNote,
        headcount,
        calendarDate,
        dbStart,
        dbEnd,
        '[]', // menuItems 빈 배열
        0,    // totalAmount
        0,    // depositAmount (사장님이 직접 처리하므로 우리가 받지 않음)
        createdAt,
      ],
    );
    return { success: true, data: { reservationId, status: 'CONFIRMED' } };
  } catch (e) {
    console.error('[adminCreateManualReservation]', e);
    return { success: false, message: formatMysqlUserError(e) };
  }
}


// ── 가게 지정 휴무일 (closedDatesJson) ──────────────────────

const YMD_RE = /^\d{4}-\d{2}-\d{2}$/;

function parseClosedDatesFromRow(raw: unknown): string[] {
  if (raw == null) return [];
  if (Array.isArray(raw)) {
    return raw
      .map((v) => String(v ?? '').trim())
      .filter((v) => YMD_RE.test(v));
  }
  if (typeof raw === 'string') {
    const t = raw.trim();
    if (!t) return [];
    try {
      const parsed = JSON.parse(t);
      if (Array.isArray(parsed)) {
        return parsed
          .map((v) => String(v ?? '').trim())
          .filter((v) => YMD_RE.test(v));
      }
    } catch {
      return [];
    }
  }
  return [];
}

/** 사장님 가게의 지정 휴무일 목록 조회 */
export async function adminGetClosedDates(storeId: string): Promise<
  | { success: true; data: string[] }
  | { success: false; message: string }
> {
  if (!isMysqlConfigured()) {
    return { success: false, message: 'MySQL(MYSQL_*) 설정이 필요합니다.' };
  }
  const sid = storeId.trim();
  if (!sid) return { success: false, message: '가게 ID가 필요합니다.' };

  try {
    const pool = getPool();
    const [rows] = await pool.query<StoreRow[]>(
      'SELECT closedDatesJson FROM store WHERE storeId = ? LIMIT 1',
      [sid],
    );
    if (!rows.length) {
      return { success: false, message: '가게를 찾을 수 없습니다.' };
    }
    const list = parseClosedDatesFromRow(rows[0].closedDatesJson);
    list.sort();
    return { success: true, data: list };
  } catch (e) {
    console.error('[adminGetClosedDates]', e);
    return { success: false, message: formatMysqlUserError(e) };
  }
}

/** 지정 휴무일 추가 (이미 있으면 그대로 두고 정상 응답) */
export async function adminAddClosedDate(
  storeId: string,
  date: string,
): Promise<
  | { success: true; data: string[] }
  | { success: false; message: string }
> {
  const d = String(date ?? '').trim();
  if (!YMD_RE.test(d)) {
    return { success: false, message: '날짜 형식이 올바르지 않습니다. (YYYY-MM-DD)' };
  }
  const cur = await adminGetClosedDates(storeId);
  if (!cur.success) return cur;
  if (cur.data.includes(d)) {
    return { success: true, data: cur.data };
  }
  const next = [...cur.data, d].sort();
  try {
    const pool = getPool();
    await pool.execute<ResultSetHeader>(
      'UPDATE store SET closedDatesJson = ? WHERE storeId = ?',
      [JSON.stringify(next), storeId.trim()],
    );
    return { success: true, data: next };
  } catch (e) {
    console.error('[adminAddClosedDate]', e);
    return { success: false, message: formatMysqlUserError(e) };
  }
}

/** 지정 휴무일 해제 */
export async function adminRemoveClosedDate(
  storeId: string,
  date: string,
): Promise<
  | { success: true; data: string[] }
  | { success: false; message: string }
> {
  const d = String(date ?? '').trim();
  if (!YMD_RE.test(d)) {
    return { success: false, message: '날짜 형식이 올바르지 않습니다. (YYYY-MM-DD)' };
  }
  const cur = await adminGetClosedDates(storeId);
  if (!cur.success) return cur;
  if (!cur.data.includes(d)) {
    return { success: true, data: cur.data };
  }
  const next = cur.data.filter((x) => x !== d).sort();
  try {
    const pool = getPool();
    await pool.execute<ResultSetHeader>(
      'UPDATE store SET closedDatesJson = ? WHERE storeId = ?',
      [JSON.stringify(next), storeId.trim()],
    );
    return { success: true, data: next };
  } catch (e) {
    console.error('[adminRemoveClosedDate]', e);
    return { success: false, message: formatMysqlUserError(e) };
  }
}
