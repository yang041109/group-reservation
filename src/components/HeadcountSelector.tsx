'use client';

import { FieldSectionHeader, PeopleFieldIcon } from '@/components/icons/BookingFieldIcons';

interface HeadcountSelectorProps {
  maxCapacity: number;
  minCapacity?: number;
  selectedHeadcount: number;
  onChange: (headcount: number) => void;
  variant?: 'panel' | 'compact';
  className?: string;
}

const circleBtnClass =
  'flex h-11 w-11 items-center justify-center rounded-full border border-gray-200 bg-white text-xl font-medium text-gray-700 shadow-sm transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-35';

const stepBtnClass =
  'min-w-[44px] rounded-lg border border-gray-200 bg-white px-3 py-1 text-xs font-semibold text-gray-600 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-35';

export default function HeadcountSelector({
  maxCapacity,
  minCapacity = 1,
  selectedHeadcount,
  onChange,
  variant = 'panel',
  className = '',
}: HeadcountSelectorProps) {
  const effectiveMin = Math.max(0, minCapacity);

  const panelControls = (
    <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-4 sm:gap-x-10">
      <div className="flex flex-col items-center gap-2">
        <button
          type="button"
          disabled={selectedHeadcount <= effectiveMin}
          onClick={() => onChange(Math.max(effectiveMin, selectedHeadcount - 1))}
          className={circleBtnClass}
          aria-label="1명 줄이기"
        >
          −
        </button>
        <button
          type="button"
          disabled={selectedHeadcount <= effectiveMin}
          onClick={() => onChange(Math.max(effectiveMin, selectedHeadcount - 10))}
          className={stepBtnClass}
          aria-label="10명 줄이기"
        >
          −10
        </button>
      </div>

      <span className="min-w-[3.5rem] text-center text-[2.5rem] font-extrabold leading-none tabular-nums tracking-tight text-gray-900">
        {selectedHeadcount}
      </span>

      <div className="flex items-center gap-4 sm:gap-5">
        <div className="flex flex-col items-center gap-2">
          <button
            type="button"
            disabled={selectedHeadcount >= maxCapacity}
            onClick={() => onChange(Math.min(maxCapacity, selectedHeadcount + 1))}
            className={circleBtnClass}
            aria-label="1명 늘리기"
          >
            +
          </button>
          <button
            type="button"
            disabled={selectedHeadcount >= maxCapacity}
            onClick={() => onChange(Math.min(maxCapacity, selectedHeadcount + 10))}
            className={stepBtnClass}
            aria-label="10명 늘리기"
          >
            +10
          </button>
        </div>
        <p className="text-sm font-medium text-gray-400 whitespace-nowrap">
          {effectiveMin}명 ~ {maxCapacity}명
        </p>
      </div>
    </div>
  );

  const compactControls = (
    <div className="flex items-center justify-center gap-4">
      <div className="flex flex-col items-center gap-1">
        <button
          type="button"
          disabled={selectedHeadcount <= effectiveMin}
          onClick={() => onChange(Math.max(effectiveMin, selectedHeadcount - 1))}
          className={circleBtnClass}
          aria-label="1명 줄이기"
        >
          −
        </button>
        <button
          type="button"
          disabled={selectedHeadcount <= effectiveMin}
          onClick={() => onChange(Math.max(effectiveMin, selectedHeadcount - 10))}
          className={stepBtnClass}
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
          className={circleBtnClass}
          aria-label="1명 늘리기"
        >
          +
        </button>
        <button
          type="button"
          disabled={selectedHeadcount >= maxCapacity}
          onClick={() => onChange(Math.min(maxCapacity, selectedHeadcount + 10))}
          className={stepBtnClass}
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
        <div className="mt-2">{compactControls}</div>
        <p className="mt-2 text-center text-xs text-gray-500">
          {effectiveMin}명 ~ {maxCapacity}명
        </p>
      </div>
    );
  }

  return (
    <div
      className={`w-full rounded-3xl border border-gray-100 bg-white p-5 shadow-[0_8px_30px_rgba(0,0,0,0.06)] ${className}`}
    >
      <FieldSectionHeader icon={<PeopleFieldIcon />} title="인원수" />
      {panelControls}
    </div>
  );
}
