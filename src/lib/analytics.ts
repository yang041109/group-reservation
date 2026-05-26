/**
 * Google Analytics 4 이벤트 래퍼.
 * NEXT_PUBLIC_GA_MEASUREMENT_ID 가 빌드 시점에 설정돼 있어야 실제 전송됨.
 * 미설정 시 모든 호출은 no-op (개발 환경에서 안전).
 *
 * 표준 이벤트 이름:
 *   - viewed_store          { storeId, storeName }
 *   - searched_stores       { date, headcount }
 *   - clicked_reserve_button{ storeId, storeName, headcount, date, time }
 *   - started_reservation_flow { storeId, headcount, date, time }
 *   - submitted_reservation { storeId, headcount, date, time, totalAmount }
 */

type GtagParams = Record<string, unknown>;
type GtagFn = (command: string, eventOrId: string, params?: GtagParams) => void;

declare global {
  interface Window {
    gtag?: GtagFn;
    dataLayer?: unknown[];
  }
}

export const GA_MEASUREMENT_ID: string | undefined =
  process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;

export function isAnalyticsEnabled(): boolean {
  return Boolean(GA_MEASUREMENT_ID);
}

export function trackEvent(name: string, params?: GtagParams): void {
  if (typeof window === 'undefined') return;
  if (typeof window.gtag !== 'function') return;
  try {
    window.gtag('event', name, params ?? {});
  } catch {
    // 분석은 보조 기능이라 실패해도 사용자 경험에 영향 없음
  }
}

export function trackPageView(url: string): void {
  if (typeof window === 'undefined') return;
  if (typeof window.gtag !== 'function') return;
  if (!GA_MEASUREMENT_ID) return;
  try {
    window.gtag('config', GA_MEASUREMENT_ID, {
      page_path: url,
    });
  } catch {
    // ignore
  }
}
