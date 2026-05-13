/** 고정 헤더 높이에 맞춘 앵커 스크롤 보정 */
export const LANDING_NAV_SCROLL_OFFSET = 80;

export function scrollToLandingId(elementId: string) {
  if (typeof document === 'undefined') return;
  const el = document.getElementById(elementId);
  if (!el) return;
  const y = el.getBoundingClientRect().top + window.scrollY - LANDING_NAV_SCROLL_OFFSET;
  window.scrollTo({ top: Math.max(0, y), behavior: 'smooth' });
}
