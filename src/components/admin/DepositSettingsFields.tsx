'use client';

import type { DepositMode } from '@/lib/deposit-tiers';

export type DepositTierFormRow = {
  min: string;
  max: string;
  amount: string;
  calcType: 'fixed' | 'per_person';
};

type DepositSettingsFieldsProps = {
  depositMode: DepositMode;
  onDepositModeChange: (mode: DepositMode) => void;
  depositFlat: string;
  onDepositFlatChange: (value: string) => void;
  tierRows: DepositTierFormRow[];
  onTierRowsChange: (updater: (rows: DepositTierFormRow[]) => DepositTierFormRow[]) => void;
  ownerName: string;
  onOwnerNameChange: (value: string) => void;
  ownerBankAccount: string;
  onOwnerBankAccountChange: (value: string) => void;
  showBankFields: boolean;
  variant?: 'manage' | 'owner';
};

export function defaultDepositTierRows(): DepositTierFormRow[] {
  return [{ min: '1', max: '10', amount: '0', calcType: 'fixed' }];
}

const MODE_OPTIONS: { value: DepositMode; title: string; desc: string }[] = [
  { value: 'flat', title: '단순 고정', desc: '인원과 관계없이 동일 금액' },
  { value: 'per_person', title: '인당', desc: '예약 인원 × 설정 금액' },
  { value: 'tiered', title: '구간별', desc: '인원 구간마다 고정 또는 인당 선택' },
];

export default function DepositSettingsFields({
  depositMode,
  onDepositModeChange,
  depositFlat,
  onDepositFlatChange,
  tierRows,
  onTierRowsChange,
  ownerName,
  onOwnerNameChange,
  ownerBankAccount,
  onOwnerBankAccountChange,
  showBankFields,
  variant = 'manage',
}: DepositSettingsFieldsProps) {
  const isOwner = variant === 'owner';

  const addTierRow = () => {
    onTierRowsChange((rows) => [...rows, { min: '1', max: '20', amount: '0', calcType: 'fixed' }]);
  };

  const updateTier = (idx: number, patch: Partial<DepositTierFormRow>) => {
    onTierRowsChange((rows) => rows.map((r, i) => (i === idx ? { ...r, ...patch } : r)));
  };

  const removeTier = (idx: number) => {
    onTierRowsChange((rows) => (rows.length <= 1 ? rows : rows.filter((_, i) => i !== idx)));
  };

  return (
    <div className={isOwner ? '' : 'sm:col-span-2 space-y-3'}>
      <div className={isOwner ? 'space-y-2' : 'rounded-lg border border-gray-100 bg-gray-50/80 p-3 space-y-3'}>
        {!isOwner ? <p className="text-sm font-medium text-gray-800">예약금 방식</p> : null}
        <div className="space-y-2">
          {MODE_OPTIONS.map((opt) => (
            <label
              key={opt.value}
              className={
                isOwner
                  ? 'flex cursor-pointer items-start gap-2 rounded-lg border border-gray-200 bg-gray-50 p-3'
                  : 'flex cursor-pointer items-start gap-2 rounded-md border border-gray-200 bg-white p-2.5'
              }
            >
              <input
                type="radio"
                name="depositMode"
                checked={depositMode === opt.value}
                onChange={() => {
                  onDepositModeChange(opt.value);
                  if (opt.value === 'tiered' && tierRows.length === 0) {
                    onTierRowsChange(() => defaultDepositTierRows());
                  }
                }}
                className="mt-0.5"
              />
              <span>
                <span className={isOwner ? 'text-sm font-semibold text-gray-800' : 'text-sm font-medium text-gray-800'}>
                  {opt.title}
                </span>
                <span className="mt-0.5 block text-xs text-gray-500">{opt.desc}</span>
              </span>
            </label>
          ))}
        </div>

        {depositMode === 'flat' ? (
          <label className="block">
            <span className={isOwner ? 'text-sm font-semibold text-gray-700' : 'text-xs text-gray-500'}>
              예약금 (원)
            </span>
            <input
              type="number"
              min={0}
              value={depositFlat}
              onChange={(e) => onDepositFlatChange(e.target.value)}
              className={
                isOwner
                  ? 'mt-1.5 w-full rounded-lg border border-gray-300 px-3 py-2.5 text-base'
                  : 'mt-1 w-full max-w-[12rem] rounded-lg border border-gray-300 px-3 py-2'
              }
            />
          </label>
        ) : null}

        {depositMode === 'per_person' ? (
          <label className="block">
            <span className={isOwner ? 'text-sm font-semibold text-gray-700' : 'text-xs text-gray-500'}>
              1인당 예약금 (원)
            </span>
            <input
              type="number"
              min={0}
              value={depositFlat}
              onChange={(e) => onDepositFlatChange(e.target.value)}
              className={
                isOwner
                  ? 'mt-1.5 w-full rounded-lg border border-gray-300 px-3 py-2.5 text-base'
                  : 'mt-1 w-full max-w-[12rem] rounded-lg border border-gray-300 px-3 py-2'
              }
            />
            <p className="mt-1 text-xs text-gray-500">예: 5,000원 × 30명 = 150,000원</p>
          </label>
        ) : null}

        {depositMode === 'tiered' ? (
          <div className="space-y-2">
            <p className="text-xs text-gray-600">
              각 구간의 계산 방식(고정/인당)과 금액을 설정합니다. 예: 30명 이하 고정 10만원, 31명 이상 인당 5천원
            </p>
            {tierRows.map((row, idx) => (
              <div
                key={idx}
                className={
                  isOwner
                    ? 'space-y-2 rounded-lg border border-gray-200 bg-white p-3'
                    : 'flex flex-wrap items-end gap-2 rounded-md bg-white p-2 shadow-sm'
                }
              >
                <div className={isOwner ? 'grid grid-cols-2 gap-2' : 'flex flex-wrap items-center gap-2'}>
                  <input
                    type="number"
                    min={1}
                    value={row.min}
                    onChange={(e) => updateTier(idx, { min: e.target.value })}
                    placeholder="최소"
                    className={
                      isOwner
                        ? 'rounded-lg border border-gray-300 px-2 py-2 text-sm'
                        : 'w-16 rounded border border-gray-200 px-1 py-0.5'
                    }
                  />
                  <input
                    type="number"
                    min={1}
                    value={row.max}
                    onChange={(e) => updateTier(idx, { max: e.target.value })}
                    placeholder="최대"
                    className={
                      isOwner
                        ? 'rounded-lg border border-gray-300 px-2 py-2 text-sm'
                        : 'w-16 rounded border border-gray-200 px-1 py-0.5'
                    }
                  />
                </div>
                <select
                  value={row.calcType}
                  onChange={(e) =>
                    updateTier(idx, { calcType: e.target.value as 'fixed' | 'per_person' })
                  }
                  className={
                    isOwner
                      ? 'w-full rounded-lg border border-gray-300 px-2 py-2 text-sm'
                      : 'rounded border border-gray-200 px-1 py-0.5 text-xs'
                  }
                >
                  <option value="fixed">고정 금액</option>
                  <option value="per_person">인당 금액</option>
                </select>
                <input
                  type="number"
                  min={0}
                  value={row.amount}
                  onChange={(e) => updateTier(idx, { amount: e.target.value })}
                  placeholder={row.calcType === 'per_person' ? '인당(원)' : '예약금(원)'}
                  className={
                    isOwner
                      ? 'w-full rounded-lg border border-gray-300 px-2 py-2 text-sm'
                      : 'w-24 rounded border border-gray-200 px-1 py-0.5'
                  }
                />
                {tierRows.length > 1 ? (
                  <button
                    type="button"
                    onClick={() => removeTier(idx)}
                    className="text-xs text-red-600 hover:underline"
                  >
                    구간 삭제
                  </button>
                ) : null}
              </div>
            ))}
            <button
              type="button"
              onClick={addTierRow}
              className={
                isOwner
                  ? 'w-full rounded-lg border border-dashed border-gray-300 py-2 text-sm font-semibold text-gray-700'
                  : 'text-sm text-blue-600 hover:underline'
              }
            >
              + 구간 추가
            </button>
          </div>
        ) : null}
      </div>

      {showBankFields ? (
        <div
          className={
            isOwner
              ? 'mt-4 space-y-3 rounded-lg border border-blue-100 bg-blue-50/50 p-3'
              : 'space-y-3 rounded-lg border border-blue-100 bg-blue-50/50 p-3'
          }
        >
          <p className={isOwner ? 'text-sm font-semibold text-blue-900' : 'text-sm font-medium text-blue-900'}>
            예약금 입금 안내 (고객 예약 확정 화면에 표시)
          </p>
          <label className="block">
            <span className={isOwner ? 'text-sm font-semibold text-gray-700' : 'text-xs text-gray-600'}>
              {isOwner ? '예금주' : '사장님 성함 (예금주)'}
            </span>
            <input
              value={ownerName}
              onChange={(e) => onOwnerNameChange(e.target.value)}
              placeholder={isOwner ? '홍길동' : undefined}
              className={
                isOwner
                  ? 'mt-1.5 w-full rounded-lg border border-gray-300 px-3 py-2.5 text-base'
                  : 'mt-1 w-full rounded-lg border border-gray-300 px-3 py-2'
              }
            />
          </label>
          <label className="block">
            <span className={isOwner ? 'text-sm font-semibold text-gray-700' : 'text-xs text-gray-600'}>
              계좌번호
            </span>
            <input
              value={ownerBankAccount}
              onChange={(e) => onOwnerBankAccountChange(e.target.value)}
              placeholder={isOwner ? '농협 123-4567-8901' : '은행명 포함 입력'}
              className={
                isOwner
                  ? 'mt-1.5 w-full rounded-lg border border-gray-300 px-3 py-2.5 text-base'
                  : 'mt-1 w-full rounded-lg border border-gray-300 px-3 py-2'
              }
            />
          </label>
        </div>
      ) : null}
    </div>
  );
}
