// ============================================================
// 백엔드 API 클라이언트 모듈
// Spring Boot 백엔드 서버와의 통신을 담당
// ============================================================

// --- 환경 변수 기반 Base URL ---

const BACKEND_API_URL = process.env.BACKEND_API_URL || 'http://localhost:8080';

// --- 에러 클래스 ---

export class BackendApiError extends Error {
  constructor(
    public statusCode: number,
    public responseBody: string,
  ) {
    super(`Backend API error: ${statusCode}`);
    this.name = 'BackendApiError';
  }
}

// --- 백엔드 공통 응답 래퍼 타입 ---

export interface BackendResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
}

// --- 공통 응답 래퍼 파싱 함수 ---

export function parseBackendResponse<T>(response: BackendResponse<T>): T {
  if (!response.success) {
    throw new BackendApiError(400, response.message || '요청 처리에 실패했습니다.');
  }
  return response.data as T;
}

// --- 백엔드 요청/응답 타입 ---

export interface BackendCreateReservationRequest {
  userName: string;
  groupName: string;
  userPhone: string;
  userNote: string;
  storeId: string;
  slotId: string;
  headcount: number;
  selectedMenus: { menuId: string; quantity: number }[];
}

export interface BackendReservationMenuItem {
  menuId: string;
  name: string;
  quantity: number;
  price: number;
}

export interface BackendReservation {
  id: number;
  storeId: string;
  headcount: number;
  time: string;
  totalAmount: number;
  minOrderAmount: number;
  status: string;
  createdAt: string; // ISO 8601
  menuItems: BackendReservationMenuItem[];
}

// --- 공통 fetch 래퍼 ---

export async function backendFetch<T>(
  path: string,
  options?: RequestInit & { rawResponse?: boolean },
): Promise<T> {
  const url = `${BACKEND_API_URL}${path}`;
  const { rawResponse, ...fetchOptions } = options ?? {};
  const response = await fetch(url, {
    ...fetchOptions,
    headers: {
      'Content-Type': 'application/json',
      ...fetchOptions?.headers,
    },
  });

  if (!response.ok) {
    const body = await response.text();
    // 실패 응답도 래퍼 형식일 수 있으므로 JSON 파싱 시도
    try {
      const parsed = JSON.parse(body) as BackendResponse<unknown>;
      if (parsed.success === false) {
        throw new BackendApiError(response.status, parsed.message || body);
      }
    } catch (e) {
      if (e instanceof BackendApiError) throw e;
    }
    throw new BackendApiError(response.status, body);
  }

  const contentType = response.headers.get('content-type');
  if (contentType?.includes('application/json')) {
    const json = await response.json();
    // rawResponse 옵션: 래퍼 파싱 없이 원본 반환 (admin/list 등)
    if (rawResponse) return json as T;
    // 공통 래퍼 파싱 시도: success 필드가 있으면 자동 적용
    if (json && typeof json === 'object' && 'success' in json) {
      return parseBackendResponse<T>(json as BackendResponse<T>);
    }
    return json as T;
  }
  return response.text() as unknown as T;
}

// --- DTO 변환 함수 ---

import type { CreateReservationRequest, AdminReservationView } from '@/types';

export function toBackendReservationRequest(
  req: CreateReservationRequest,
): BackendCreateReservationRequest {
  return {
    userName: req.representativeName,
    groupName: req.groupName,
    userPhone: req.phone,
    userNote: '',
    storeId: req.storeId,
    slotId: req.time,
    headcount: req.headcount,
    selectedMenus: req.menuItems.map((item) => ({
      menuId: item.menuId,
      quantity: item.quantity,
    })),
  };
}

export function fromBackendReservation(
  backend: BackendReservation,
  storeName?: string,
): AdminReservationView {
  return {
    id: String(backend.id),
    storeId: backend.storeId,
    storeName: storeName ?? '',
    headcount: backend.headcount,
    time: backend.time,
    totalAmount: backend.totalAmount,
    minOrderAmount: backend.minOrderAmount,
    status: backend.status,
    createdAt: new Date(backend.createdAt),
    menuItems: backend.menuItems.map((item) => ({
      menuId: item.menuId,
      name: item.name,
      quantity: item.quantity,
      priceAtTime: item.price,
      price: item.price,
    })),
  };
}

// --- 예약 생성 (POST /api/reservations → 백엔드 프록시) ---

export async function createReservation(
  data: BackendCreateReservationRequest,
): Promise<unknown> {
  return backendFetch<unknown>('/api/reservations', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

// --- 가게 목록 조회 (GET /api/stores → 백엔드 프록시) ---

export async function getStores(date: string, headcount: number): Promise<unknown> {
  return backendFetch<unknown>(
    `/api/stores?date=${date}&headcount=${headcount}`,
  );
}

// --- 가게 상세 조회 (GET /api/stores/:id → 백엔드 프록시) ---

export async function getStoreDetail(storeId: string, date: string): Promise<unknown> {
  return backendFetch<unknown>(
    `/api/stores/${storeId}?date=${date}`,
  );
}

// --- 전화번호로 예약 조회 (GET /api/reservations/check → 백엔드 프록시) ---

export async function getReservationsByPhone(userPhone: string): Promise<unknown> {
  return backendFetch<unknown>(
    `/api/reservations/check?userPhone=${encodeURIComponent(userPhone)}`,
  );
}

// --- 예약 취소 (PATCH /api/reservations/:id/cancel → 백엔드 프록시) ---

export async function cancelReservation(reservationId: string): Promise<unknown> {
  return backendFetch<unknown>(
    `/api/reservations/${reservationId}/cancel`,
    { method: 'PATCH' },
  );
}

// --- 관리자 예약 목록 조회 (GET /api/reservations/admin/list → 백엔드 프록시) ---

export async function getAdminReservationList(): Promise<BackendReservation[]> {
  return backendFetch<BackendReservation[]>(
    '/api/reservations/admin/list',
    { rawResponse: true },
  );
}

// --- 하위 호환: 기존 createBackendReservation 별칭 ---

export const createBackendReservation = createReservation;

// --- 내보내기: Base URL (테스트용) ---

export function getBackendApiUrl(): string {
  return BACKEND_API_URL;
}
