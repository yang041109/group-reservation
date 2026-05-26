/**
 * 교대제(부제) 운영 모드 헬퍼.
 *
 * - shiftStartTimesJson: 허용되는 예약 시작 시각 목록. 예: ["18:00", "21:00"]
 * - shiftActiveMonthRangesJson: 적용 기간(연중 반복). 예: [{ start: "03-01", end: "03-31" }]
 *
 * 적용 기간 내 날짜에서는 손님이 시작 시각으로 shiftStartTimes 안의 값만 고를 수 있고,
 * 그 외 슬롯은 마감(회색) 처리. 적용 기간 밖이면 평소처럼 자유 시간 예약.
 */

import {
  isDepositActiveOnDate,
  parseDepositActiveMonthRangesJson,
  serializeDepositActiveMonthRangesForDb,
  type DepositActiveMonthRange,
} from '@/lib/deposit-tiers';

/** "HH:mm" 형식 한 칸. 잘못된 입력이면 null */
function normalizeHhmm(v: unknown): string | null {
  if (v == null) return null;
  const s = String(v).trim();
  if (!s) return null;
  // 허용 형태: H:mm, HH:mm, H:m (앞자리 0 누락 보정)
  const m = /^(\d{1,2})\s*:\s*(\d{1,2})$/.exec(s);
  if (!m) return null;
  const h = parseInt(m[1], 10);
  const min = parseInt(m[2], 10);
  if (!Number.isFinite(h) || !Number.isFinite(min)) return null;
  if (h < 0 || h > 23 || min < 0 || min > 59) return null;
  return `${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`;
}

/** mysql2 가 자동 파싱했을 수도 있으므로 string/array 둘 다 받음 */
export function parseShiftStartTimes(raw: unknown): string[] {
  if (raw == null || raw === '') return [];
  let arr: unknown = raw;
  if (typeof raw === 'string') {
    const t = raw.trim();
    if (!t) return [];
    try {
      arr = JSON.parse(t);
    } catch {
      // CSV("18:00, 21:00") 입력도 한 번 더 시도
      arr = t.split(/[,\s]+/);
    }
  }
  if (!Array.isArray(arr)) return [];
  const out: string[] = [];
  const seen = new Set<string>();
  for (const v of arr) {
    const hhmm = normalizeHhmm(v);
    if (hhmm && !seen.has(hhmm)) {
      seen.add(hhmm);
      out.push(hhmm);
    }
  }
  out.sort();
  return out;
}

export function serializeShiftStartTimesForDb(times: string[]): string | null {
  const cleaned: string[] = [];
  const seen = new Set<string>();
  for (const t of times) {
    const hhmm = normalizeHhmm(t);
    if (hhmm && !seen.has(hhmm)) {
      seen.add(hhmm);
      cleaned.push(hhmm);
    }
  }
  cleaned.sort();
  return cleaned.length ? JSON.stringify(cleaned) : null;
}

/** 교대제 적용 기간은 예약금 적용 기간과 동일 스키마라 같은 helper 재사용 */
export function parseShiftActiveMonthRanges(raw: unknown): DepositActiveMonthRange[] {
  return parseDepositActiveMonthRangesJson(raw);
}

export function serializeShiftActiveMonthRangesForDb(
  ranges: DepositActiveMonthRange[],
): string | null {
  return serializeDepositActiveMonthRangesForDb(ranges);
}

/** 해당 날짜가 교대제 적용 기간 안에 있는지 */
export function isShiftActiveOnDate(
  dateYmd: string,
  ranges: DepositActiveMonthRange[],
): boolean {
  return isDepositActiveOnDate(dateYmd, ranges);
}

/**
 * timeBlock(예: "18:00") 이 교대제 시작 시각에 해당하는지.
 * 빈 목록이면 항상 false(=교대제 비적용).
 */
export function isShiftStartTime(timeBlock: string, shiftStartTimes: string[]): boolean {
  if (!shiftStartTimes.length) return false;
  const t = normalizeHhmm(timeBlock);
  if (!t) return false;
  return shiftStartTimes.includes(t);
}
