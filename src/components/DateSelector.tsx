'use client';

import { useMemo } from 'react';

interface DateSelectorProps {
  selectedDate: string | null;
  onChange: (date: string) => void;
}

/** 오늘 이후 14일간의 날짜 목록 생성 (당일 제외) */
function getAvailableDates(): { value: string; label: string; dayOfWeek: string }[] {
  const dates: { value: string; label: string; dayOfWeek: string }[] = [];
  const days = ['일', '월', '화', '수', '목', '금', '토'];
  const now = new Date();

  for (let i = 1; i <= 14; i++) {
    const d = new Date(now);
    d.setDate(now.getDate() + i);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    const value = `${yyyy}-${mm}-${dd}`;
    const dayOfWeek = days[d.getDay()];
    const label = `${parseInt(mm)}/${parseInt(dd)}`;
    dates.push({ value, label, dayOfWeek });
  }
  return dates;
}

export default function DateSelector({ selectedDate, onChange }: DateSelectorProps) {
  const dates = useMemo(() => getAvailableDates(), []);

  return (
    <div>
      <h3 className="text-sm font-semibold text-gray-700">📅 날짜 선택</h3>
      <div className="mt-2 flex gap-2 overflow-x-auto pb-2">
        {dates.map((d) => {
          const isSelected = selectedDate === d.value;
          const isWeekend = d.dayOfWeek === '토' || d.dayOfWeek === '일';
          return (
            <button
              key={d.value}
              type="button"
              onClick={() => onChange(d.value)}
              className={`flex flex-col items-center rounded-lg border px-3 py-2 text-sm transition shrink-0 ${
                isSelected
                  ? 'border-blue-500 bg-blue-50 text-blue-700'
                  : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
              }`}
            >
              <span className="text-xs font-medium">{d.label}</span>
              <span
                className={`text-xs ${
                  isWeekend
                    ? d.dayOfWeek === '일'
                      ? 'text-red-500'
                      : 'text-blue-500'
                    : isSelected
                      ? 'text-blue-600'
                      : 'text-gray-400'
                }`}
              >
                {d.dayOfWeek}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
