import type {
  CreateReservationRequest,
  MenuItemData,
  MinOrderRule,
  ReservationStatus,
  StatusTransitionResult,
  ValidationResult,
} from '@/types';

/** Parse "HH:mm" → total minutes */
function toMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
}

/**
 * 인원수가 속하는 구간의 최소 주문 금액을 반환한다.
 * 해당하는 구간이 없으면 0을 반환한다.
 */
export function getMinOrderAmount(
  headcount: number,
  rules: MinOrderRule[],
): number {
  const rule = rules.find(
    (r) => headcount >= r.minHeadcount && headcount <= r.maxHeadcount,
  );
  return rule ? rule.minOrderAmount : 0;
}

/**
 * 예약 요청의 유효성을 검증한다.
 *
 * 검증 항목:
 * - 인원수 미선택 (Requirements 4.8)
 * - 시간 미선택 (Requirements 4.9)
 * - 최대 수용 인원 초과 (Requirements 3.2, 3.3)
 * - 예약 불가능 시간 (Requirements 3.5)
 * - 최소 주문 금액 미달 (Requirements 4.5, 4.6, 5.7)
 */
export function validateReservationRequest(
  req: Partial<CreateReservationRequest>,
  store: { maxCapacity: number },
  availableTimes: string[],
  minOrderRules: MinOrderRule[],
  menuData?: MenuItemData[],
): ValidationResult {
  const errors: string[] = [];

  // 인원수 미선택 또는 유효하지 않은 값
  if (!req.headcount || req.headcount < 1) {
    errors.push('인원수를 선택해주세요.');
  }

  // 최대 수용 인원 초과
  if (req.headcount && req.headcount > store.maxCapacity) {
    errors.push(
      `최대 수용 가능 인원은 ${store.maxCapacity}명입니다.`,
    );
  }

  // 날짜 미선택
  if (!req.date) {
    errors.push('날짜를 선택해주세요.');
  }

  // 당일 예약 불가
  if (req.date) {
    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    if (req.date <= todayStr) {
      errors.push('당일 예약은 불가능합니다. 내일 이후 날짜를 선택해주세요.');
    }
  }

  // 시간 미선택
  if (!req.time) {
    errors.push('시간을 선택해주세요.');
  }

  // 예약 불가능 시간
  if (req.time) {
    // 범위 형식 ("HH:mm - HH:mm") 또는 단일 시간 ("HH:mm") 모두 지원
    if (req.time.includes(' - ')) {
      const [start, end] = req.time.split(' - ');
      const startMin = toMinutes(start);
      const endMin = toMinutes(end);
      // 범위 내 모든 시간이 available인지 확인
      const timesInRange = availableTimes.filter((t) => {
        const m = toMinutes(t);
        return m >= startMin && m <= endMin;
      });
      if (timesInRange.length === 0) {
        errors.push('선택한 시간은 예약이 불가능합니다.');
      }
    } else if (!availableTimes.includes(req.time)) {
      errors.push('선택한 시간은 예약이 불가능합니다.');
    }
  }

  // 최소 주문 금액 검증
  if (req.headcount && req.headcount >= 1 && req.totalAmount !== undefined) {
    const minAmount = getMinOrderAmount(req.headcount, minOrderRules);
    if (minAmount > 0 && req.totalAmount < minAmount) {
      errors.push(
        `${req.headcount}명 기준 최소 주문 금액은 ${minAmount.toLocaleString()}원입니다. 현재 ${req.totalAmount.toLocaleString()}원 (${(minAmount - req.totalAmount).toLocaleString()}원 부족)`,
      );
    }
  }

  // 필수 메뉴(is_required) 포함 여부 검증
  if (menuData && req.menuItems) {
    const requiredMenus = menuData.filter((m) => m.isRequired);
    for (const required of requiredMenus) {
      const selected = req.menuItems.find((item) => item.menuId === required.id);
      if (!selected || selected.quantity < 1) {
        errors.push(`필수 메뉴 "${required.name}"을(를) 선택해주세요.`);
      }
    }
  }

  return { valid: errors.length === 0, errors };
}

/**
 * 메뉴 아이템별 (가격 × 수량)을 합산하여 총 금액을 계산한다.
 *
 * - 메뉴 데이터에 존재하지 않는 menuId는 0원으로 처리한다.
 * - Requirements: 4.3, 4.4
 */
export function calculateTotalAmount(
  menuItems: { menuId: string; quantity: number }[],
  menuData: MenuItemData[],
): number {
  return menuItems.reduce((total, item) => {
    const menu = menuData.find((m) => m.id === item.menuId);
    return total + (menu ? menu.price * item.quantity : 0);
  }, 0);
}

/**
 * 허용된 예약 상태 전이 맵.
 * PENDING → CONFIRMED, PENDING → CANCELED 만 허용한다.
 */
const VALID_TRANSITIONS: Record<ReservationStatus, ReservationStatus[]> = {
  PENDING: ['CONFIRMED', 'CANCELED'],
  CONFIRMED: ['DEPOSIT_PENDING', 'CANCELED'],
  DEPOSIT_PENDING: ['DEPOSIT_CONFIRMED', 'CANCELED'],
  DEPOSIT_CONFIRMED: ['CANCELED'],
  CANCELED: [],
};

/**
 * 예약 상태 전이가 유효한지 검증한다.
 *
 * - PENDING → CONFIRMED ✅
 * - PENDING → CANCELED ✅
 * - CONFIRMED → DEPOSIT_PENDING ✅
 * - CONFIRMED → CANCELED ✅
 * - DEPOSIT_PENDING → DEPOSIT_CONFIRMED ✅
 * - DEPOSIT_PENDING → CANCELED ✅
 * - DEPOSIT_CONFIRMED → CANCELED ✅
 * - 그 외 모든 전이 ❌
 *
 * Requirements: 6.4, 6.5, 6.9
 */
export function validateStatusTransition(
  currentStatus: ReservationStatus,
  newStatus: ReservationStatus,
): StatusTransitionResult {
  if (currentStatus === newStatus) {
    return { valid: false, error: `이미 ${currentStatus} 상태입니다.` };
  }

  const allowed = VALID_TRANSITIONS[currentStatus];
  if (!allowed || !allowed.includes(newStatus)) {
    return {
      valid: false,
      error: `${currentStatus}에서 ${newStatus}(으)로의 상태 전이는 허용되지 않습니다.`,
    };
  }

  return { valid: true };
}
