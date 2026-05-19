'use client';

import { useEffect, useState } from 'react';
import { FieldSectionHeader, PeopleFieldIcon } from '@/components/icons/BookingFieldIcons';

interface HeadcountSelectorProps {
  maxCapacity: number;
  minCapacity?: number;
  selectedHeadcount: number;
  onChange: (headcount: number) => void;
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
  className = '',
}: HeadcountSelectorProps) {
  const effectiveMin = Math.max(0, minCapacity);
  const [draft, setDraft] = useState(String(selectedHeadcount));

  useEffect(() => {
    setDraft(String(selectedHeadcount));
  }, [selectedHeadcount]);

  const commitDraft = () => {
    const parsed = parseInt(draft.replace(/\D/g, ''), 10);
    if (Number.isNaN(parsed)) {
      setDraft(String(selectedHeadcount));
      return;
    }
    const clamped = Math.min(maxCapacity, Math.max(effectiveMin, parsed));
    onChange(clamped);
    setDraft(String(clamped));
  };

  return (
    <div
      className={`w-full rounded-3xl border border-gray-100 bg-white p-5 shadow-[0_8px_30px_rgba(0,0,0,0.06)] ${className}`}
    >
      <FieldSectionHeader icon={<PeopleFieldIcon />} title="인원수" />
      <div className="flex flex-col items-center gap-3">
        <div className="flex flex-nowrap items-center justify-center gap-x-6 sm:gap-x-10">
          <div className="flex shrink-0 flex-col items-center gap-2">
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

          <label className="flex shrink-0 items-center justify-center px-1">
            <span className="sr-only">인원수 직접 입력</span>
            <input
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              aria-label="인원수"
              value={draft}
              onChange={(e) => setDraft(e.target.value.replace(/[^\d]/g, ''))}
              onBlur={commitDraft}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  commitDraft();
                  (e.target as HTMLInputElement).blur();
                }
              }}
              className="w-[4.5rem] border-0 bg-transparent text-center text-[2.5rem] font-extrabold leading-none tabular-nums tracking-tight text-gray-900 outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2 rounded-lg"
            />
          </label>

          <div className="flex shrink-0 flex-col items-center gap-2">
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
        </div>
        <p className="text-sm font-medium text-gray-400">
          {effectiveMin}명 ~ {maxCapacity}명
        </p>
      </div>
    </div>
  );
}
