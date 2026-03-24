'use client';

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

export default function TimeSelector({
  availableTimes,
  reservedTimes = [],
  selectedTime,
  onChange,
}: TimeSelectorProps) {
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
                return (
                  <div
                    key={hour}
                    className="text-xs font-medium text-gray-500"
                    style={{ width: `${(slots.length / allTimes.length) * 100}%` }}
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
                  const isSelected = selectedTime === time;
                  const isAvailable = !isReserved;

                  let bgClass: string;
                  if (isSelected) {
                    bgClass = 'bg-blue-700';
                  } else if (isReserved) {
                    bgClass = 'bg-gray-400 cursor-not-allowed';
                  } else {
                    bgClass = 'bg-cyan-400 hover:bg-cyan-500 cursor-pointer';
                  }

                  return (
                    <button
                      key={time}
                      type="button"
                      disabled={isReserved}
                      onClick={() => isAvailable && onChange(time)}
                      title={`${time}${isReserved ? ' (예약됨)' : isSelected ? ' (선택됨)' : ''}`}
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
      {selectedTime && (
        <p className="mt-2 text-sm text-blue-600 font-medium">
          선택된 시간: {selectedTime}
        </p>
      )}
    </div>
  );
}
