import { generateSlotTimeBlocks } from '@/lib/slot-hour-range';
import type { TimeSlot } from '@/types';

/** 시트/DB 값 → 0~23 시 (실패 시 NaN) */
export function coerceHourFromValue(v: unknown): number {
  if (v === '' || v === null || v === undefined) return NaN;
  if (typeof v === 'number' && Number.isFinite(v)) {
    const hn = Math.floor(v);
    if (hn >= 0 && hn <= 23) return hn;
    return NaN;
  }
  const s = String(v).trim();
  const hm = /^(\d{1,2})\s*:\s*(\d{2})/.exec(s);
  if (hm) {
    const hh = parseInt(hm[1], 10);
    if (hh >= 0 && hh <= 23) return hh;
    return NaN;
  }
  const isoM = /T(\d{2}):/.exec(s);
  if (isoM) {
    const ih = parseInt(isoM[1], 10);
    if (ih >= 0 && ih <= 23) return ih;
  }
  const n = parseInt(s, 10);
  if (!Number.isNaN(n) && n >= 0 && n <= 23) return n;
  return NaN;
}

function firstDefinedField(obj: Record<string, unknown>, keys: string[]): unknown {
  for (const k of keys) {
    if (!Object.prototype.hasOwnProperty.call(obj, k)) continue;
    const v = obj[k];
    if (v === '' || v === null || v === undefined) continue;
    return v;
  }
  return undefined;
}

export function getSlotHourRangeFromStoreRow(store: Record<string, unknown>): {
  slotStartHour: number;
  slotEndHour: number;
  crossesMidnight: boolean;
} {
  const DEFAULT_START = 11;
  const DEFAULT_END = 20;
  const startRaw = firstDefinedField(store, [
    'slotStartHour',
    'SlotStartHour',
    'slot_start_hour',
    'startHour',
    'openHour',
  ]);
  const endRaw = firstDefinedField(store, [
    'slotEndHour',
    'SlotEndHour',
    'slot_end_hour',
    'endHour',
    'closeHour',
  ]);
  let start = coerceHourFromValue(startRaw);
  let end = coerceHourFromValue(endRaw);
  if (Number.isNaN(start) || start < 0 || start > 23) start = DEFAULT_START;
  if (Number.isNaN(end) || end < 0 || end > 23) end = DEFAULT_END;
  const crossesMidnight = end < start;
  return { slotStartHour: start, slotEndHour: end, crossesMidnight };
}

function hhmmToMinutes(s: string): number {
  const p = String(s).trim().split(':');
  const h = parseInt(p[0], 10);
  const m = parseInt(p[1] || '0', 10);
  if (Number.isNaN(h) || Number.isNaN(m)) return 0;
  return h * 60 + m;
}

function timeToExtendedMinutes(
  timeStr: string,
  crossesMidnight: boolean,
  startHour: number,
  endHour: number,
): number {
  const mins = hhmmToMinutes(timeStr);
  if (!crossesMidnight) return mins;
  const h = (mins / 60) | 0;
  if (h >= startHour) return mins;
  if (h <= endHour) return mins + 24 * 60;
  return mins;
}

export function slotOverlapsReservation(
  slotTime: string,
  resStart: string,
  resEnd: string,
  crossesMidnight: boolean,
  startHour: number,
  endHour: number,
): boolean {
  const sm = timeToExtendedMinutes(slotTime, crossesMidnight, startHour, endHour);
  let lo = timeToExtendedMinutes(String(resStart).trim(), crossesMidnight, startHour, endHour);
  let hi = timeToExtendedMinutes(String(resEnd).trim(), crossesMidnight, startHour, endHour);
  if (hi < lo) hi += 24 * 60;
  return sm >= lo && sm <= hi;
}

export interface ConfirmedReservationLike {
  headcount: number;
  startTime: string;
  endTime: string;
}

/** Apps Script `buildSlots` 와 동일한 슬롯 목록 */
export function buildSlots(
  maxPeople: number,
  confirmedReservations: ConfirmedReservationLike[],
  startHour: number,
  endHour: number,
  crossesMidnight: boolean,
): TimeSlot[] {
  const h0 = typeof startHour === 'number' ? startHour : 11;
  const h1 = typeof endHour === 'number' ? endHour : 20;
  const cross = !!crossesMidnight;
  const slotTimes = generateSlotTimeBlocks(h0, h1, cross);

  const slots: TimeSlot[] = [];
  for (let i = 0; i < slotTimes.length; i++) {
    const time = slotTimes[i];
    let booked = 0;
    confirmedReservations.forEach((r) => {
      const start = String(r.startTime).trim();
      const end = String(r.endTime).trim();
      if (slotOverlapsReservation(time, start, end, cross, h0, h1)) {
        booked += r.headcount || 0;
      }
    });
    const remaining = Math.max(0, maxPeople - booked);
    slots.push({
      slotId: `slot-${time.replace(':', '')}`,
      timeBlock: time,
      isAvailable: remaining > 0,
      maxPeople,
      currentHeadcount: booked,
    });
  }
  return slots;
}
