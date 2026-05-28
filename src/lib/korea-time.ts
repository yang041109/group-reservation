const KOREA_TZ = 'Asia/Seoul';

const NAIVE_DATETIME_RE = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/;

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

/** 한국 시각 `YYYY-MM-DD HH:mm:ss` */
export function koreaSqlDatetime(d: Date): string {
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

/**
 * createdAt → Date (한국 시각으로 표시할 기준 시각)
 * - ISO 문자열·Date: 그대로 UTC 기준 instant
 * - `YYYY-MM-DD HH:mm:ss`: DB에 UTC로 저장된 값(toISOString) → Z로 해석
 */
export function parseReservationCreatedAt(raw: unknown): Date | null {
  if (raw == null || raw === '') return null;
  if (raw instanceof Date) {
    return Number.isNaN(raw.getTime()) ? null : raw;
  }
  const s = String(raw).trim();
  if (!s) return null;

  if (NAIVE_DATETIME_RE.test(s)) {
    const d = new Date(`${s.replace(' ', 'T')}Z`);
    return Number.isNaN(d.getTime()) ? null : d;
  }

  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** 예약 접수 시각 — `2026-05-26 20:15:32` (한국 시간) */
export function formatReservationCreatedAt(raw: unknown): string {
  const d = parseReservationCreatedAt(raw);
  if (!d) return raw == null ? '' : String(raw).trim();
  return koreaSqlDatetime(d);
}
