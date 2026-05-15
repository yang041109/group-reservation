import type { TimeSlot } from '@/types';

/** 슬롯 점유율 (0~1) */
export function slotOccupancyRatio(slot: TimeSlot): number {
  if (slot.maxPeople <= 0) return 1;
  return slot.currentHeadcount / slot.maxPeople;
}

/** 선택 인원이 해당 슬롯에 들어갈 수 있는지 */
export function slotFitsHeadcount(slot: TimeSlot, headcount: number): boolean {
  if (!slot.isAvailable) return false;
  if (headcount <= 0) return slot.maxPeople - slot.currentHeadcount > 0;
  return slot.maxPeople - slot.currentHeadcount >= headcount;
}

/** 여유순 정렬용 점수 (높을수록 여유). 예약 불가면 -1 */
export function computeAvailabilityScore(
  timeline: TimeSlot[] | undefined,
  headcount: number,
): number {
  if (!timeline?.length) return -1;
  const eligible = timeline.filter((s) => slotFitsHeadcount(s, headcount));
  if (!eligible.length) return -1;

  let sum = 0;
  for (const s of eligible) {
    const ratio = slotOccupancyRatio(s);
    if (ratio >= 1) sum += 0;
    else if (ratio >= 0.8) sum += 1;
    else if (ratio >= 0.5) sum += 2;
    else if (ratio > 0) sum += 3;
    else sum += 4;
  }
  return sum / eligible.length;
}

/** 해당 날짜·인원 기준 예약 가능 여부 */
export function isStoreBookable(
  timeline: TimeSlot[] | undefined,
  headcount: number,
  closedOnDate?: boolean,
): boolean {
  if (closedOnDate) return false;
  if (!timeline?.length) return false;
  if (headcount <= 0) {
    return timeline.some((s) => s.isAvailable && s.maxPeople - s.currentHeadcount > 0);
  }
  return timeline.some((s) => slotFitsHeadcount(s, headcount));
}
