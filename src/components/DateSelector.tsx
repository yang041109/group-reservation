'use client';

import { useState, useMemo } from 'react';

interface DateSelectorProps {
  selectedDate: string | null;
  onChange: (date: string) => void;
  /** YYYY-MM-DD 형식의 예약 불가 날짜 목록 */
  unavailableDates?: string[];
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
}: DateSelectorProps) {
  const today = useMemo(() => getTodayStr(), []);
  const now = useMemo(() => new Date(), []);

  const [viewYear, setViewYear] = useState(now.getFullYear());
  const [viewMonth, setViewMonth] = useState(now.getMonth());

  const unavailableSet = useMemo(() => new Set(unavailableDates), [unavailableDates]);

  // Build calendar grid
  const calendarDays = useMemo(() => {
    const firstDay = new Date(viewYear, viewMonth, 1).getDay();
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
    const daysInPrevMonth = new Date(viewYear, viewMonth, 0).getDate();

    const cells: { date: string; day: number; isCurrentMonth: boolean }[] = [];

    // Previous month padding
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

    // Current month
    for (let d = 1; d <= daysInMonth; d++) {
      cells.push({
        date: toDateStr(viewYear, viewMonth, d),
        day: d,
        isCurrentMonth: true,
      });
    }

    // Next month padding (fill to complete last row)
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

  // Don't allow navigating before current month
  const canGoPrev =
    viewYear > now.getFullYear() ||
    (viewYear === now.getFullYear() && viewMonth > now.getMonth());

  return (
    <div>
      <h3 className="text-sm font-semibold text-gray-700">📅 날짜 선택</h3>
      <div className="mt-2 rounded-xl border border-gray-200 bg-white p-4">
        {/* Month navigation */}
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-semibold text-gray-800">
            {formatHeader(viewYear, viewMonth)}
          </span>
          <div className="flex gap-1">
            <button
              type="button"
              disabled={!canGoPrev}
              onClick={goToPrevMonth}
              className="flex h-7 w-7 items-center justify-center rounded text-gray-500 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed"
              aria-label="이전 달"
            >
              ▲
            </button>
            <button
              type="button"
              onClick={goToNextMonth}
              className="flex h-7 w-7 items-center justify-center rounded text-gray-500 hover:bg-gray-100"
              aria-label="다음 달"
            >
              ▼
            </button>
          </div>
        </div>

        {/* Day of week headers */}
        <div className="grid grid-cols-7 mb-1">
          {DAY_LABELS.map((label, i) => (
            <div
              key={label}
              className={`text-center text-xs font-semibold py-1 ${
                i === 0 ? 'text-red-400' : i === 6 ? 'text-blue-400' : 'text-gray-500'
              }`}
            >
              {label}
            </div>
          ))}
        </div>

        {/* Calendar grid */}
        <div className="grid grid-cols-7">
          {calendarDays.map((cell, idx) => {
            const isPast = cell.date <= today;
            const isUnavailable = unavailableSet.has(cell.date);
            const isDisabled = isPast || isUnavailable || !cell.isCurrentMonth;
            const isSelected = selectedDate === cell.date;
            const dayOfWeek = new Date(cell.date + 'T00:00:00').getDay();

            let textColor = 'text-gray-900';
            if (!cell.isCurrentMonth) textColor = 'text-gray-300';
            else if (isPast) textColor = 'text-gray-300';
            else if (isUnavailable) textColor = 'text-gray-400';
            else if (dayOfWeek === 0) textColor = 'text-red-500';
            else if (dayOfWeek === 6) textColor = 'text-blue-500';

            return (
              <button
                key={idx}
                type="button"
                disabled={isDisabled}
                onClick={() => onChange(cell.date)}
                className={`relative flex h-10 items-center justify-center text-sm transition rounded-full
                  ${isSelected ? 'bg-blue-500 text-white' : ''}
                  ${!isSelected && !isDisabled ? 'hover:bg-gray-100' : ''}
                  ${isDisabled && !isSelected ? 'cursor-not-allowed' : ''}
                  ${!isSelected ? textColor : ''}
                `}
                aria-label={cell.date}
              >
                {cell.day}
                {isUnavailable && cell.isCurrentMonth && !isPast && (
                  <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 text-[8px] text-gray-400">
                    마감
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
