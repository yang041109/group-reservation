'use client';

interface TotalPriceProps {
  totalAmount: number;
  minOrderAmount: number;
}

export default function TotalPrice({
  totalAmount,
  minOrderAmount,
}: TotalPriceProps) {
  const deficit = minOrderAmount - totalAmount;
  const isMet = minOrderAmount <= 0 || totalAmount >= minOrderAmount;

  return (
    <div className="mt-4 rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-gray-700">총 금액</span>
        <span className="text-lg font-bold text-gray-900">
          {totalAmount.toLocaleString()}원
        </span>
      </div>

      {minOrderAmount > 0 && (
        <div className="mt-2">
          {isMet ? (
            <p className="text-sm text-green-600">
              ✅ 최소 주문 금액을 충족했습니다
            </p>
          ) : (
            <p className="text-sm text-red-600">
              ⚠️ 최소 주문 금액까지{' '}
              <span className="font-semibold">
                {deficit.toLocaleString()}원
              </span>{' '}
              부족합니다
            </p>
          )}
        </div>
      )}
    </div>
  );
}
