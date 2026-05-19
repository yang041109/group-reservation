'use client';

import { useRouter } from 'next/navigation';

interface ReserveButtonProps {
  selectedHeadcount: number;
  selectedDate: string | null;
  selectedTime: string | null;
  totalAmount: number;
  storeId: string;
  storeName: string;
  menuQuantities: Record<string, number>;
  menus: { id: string; name: string; price: number }[];
  /** 예약 확정 시 저장되는 예약금(인원 구간 반영) */
  expectedDeposit: number;
  ownerName?: string | null;
  ownerBankAccount?: string | null;
  minGroupHeadcount?: number;
}

export default function ReserveButton({
  selectedHeadcount,
  selectedDate,
  selectedTime,
  totalAmount,
  storeId,
  storeName,
  menuQuantities,
  menus,
  expectedDeposit,
  ownerName,
  ownerBankAccount,
  minGroupHeadcount = 2,
}: ReserveButtonProps) {
  const router = useRouter();

  const dateNotSelected = selectedDate === null;
  const timeNotSelected = selectedTime === null;
  const belowGroupMin = selectedHeadcount < minGroupHeadcount;
  const isDisabled = dateNotSelected || timeNotSelected || belowGroupMin;

  let validationMessage: string | null = null;
  if (dateNotSelected) {
    validationMessage = '날짜를 선택해주세요';
  } else if (timeNotSelected) {
    validationMessage = '시간을 선택해주세요';
  } else if (belowGroupMin) {
    validationMessage = `단체예약은 ${minGroupHeadcount}명 이상부터 가능합니다`;
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
