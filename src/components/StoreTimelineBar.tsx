'use client';

import type { TimeSlot } from '@/types';
import {
  generateSlotTimeBlocks,
  getHourLabels,
  getHourLabelsFromSlotBlocks,
} from '@/lib/slot-hour-range';
import {
  getOccupancyColorClass,
  SLOT_CLOSED_CLASS,
  TIMELINE_LEGEND,
} from '@/lib/store-timeline-colors';

export type TimelineBarSlotState = {
  timeBlock: string;
  /** 고객 화면·검색 카드용 */
  barClass: string;
  title: string;
  /** 사장님 수동 마감 여부 */
  ownerClosed?: boolean;
  /** 잔여 인원 (있을 때) */
  remaining?: number;
};

function slotToBarState(
  time: string,
  slot: TimeSlot | undefined,
  ownerClosed: boolean,
): TimelineBarSlotState {
  if (ownerClosed) {
    return {
      timeBlock: time,
      barClass: `${SLOT_CLOSED_CLASS} ring-2 ring-orange-400 ring-inset`,
      title: `${time} (사장님 마감)`,
      ownerClosed: true,
    };
  }
  if (!slot) {
    return {
      timeBlock: time,
      barClass: SLOT_CLOSED_CLASS,
      title: `${time} (마감)`,
    };
  }
  const remaining = slot.maxPeople - slot.currentHeadcount;
  const ratio = slot.maxPeople > 0 ? slot.currentHeadcount / slot.maxPeople : 1;
  if (!slot.isAvailable) {
    return {
      timeBlock: time,
      barClass: SLOT_CLOSED_CLASS,
      title: `${time} (마감)`,
      remaining: 0,
    };
  }
  return {
    timeBlock: time,
    barClass: getOccupancyColorClass(ratio),
    title: `${time} — 잔여 ${remaining}명`,
    remaining,
  };
}

export default function StoreTimelineBar({
  slots,
  slotStartHour,
  slotEndHour,
  crossesMidnight = false,
  ownerClosedBlocks = [],
  closedOnDate = false,
  showLegend = true,
  barHeightClass = 'h-9',
  onBlockClick,
  highlightRange,
}: {
  slots: TimeSlot[];
  slotStartHour: number;
  slotEndHour: number;
  crossesMidnight?: boolean;
  ownerClosedBlocks?: string[];
  closedOnDate?: boolean;
  showLegend?: boolean;
  barHeightClass?: string;
  onBlockClick?: (timeBlock: string) => void;
  /** 선택 중인 구간 미리보기 [start, end] */
  highlightRange?: [string, string] | null;
}) {
  const ownerSet = new Set(ownerClosedBlocks);
  const timelineMap = new Map(slots.map((s) => [s.timeBlock, s]));
  const allSlots =
    slots.length > 0
      ? slots.map((s) => s.timeBlock)
      : generateSlotTimeBlocks(slotStartHour, slotEndHour, crossesMidnight);
  const hours =
    allSlots.length > 0
      ? getHourLabelsFromSlotBlocks(allSlots)
      : getHourLabels(slotStartHour, slotEndHour, crossesMidnight);

  const rangeSet = new Set<string>();
  if (highlightRange) {
    const [a, b] = highlightRange;
    const i0 = allSlots.indexOf(a);
    const i1 = allSlots.indexOf(b);
    if (i0 >= 0 && i1 >= 0) {
      const lo = Math.min(i0, i1);
      const hi = Math.max(i0, i1);
      for (let i = lo; i <= hi; i++) rangeSet.add(allSlots[i]);
    }
  }

  if (closedOnDate) {
    return (
      <p className="rounded-lg bg-gray-100 px-3 py-2 text-center text-sm text-gray-500">오늘 휴무</p>
    );
  }

  return (
    <div>
      <div className="mb-1 flex">
        {hours.map((hour) => (
          <div
            key={hour}
            className="text-center text-sm font-bold text-gray-800"
            style={{ width: `${(1 / hours.length) * 100}%` }}
          >
            {hour}
          </div>
        ))}
      </div>
      <div className={`flex overflow-hidden rounded-lg ${barHeightClass}`}>
        {allSlots.map((time) => {
          const slot = timelineMap.get(time);
          const isOwnerClosed = ownerSet.has(time);
          const state = slotToBarState(time, slot, isOwnerClosed);
          const inRange = rangeSet.has(time);
          const clickable = !!onBlockClick;
          return (
            <button
              key={time}
              type="button"
              title={state.title}
              disabled={!clickable}
              onClick={() => onBlockClick?.(time)}
              className={`flex-1 border-r border-white last:border-r-0 ${state.barClass} ${
                clickable ? 'cursor-pointer hover:opacity-90' : ''
              } ${inRange ? 'outline outline-2 outline-offset-[-2px] outline-blue-600' : ''}`}
            />
          );
        })}
      </div>
      {showLegend ? (
        <div className="mt-2 flex flex-wrap items-center justify-center gap-2 text-[10px] text-gray-500 sm:gap-3 sm:text-xs">
          {TIMELINE_LEGEND.map((item) => (
            <span key={item.label} className="flex items-center gap-1">
              <span className={`inline-block h-2.5 w-2.5 rounded-sm ${item.color}`} />
              {item.label}
            </span>
          ))}
          {onBlockClick ? (
            <span className="flex items-center gap-1">
              <span className="inline-block h-2.5 w-2.5 rounded-sm ring-2 ring-orange-400 bg-[#f29da6]" />
              사장님 마감
            </span>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
