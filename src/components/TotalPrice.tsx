'use client';

export interface MenuReceiptLine {
  menuId: string;
  name: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
}

interface TotalPriceProps {
  totalAmount: number;
  minOrderAmount: number;
  /** 선택한 메뉴 영수증 내역 (총 금액 아래 표시) */
  receiptLines?: MenuReceiptLine[];
}

export default function TotalPrice({
  totalAmount,
  minOrderAmount,
  receiptLines = [],
}: TotalPriceProps) {
  const deficit = minOrderAmount - totalAmount;
  const isMet = minOrderAmount <= 0 || totalAmount >= minOrderAmount;
  const hasLines = receiptLines.length > 0;

  return (
    <div className="mt-4 rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-gray-700">총 금액</span>
        <span className="text-lg font-bold text-gray-900">
          {totalAmount.toLocaleString()}원
        </span>
      </div>

      {hasLines ? (
        <div className="mt-4 border-t border-dashed border-gray-200 pt-4">
          <p className="mb-2 text-xs font-semibold tracking-wide text-gray-500">주문 내역</p>
          <ul className="space-y-2.5">
            {receiptLines.map((line) => (
              <li key={line.menuId} className="text-sm">
                <div className="flex items-start justify-between gap-3">
                  <span className="font-medium text-gray-800">
                    {line.name}
                    <span className="ml-1 font-normal text-gray-500">× {line.quantity}</span>
                  </span>
                  <span className="shrink-0 font-semibold tabular-nums text-gray-900">
                    {line.lineTotal.toLocaleString()}원
                  </span>
                </div>
                <p className="mt-0.5 text-xs text-gray-400 tabular-nums">
                  {line.unitPrice.toLocaleString()}원 × {line.quantity}
                </p>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {minOrderAmount > 0 && (
        <div className={hasLines ? 'mt-3' : 'mt-2'}>
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
