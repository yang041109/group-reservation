'use client';

import { useRouter } from 'next/navigation';

interface ReserveButtonProps {
  selectedHeadcount: number;
  selectedTime: string | null;
  totalAmount: number;
  minOrderAmount: number;
  storeId: string;
  storeName: string;
  menuQuantities: Record<string, number>;
  menus: { id: string; name: string; price: number }[];
}

export default function ReserveButton({
  selectedHeadcount,
  selectedTime,
  totalAmount,
  minOrderAmount,
  storeId,
  storeName,
  menuQuantities,
  menus,
}: ReserveButtonProps) {
  const router = useRouter();

  // Validation
  const timeNotSelected = selectedTime === null;
  const minOrderNotMet = minOrderAmount > 0 && totalAmount < minOrderAmount;
  const deficit = minOrderAmount - totalAmount;
  const isDisabled = timeNotSelected || minOrderNotMet;

  // Determine validation message
  let validationMessage: string | null = null;
  if (timeNotSelected) {
    validationMessage = '시간을 선택해주세요';
  } else if (minOrderNotMet) {
    validationMessage = `최소 주문 금액까지 ${deficit.toLocaleString()}원 부족합니다`;
  }

  const handleClick = () => {
    if (isDisabled) return;

    // Build menu items with names and prices for the confirm page
    const menuItems = Object.entries(menuQuantities).map(([menuId, quantity]) => {
      const menu = menus.find((m) => m.id === menuId);
      return {
        menuId,
        name: menu?.name ?? '',
        price: menu?.price ?? 0,
        quantity,
      };
    });

    // Store reservation data in sessionStorage for the confirm page
    const pendingReservation = {
      storeId,
      storeName,
      headcount: selectedHeadcount,
      time: selectedTime,
      menuItems,
      totalAmount,
      minOrderAmount,
    };

    sessionStorage.setItem('pendingReservation', JSON.stringify(pendingReservation));
    router.push(`/stores/${storeId}/confirm`);
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-gray-200 bg-white shadow-[0_-2px_10px_rgba(0,0,0,0.08)]">
      <div className="mx-auto max-w-3xl px-4 py-3">
        {validationMessage && (
          <p className="mb-2 text-center text-sm text-red-500">
            {validationMessage}
          </p>
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
