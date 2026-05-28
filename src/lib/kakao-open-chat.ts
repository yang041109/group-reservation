/** 우르르 문의용 카카오 오픈채팅 */
export const KAKAO_INQUIRY_OPEN_CHAT_URL = 'https://open.kakao.com/o/sFvSbIwi';

function isMobileDevice(): boolean {
  if (typeof navigator === 'undefined') return false;
  return /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);
}

/**
 * 오픈채팅 입장 — 카카오가 앱/PC 카톡으로 넘기도록 공식 링크 사용.
 * 모바일: 같은 탭 이동(앱 핸드오프에 유리), PC: 새 탭.
 */
export function openKakaoInquiryChat(): void {
  const url = KAKAO_INQUIRY_OPEN_CHAT_URL;
  if (isMobileDevice()) {
    window.location.assign(url);
    return;
  }
  window.open(url, '_blank', 'noopener,noreferrer');
}
