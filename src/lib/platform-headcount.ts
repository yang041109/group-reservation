/** 고객 검색·랜딩 기본 인원 (단체 예약 최소 10명 기준) */
export const PLATFORM_DEFAULT_HEADCOUNT = 10;
export const PLATFORM_MIN_HEADCOUNT = 10;
export const PLATFORM_MAX_HEADCOUNT = 999;

export function clampPlatformHeadcount(n: number): number {
  if (!Number.isFinite(n)) return PLATFORM_DEFAULT_HEADCOUNT;
  return Math.min(PLATFORM_MAX_HEADCOUNT, Math.max(PLATFORM_MIN_HEADCOUNT, Math.floor(n)));
}
