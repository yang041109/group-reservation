'use client';

import { useMemo } from 'react';
import type { TimeSlot } from '@/types';
import {
  generateSlotTimeBlocks,
  getHourLabels,
  timeBlockToExtendedMinutes,
} from '@/lib/slot-hour-range';

/** 30분 슬롯 한 칸 너비(px) — 길면 가로 스크롤 */
const SLOT_CELL_PX = 36;

interface TimeSelectorProps {
  availableTimes: string[];
  reservedTimes?: string[];
  /** slots 테이블 기반 타임슬롯 (있으면 히트맵 모드) */
  slots?: TimeSlot[];
  selectedTime: string | null;
  onChange: (time: string) => void;
  startHour?: number;
  endHour?: number;
  /** true면 endHour < startHour (예: 17~3시) 자정 넘김 영업 */
  crossesMidnight?: boolean;
}

type SlotStatus = 'available' | 'reserved' | 'unavailable' | 'full';

/** 점유율 → 배경색 (선택 안 된 상태) */
function getOccupancyBg(ratio: number, status: SlotStatus): string {
  if (status === 'full') return 'bg-[#f29da6] cursor-not-allowed';
  if (status === 'reserved') return 'bg-[#f29da6] cursor-not-allowed';
  if (status === 'unavailable') return 'bg-[#f29da6] cursor-not-allowed';
  if (ratio >= 0.8) return 'bg-[#a7a7a8] hover:bg-[#9a9a9b] cursor-pointer';
  if (ratio >= 0.5) return 'bg-[#23f7ed] hover:bg-[#1de5db] cursor-pointer';
  if (ratio > 0) return 'bg-[#23cdfc] hover:bg-[#1bb9e8] cursor-pointer';
  return 'bg-[#2c9af5] hover:bg-[#2488d9] cursor-pointer';
}

export default function TimeSelector({
  availableTimes,
  reservedTimes = [],
  slots,
  selectedTime,
  onChange,
  startHour = 11,
  endHour = 20,
  crossesMidnight = false,
}: TimeSelectorProps) {
  const { startTime, endTime } = useMemo(() => {
    if (!selectedTime) return { startTime: null, endTime: null };
    if (selectedTime.includes(' - ')) {
      const [s, e] = selectedTime.split(' - ');
      return { startTime: s.trim(), endTime: e.trim() };
    }
    return { startTime: selectedTime, endTime: null };
  }, [selectedTime]);

  const ext = useMemo(
    () => (t: string) =>
      timeBlockToExtendedMinutes(t, crossesMidnight, startHour, endHour),
    [crossesMidnight, startHour, endHour],
  );

  const availableSet = useMemo(() => new Set(availableTimes), [availableTimes]);
  const reservedSet = useMemo(() => new Set(reservedTimes), [reservedTimes]);

  const slotMap = useMemo(() => {
    const map = new Map<string, TimeSlot>();
    if (slots) {
      for (const s of slots) map.set(s.timeBlock, s);
    }
    return map;
  }, [slots]);

  const allSlots = useMemo(
    () => generateSlotTimeBlocks(startHour, endHour, crossesMidnight),
    [startHour, endHour, crossesMidnight],
  );

  const getSlotInfo = (time: string): { status: SlotStatus; remaining: number; maxPeople: number; currentHeadcount: number; ratio: number } => {
    const slot = slotMap.get(time);
    if (slot) {
      const remaining = slot.maxPeople - slot.currentHeadcount;
      const ratio = slot.currentHeadcount / slot.maxPeople;
      if (!slot.isAvailable && remaining <= 0) return { status: 'full', remaining: 0, maxPeople: slot.maxPeople, currentHeadcount: slot.currentHeadcount, ratio: 1 };
      if (!slot.isAvailable) return { status: 'reserved', remaining, maxPeople: slot.maxPeople, currentHeadcount: slot.currentHeadcount, ratio };
      return { status: 'available', remaining, maxPeople: slot.maxPeople, currentHeadcount: slot.currentHeadcount, ratio };
    }
    if (reservedSet.has(time)) return { status: 'reserved', remaining: 0, maxPeople: 0, currentHeadcount: 0, ratio: 1 };
    if (availableSet.has(time)) return { status: 'available', remaining: 0, maxPeople: 0, currentHeadcount: 0, ratio: 0 };
    return { status: 'unavailable', remaining: 0, maxPeople: 0, currentHeadcount: 0, ratio: 0 };
  };

  const hours = useMemo(
    () => getHourLabels(startHour, endHour, crossesMidnight),
    [startHour, endHour, crossesMidnight],
  );

  const isInRange = (time: string): boolean => {
    if (!startTime) return false;
    if (!endTime) return time === startTime;
    const t = ext(time);
    return t >= ext(startTime) && t <= ext(endTime);
  };

  const rangeHasBlockedSlot = (from: string, to: string): boolean => {
    const lo = ext(from);
    const hi = ext(to);
    return allSlots.some((slotT) => {
      const m = ext(slotT);
      if (m < lo || m > hi) return false;
      const info = getSlotInfo(slotT);
      return info.status !== 'available';
    });
  };

  const handleSlotClick = (time: string) => {
    const info = getSlotInfo(time);
    if (info.status !== 'available') return;

    if (!startTime || endTime) {
      onChange(time);
    } else {
      const e1 = ext(startTime);
      const e2 = ext(time);
      if (e2 === e1) {
        onChange(time);
        return;
      }
      const [loStr, hiStr] = e1 <= e2 ? [startTime, time] : [time, startTime];
      if (rangeHasBlockedSlot(loStr, hiStr)) {
        onChange(time);
        return;
      }
      onChange(`${loStr} - ${hiStr}`);
    }
  };

  const rangeDuration = useMemo(() => {
    if (!startTime) return 0;
    if (!endTime) return 0.5;
    return (ext(endTime) - ext(startTime) + 30) / 60;
  }, [startTime, endTime, ext]);

  const rangeMinRemaining = useMemo(() => {
    if (!startTime) return null;
    const lo = ext(startTime);
    const hi = endTime ? ext(endTime) : lo;
    let min = Infinity;
    for (const t of allSlots) {
      const m = ext(t);
      if (m >= lo && m <= hi) {
        const info = getSlotInfo(t);
        if (info.maxPeople > 0) min = Math.min(min, info.remaining);
      }
    }
    return min === Infinity ? null : min;
  }, [startTime, endTime, allSlots, ext, slotMap, availableSet, reservedSet]);

  const labelWidth = SLOT_CELL_PX * 2;

  return (
    <div>
      <h3 className="text-sm font-semibold text-gray-700">🕐 예약 시간</h3>
      {crossesMidnight && (
        <p className="mt-1 text-[10px] text-gray-500">
          자정 이후 막대는 <span className="font-medium">다음 날 새벽</span> 시간입니다. (예: 0 = 00:00)
        </p>
      )}
      <p className="mt-1 text-[10px] text-gray-400">
        막대가 길면 좌우로 스크롤할 수 있어요.
      </p>

      <div
        className="mt-2 overflow-x-auto overflow-y-hidden overscroll-x-contain pb-1 [-webkit-overflow-scrolling:touch]"
        style={{ WebkitOverflowScrolling: 'touch' }}
      >
        <div className="inline-block min-w-min align-top">
          <div className="flex border-b border-gray-100 pb-0.5">
            {hours.map((hour) => (
              <div
                key={`h-${hour}-${startHour}-${endHour}-${crossesMidnight}`}
                className="flex-shrink-0 text-left text-xs font-medium text-gray-500 pl-0.5"
                style={{ width: labelWidth }}
              >
                {hour}
              </div>
            ))}
          </div>
          <div className="flex h-9 overflow-hidden rounded-md">
            {allSlots.map((time) => {
              const info = getSlotInfo(time);
              const inRange = isInRange(time);
              const isStart = time === startTime;

              let bgClass: string;
              if (isStart && !endTime) {
                bgClass = 'bg-blue-600';
              } else if (inRange) {
                bgClass = 'bg-blue-500';
              } else {
                bgClass = getOccupancyBg(info.ratio, info.status);
              }

              const showCount = info.maxPeople > 0 && info.status !== 'unavailable';
              const remaining = info.remaining;

              let titleText = time;
              if (info.status === 'full') titleText = `${time} (마감)`;
              else if (info.status === 'reserved') titleText = `${time} (마감)`;
              else if (info.status === 'unavailable') titleText = `${time} (마감)`;
              else if (showCount) titleText = `${time} — 잔여 ${remaining}명 / 최대 ${info.maxPeople}명`;

              return (
                <button
                  key={time}
                  type="button"
                  disabled={info.status !== 'available'}
                  onClick={() => handleSlotClick(time)}
                  title={titleText}
                  style={{ width: SLOT_CELL_PX, minWidth: SLOT_CELL_PX }}
                  className={`flex-shrink-0 border-r border-white/30 last:border-r-0 transition-colors relative flex items-center justify-center ${bgClass}`}
                  aria-label={titleText}
                >
                  {showCount && (
                    <span className={`text-[9px] font-bold leading-none ${
                      inRange || isStart ? 'text-white' : info.status === 'full' ? 'text-white/80' : 'text-gray-700/70'
                    }`}>
                      {remaining > 0 ? remaining : '✕'}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-3 text-[10px] text-gray-500">
        <span className="flex items-center gap-1"><span className="inline-block h-2.5 w-2.5 rounded-sm bg-[#2c9af5]" />여유</span>
        <span className="flex items-center gap-1"><span className="inline-block h-2.5 w-2.5 rounded-sm bg-[#23cdfc]" />보통</span>
        <span className="flex items-center gap-1"><span className="inline-block h-2.5 w-2.5 rounded-sm bg-[#23f7ed]" />혼잡</span>
        <span className="flex items-center gap-1"><span className="inline-block h-2.5 w-2.5 rounded-sm bg-[#a7a7a8]" />거의마감</span>
        <span className="flex items-center gap-1"><span className="inline-block h-2.5 w-2.5 rounded-sm bg-[#f29da6]" />마감</span>
        <span className="text-gray-400">숫자 = 잔여 인원</span>
      </div>

      {startTime && (
        <div className="mt-2 space-y-1">
          <p className="text-sm text-blue-600 font-medium">
            {endTime
              ? (() => {
                  // 끝 시간 = 마지막 슬롯 + 30분 (슬롯이 30분 단위이므로)
                  const endMin = ext(endTime) + 30;
                  const endH = Math.floor(endMin / 60) % 24;
                  const endM = endMin % 60;
                  const displayEnd = `${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}`;
                  const duration = (ext(endTime) - ext(startTime) + 30) / 60;
                  return `선택: ${startTime} ~ ${displayEnd} (${duration % 1 === 0 ? `${duration}시간` : `${Math.floor(duration)}시간 30분`})`;
                })()
              : `선택: ${startTime} (다른 시간을 클릭하면 범위 선택)`}
          </p>
          {rangeMinRemaining !== null && (
            <p className={`text-sm font-medium ${rangeMinRemaining > 10 ? 'text-emerald-600' : rangeMinRemaining > 0 ? 'text-orange-600' : 'text-red-600'}`}>
              👥 선택 시간대 최대 수용 가능 인원: {rangeMinRemaining}명
            </p>
          )}
        </div>
      )}
    </div>
  );
}
