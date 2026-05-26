export type Period = 'AM' | 'PM';

const HOURS_12 = [12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11] as const;

export function pad2(n: number) {
  return String(n).padStart(2, '0');
}

/** HH:MM 또는 H:MM → 24h HH:MM */
export function normalizeTimeHHMM(raw: string): string | null {
  const m = /^(\d{1,2}):(\d{2})$/.exec(raw.trim());
  if (!m) return null;
  const h = parseInt(m[1], 10);
  const min = parseInt(m[2], 10);
  if (h < 0 || h > 23 || (min !== 0 && min !== 30)) return null;
  return `${pad2(h)}:${pad2(min)}`;
}

/** HH:MM(24h) → 12시간제 + 30분 */
export function parseHalfHourTime(hhmm: string): {
  period: Period;
  hour12: number;
  minute: 0 | 30;
} | null {
  const norm = normalizeTimeHHMM(hhmm);
  if (!norm) return null;
  const m = /^(\d{2}):(\d{2})$/.exec(norm);
  if (!m) return null;
  const h24 = parseInt(m[1], 10);
  const min = parseInt(m[2], 10) as 0 | 30;
  const period: Period = h24 < 12 ? 'AM' : 'PM';
  const h12 = h24 % 12 || 12;
  return { period, hour12: h12, minute: min };
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

export function snapToHalfHour(hhmm: string): string {
  const norm = normalizeTimeHHMM(hhmm);
  if (!norm) return hhmm;
  let h = parseInt(norm.slice(0, 2), 10);
  const min = parseInt(norm.slice(3), 10);
  if (min < 15) return `${pad2(h)}:00`;
  if (min < 45) return `${pad2(h)}:30`;
  h = (h + 1) % 24;
  return `${pad2(h)}:00`;
}

export function isHalfHourTime(hhmm: string): boolean {
  const norm = normalizeTimeHHMM(hhmm);
  return norm != null && /^\d{2}:(00|30)$/.test(norm);
}

export const DEFAULT_AFTERNOON_START = '14:00';
export const DEFAULT_AFTERNOON_END = '15:00';

export function formatHalfHourLabel(hhmm: string): string {
  const parsed = parseHalfHourTime(hhmm);
  if (!parsed) return hhmm;
  const meridiem = parsed.period === 'AM' ? '오전' : '오후';
  return `${meridiem} ${parsed.hour12}:${pad2(parsed.minute)}`;
}

export const PERIOD_OPTIONS: { value: Period; label: string }[] = [
  { value: 'AM', label: '오전' },
  { value: 'PM', label: '오후' },
];

export const HOUR12_OPTIONS = HOURS_12.map((h) => ({ value: h, label: `${h}시` }));

export const MINUTE_OPTIONS: { value: 0 | 30; label: string }[] = [
  { value: 0, label: '00분' },
  { value: 30, label: '30분' },
];
