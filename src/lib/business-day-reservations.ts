import { timeBlockToExtendedMinutes } from '@/lib/slot-hour-range';

export interface BusinessDayRange {
  slotStartHour: number;
  slotEndHour: number;
  crossesMidnight: boolean;
  closed: boolean;
}

export type BusinessDayRangeLookup = (ymd: string) => BusinessDayRange;

function parseTimeToMinutes(t: string): number | null {
  const m = /^(\d{1,2}):(\d{2})$/.exec(String(t).trim());
  if (!m) return null;
  const h = parseInt(m[1], 10);
  const min = parseInt(m[2], 10);
  if (h < 0 || h > 23 || min < 0 || min > 59) return null;
  return h * 60 + min;
}

/** `YYYY-MM-DD` ±일 */
export function addDaysYmd(ymd: string, deltaDays: number): string {
  const [y, m, d] = ymd.slice(0, 10).split('-').map((x) => parseInt(x, 10));
  const dt = new Date(Date.UTC(y, m - 1, d + deltaDays));
  const yy = dt.getUTCFullYear();
  const mm = String(dt.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(dt.getUTCDate()).padStart(2, '0');
  return `${yy}-${mm}-${dd}`;
}

function isStartTimeInBusinessWindow(startMins: number, range: BusinessDayRange): boolean {
  const h = Math.floor(startMins / 60);
  const { slotStartHour: sh, slotEndHour: eh, crossesMidnight: cross } = range;
  if (!cross) return h >= sh && h < eh;
  return h >= sh || h < eh;
}

/**
 * 예약이 `businessYmd` 영업일(시작~마감, 자정 넘김 포함)에 속하는지.
 * `date`는 고객이 선택한 날짜(영업일) 또는 자정 이후 다음 달력일일 수 있음.
 */
export function reservationBelongsToBusinessDay(
  res: { date: string; startTime: string },
  businessYmd: string,
  range: BusinessDayRange,
): boolean {
  if (range.closed) return false;
  const resDate = res.date.slice(0, 10);
  const startMins = parseTimeToMinutes(res.startTime);
  if (startMins === null) return false;
  if (!isStartTimeInBusinessWindow(startMins, range)) return false;

  const { crossesMidnight: cross, slotStartHour: sh, slotEndHour: eh } = range;
  if (!cross) return resDate === businessYmd;

  const nextYmd = addDaysYmd(businessYmd, 1);
  const h = Math.floor(startMins / 60);
  if (resDate === businessYmd && h >= sh) return true;
  if (resDate === businessYmd && h < eh) return true;
  if (resDate === nextYmd && h < eh) return true;
  return false;
}

/**
 * 사장님 홈 「오늘」: 달력 오늘이 새벽 마감 전이면 전날 영업일(자정 넘김 꼬리)을 본다.
 */
export function resolveOwnerBusinessDayYmd(
  calendarTodayYmd: string,
  koreaHour: number,
  getRangeForDate: BusinessDayRangeLookup,
): string {
  const todayRange = getRangeForDate(calendarTodayYmd);
  if (todayRange.crossesMidnight && !todayRange.closed && koreaHour < todayRange.slotEndHour) {
    return addDaysYmd(calendarTodayYmd, -1);
  }

  const yesterday = addDaysYmd(calendarTodayYmd, -1);
  const yesterdayRange = getRangeForDate(yesterday);
  if (
    yesterdayRange.crossesMidnight &&
    !yesterdayRange.closed &&
    koreaHour < yesterdayRange.slotEndHour
  ) {
    return yesterday;
  }

  return calendarTodayYmd;
}

/** 영업일 타임라인 순 정렬(저녁 → 자정 이후 새벽) */
export function compareReservationsForBusinessDay(
  a: { date: string; startTime: string },
  b: { date: string; startTime: string },
  range: Pick<BusinessDayRange, 'slotStartHour' | 'slotEndHour' | 'crossesMidnight'>,
): number {
  const ka = reservationBusinessSortKey(a, range);
  const kb = reservationBusinessSortKey(b, range);
  if (ka !== kb) return ka - kb;
  return String(a.startTime).localeCompare(String(b.startTime));
}

export function reservationBusinessSortKey(
  res: { date: string; startTime: string },
  range: Pick<BusinessDayRange, 'slotStartHour' | 'slotEndHour' | 'crossesMidnight'>,
): number {
  const start = String(res.startTime).trim();
  return timeBlockToExtendedMinutes(
    start,
    range.crossesMidnight,
    range.slotStartHour,
    range.slotEndHour,
  );
}

export function filterReservationsForBusinessDay<T extends { date: string; startTime: string }>(
  list: T[],
  businessYmd: string,
  range: BusinessDayRange,
): T[] {
  return list
    .filter((r) => reservationBelongsToBusinessDay(r, businessYmd, range))
    .sort((a, b) => compareReservationsForBusinessDay(a, b, range));
}

/** DB 조회용 date 범위 (영업일 ± 인접 달력일) */
export function reservationQueryRangeForBusinessDay(
  businessYmd: string,
  range: BusinessDayRange,
): { from: string; to: string } {
  if (!range.crossesMidnight) {
    return { from: businessYmd, to: businessYmd };
  }
  return { from: businessYmd, to: addDaysYmd(businessYmd, 1) };
}
