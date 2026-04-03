'use client';

import { useMemo } from 'react';
import type { TimeSlot } from '@/types';

interface TimeSelectorProps {
  availableTimes: string[];
  reservedTimes?: string[];
  /** slots 테이블 기반 타임슬롯 (있으면 히트맵 모드) */
  slots?: TimeSlot[];
  selectedTime: string | null;
  onChange: (time: string) => void;
  startHour?: number;
  endHour?: number;
}

function toMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
}

function toTimeStr(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

function generateAllSlots(startHour: number, endHour: number): string[] {
  const slots: string[] = [];
  for (let h = startHour; h <= endHour; h++) {
    slots.push(toTimeStr(h * 60));
    slots.push(toTimeStr(h * 60 + 30));
  }
  return slots;
}

type SlotStatus = 'available' | 'reserved' | 'unavailable' | 'full';

/** 점유율 → 배경색 (선택 안 된 상태) */
function getOccupancyBg(ratio: number, status: SlotStatus): string {
  if (status === 'full') return 'bg-red-400 cursor-not-allowed';
  if (status === 'reserved') return 'bg-gray-400 cursor-not-allowed';
  if (status === 'unavailable') return 'bg-gray-200 cursor-not-allowed';
  // available
  if (ratio >= 0.8) return 'bg-orange-300 hover:bg-orange-400 cursor-pointer';
  if (ratio >= 0.5) return 'bg-yellow-300 hover:bg-yellow-400 cursor-pointer';
  if (ratio > 0) return 'bg-emerald-300 hover:bg-emerald-400 cursor-pointer';
  return 'bg-emerald-400 hover:bg-emerald-500 cursor-pointer';
}

export default function TimeSelector({
  availableTimes,
  reservedTimes = [],
  slots,
  selectedTime,
  onChange,
  startHour = 11,
  endHour = 20,
}: TimeSelectorProps) {
  const { startTime, endTime } = useMemo(() => {
    if (!selectedTime) return { startTime: null, endTime: null };
    if (selectedTime.includes(' - ')) {
      const [s, e] = selectedTime.split(' - ');
      return { startTime: s, endTime: e };
    }
    return { startTime: selectedTime, endTime: null };
  }, [selectedTime]);

  const availableSet = useMemo(() => new Set(availableTimes), [availableTimes]);
  const reservedSet = useMemo(() => new Set(reservedTimes), [reservedTimes]);

  // slots 맵 구성
  const slotMap = useMemo(() => {
    const map = new Map<string, TimeSlot>();
    if (slots) {
      for (const s of slots) map.set(s.timeBlock, s);
    }
    return map;
  }, [slots]);

  const allSlots = useMemo(() => generateAllSlots(startHour, endHour), [startHour, endHour]);

  const getSlotInfo = (time: string): { status: SlotStatus; remaining: number; maxPeople: number; currentHeadcount: number; ratio: number } => {
    const slot = slotMap.get(time);
    if (slot) {
      const remaining = slot.maxPeople - slot.currentHeadcount;
      const ratio = slot.currentHeadcount / slot.maxPeople;
      if (!slot.isAvailable && remaining <= 0) return { status: 'full', remaining: 0, maxPeople: slot.maxPeople, currentHeadcount: slot.currentHeadcount, ratio: 1 };
      if (!slot.isAvailable) return { status: 'reserved', remaining, maxPeople: slot.maxPeople, currentHeadcount: slot.currentHeadcount, ratio };
      return { status: 'available', remaining, maxPeople: slot.maxPeople, currentHeadcount: slot.currentHeadcount, ratio };
    }
    // 폴백
    if (reservedSet.has(time)) return { status: 'reserved', remaining: 0, maxPeople: 0, currentHeadcount: 0, ratio: 1 };
    if (availableSet.has(time)) return { status: 'available', remaining: 0, maxPeople: 0, currentHeadcount: 0, ratio: 0 };
    return { status: 'unavailable', remaining: 0, maxPeople: 0, currentHeadcount: 0, ratio: 0 };
  };

  const hours = useMemo(() => {
    const result: number[] = [];
    for (let h = startHour; h <= endHour; h++) result.push(h);
    return result;
  }, [startHour, endHour]);

  const ROW_SIZE = 10;
  const hourRows: number[][] = [];
  for (let i = 0; i < hours.length; i += ROW_SIZE) {
    hourRows.push(hours.slice(i, i + ROW_SIZE));
  }

  const isInRange = (time: string): boolean => {
    if (!startTime) return false;
    if (!endTime) return time === startTime;
    const t = toMinutes(time);
    return t >= toMinutes(startTime) && t <= toMinutes(endTime);
  };

  const rangeHasBlockedSlot = (from: string, to: string): boolean => {
    const lo = toMinutes(from);
    const hi = toMinutes(to);
    return allSlots.some((t) => {
      const m = toMinutes(t);
      if (m < lo || m > hi) return false;
      const info = getSlotInfo(t);
      return info.status !== 'available';
    });
  };

  const handleSlotClick = (time: string) => {
    const info = getSlotInfo(time);
    if (info.status !== 'available') return;

    if (!startTime || endTime) {
      onChange(time);
    } else {
      const sMin = toMinutes(startTime);
      const tMin = toMinutes(time);
      if (tMin === sMin) { onChange(time); return; }
      const [lo, hi] = sMin < tMin ? [startTime, time] : [time, startTime];
      if (rangeHasBlockedSlot(lo, hi)) { onChange(time); return; }
      onChange(`${lo} - ${hi}`);
    }
  };

  const rangeDuration = useMemo(() => {
    if (!startTime) return 0;
    if (!endTime) return 0.5;
    return (toMinutes(endTime) - toMinutes(startTime) + 30) / 60;
  }, [startTime, endTime]);

  // 선택 범위 내 최소 잔여 인원 계산
  const rangeMinRemaining = useMemo(() => {
    if (!startTime) return null;
    const lo = toMinutes(startTime);
    const hi = endTime ? toMinutes(endTime) : lo;
    let min = Infinity;
    for (const t of allSlots) {
      const m = toMinutes(t);
      if (m >= lo && m <= hi) {
        const info = getSlotInfo(t);
        if (info.maxPeople > 0) min = Math.min(min, info.remaining);
      }
    }
    return min === Infinity ? null : min;
  }, [startTime, endTime, allSlots, slotMap]);

  return (
    <div>
      <h3 className="text-sm font-semibold text-gray-700">🕐 예약 시간</h3>
      <div className="mt-3 space-y-3">
        {hourRows.map((rowHours, rowIdx) => (
          <div key={rowIdx}>
            <div className="flex">
              {rowHours.map((hour) => (
                <div
                  key={hour}
                  className="text-xs font-medium text-gray-500"
                  style={{ width: `${(1 / rowHours.length) * 100}%` }}
                >
                  {hour}
                </div>
              ))}
            </div>
            {/* 히트맵 슬롯 바 */}
            <div className="flex h-9 overflow-hidden rounded-md">
              {rowHours.flatMap((hour) => {
                const slot0 = toTimeStr(hour * 60);
                const slot1 = toTimeStr(hour * 60 + 30);
                return [slot0, slot1].map((time) => {
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

                  // 잔여 인원 텍스트 (슬롯 데이터가 있을 때만)
                  const showCount = info.maxPeople > 0 && info.status !== 'unavailable';
                  const remaining = info.remaining;

                  let titleText = time;
                  if (info.status === 'full') titleText = `${time} (마감)`;
                  else if (info.status === 'reserved') titleText = `${time} (예약불가)`;
                  else if (info.status === 'unavailable') titleText = `${time} (불가)`;
                  else if (showCount) titleText = `${time} — 잔여 ${remaining}명 / 최대 ${info.maxPeople}명`;

                  return (
                    <button
                      key={time}
                      type="button"
                      disabled={info.status !== 'available'}
                      onClick={() => handleSlotClick(time)}
                      title={titleText}
                      className={`flex-1 border-r border-white/30 last:border-r-0 transition-colors relative flex items-center justify-center ${bgClass}`}
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
                });
              })}
            </div>
          </div>
        ))}
      </div>

      {/* 범례 */}
      <div className="mt-2 flex flex-wrap items-center gap-3 text-[10px] text-gray-500">
        <span className="flex items-center gap-1"><span className="inline-block h-2.5 w-2.5 rounded-sm bg-emerald-400" />여유</span>
        <span className="flex items-center gap-1"><span className="inline-block h-2.5 w-2.5 rounded-sm bg-yellow-300" />보통</span>
        <span className="flex items-center gap-1"><span className="inline-block h-2.5 w-2.5 rounded-sm bg-orange-300" />혼잡</span>
        <span className="flex items-center gap-1"><span className="inline-block h-2.5 w-2.5 rounded-sm bg-red-400" />마감</span>
        <span className="flex items-center gap-1"><span className="inline-block h-2.5 w-2.5 rounded-sm bg-gray-200" />불가</span>
        <span className="text-gray-400">숫자 = 잔여 인원</span>
      </div>

      {startTime && (
        <div className="mt-2 space-y-1">
          <p className="text-sm text-blue-600 font-medium">
            {endTime
              ? `선택: ${startTime} ~ ${endTime} (${rangeDuration % 1 === 0 ? `${rangeDuration}시간` : `${Math.floor(rangeDuration)}시간 30분`})`
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
