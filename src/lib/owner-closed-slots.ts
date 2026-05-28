import type { TimeSlot } from '@/types';
import { addDaysYmd } from '@/lib/business-day-reservations';
import { getKoreaDateParts, koreaTodayYmd } from '@/lib/korea-time';

/** 자정 넘김 영업 시 “지난 슬롯” 판별용 */
export type SlotBusinessHours = {
  crossesMidnight: boolean;
  slotStartHour: number;
  slotEndHour: number;
};

export type OwnerClosedSlotsPayload = {
  date: string;
  blocks: string[];
};

export function parseOwnerClosedSlotsJson(raw: unknown): OwnerClosedSlotsPayload | null {
  if (raw == null || raw === '') return null;
  let parsed: unknown = raw;
  if (typeof raw === 'string') {
    try {
      parsed = JSON.parse(raw);
    } catch {
      return null;
    }
  }
  if (!parsed || typeof parsed !== 'object') return null;
  const rec = parsed as Record<string, unknown>;
  const date = String(rec.date ?? '').trim().slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;
  const blocks = Array.isArray(rec.blocks)
    ? rec.blocks.map((b) => String(b).trim()).filter((b) => /^\d{1,2}:\d{2}$/.test(b))
    : [];
  return { date, blocks };
}

export function serializeOwnerClosedSlotsForDb(date: string, blocks: string[]): string {
  const unique = [...new Set(blocks.map((b) => b.trim()).filter(Boolean))].sort();
  return JSON.stringify({ date: date.slice(0, 10), blocks: unique });
}

export function ownerClosedBlockSet(
  raw: unknown,
  dateYmd: string,
): Set<string> {
  const parsed = parseOwnerClosedSlotsJson(raw);
  if (!parsed || parsed.date !== dateYmd) return new Set();
  return new Set(parsed.blocks);
}

function minutesFromTimeBlock(tb: string): number {
  const [h, m] = String(tb).trim().split(':').map((x) => parseInt(x, 10));
  return (h || 0) * 60 + (m || 0);
}

/** 슬롯의 실제 달력일·시각 (자정 넘김 새벽은 영업일+1일) */
function slotCalendarYmdAndMinutes(
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
