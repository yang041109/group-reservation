'use client';

import { useMemo } from 'react';

interface TimeSelectorProps {
  availableTimes: string[];
  reservedTimes?: string[];
  selectedTime: string | null;
  onChange: (time: string) => void;
}

/** Parse "HH:mm" → hour number for grouping */
function parseHour(time: string): number {
  return parseInt(time.split(':')[0], 10);
}

/** Parse "HH:mm" → total minutes for comparison */
function toMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
}

/**
 * TimeSelector with range selection.
 *
 * First click sets the start time, second click sets the end time.
 * The range between start and end is highlighted.
 * Clicking again resets and starts a new selection.
 *
 * The `selectedTime` prop stores the range as "HH:mm - HH:mm" or a single "HH:mm".
 */
export default function TimeSelector({
  availableTimes,
  reservedTimes = [],
  selectedTime,
  onChange,
}: TimeSelectorProps) {
  // Parse current selection
  const { startTime, endTime } = useMemo(() => {
    if (!selectedTime) return { startTime: null, endTime: null };
    if (selectedTime.includes(' - ')) {
      const [s, e] = selectedTime.split(' - ');
      return { startTime: s, endTime: e };
    }
    return { startTime: selectedTime, endTime: null };
  }, [selectedTime]);

  if (availableTimes.length === 0 && reservedTimes.length === 0) {
    return (
      <div>
        <h3 className="text-sm font-semibold text-gray-700">🕐 예약 시간</h3>
        <p className="mt-2 text-sm text-gray-400">예약 가능한 시간이 없습니다</p>
      </div>
    );
  }

  // Combine all times and sort them
  const allTimes = [...new Set([...availableTimes, ...reservedTimes])].sort();
  const reservedSet = new Set(reservedTimes);

  // Group times by hour for the timetable rows
  const hourGroups = new Map<number, string[]>();
  for (const time of allTimes) {
    const hour = parseHour(time);
    if (!hourGroups.has(hour)) hourGroups.set(hour, []);
    hourGroups.get(hour)!.push(time);
  }

  const sortedHours = [...hourGroups.keys()].sort((a, b) => a - b);

  // Split into rows of up to 8 hours
  const ROW_SIZE = 8;
  const hourRows: number[][] = [];
  for (let i = 0; i < sortedHours.length; i += ROW_SIZE) {
    hourRows.push(sortedHours.slice(i, i + ROW_SIZE));
  }

  // Check if a time is within the selected range
  const isInRange = (time: string): boolean => {
    if (!startTime) return false;
    if (!endTime) return time === startTime;
    const t = toMinutes(time);
    const s = toMinutes(startTime);
    const e = toMinutes(endTime);
    return t >= s && t <= e;
  };

  // Check if a range from start to target contains any reserved slots
  const rangeHasReserved = (from: string, to: string): boolean => {
    const fromMin = toMinutes(from);
    const toMin = toMinutes(to);
    const [lo, hi] = fromMin <= toMin ? [fromMin, toMin] : [toMin, fromMin];
    return allTimes.some((t) => {
      const m = toMinutes(t);
      return m >= lo && m <= hi && reservedSet.has(t);
    });
  };

  const handleSlotClick = (time: string) => {
    if (reservedSet.has(time)) return;

    if (!startTime || endTime) {
      // No selection yet, or already have a full range → start new selection
      onChange(time);
    } else {
      // Have start, clicking end
      const sMin = toMinutes(startTime);
      const tMin = toMinutes(time);

      if (tMin === sMin) {
        // Clicked same slot → deselect
        onChange(time);
        return;
      }

      const [lo, hi] = sMin < tMin ? [startTime, time] : [time, startTime];

      // Check if range contains reserved slots
      if (rangeHasReserved(lo, hi)) {
        // Can't select range through reserved slots → start new selection
        onChange(time);
        return;
      }

      onChange(`${lo} - ${hi}`);
    }
  };

  // Calculate hours for display
  const rangeHours = useMemo(() => {
    if (!startTime) return 0;
    if (!endTime) return 1;
    return (toMinutes(endTime) - toMinutes(startTime)) / 60 + 1;
  }, [startTime, endTime]);

  return (
    <div>
      <h3 className="text-sm font-semibold text-gray-700">🕐 예약 시간</h3>
      <div className="mt-3 space-y-3">
        {hourRows.map((hours, rowIdx) => (
          <div key={rowIdx}>
            {/* Hour labels */}
            <div className="flex">
              {hours.map((hour) => {
                const slots = hourGroups.get(hour)!;
                const rowSlotCount = hours.reduce(
                  (sum, h) => sum + (hourGroups.get(h)?.length ?? 0),
                  0,
                );
                return (
                  <div
                    key={hour}
                    className="text-xs font-medium text-gray-500"
                    style={{ width: `${(slots.length / rowSlotCount) * 100}%` }}
                  >
                    {hour}
                  </div>
                );
              })}
            </div>
            {/* Slot bar */}
            <div className="flex h-7 overflow-hidden rounded-md">
              {hours.flatMap((hour) =>
                hourGroups.get(hour)!.map((time) => {
                  const isReserved = reservedSet.has(time);
                  const inRange = isInRange(time);
                  const isStart = time === startTime;

                  let bgClass: string;
                  if (isReserved) {
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
                      disabled={isReserved}
                      onClick={() => handleSlotClick(time)}
                      title={`${time}${isReserved ? ' (예약됨)' : inRange ? ' (선택됨)' : ''}`}
                      className={`flex-1 border-r border-white/30 last:border-r-0 transition-colors ${bgClass}`}
                      aria-label={`${time}${isReserved ? ' 예약됨' : ''}`}
                    />
                  );
                }),
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Selected time display */}
      {startTime && (
        <p className="mt-2 text-sm text-blue-600 font-medium">
          {endTime
            ? `선택: ${startTime} ~ ${endTime} (${rangeHours}시간)`
            : `선택: ${startTime} (다른 시간을 클릭하면 범위 선택)`}
        </p>
      )}
    </div>
  );
}
