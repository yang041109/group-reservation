const KOREA_TZ = 'Asia/Seoul';

export function getKoreaDateParts(d: Date): { ymd: string; hour: number; minute: number } {
  const f = new Intl.DateTimeFormat('en-US', {
    timeZone: KOREA_TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
  const parts = Object.fromEntries(
    f.formatToParts(d).filter((p) => p.type !== 'literal').map((p) => [p.type, p.value]),
  );
  return {
    ymd: `${parts.year}-${parts.month}-${parts.day}`,
    hour: parseInt(parts.hour, 10) || 0,
    minute: parseInt(parts.minute, 10) || 0,
  };
}

export function koreaTodayYmd(now = new Date()): string {
  return getKoreaDateParts(now).ymd;
}

/** 예약 접수 시각 — `2026-05-26 20:15:32` (한국 시간, 시·분·초) */
export function formatReservationCreatedAt(raw: unknown): string {
  if (raw == null || raw === '') return '';
  let d: Date;
  if (raw instanceof Date) {
    d = raw;
  } else {
    const s = String(raw).trim();
    if (!s) return '';
    if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(s)) {
      d = new Date(`${s.replace(' ', 'T')}+09:00`);
    } else {
      d = new Date(s);
    }
  }
  if (Number.isNaN(d.getTime())) return String(raw).trim();

  const f = new Intl.DateTimeFormat('en-US', {
    timeZone: KOREA_TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
  const parts = Object.fromEntries(
    f.formatToParts(d).filter((p) => p.type !== 'literal').map((p) => [p.type, p.value]),
  );
  return `${parts.year}-${parts.month}-${parts.day} ${parts.hour}:${parts.minute}:${parts.second}`;
}
