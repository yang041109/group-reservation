/** 검색 카드·사장님 타임라인 공통 색상 */
export const SLOT_CLOSED_CLASS = 'bg-[#f29da6]';

export const TIMELINE_LEGEND = [
  { label: '여유', color: 'bg-[#2c9af5]' },
  { label: '보통', color: 'bg-[#23cdfc]' },
  { label: '혼잡', color: 'bg-[#23f7ed]' },
  { label: '거의 마감', color: 'bg-[#a7a7a8]' },
  { label: '마감', color: SLOT_CLOSED_CLASS },
] as const;

export function getOccupancyColorClass(ratio: number): string {
  if (ratio >= 1) return SLOT_CLOSED_CLASS;
  if (ratio >= 0.8) return 'bg-[#a7a7a8]';
  if (ratio >= 0.5) return 'bg-[#23f7ed]';
  if (ratio > 0) return 'bg-[#23cdfc]';
  return 'bg-[#2c9af5]';
}
