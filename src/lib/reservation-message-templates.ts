/**
 * 사장님이 손님에게 보낼 수락/거절 안내 문구 자동 생성.
 * 카톡·문자 등에 그대로 복사해서 쓸 수 있는 형태.
 */

type ReservationCore = {
  storeName: string;
  date: string;        // YYYY-MM-DD
  startTime: string;   // HH:mm
  endTime?: string;    // HH:mm (optional)
  headcount: number;
};

/** "2026-05-28" → "2026년 5월 28일" */
function formatDateKr(ymd: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(ymd).trim());
  if (!m) return ymd;
  return `${m[1]}년 ${parseInt(m[2], 10)}월 ${parseInt(m[3], 10)}일`;
}

/** "21:30" → "21:30" / start~end 가 다르면 "21:30 ~ 23:30" */
function formatTimeRange(start: string, end?: string): string {
  const s = String(start || '').trim();
  if (!end || end === s) return s;
  return `${s} ~ ${end}`;
}

/**
 * 예약 수락 안내 문구.
 * @param r 예약 정보
 * @param customNote 사장님이 직접 추가한 문구 (선택)
 */
export function buildAcceptMessage(
  r: ReservationCore,
  customNote?: string,
): string {
  const lines: string[] = [];
  lines.push('[우르르 예약 확정 안내]');
  lines.push('');
  lines.push('안녕하세요! 고객님께서 접수해주신 예약이 최종 확정되었습니다.');
  lines.push('방문 시간에 맞추어 도착해 주시길 부탁드리며, 즐거운 시간 보내시길 바랍니다.');
  lines.push('');
  lines.push(`예약 매장: ${r.storeName}`);
  lines.push(`예약 일시: ${formatDateKr(r.date)} ${formatTimeRange(r.startTime, r.endTime)}`);
  lines.push(`예약 인원: ${r.headcount}명`);
  if (customNote && customNote.trim()) {
    lines.push('');
    lines.push(customNote.trim());
  }
  lines.push('');
  lines.push('안내 사항');
  lines.push('예약 취소 및 인원 변동이 있을 경우 미리 연락 부탁드립니다.');
  lines.push('');
  lines.push('감사합니다.');
  return lines.join('\n');
}

/**
 * 예약 거절 안내 문구.
 * @param r 예약 정보
 * @param reason 거절 사유
 * @param alternative 대안 안내 (선택)
 */
export function buildRejectMessage(
  r: ReservationCore,
  reason: string,
  alternative?: string,
): string {
  const lines: string[] = [];
  lines.push('[우르르 예약 거절 안내]');
  lines.push('');
  lines.push('안녕하세요! 고객님께서 접수해주신 예약이 최종 거절되었습니다.');
  lines.push('');
  if (reason && reason.trim()) {
    lines.push(`사유: ${reason.trim()}`);
    lines.push('');
  }
  lines.push(`예약 매장: ${r.storeName}`);
  lines.push(`예약 일시: ${formatDateKr(r.date)} ${formatTimeRange(r.startTime, r.endTime)}`);
  lines.push(`예약 인원: ${r.headcount}명`);
  if (alternative && alternative.trim()) {
    lines.push('');
    lines.push(alternative.trim());
  } else {
    lines.push('');
    lines.push('다른 가게 예약을 부탁드립니다.');
  }
  lines.push('');
  lines.push('감사합니다.');
  return lines.join('\n');
}
