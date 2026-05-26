'use client';

import {
  DEFAULT_AFTERNOON_END,
  DEFAULT_AFTERNOON_START,
  formatHalfHourLabel,
  HOUR12_OPTIONS,
  isHalfHourTime,
  MINUTE_OPTIONS,
  parseHalfHourTime,
  PERIOD_OPTIONS,
  snapToHalfHour,
  type Period,
  toHalfHourTime24,
} from '@/lib/half-hour-time';

export {
  DEFAULT_AFTERNOON_END,
  DEFAULT_AFTERNOON_START,
  isHalfHourTime,
  snapToHalfHour,
};

interface HalfHourTimeSelectProps {
  value: string;
  onChange: (value: string) => void;
  label: string;
  disabled?: boolean;
  defaultPeriod?: Period;
}

export default function HalfHourTimeSelect({
  value,
  onChange,
  label,
  disabled = false,
  defaultPeriod = 'PM',
}: HalfHourTimeSelectProps) {
  const parsed =
    parseHalfHourTime(value) ??
    (defaultPeriod === 'PM'
      ? { period: 'PM' as const, hour12: 2, minute: 0 as const }
      : { period: 'AM' as const, hour12: 9, minute: 0 as const });

  const { period, hour12, minute } = parsed;

  const update = (next: Partial<{ period: Period; hour12: number; minute: 0 | 30 }>) => {
    onChange(
      toHalfHourTime24(
        next.period ?? period,
        next.hour12 ?? hour12,
        next.minute ?? minute,
      ),
    );
  };

  const selectClass =
    'min-w-0 rounded-lg border border-gray-300 bg-white px-2 py-2 text-sm disabled:bg-gray-100';

  return (
    <div className="min-w-0">
      <span className="text-xs text-gray-500">{label}</span>
      <p className="mt-0.5 text-sm font-medium text-gray-800">{formatHalfHourLabel(value)}</p>
      <div className="mt-1 grid grid-cols-3 gap-1.5">
        <select
          value={period}
          onChange={(e) => update({ period: e.target.value as Period })}
          disabled={disabled}
          aria-label={`${label} 오전/오후`}
          className={selectClass}
        >
          {PERIOD_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <select
          value={hour12}
          onChange={(e) => update({ hour12: parseInt(e.target.value, 10) })}
          disabled={disabled}
          aria-label={`${label} 시`}
          className={selectClass}
        >
          {HOUR12_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <select
          value={minute}
          onChange={(e) => update({ minute: parseInt(e.target.value, 10) as 0 | 30 })}
          disabled={disabled}
          aria-label={`${label} 분`}
          className={selectClass}
        >
          {MINUTE_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
