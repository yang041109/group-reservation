'use client';

import { useMemo } from 'react';

interface TimeSelectorProps {
  availableTimes: string[];
  reservedTimes?: string[];
  selectedTime: string | null;
  onChange: (time: string) => void;
  /** 타임테이블 시작 시간 (기본 11) */
  startHour?: number;
  /** 타임테이블 종료 시간 (기본 20, 이 시간의 :30까지 표시) */
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

/** Generate all 30-min slots from startHour to endHour:30 */
function generateAllSlots(startHour: number, endHour: number): string[] {
  const slots: string[] = [];
  for (let h = startHour; h <= endHour; h++) {
    slots.push(toTimeStr(h * 60));
    slots.push(toTimeStr(h * 60 + 30));
  }
  return slots;
}

type SlotStatus = 'available' | 'reserved' | 'unavailable';

export default function TimeSelector({
  availableTimes,
  reservedTimes = [],
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

  // All 30-min slots in the range
  const allSlots = useMemo(() => generateAllSlots(startHour, endHour), [startHour, endHour]);

  const getStatus = (time: string): SlotStatus => {
    if (reservedSet.has(time)) return 'reserved';
    if (availableSet.has(time)) return 'available';
    return 'unavailable';
  };

  // Group by hour
  const hours = useMemo(() => {
    const result: number[] = [];
    for (let h = startHour; h <= endHour; h++) result.push(h);
    return result;
  }, [startHour, endHour]);

  // Split into rows of 10 hours max
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
      const s = getStatus(t);
      return s === 'reserved' || s === 'unavailable';
    });
  };

  const handleSlotClick = (time: string) => {
    const status = getStatus(time);
    if (status !== 'available') return;

    if (!startTime || endTime) {
      onChange(time);
    } else {
      const sMin = toMinutes(startTime);
      const tMin = toMinutes(time);

      if (tMin === sMin) {
        onChange(time);
        return;
      }

      const [lo, hi] = sMin < tMin ? [startTime, time] : [time, startTime];

      if (rangeHasBlockedSlot(lo, hi)) {
        onChange(time);
        return;
      }

      onChange(`${lo} - ${hi}`);
    }
  };

  const rangeDuration = useMemo(() => {
    if (!startTime) return 0;
    if (!endTime) return 0.5;
    return (toMinutes(endTime) - toMinutes(startTime) + 30) / 60;
  }, [startTime, endTime]);

  return (
    <div>
      <h3 className="text-sm font-semibold text-gray-700">🕐 예약 시간</h3>
      <div className="mt-3 space-y-3">
        {hourRows.map((rowHours, rowIdx) => (
          <div key={rowIdx}>
            {/* Hour labels — each hour gets equal width (2 slots) */}
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
            {/* Slot bar */}
            <div className="flex h-7 overflow-hidden rounded-md">
              {rowHours.flatMap((hour) => {
                const slot0 = toTimeStr(hour * 60);
                const slot1 = toTimeStr(hour * 60 + 30);
                return [slot0, slot1].map((time) => {
                  const status = getStatus(time);
                  const inRange = isInRange(time);
                  const isStart = time === startTime;

                  let bgClass: string;
                  if (status === 'unavailable') {
                    bgClass = 'bg-gray-200 cursor-not-allowed';
                  } else if (status === 'reserved') {
                    bgClass = 'bg-gray-400 cursor-not-allowed';
                  } else if (isStart && !endTime) {
                    bgClass = 'bg-blue-600';
                  } else if (inRange) {
                    bgClass = 'bg-blue-500';
                  } else {
                    bgClass = 'bg-cyan-400 hover:bg-cyan-500 cursor-pointer';
                  }

                  return (
                    <button
                      key={time}
                      type="button"
                      disabled={status !== 'available'}
                      onClick={() => handleSlotClick(time)}
                      title={`${time}${status === 'reserved' ? ' (예약됨)' : status === 'unavailable' ? ' (불가)' : inRange ? ' (선택됨)' : ''}`}
                      className={`flex-1 border-r border-white/30 last:border-r-0 transition-colors ${bgClass}`}
                      aria-label={`${time}${status === 'reserved' ? ' 예약됨' : status === 'unavailable' ? ' 불가' : ''}`}
                    />
                  );
                });
              })}
            </div>
          </div>
        ))}
      </div>

      {startTime && (
        <p className="mt-2 text-sm text-blue-600 font-medium">
          {endTime
            ? `선택: ${startTime} ~ ${endTime} (${rangeDuration % 1 === 0 ? `${rangeDuration}시간` : `${Math.floor(rangeDuration)}시간 30분`})`
            : `선택: ${startTime} (다른 시간을 클릭하면 범위 선택)`}
        </p>
      )}
    </div>
  );
}
