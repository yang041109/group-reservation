// ============================================================
// Google Sheets 백엔드 클라이언트
// Apps Script 웹앱을 통해 시트 데이터를 CRUD
// ============================================================

const SHEETS_URL = process.env.NEXT_PUBLIC_SHEETS_URL || '';

export class SheetsApiError extends Error {
  constructor(public statusCode: number, public responseBody: string) {
    super(`Sheets API error: ${statusCode}`);
    this.name = 'SheetsApiError';
  }
}

async function sheetsGet<T>(params: Record<string, string>): Promise<T> {
  if (!SHEETS_URL) throw new SheetsApiError(500, 'SHEETS_URL이 설정되지 않았습니다.');
  const url = `${SHEETS_URL}?${new URLSearchParams(params)}`;
  const res = await fetch(url, { cache: 'no-store' });
  if (!res.ok) {
    // Apps Script는 리다이렉트 후 200을 반환하므로 여기 오면 진짜 에러
    throw new SheetsApiError(res.status, await res.text());
  }
  const json = await res.json();
  if (json.success === false) {
    throw new SheetsApiError(400, json.message || '요청 처리에 실패했습니다.');
  }
  return json.data ?? json;
}

async function sheetsPost<T>(body: Record<string, unknown>): Promise<T> {
  if (!SHEETS_URL) throw new SheetsApiError(500, 'SHEETS_URL이 설정되지 않았습니다.');
  const res = await fetch(SHEETS_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain' }, // Apps Script는 text/plain 권장
    body: JSON.stringify(body),
    cache: 'no-store',
  });
  if (!res.ok) {
    throw new SheetsApiError(res.status, await res.text());
  }
  const json = await res.json();
  if (json.success === false) {
    throw new SheetsApiError(400, json.message || '요청 처리에 실패했습니다.');
  }
  return json.data ?? json;
}

// ── 가게 목록 조회 ─────────────────────────────────────────────

export async function getStoresFromSheets(date: string, headcount: number) {
  return sheetsGet<unknown[]>({
    action: 'getStores',
    date,
    headcount: String(headcount),
  });
}

// ── 가게 상세 조회 ─────────────────────────────────────────────

export async function getStoreDetailFromSheets(storeId: string, date: string) {
  return sheetsGet<unknown>({
    action: 'getStoreDetail',
    storeId,
    date,
  });
}

// ── 예약 생성 ──────────────────────────────────────────────────

export interface SheetsCreateReservationRequest {
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

export async function createReservationInSheets(data: SheetsCreateReservationRequest) {
  return sheetsPost<unknown>({
    action: 'createReservation',
    data,
  });
}

// ── 전화번호로 예약 조회 ───────────────────────────────────────

export async function getReservationsByPhoneFromSheets(userPhone: string) {
  return sheetsGet<unknown[]>({
    action: 'getReservations',
    userPhone,
  });
}

// ── 예약 취소 ──────────────────────────────────────────────────

export async function cancelReservationInSheets(reservationId: string) {
  return sheetsGet<unknown>({
    action: 'cancelReservation',
    reservationId,
  });
}
