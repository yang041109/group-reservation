'use client';

import { useState, useMemo } from 'react';
import { CalendarFieldIcon, FieldSectionHeader } from '@/components/icons/BookingFieldIcons';

interface DateSelectorProps {
  selectedDate: string | null;
  onChange: (date: string) => void;
  unavailableDates?: string[];
  /** panel: 흰 카드+그림자(검색), embedded: 랜딩 위젯 안 */
  variant?: 'panel' | 'embedded';
}

const DAY_LABELS = ['일', '월', '화', '수', '목', '금', '토'];

function toDateStr(y: number, m: number, d: number): string {
  return `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

function getTodayStr(): string {
  const now = new Date();
  return toDateStr(now.getFullYear(), now.getMonth(), now.getDate());
}

function formatHeader(year: number, month: number): string {
  return `${year}년 ${month + 1}월`;
}

export default function DateSelector({
  selectedDate,
  onChange,
  unavailableDates = [],
  variant = 'panel',
}: DateSelectorProps) {
  const today = useMemo(() => getTodayStr(), []);
  const now = useMemo(() => new Date(), []);

  const [viewYear, setViewYear] = useState(now.getFullYear());
  const [viewMonth, setViewMonth] = useState(now.getMonth());

  const unavailableSet = useMemo(() => new Set(unavailableDates), [unavailableDates]);

  const calendarDays = useMemo(() => {
    const firstDay = new Date(viewYear, viewMonth, 1).getDay();
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
    const daysInPrevMonth = new Date(viewYear, viewMonth, 0).getDate();

    const cells: { date: string; day: number; isCurrentMonth: boolean }[] = [];

    for (let i = firstDay - 1; i >= 0; i--) {
      const d = daysInPrevMonth - i;
      const prevMonth = viewMonth === 0 ? 11 : viewMonth - 1;
      const prevYear = viewMonth === 0 ? viewYear - 1 : viewYear;
      cells.push({
        date: toDateStr(prevYear, prevMonth, d),
        day: d,
        isCurrentMonth: false,
      });
    }

    for (let d = 1; d <= daysInMonth; d++) {
      cells.push({
        date: toDateStr(viewYear, viewMonth, d),
        day: d,
        isCurrentMonth: true,
      });
    }

    const remaining = 7 - (cells.length % 7);
    if (remaining < 7) {
      const nextMonth = viewMonth === 11 ? 0 : viewMonth + 1;
      const nextYear = viewMonth === 11 ? viewYear + 1 : viewYear;
      for (let d = 1; d <= remaining; d++) {
        cells.push({
          date: toDateStr(nextYear, nextMonth, d),
          day: d,
          isCurrentMonth: false,
        });
      }
    }

    return cells;
  }, [viewYear, viewMonth]);

  const goToPrevMonth = () => {
    if (viewMonth === 0) {
      setViewYear(viewYear - 1);
      setViewMonth(11);
    } else {
      setViewMonth(viewMonth - 1);
    }
  };

  const goToNextMonth = () => {
    if (viewMonth === 11) {
      setViewYear(viewYear + 1);
      setViewMonth(0);
    } else {
      setViewMonth(viewMonth + 1);
    }
  };

  const canGoPrev =
    viewYear > now.getFullYear() ||
    (viewYear === now.getFullYear() && viewMonth > now.getMonth());

  const inner = (
    <>
      <FieldSectionHeader icon={<CalendarFieldIcon />} title="날짜 선택" />

      <div className="mb-4 flex items-center justify-center gap-4">
        <button
          type="button"
          disabled={!canGoPrev}
          onClick={goToPrevMonth}
          className="flex h-8 w-8 items-center justify-center rounded-lg text-lg text-gray-500 hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-30"
          aria-label="이전 달"
        >
          ‹
        </button>
        <span className="min-w-[7rem] text-center text-sm font-semibold text-gray-800">
          {formatHeader(viewYear, viewMonth)}
        </span>
        <button
          type="button"
          onClick={goToNextMonth}
          className="flex h-8 w-8 items-center justify-center rounded-lg text-lg text-gray-500 hover:bg-gray-100"
          aria-label="다음 달"
        >
          ›
        </button>
      </div>

      <div className="grid grid-cols-7 mb-1">
        {DAY_LABELS.map((label, i) => (
          <div
            key={label}
            className={`py-1 text-center text-xs font-semibold ${
              i === 0 ? 'text-red-500' : i === 6 ? 'text-blue-500' : 'text-gray-500'
            }`}
          >
            {label}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-y-0.5">
        {calendarDays.map((cell, idx) => {
          const isPast = cell.date < today;
          const isUnavailable = unavailableSet.has(cell.date);
          const isDisabled = isPast || isUnavailable || !cell.isCurrentMonth;
          const isSelected = selectedDate === cell.date;
          const dayOfWeek = new Date(`${cell.date}T12:00:00`).getDay();

          let textColor = 'text-gray-900';
          if (!cell.isCurrentMonth || isPast) textColor = 'text-gray-300';
          else if (isUnavailable) textColor = 'text-gray-400';
          else if (dayOfWeek === 0) textColor = 'text-red-500';
          else if (dayOfWeek === 6) textColor = 'text-blue-500';

          return (
            <button
              key={idx}
              type="button"
              disabled={isDisabled}
              onClick={() => onChange(cell.date)}
              className={`relative mx-auto flex h-10 w-10 items-center justify-center text-sm font-medium transition
                ${isSelected ? 'rounded-xl bg-blue-500 text-white shadow-md shadow-blue-500/35' : 'rounded-xl'}
                ${!isSelected && !isDisabled ? 'hover:bg-gray-100' : ''}
                ${isDisabled && !isSelected ? 'cursor-not-allowed' : ''}
                ${!isSelected ? textColor : ''}
              `}
              aria-label={cell.date}
              aria-pressed={isSelected}
            >
              {cell.day}
            </button>
          );
        })}
      </div>
    </>
  );

  if (variant === 'embedded') {
    return <div className="w-full">{inner}</div>;
  }

  return (
    <div className="rounded-3xl border border-gray-100 bg-white p-5 shadow-[0_8px_30px_rgba(0,0,0,0.06)]">
      {inner}
    </div>
  );
}
