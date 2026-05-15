'use client';

import { FieldSectionHeader, PeopleFieldIcon } from '@/components/icons/BookingFieldIcons';

interface HeadcountSelectorProps {
  maxCapacity: number;
  minCapacity?: number;
  selectedHeadcount: number;
  onChange: (headcount: number) => void;
  variant?: 'panel' | 'compact';
}

export default function HeadcountSelector({
  maxCapacity,
  minCapacity = 1,
  selectedHeadcount,
  onChange,
  variant = 'panel',
}: HeadcountSelectorProps) {
  const effectiveMin = Math.max(0, minCapacity);

  const controls = (
    <div className="flex items-center justify-center gap-4">
      <div className="flex flex-col items-center gap-1">
        <button
          type="button"
          disabled={selectedHeadcount <= effectiveMin}
          onClick={() => onChange(Math.max(effectiveMin, selectedHeadcount - 1))}
          className="flex h-10 w-10 items-center justify-center rounded-full border border-gray-200 text-lg text-gray-600 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-35"
          aria-label="1명 줄이기"
        >
          −
        </button>
        <button
          type="button"
          disabled={selectedHeadcount <= effectiveMin}
          onClick={() => onChange(Math.max(effectiveMin, selectedHeadcount - 10))}
          className="rounded-lg border border-gray-200 px-2 py-0.5 text-xs font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-35"
        >
          −10
        </button>
      </div>

      <span className="min-w-[3rem] text-center text-2xl font-bold tabular-nums text-gray-900">
        {selectedHeadcount}
      </span>

      <div className="flex flex-col items-center gap-1">
        <button
          type="button"
          disabled={selectedHeadcount >= maxCapacity}
          onClick={() => onChange(Math.min(maxCapacity, selectedHeadcount + 1))}
          className="flex h-10 w-10 items-center justify-center rounded-full border border-gray-200 text-lg text-gray-600 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-35"
          aria-label="1명 늘리기"
        >
          +
        </button>
        <button
          type="button"
          disabled={selectedHeadcount >= maxCapacity}
          onClick={() => onChange(Math.min(maxCapacity, selectedHeadcount + 10))}
          className="rounded-lg border border-gray-200 px-2 py-0.5 text-xs font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-35"
        >
          +10
        </button>
      </div>
    </div>
  );

  if (variant === 'compact') {
    return (
      <div>
        <h3 className="text-sm font-semibold text-gray-700">👥 인원수</h3>
        <div className="mt-2 flex items-center gap-3">{controls}</div>
        <p className="mt-2 text-center text-xs text-gray-500">
          {effectiveMin}명 ~ {maxCapacity}명
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-3xl border border-gray-100 bg-white p-5 shadow-[0_8px_30px_rgba(0,0,0,0.06)]">
      <FieldSectionHeader icon={<PeopleFieldIcon />} title="인원수" />
      {controls}
      <p className="mt-3 text-center text-xs text-gray-500">
        {effectiveMin}명 ~ {maxCapacity}명까지 선택 가능
      </p>
    </div>
  );
}
