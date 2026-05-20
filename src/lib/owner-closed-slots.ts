import type { TimeSlot } from '@/types';
import { getKoreaDateParts, koreaTodayYmd } from '@/lib/korea-time';
import { timeBlockToExtendedMinutes } from '@/lib/slot-hour-range';

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

/** 오늘(KST) 지난 30분 슬롯. 자정 넘김 영업은 00:00~종료시를 “다음날 새벽”으로 확장해 비교 */
export function isSlotPastForToday(
  slotTime: string,
  now = new Date(),
  hours?: SlotBusinessHours,
): boolean {
  if (koreaTodayYmd(now) === '') return false;
  const { hour, minute } = getKoreaDateParts(now);
  const nowMin = hour * 60 + minute;

  if (hours?.crossesMidnight) {
    const nowLabel = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
    const slotExt = timeBlockToExtendedMinutes(
      slotTime,
      true,
      hours.slotStartHour,
      hours.slotEndHour,
    );
    const nowExt = timeBlockToExtendedMinutes(
      nowLabel,
      true,
      hours.slotStartHour,
      hours.slotEndHour,
    );
    return slotExt < nowExt;
  }

  return minutesFromTimeBlock(slotTime) < nowMin;
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
  const today = koreaTodayYmd(now);
  const isToday = dateYmd === today;

  return slots.map((slot) => {
    if (isToday && isSlotPastForToday(slot.timeBlock, now, hours)) {
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
  if (dateYmd === koreaTodayYmd(now) && isSlotPastForToday(slotTime, now, hours)) return true;
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
