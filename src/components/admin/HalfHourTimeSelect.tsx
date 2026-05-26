'use client';

type Period = 'AM' | 'PM';

const HOURS_12 = [12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11] as const;
const MINUTES: (0 | 30)[] = [0, 30];

function pad2(n: number) {
  return String(n).padStart(2, '0');
}

/** HH:MM(24h) → 12시간제 + 30분 */
export function parseHalfHourTime(hhmm: string): {
  period: Period;
  hour12: number;
  minute: 0 | 30;
} | null {
  const m = /^(\d{2}):(\d{2})$/.exec(hhmm);
  if (!m) return null;
  const h24 = parseInt(m[1], 10);
  const min = parseInt(m[2], 10);
  if (h24 < 0 || h24 > 23 || (min !== 0 && min !== 30)) return null;
  const period: Period = h24 < 12 ? 'AM' : 'PM';
  const h12 = h24 % 12 || 12;
  return { period, hour12: h12, minute: min as 0 | 30 };
}

/** 12시간제 + 30분 → HH:MM(24h) */
export function toHalfHourTime24(period: Period, hour12: number, minute: 0 | 30): string {
  let h24: number;
  if (period === 'AM') {
    h24 = hour12 === 12 ? 0 : hour12;
  } else {
    h24 = hour12 === 12 ? 12 : hour12 + 12;
  }
  return `${pad2(h24)}:${pad2(minute)}`;
}

/** 가장 가까운 30분 슬롯으로 맞춤 */
export function snapToHalfHour(hhmm: string): string {
  const m = /^(\d{2}):(\d{2})$/.exec(hhmm);
  if (!m) return hhmm;
  let h = parseInt(m[1], 10);
  const min = parseInt(m[2], 10);
  if (min < 15) {
    return `${pad2(h)}:00`;
  }
  if (min < 45) {
    return `${pad2(h)}:30`;
  }
  h = (h + 1) % 24;
  return `${pad2(h)}:00`;
}

export function isHalfHourTime(hhmm: string): boolean {
  return /^\d{2}:(00|30)$/.test(hhmm);
}

/** 일정 등록 기본값: 오후 2시 ~ 3시 */
export const DEFAULT_AFTERNOON_START = '14:00';
export const DEFAULT_AFTERNOON_END = '15:00';

interface HalfHourTimeSelectProps {
  value: string;
  onChange: (value: string) => void;
  label: string;
  disabled?: boolean;
  /** value가 비어 있거나 파싱 불가일 때 사용 */
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
      <div className="mt-1 grid grid-cols-3 gap-1.5">
        <select
          value={period}
          onChange={(e) => update({ period: e.target.value as Period })}
          disabled={disabled}
          aria-label={`${label} 오전/오후`}
          className={selectClass}
        >
          <option value="AM">오전</option>
          <option value="PM">오후</option>
        </select>
        <select
          value={hour12}
          onChange={(e) => update({ hour12: parseInt(e.target.value, 10) })}
          disabled={disabled}
          aria-label={`${label} 시`}
          className={selectClass}
        >
          {HOURS_12.map((h) => (
            <option key={h} value={h}>
              {h}시
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
          {MINUTES.map((m) => (
            <option key={m} value={m}>
              {pad2(m)}분
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
