import type { TimeSlot } from '@/types';
import { addDaysYmd } from '@/lib/business-day-reservations';
import { getKoreaDateParts, koreaTodayYmd } from '@/lib/korea-time';
import { generateSlotTimeBlocks } from '@/lib/slot-hour-range';

/** 자정 넘김 영업 시 “지난 슬롯” 판별용 */
export type SlotBusinessHours = {
  crossesMidnight: boolean;
  slotStartHour: number;
  slotEndHour: number;
};

export type OwnerClosedSlotsPayload = {
  date: string;
  /** 강제 차단: 이 슬롯을 차지하는 모든 예약 거부 (예약 시간이 지나가기만 해도 안됨) */
  blocks: string[];
  /** 시작 시간만 차단: 이 슬롯을 시작 시간으로 가진 예약만 거부.
   *  거쳐가는(span) 예약은 허용. 예) noStartBlocks=[10:00] 이면 9시-11시 예약은 OK, 10시 시작은 X. */
  noStartBlocks?: string[];
};

export type OwnerClosedSlotsStore = {
  entries: OwnerClosedSlotsPayload[];
};

/** 30분 단위 시각 선택지 (00:00~23:30) */
export function allHalfHourTimeOptions(): string[] {
  const out: string[] = [];
  for (let h = 0; h < 24; h++) {
    out.push(`${String(h).padStart(2, '0')}:00`, `${String(h).padStart(2, '0')}:30`);
  }
  return out;
}

function enumerateYmdRange(fromYmd: string, toYmd: string): string[] {
  const from = fromYmd.trim().slice(0, 10);
  const to = toYmd.trim().slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(from) || !/^\d{4}-\d{2}-\d{2}$/.test(to)) return [];
  const out: string[] = [];
  let cur = from;
  for (let i = 0; i < 400; i++) {
    out.push(cur);
    if (cur === to) break;
    cur = addDaysYmd(cur, 1);
    if (cur < from) break;
  }
  return out;
}

/** 달력일+시각 → 비교용 키 (분 단위) */
export function calendarInstantKey(ymd: string, hhmm: string): number {
  const d = ymd.trim().slice(0, 10);
  const m = /^(\d{1,2}):(\d{2})$/.exec(String(hhmm).trim());
  if (!/^\d{4}-\d{2}-\d{2}$/.test(d) || !m) return 0;
  const [y, mo, day] = d.split('-').map((x) => parseInt(x, 10));
  const h = parseInt(m[1], 10);
  const min = parseInt(m[2], 10);
  return Date.UTC(y, mo - 1, day, h, min) / 60_000;
}

function sanitizeTimeArray(arr: unknown): string[] {
  if (!Array.isArray(arr)) return [];
  return arr.map((b) => String(b).trim()).filter((b) => /^\d{1,2}:\d{2}$/.test(b));
}

function normalizeEntry(rec: Record<string, unknown>): OwnerClosedSlotsPayload | null {
  const date = String(rec.date ?? '').trim().slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;
  const blocks = sanitizeTimeArray(rec.blocks);
  const noStartBlocks = sanitizeTimeArray(rec.noStartBlocks);
  const payload: OwnerClosedSlotsPayload = { date, blocks };
  if (noStartBlocks.length) payload.noStartBlocks = noStartBlocks;
  return payload;
}

export function parseOwnerClosedSlotsStore(raw: unknown): OwnerClosedSlotsStore {
  if (raw == null || raw === '') return { entries: [] };
  let parsed: unknown = raw;
  if (typeof raw === 'string') {
    try {
      parsed = JSON.parse(raw);
    } catch {
      return { entries: [] };
    }
  }
  if (!parsed || typeof parsed !== 'object') return { entries: [] };
  const rec = parsed as Record<string, unknown>;
  if (Array.isArray(rec.entries)) {
    const entries: OwnerClosedSlotsPayload[] = [];
    for (const item of rec.entries) {
      if (!item || typeof item !== 'object') continue;
      const e = normalizeEntry(item as Record<string, unknown>);
      if (e) entries.push(e);
    }
    return { entries };
  }
  const legacy = normalizeEntry(rec);
  return legacy ? { entries: [legacy] } : { entries: [] };
}

/** 하위 호환 — 단일 날짜 payload */
export function parseOwnerClosedSlotsJson(raw: unknown): OwnerClosedSlotsPayload | null {
  const store = parseOwnerClosedSlotsStore(raw);
  return store.entries[0] ?? null;
}

export function upsertOwnerClosedEntry(
  entries: OwnerClosedSlotsPayload[],
  date: string,
  blocks: string[],
  noStartBlocks: string[] = [],
): OwnerClosedSlotsPayload[] {
  const ymd = date.trim().slice(0, 10);
  const uniqB = [...new Set(blocks.map((b) => b.trim()).filter(Boolean))].sort();
  const uniqN = [...new Set(noStartBlocks.map((b) => b.trim()).filter(Boolean))].sort();
  const next: OwnerClosedSlotsPayload = { date: ymd, blocks: uniqB };
  if (uniqN.length) next.noStartBlocks = uniqN;
  const rest = entries.filter((e) => e.date !== ymd);
  if (!uniqB.length && !uniqN.length) return rest;
  return [...rest, next].sort((a, b) => a.date.localeCompare(b.date));
}

export function serializeOwnerClosedSlotsStore(store: OwnerClosedSlotsStore): string {
  let entries: OwnerClosedSlotsPayload[] = [];
  for (const e of store.entries) {
    entries = upsertOwnerClosedEntry(entries, e.date, e.blocks, e.noStartBlocks ?? []);
  }
  return JSON.stringify({ entries });
}

export function serializeOwnerClosedSlotsForDb(
  date: string,
  blocks: string[],
  noStartBlocks: string[] = [],
): string {
  return serializeOwnerClosedSlotsStore({
    entries: upsertOwnerClosedEntry([], date, blocks, noStartBlocks),
  });
}

export function ownerClosedBlockSet(
  raw: unknown,
  dateYmd: string,
): Set<string> {
  const entry = parseOwnerClosedSlotsStore(raw).entries.find((e) => e.date === dateYmd);
  return new Set(entry?.blocks ?? []);
}

/** 시작 시간만 차단된 슬롯 집합 */
export function ownerNoStartBlockSet(
  raw: unknown,
  dateYmd: string,
): Set<string> {
  const entry = parseOwnerClosedSlotsStore(raw).entries.find((e) => e.date === dateYmd);
  return new Set(entry?.noStartBlocks ?? []);
}

function minutesFromTimeBlock(tb: string): number {
  const [h, m] = String(tb).trim().split(':').map((x) => parseInt(x, 10));
  return (h || 0) * 60 + (m || 0);
}

/** 슬롯의 실제 달력일·시각 (자정 넘김 새벽은 영업일+1일) */
export function slotCalendarYmdAndMinutes(
  slotTime: string,
  businessDateYmd: string,
  hours: SlotBusinessHours,
): { ymd: string; minutes: number } {
  const minutes = minutesFromTimeBlock(slotTime);
  const slotH = Math.floor(minutes / 60);
  if (hours.crossesMidnight && slotH < hours.slotEndHour) {
    return { ymd: addDaysYmd(businessDateYmd, 1), minutes };
  }
  return { ymd: businessDateYmd, minutes };
}

/**
 * 선택한 영업일 기준 지난 슬롯 여부.
 * 자정 넘김: 저녁=선택일 당일, 새벽=선택일 **다음** 달력일로 환산해 현재 시각과 비교.
 * 예) 29일 01:00 · 29일 선택 → 00:30은 30일 00:30(미래) / 28일 선택 → 00:30은 29일 00:30(과거).
 */
export function isSlotPastForSelectedDate(
  slotTime: string,
  selectedDateYmd: string,
  now = new Date(),
  hours?: SlotBusinessHours,
): boolean {
  const today = koreaTodayYmd(now);
  const selected = selectedDateYmd.trim().slice(0, 10);
  if (!selected || !today) return false;

  const { hour, minute } = getKoreaDateParts(now);
  const nowMin = hour * 60 + minute;

  if (!hours?.crossesMidnight) {
    if (selected > today) return false;
    if (selected < today) return true;
    return minutesFromTimeBlock(slotTime) < nowMin;
  }

  const { ymd: slotDay, minutes: slotMin } = slotCalendarYmdAndMinutes(
    slotTime,
    selected,
    hours,
  );

  if (slotDay > today) return false;
  if (slotDay < today) return true;
  return slotMin < nowMin;
}

/** 오늘(KST) 선택과 동일 — `isSlotPastForSelectedDate(..., koreaTodayYmd(now), ...)` */
export function isSlotPastForToday(
  slotTime: string,
  now = new Date(),
  hours?: SlotBusinessHours,
): boolean {
  return isSlotPastForSelectedDate(slotTime, koreaTodayYmd(now), now, hours);
}

function closeSlot(slot: TimeSlot): TimeSlot {
  return {
    ...slot,
    isAvailable: false,
    currentHeadcount: slot.maxPeople,
  };
}

/** 사장님 수동 마감 + 오늘 지난 시간 반영 */
export function applyOwnerClosedBlocksToSlots(
  slots: TimeSlot[],
  dateYmd: string,
  ownerClosedJson: unknown,
  now = new Date(),
  hours?: SlotBusinessHours,
): TimeSlot[] {
  const closedSet = ownerClosedBlockSet(ownerClosedJson, dateYmd);

  return slots.map((slot) => {
    if (isSlotPastForSelectedDate(slot.timeBlock, dateYmd, now, hours)) {
      return closeSlot(slot);
    }
    if (closedSet.has(slot.timeBlock)) {
      return closeSlot(slot);
    }
    return slot;
  });
}

export function isSlotBlockedForBooking(
  slotTime: string,
  dateYmd: string,
  ownerClosedJson: unknown,
  now = new Date(),
  hours?: SlotBusinessHours,
): boolean {
  const closedSet = ownerClosedBlockSet(ownerClosedJson, dateYmd);
  if (closedSet.has(slotTime)) return true;
  if (isSlotPastForSelectedDate(slotTime, dateYmd, now, hours)) return true;
  return false;
}

/** allBlocks 순서 기준 구간(시작·끝 포함) */
export function timeBlocksInRange(
  start: string,
  end: string,
  allBlocks: string[],
): string[] {
  const a = allBlocks.indexOf(start);
  const b = allBlocks.indexOf(end);
  if (a < 0 || b < 0) return [];
  const lo = Math.min(a, b);
  const hi = Math.max(a, b);
  return allBlocks.slice(lo, hi + 1);
}

/** 마지막 30분 슬롯의 종료 시각 (표시용) */
export function timeBlockRangeEndLabel(lastBlock: string): string {
  const mins = minutesFromTimeBlock(lastBlock) + 30;
  const h = Math.floor(mins / 60) % 24;
  const m = mins % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

export function formatOwnerClosedRangeLabel(startBlock: string, endBlock: string): string {
  return `${startBlock}~${timeBlockRangeEndLabel(endBlock)}`;
}

export type OwnerClosedDisplayRange = {
  start: string;
  endBlock: string;
  blocks: string[];
};

/** 영업 슬롯 순서대로 연속된 마감 블록을 구간으로 묶음 */
export function groupOwnerClosedBlocks(
  closedBlocks: string[],
  allBlocks: string[],
): OwnerClosedDisplayRange[] {
  const closed = new Set(closedBlocks);
  const ranges: OwnerClosedDisplayRange[] = [];
  let current: string[] = [];

  const flush = () => {
    if (current.length) {
      ranges.push({
        start: current[0],
        endBlock: current[current.length - 1],
        blocks: [...current],
      });
      current = [];
    }
  };

  for (const b of allBlocks) {
    if (closed.has(b)) {
      current.push(b);
    } else {
      flush();
    }
  }
  flush();
  return ranges;
}

export type OwnerCloseRangeInput = {
  startDate: string;
  startTime: string;
  endDate: string;
  endTime: string;
};

/**
 * 날짜·시각 구간에 해당하는 슬롯을 영업일별로 묶어 반환.
 * `lookupHours(businessDate)` 로 요일별 영업시간 제공.
 */
export function blocksToCloseForRange(
  input: OwnerCloseRangeInput,
  lookupHours: (businessDateYmd: string) => SlotBusinessHours & { closed?: boolean },
): Map<string, string[]> {
  const startKey = calendarInstantKey(input.startDate, input.startTime);
  const endKey = calendarInstantKey(input.endDate, input.endTime);
  const lo = Math.min(startKey, endKey);
  const hi = Math.max(startKey, endKey);
  const byDate = new Map<string, Set<string>>();

  for (const businessDate of enumerateYmdRange(input.startDate, input.endDate)) {
    const range = lookupHours(businessDate);
    if (range.closed) continue;
    const hours: SlotBusinessHours = {
      crossesMidnight: range.crossesMidnight,
      slotStartHour: range.slotStartHour,
      slotEndHour: range.slotEndHour,
    };
    const slotTimes = generateSlotTimeBlocks(
      range.slotStartHour,
      range.slotEndHour,
      range.crossesMidnight,
    );
    for (const tb of slotTimes) {
      const cal = slotCalendarYmdAndMinutes(tb, businessDate, hours);
      const key = calendarInstantKey(cal.ymd, tb);
      if (key < lo || key > hi) continue;
      const bucket = byDate.get(businessDate) ?? new Set<string>();
      bucket.add(tb);
      byDate.set(businessDate, bucket);
    }
  }

  const out = new Map<string, string[]>();
  for (const [date, bucket] of byDate) {
    out.set(date, [...bucket].sort());
  }
  return out;
}

/** 기존 entries에 구간 마감 병합 (mode: full | noStart) */
export function mergeCloseRangeIntoEntries(
  entries: OwnerClosedSlotsPayload[],
  input: OwnerCloseRangeInput,
  mode: 'full' | 'noStart',
  lookupHours: (businessDateYmd: string) => SlotBusinessHours & { closed?: boolean },
): OwnerClosedSlotsPayload[] {
  const toAdd = blocksToCloseForRange(input, lookupHours);
  let next = [...entries];
  for (const [date, blocks] of toAdd) {
    const existing = next.find((e) => e.date === date);
    const prevFull = existing?.blocks ?? [];
    const prevNo = existing?.noStartBlocks ?? [];
    if (mode === 'full') {
      next = upsertOwnerClosedEntry(
        next,
        date,
        [...new Set([...prevFull, ...blocks])],
        prevNo,
      );
    } else {
      next = upsertOwnerClosedEntry(
        next,
        date,
        prevFull,
        [...new Set([...prevNo, ...blocks])],
      );
    }
  }
  return next;
}
