import { coerceHourFromValue, getSlotHourRangeFromStoreRow } from '@/lib/booking-slots';
import {
  DEFAULT_SLOT_END_HOUR,
  DEFAULT_SLOT_START_HOUR,
} from '@/lib/slot-hour-range';

export type DayKey = 'sun' | 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat';

export const DAY_KEYS: DayKey[] = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];

export const DAY_LABELS: Record<DayKey, string> = {
  sun: '일',
  mon: '월',
  tue: '화',
  wed: '수',
  thu: '목',
  fri: '금',
  sat: '토',
};

export interface DaySchedule {
  closed?: boolean;
  start?: number;
  end?: number;
}

export type WeeklyHours = Partial<Record<DayKey, DaySchedule>>;

export function dayKeyFromYmd(dateYmd: string): DayKey {
  const d = new Date(`${dateYmd}T12:00:00`);
  const idx = d.getDay();
  return DAY_KEYS[idx] ?? 'sun';
}

export function parseWeeklyHoursJson(raw: unknown): WeeklyHours | null {
  if (raw == null || raw === '') return null;
  let obj: unknown = raw;
  if (typeof raw === 'string') {
    try {
      obj = JSON.parse(raw);
    } catch {
      return null;
    }
  }
  if (!obj || typeof obj !== 'object') return null;
  const out: WeeklyHours = {};
  for (const key of DAY_KEYS) {
    const day = (obj as Record<string, unknown>)[key];
    if (!day || typeof day !== 'object') continue;
    const rec = day as Record<string, unknown>;
    const closed = rec.closed === true || rec.closed === 1 || String(rec.closed).toLowerCase() === 'true';
    const start = coerceHourFromValue(rec.start);
    const end = coerceHourFromValue(rec.end);
    out[key] = {
      closed,
      ...(Number.isFinite(start) ? { start } : {}),
      ...(Number.isFinite(end) ? { end } : {}),
    };
  }
  return Object.keys(out).length ? out : null;
}

export function parseClosedDatesJson(raw: unknown): string[] {
  if (raw == null || raw === '') return [];
  let arr: unknown = raw;
  if (typeof raw === 'string') {
    const t = raw.trim();
    if (!t) return [];
    try {
      arr = JSON.parse(t);
    } catch {
      return t
        .split(/[\n,]+/)
        .map((s) => s.trim())
        .filter((s) => /^\d{4}-\d{2}-\d{2}$/.test(s));
    }
  }
  if (!Array.isArray(arr)) return [];
  return arr
    .map((d) => String(d).trim().slice(0, 10))
    .filter((s) => /^\d{4}-\d{2}-\d{2}$/.test(s));
}

export function serializeWeeklyHoursForDb(hours: WeeklyHours | null): string | null {
  if (!hours) return null;
  const cleaned: WeeklyHours = {};
  for (const key of DAY_KEYS) {
    const d = hours[key];
    if (!d) continue;
    cleaned[key] = {
      closed: !!d.closed,
      ...(d.start != null && Number.isFinite(d.start) ? { start: Math.floor(d.start) } : {}),
      ...(d.end != null && Number.isFinite(d.end) ? { end: Math.floor(d.end) } : {}),
    };
  }
  return Object.keys(cleaned).length ? JSON.stringify(cleaned) : null;
}

export function serializeClosedDatesForDb(dates: string[]): string | null {
  const uniq = [...new Set(dates.map((d) => d.trim()).filter((s) => /^\d{4}-\d{2}-\d{2}$/.test(s)))];
  return uniq.length ? JSON.stringify(uniq) : null;
}

export function isStoreClosedOnDate(store: Record<string, unknown>, dateYmd: string): boolean {
  const closedDates = parseClosedDatesJson(store.closedDatesJson);
  if (closedDates.includes(dateYmd)) return true;
  const weekly = parseWeeklyHoursJson(store.weeklyHoursJson);
  if (!weekly) return false;
  const day = dayKeyFromYmd(dateYmd);
  const sched = weekly[day];
  return !!sched?.closed;
}

export function getSlotHourRangeForStoreOnDate(
  store: Record<string, unknown>,
  dateYmd: string,
): { slotStartHour: number; slotEndHour: number; crossesMidnight: boolean; closed: boolean } {
  if (isStoreClosedOnDate(store, dateYmd)) {
    return { slotStartHour: 0, slotEndHour: 0, crossesMidnight: false, closed: true };
  }

  const weekly = parseWeeklyHoursJson(store.weeklyHoursJson);
  const day = dayKeyFromYmd(dateYmd);
  const sched = weekly?.[day];
  if (sched && !sched.closed && sched.start != null && sched.end != null) {
    let start = sched.start;
    let end = sched.end;
    if (start >= 0 && start <= 23 && end >= 0 && end <= 23) {
      return { slotStartHour: start, slotEndHour: end, crossesMidnight: end < start, closed: false };
    }
  }

  if (weekly) {
    return {
      slotStartHour: DEFAULT_SLOT_START_HOUR,
      slotEndHour: DEFAULT_SLOT_END_HOUR,
      crossesMidnight: false,
      closed: false,
    };
  }

  const def = getSlotHourRangeFromStoreRow(store);
  return { ...def, closed: false };
}

export function readMinGroupHeadcount(store: Record<string, unknown>): number {
  const n = parseInt(String(store.minGroupHeadcount ?? ''), 10);
  return Number.isFinite(n) && n >= 1 ? n : 2;
}
