'use client';

import { generateSlotTimeBlocks, getHourLabels } from '@/lib/slot-hour-range';

/** 메인 검색 카드와 동일한 30분 슬롯 막대 (랜딩 데모용) */
export default function LandingTimeSlotBar({
  startHour = 17,
  endHour = 20,
  slotColors,
}: {
  startHour?: number;
  endHour?: number;
  slotColors?: string[];
}) {
  const crossesMidnight = endHour < startHour;
  const hours = getHourLabels(startHour, endHour, crossesMidnight);
  const slots = generateSlotTimeBlocks(startHour, endHour, crossesMidnight);
  const defaultColors = [
    '#f29da6',
    '#f29da6',
    '#2c9af5',
    '#23cdfc',
    '#23f7ed',
    '#2c9af5',
    '#a7a7a8',
    '#f29da6',
    '#2c9af5',
    '#23cdfc',
  ];
  const colors = slotColors ?? slots.map((_, i) => defaultColors[i % defaultColors.length]);

  return (
    <div>
      <div className="mb-1.5 flex">
        {hours.map((hour) => (
          <div
            key={hour}
            className="text-xs font-bold text-[var(--ink-2)]"
            style={{ width: `${(1 / hours.length) * 100}%` }}
          >
            {hour}
          </div>
        ))}
      </div>
      <div className="flex h-10 overflow-hidden rounded-xl">
        {slots.map((time, i) => (
          <div
            key={time}
            title={time}
            className="flex-1 border-r border-white last:border-r-0"
            style={{ background: colors[i] ?? '#e8ecf2' }}
          />
        ))}
      </div>
      <div className="mt-2 flex flex-wrap items-center justify-center gap-2 text-[10px] text-[var(--ink-3)] sm:gap-3 sm:text-xs">
        <span className="flex items-center gap-1">
          <span className="inline-block h-2.5 w-2.5 rounded bg-[#2c9af5]" />
          여유
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block h-2.5 w-2.5 rounded bg-[#23cdfc]" />
          보통
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block h-2.5 w-2.5 rounded bg-[#23f7ed]" />
          혼잡
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block h-2.5 w-2.5 rounded bg-[#a7a7a8]" />
          거의마감
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block h-2.5 w-2.5 rounded bg-[#f29da6]" />
          마감
        </span>
      </div>
    </div>
  );
}
