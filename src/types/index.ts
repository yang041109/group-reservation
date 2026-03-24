// ============================================================
// 단체 예약 플랫폼 - 공유 TypeScript 타입 및 인터페이스
// ============================================================

// --- 인원수 기반 최소 주문 금액 규칙 ---

export interface MinOrderRule {
  minHeadcount: number;
  maxHeadcount: number;
  minOrderAmount: number;
}

// --- 가게 관련 ---

/** GET /api/stores response item */
export interface StoreCard {
  id: string;
  name: string;
  images: string[];
  availableTimes: string[];
  maxCapacity: number;
  minOrderRules: MinOrderRule[];
}

/** GET /api/stores/:id response – store detail */
export interface StoreDetail {
  id: string;
  name: string;
  images: string[];
  maxCapacity: number;
  availableTimes: string[];
  minOrderRules: MinOrderRule[];
}

export interface MenuItemData {
  id: string;
  name: string;
  price: number;
  category?: string;
}

// --- 예약 상태 ---

export type ReservationStatus = 'pending' | 'accepted' | 'rejected';

export interface StatusTransitionResult {
  valid: boolean;
  error?: string;
}

// --- 예약 관련 ---

/** POST /api/reservations request */
export interface CreateReservationRequest {
  storeId: string;
  headcount: number;
  time: string;
  menuItems: { menuId: string; quantity: number }[];
  totalAmount: number;
  minOrderAmount: number;
}

export interface CreateReservationResponse {
  reservationId: string;
  status: 'pending';
}

/** POST /api/reservations/:id/respond request */
export interface RespondReservationRequest {
  action: 'accept' | 'reject';
  note?: string;
}

// --- 알림 관련 ---

export interface NotificationData {
  id: string;
  reservationId: string;
  storeName: string;
  type: 'accepted' | 'rejected';
  message: string;
  adminNote?: string;
  isRead: boolean;
  createdAt: Date;
}

/** GET /api/notifications response */
export interface GetNotificationsResponse {
  notifications: NotificationData[];
  unreadCount: number;
}

/** PATCH /api/notifications/:id/read response */
export interface MarkNotificationReadResponse {
  id: string;
  isRead: true;
}

// --- 유효성 검증 ---

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

// --- 노션 동기화 ---

/** POST /api/admin/sync-notion response */
export interface SyncNotionResponse {
  syncedStores: number;
  errors: string[];
  lastSyncedAt: Date;
}

export interface NotionStoreData {
  name: string;
  images: string[];
  menus: { name: string; price: number; category?: string }[];
  availableTimes: string[];
  maxCapacity: number;
  minOrderRules: { minHeadcount: number; maxHeadcount: number; minOrderAmount: number }[];
}

// --- Slack ---

export interface SlackReservationNotification {
  storeName: string;
  headcount: number;
  time: string;
  menuItems: { name: string; quantity: number; price: number }[];
  totalAmount: number;
  minOrderAmount: number;
  reservationId: string;
}

// --- API 응답 래퍼 ---

export interface GetStoresResponse {
  stores: StoreCard[];
}

export interface GetStoreDetailResponse {
  store: StoreDetail;
  menus: MenuItemData[];
  availableTimes: string[];
}
