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
  /** 구간별 모드에서 고정 vs 인당 (기본 고정) */
  calcType?: 'fixed' | 'per_person';
}

export type DepositMode = 'flat' | 'per_person' | 'tiered';

// --- 슬롯 관련 (slots 테이블 대응) ---

export interface TimeSlot {
  slotId: string;
  timeBlock: string;       // "11:00", "11:30" 등
  isAvailable: boolean;
  maxPeople: number;
  /** 현재 예약된 인원수 */
  currentHeadcount: number;
}

// --- 동(zone) 관련 ---

/** 한 가게가 동(zone) 단위로 운영될 때 각 동의 요약 정보. */
export interface ZoneInfo {
  zoneId: string;
  name: string;
  maxCapacity: number;
  sortOrder: number;
}

// --- 가게 관련 ---

/** GET /api/stores response item */
export interface StoreCard {
  id: string;
  name: string;
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
  /** @deprecated depositMode 사용 */
  depositUseTiers?: boolean;
  depositMode?: DepositMode;
  depositTiers?: DepositTier[];
  minGroupHeadcount?: number;
  closedOnDate?: boolean;
  /** 가게가 당일 예약을 허용하는지. /search 카드에서 sameDayBlocked 계산에 사용. */
  allowSameDayBooking?: boolean;
  /** 간략 위치 (검색 카드) */
  locationLabel?: string | null;
  /** 전역관리 목록 순서 */
  sortOrder?: number;
  /** 동(zone) 단위 운영 시 각 동의 타임라인. zones.length > 0 이면 동별 탭을 그린다. */
  zones?: ZoneCardEntry[];
}

/** StoreCard 안에서 동별로 따로 노출되는 정보. */
export interface ZoneCardEntry {
  zoneId: string;
  name: string;
  maxCapacity: number;
  sortOrder: number;
  /** 이 동 기준 슬롯 타임라인 (closedOnDate true 면 빈 배열) */
  timeline: TimeSlot[];
  slotStartHour: number;
  slotEndHour: number;
  closedOnDate: boolean;
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
  /** 고정·인당 모드 기준 금액(원) */
  depositAmount?: number;
  /** @deprecated depositMode 사용 */
  depositUseTiers?: boolean;
  depositMode?: DepositMode;
  depositTiers?: DepositTier[];
  minGroupHeadcount?: number;
  ownerName?: string | null;
  ownerBankAccount?: string | null;
  closedOnDate?: boolean;
  locationLabel?: string | null;
  /** true 이면 당일 예약을 받음 (false/undefined 면 내일 이후만 가능) */
  allowSameDayBooking?: boolean;
  /** 메뉴 영역 상단에 띄울 안내 문구 (예: 전 인원 동일 메뉴) */
  menuNoticeText?: string | null;
  /** 예약금 적용 기간 (비어있으면 연중 적용). MM-DD 범위. */
  depositActiveMonthRanges?: { start: string; end: string }[];
  /** N명당 메뉴 1개 강제. null/undefined 면 제한 없음. */
  menuRequiredPeoplePerItem?: number | null;
  /** 교대제(부제) 적용 시 허용되는 시작 시각. 예: ["18:00","21:00"] */
  shiftStartTimes?: string[];
  /** 교대제 적용 기간. 비어있으면 미적용. MM-DD 범위. */
  shiftActiveMonthRanges?: { start: string; end: string }[];
  /** 동(zone) 단위 운영 시 동별 세부 정보. 빈 배열이면 단일 운영. */
  zones?: ZoneDetailEntry[];
}

/** StoreDetail 안에서 동별로 따로 내려주는 슬롯·영업시간 정보. */
export interface ZoneDetailEntry {
  zoneId: string;
  name: string;
  maxCapacity: number;
  sortOrder: number;
  slotStartHour: number;
  slotEndHour: number;
  closedOnDate: boolean;
  slots: TimeSlot[];
  availableTimes: string[];
  reservedTimes: string[];
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
  /** 표시 순서(작을수록 앞) */
  sortOrder?: number;
  /** 메뉴 설명 (재료/특징/안내 등) */
  description?: string | null;
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
  /** 가게가 동(zone) 운영 중이면 필수. 단일 운영이면 undefined. */
  zoneId?: string;
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
  userNote?: string;
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
  /** 가게가 동(zone) 운영 중이면 동별 상세. store.zones 와 동일. */
  zones?: ZoneDetailEntry[];
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
