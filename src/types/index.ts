// ============================================================
// 우르르 (urr) - 공유 TypeScript 타입 및 인터페이스
// ============================================================

// --- 인원수 기반 최소 주문 금액 규칙 ---

export interface MinOrderRule {
  minHeadcount: number;
  maxHeadcount: number;
  minOrderAmount: number;
}

// --- 슬롯 관련 (slots 테이블 대응) ---

export interface TimeSlot {
  slotId: string;
  timeBlock: string;       // "11:00", "11:30" 등
  isAvailable: boolean;
  maxPeople: number;
  /** 현재 예약된 인원수 */
  currentHeadcount: number;
}

// --- 가게 관련 ---

/** GET /api/stores response item */
export interface StoreCard {
  id: string;
  name: string;
  category?: string;
  images: string[];
  /** @deprecated 하위 호환용 – timeline 사용 권장 */
  availableTimes: string[];
  /** @deprecated 하위 호환용 – timeline 사용 권장 */
  reservedTimes: string[];
  /** slots 테이블 기반 타임라인 */
  timeline?: TimeSlot[];
  maxCapacity: number;
  minOrderRules: MinOrderRule[];
  /** 예약 타임슬롯 축 시작 시(0–23). 없으면 timeline/slots 등에서 추론 */
  slotStartHour?: number;
  /** 끝 시(0–23, 해당 시 :30까지). 시작보다 작으면 자정 넘김(예: 17~3=저녁~새벽) */
  slotEndHour?: number;
  /** 예약금 (원) */
  depositAmount?: number;
}

/** GET /api/stores/:id response – store detail */
export interface StoreDetail {
  id: string;
  name: string;
  images: string[];
  maxCapacity: number;
  /** 시작·끝 시(0–23). 끝 시가 시작보다 작으면 자정 넘김 영업. 없으면 slots에서 추론 */
  slotStartHour?: number;
  slotEndHour?: number;
  /** @deprecated 하위 호환용 – slots 사용 권장 */
  availableTimes: string[];
  /** slots 테이블 기반 슬롯 목록 */
  slots?: TimeSlot[];
  minOrderRules: MinOrderRule[];
  /** 예약금 (원) */
  depositAmount?: number;
}

export interface MenuItemData {
  id: string;
  name: string;
  price: number;
  /** 필수 메뉴 여부 (menus.is_required) */
  isRequired?: boolean;
  category?: string;
  /** 메뉴 이미지 URL */
  imageUrl?: string;
}

// --- 예약 상태 ---

/** DB 상태값: PENDING | CONFIRMED | DEPOSIT_PENDING | DEPOSIT_CONFIRMED | CANCELED */
export type ReservationStatus = 'PENDING' | 'CONFIRMED' | 'DEPOSIT_PENDING' | 'DEPOSIT_CONFIRMED' | 'CANCELED';

export interface StatusTransitionResult {
  valid: boolean;
  error?: string;
}

// --- 예약 관련 ---

/** POST /api/reservations request */
export interface CreateReservationRequest {
  storeId: string;
  storeName?: string;          // Slack 알림용 (선택)
  headcount: number;
  date: string;
  time: string;
  groupName: string;           // 단체명(행사명)
  representativeName: string;  // 예약자 이름
  phone: string;               // 전화번호
  userNote?: string;           // 요청사항 (선택)
  menuItems: { menuId: string; name?: string; price?: number; quantity: number }[];
  totalAmount: number;
  minOrderAmount: number;
}

export interface CreateReservationResponse {
  reservationId: string;
  status: 'PENDING';
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
  type: 'CONFIRMED' | 'CANCELED';
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

// --- Slack ---

export interface SlackReservationNotification {
  storeName: string;
  headcount: number;
  date: string;
  time: string;
  groupName: string;
  representativeName: string;
  phone: string;
  menuItems: { name: string; quantity: number; price: number }[];
  totalAmount: number;
  minOrderAmount: number;
  reservationId: string;
}

// --- 관리자 예약 뷰 ---

export interface AdminReservationView {
  id: string;
  storeId: string;
  storeName: string;
  headcount: number;
  time: string;
  totalAmount: number;
  minOrderAmount: number;
  status: string;
  createdAt: Date;
  menuItems: {
    menuId: string;
    name: string;
    quantity: number;
    /** reservation_menus.price_at_time */
    priceAtTime: number;
    /** @deprecated 하위 호환 별칭 */
    price: number;
  }[];
}

// --- API 응답 래퍼 ---

export interface GetStoresResponse {
  stores: StoreCard[];
}

export interface GetStoreDetailResponse {
  store: StoreDetail;
  menus: MenuItemData[];
  slots?: TimeSlot[];
  /** @deprecated 하위 호환용 */
  availableTimes: string[];
  /** @deprecated 하위 호환용 */
  reservedTimes: string[];
}

// --- 전화번호 예약 조회 응답 (reservations + reservation_menus JOIN) ---

export interface ReservationCheckItem {
  reservationId: string;
  storeId: string;
  slotId: string;
  timeBlock: string;
  headcount: number;
  totalAmount: number;
  status: string;
  createdAt: string;
  menus: {
    menuId: string;
    name: string;
    quantity: number;
    priceAtTime: number;
  }[];
}
