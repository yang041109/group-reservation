// ============================================================
// 우르르 (urr) - 공유 TypeScript 타입 및 인터페이스
// ============================================================

// --- 인원수 기반 최소 주문 금액 규칙 ---

export interface MinOrderRule {
  minHeadcount: number;
  maxHeadcount: number;
  minOrderAmount: number;
}

/** 인원 구간별 예약금 (관리자 설정 → 고객 화면 표시) */
export interface DepositTier {
  minHeadcount: number;
  maxHeadcount: number;
  amount: number;
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
  /** 마감 시(0–23, 해당 시 :00 종료·마지막 슬롯은 (끝-1):30). 시작보다 작으면 자정 넘김 */
  slotEndHour?: number;
  /** 예약금 (원) — 검색·카드용: 선택 인원 기준으로 이미 계산된 값이면 그대로, 아니면 단일 금액 */
  depositAmount?: number;
  depositUseTiers?: boolean;
  depositTiers?: DepositTier[];
  minGroupHeadcount?: number;
  closedOnDate?: boolean;
  /** 간략 위치 (검색 카드) */
  locationLabel?: string | null;
  /** 전역관리 목록 순서 */
  sortOrder?: number;
}

/** GET /api/stores/:id response – store detail */
export interface StoreDetail {
  id: string;
  name: string;
  images: string[];
  maxCapacity: number;
  /** 시작·마감 시(0–23). 마감 시 :00 종료, 마지막 슬롯 (마감-1):30. 끝<시작이면 자정 넘김 */
  slotStartHour?: number;
  slotEndHour?: number;
  /** @deprecated 하위 호환용 – slots 사용 권장 */
  availableTimes: string[];
  /** slots 테이블 기반 슬롯 목록 */
  slots?: TimeSlot[];
  minOrderRules: MinOrderRule[];
  /** 단일 예약금 모드일 때 금액(원). 구간 모드일 때는 0일 수 있음 */
  depositAmount?: number;
  /** true면 depositTiers로 인원별 예약금 */
  depositUseTiers?: boolean;
  depositTiers?: DepositTier[];
  minGroupHeadcount?: number;
  ownerName?: string | null;
  ownerBankAccount?: string | null;
  closedOnDate?: boolean;
  locationLabel?: string | null;
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
