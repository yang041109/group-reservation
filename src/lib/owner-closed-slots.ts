import type { TimeSlot } from '@/types';
import { getKoreaDateParts, koreaTodayYmd } from '@/lib/korea-time';

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

/** 오늘(KST) 지난 30분 슬롯 */
export function isSlotPastForToday(slotTime: string, now = new Date()): boolean {
  if (koreaTodayYmd(now) === '') return false;
  const slotMin = minutesFromTimeBlock(slotTime);
  const { hour, minute } = getKoreaDateParts(now);
  return slotMin < hour * 60 + minute;
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
): TimeSlot[] {
  const closedSet = ownerClosedBlockSet(ownerClosedJson, dateYmd);
  const today = koreaTodayYmd(now);
  const isToday = dateYmd === today;

  return slots.map((slot) => {
    if (isToday && isSlotPastForToday(slot.timeBlock, now)) {
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
): boolean {
  const closedSet = ownerClosedBlockSet(ownerClosedJson, dateYmd);
  if (closedSet.has(slotTime)) return true;
  if (dateYmd === koreaTodayYmd(now) && isSlotPastForToday(slotTime, now)) return true;
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
