'use client';

import { useRouter } from 'next/navigation';

interface MenuItemInput {
  id: string;
  name: string;
  price: number;
  isRequired?: boolean;
}

interface ReserveButtonProps {
  selectedHeadcount: number;
  selectedDate: string | null;
  selectedTime: string | null;
  totalAmount: number;
  storeId: string;
  storeName: string;
  /** 가게가 동(zone) 운영 중이면 선택된 동의 zoneId·이름. 단일 운영이면 둘 다 undefined. */
  selectedZoneId?: string;
  selectedZoneName?: string;
  /** zone 운영 가게인데 zone 선택 전이면 true → 예약 버튼 비활성화 */
  zoneRequiredButNotSelected?: boolean;
  menuQuantities: Record<string, number>;
  menus: MenuItemInput[];
  /** 예약 확정 시 저장되는 예약금(인원 구간 반영) */
  expectedDeposit: number;
  ownerName?: string | null;
  ownerBankAccount?: string | null;
  minGroupHeadcount?: number;
  /** 가게가 당일 예약을 허용하는지 (false/undefined 면 내일 이후만) */
  allowSameDayBooking?: boolean;
  /** N명당 메뉴 1개 강제. 0/undefined 면 무시 */
  requiredPeoplePerItem?: number | null;
}

export default function ReserveButton({
  selectedHeadcount,
  selectedDate,
  selectedTime,
  totalAmount,
  storeId,
  storeName,
  selectedZoneId,
  selectedZoneName,
  zoneRequiredButNotSelected,
  menuQuantities,
  menus,
  expectedDeposit,
  ownerName,
  ownerBankAccount,
  minGroupHeadcount = 2,
  allowSameDayBooking = false,
  requiredPeoplePerItem,
}: ReserveButtonProps) {
  const router = useRouter();

  const dateNotSelected = selectedDate === null;
  const timeNotSelected = selectedTime === null;
  const belowGroupMin = selectedHeadcount < minGroupHeadcount;

  // 당일 예약 차단: 가게가 명시적으로 허용하지 않은 경우.
  // 클라이언트 시간 기준으로 판단 (서버에서도 동일하게 한 번 더 검증함).
  const sameDayBlocked = (() => {
    if (!selectedDate || allowSameDayBooking) return false;
    const now = new Date();
    const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    return selectedDate <= todayStr;
  })();

  // 필수 메뉴 미선택 여부 확인
  const requiredMenus = menus.filter((m) => m.isRequired);
  const missingRequired = requiredMenus.filter((m) => (menuQuantities[m.id] ?? 0) < 1);
  const requiredMenuNotSelected = missingRequired.length > 0;

  // 메뉴 자체가 등록돼 있으면 최소 하나는 골라야 함 (시간에 맞춰 깔리는 기본 세팅)
  const hasAnyMenu = menus.length > 0;
  const totalSelectedQty = Object.values(menuQuantities).reduce(
    (sum, q) => sum + (typeof q === 'number' && q > 0 ? q : 0),
    0,
  );
  const noMenuSelected = hasAnyMenu && totalSelectedQty === 0;

  // N명당 메뉴 1개 강제. 부족하면 차단.
  const peoplePerItem =
    requiredPeoplePerItem && requiredPeoplePerItem > 0 ? requiredPeoplePerItem : 0;
  const minRequiredQty =
    peoplePerItem > 0 && selectedHeadcount > 0
      ? Math.ceil(selectedHeadcount / peoplePerItem)
      : 0;
  const menuCountShort = minRequiredQty > 0 && totalSelectedQty < minRequiredQty;

  const isDisabled =
    dateNotSelected ||
    timeNotSelected ||
    belowGroupMin ||
    requiredMenuNotSelected ||
    noMenuSelected ||
    sameDayBlocked ||
    menuCountShort ||
    !!zoneRequiredButNotSelected;

  let validationMessage: string | null = null;
  if (sameDayBlocked) {
    validationMessage = '당일 예약은 받지 않습니다. 내일 이후 날짜를 선택해주세요';
  } else if (zoneRequiredButNotSelected) {
    validationMessage = '예약할 동(zone)을 선택해주세요';
  } else if (dateNotSelected) {
    validationMessage = '날짜를 선택해주세요';
  } else if (timeNotSelected) {
    validationMessage = '시간을 선택해주세요';
  } else if (belowGroupMin) {
    validationMessage = `단체예약은 ${minGroupHeadcount}명 이상부터 가능합니다`;
  } else if (requiredMenuNotSelected) {
    const names = missingRequired.map((m) => m.name).join(', ');
    validationMessage = `필수 메뉴를 선택해주세요: ${names}`;
  } else if (noMenuSelected) {
    validationMessage = '예약 시간에 깔아둘 메뉴를 최소 하나 이상 선택해주세요';
  } else if (menuCountShort) {
    validationMessage = `${selectedHeadcount}명 예약은 메뉴 ${minRequiredQty}개 이상 필요해요 (현재 ${totalSelectedQty}개)`;
  }

  const handleClick = () => {
    if (isDisabled) return;

    const menuItems = Object.entries(menuQuantities).map(([menuId, quantity]) => {
      const menu = menus.find((m) => m.id === menuId);
      return {
        menuId,
        name: menu?.name ?? '',
        price: menu?.price ?? 0,
        quantity,
      };
    });

    const pendingReservation = {
      storeId,
      storeName,
      zoneId: selectedZoneId ?? null,
      zoneName: selectedZoneName ?? null,
      headcount: selectedHeadcount,
      date: selectedDate,
      time: selectedTime,
      menuItems,
      totalAmount,
      minOrderAmount: 0,
      depositAmount: Math.max(0, Math.floor(expectedDeposit) || 0),
      ownerName: ownerName ?? null,
      ownerBankAccount: ownerBankAccount ?? null,
    };

    sessionStorage.setItem('pendingReservation', JSON.stringify(pendingReservation));
    router.push(`/stores/${storeId}/confirm`);
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-gray-200 bg-white shadow-[0_-2px_10px_rgba(0,0,0,0.08)]">
      <div className="mx-auto max-w-3xl px-4 py-3">
        {validationMessage && (
          <p className="mb-2 text-center text-sm text-red-500">{validationMessage}</p>
        )}
        <button
          type="button"
          disabled={isDisabled}
          onClick={handleClick}
          className={`w-full rounded-xl py-3.5 text-base font-bold transition ${
            isDisabled
              ? 'cursor-not-allowed bg-gray-300 text-gray-500'
              : 'bg-blue-500 text-white hover:bg-blue-600 active:bg-blue-700'
          }`}
        >
          예약하기
        </button>
      </div>
    </div>
  );
}
