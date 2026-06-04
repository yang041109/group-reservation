import {
  addDaysYmd,
  compareReservationsForBusinessDay,
  isStartTimeInBusinessWindow,
  reservationBelongsToBusinessDay,
  type BusinessDayRange,
} from '@/lib/business-day-reservations';

function parseTimeToMinutes(t: string): number | null {
  const m = /^(\d{1,2}):(\d{2})(?::\d{2})?$/.exec(String(t).trim());
  if (!m) return null;
  const h = parseInt(m[1], 10);
  const min = parseInt(m[2], 10);
  if (h < 0 || h > 23 || min < 0 || min > 59) return null;
  return h * 60 + min;
}

/** `22:00:00` → `22:00` */
export function normalizeTimeHHmm(time: string): string {
  const s = String(time).trim();
  const m = /^(\d{1,2}):(\d{2})(?::\d{2})?$/.exec(s);
  if (!m) return s;
  const h = Math.min(23, Math.max(0, parseInt(m[1], 10)));
  const min = Math.min(59, Math.max(0, parseInt(m[2], 10)));
  return `${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`;
}

function hourFromHHmm(hhmm: string): number {
  const m = /^(\d{1,2}):(\d{2})$/.exec(normalizeTimeHHmm(hhmm));
  if (!m) return -1;
  return parseInt(m[1], 10);
}

/**
 * 고객이 고른 영업일 + 시각 → DB에 넣을 달력 `date`.
 * 자정 넘김 영업에서 새벽(0 ~ slotEndHour)은 익일 달력일.
 */
export function resolveCalendarDateForBusinessSlot(
  businessDateYmd: string,
  timeStr: string,
  range: Pick<BusinessDayRange, 'slotStartHour' | 'slotEndHour' | 'crossesMidnight'>,
): string {
  const business = businessDateYmd.trim().slice(0, 10);
  if (!range.crossesMidnight) return business;
  const h = hourFromHHmm(timeStr);
  if (h < 0) return business;
  if (h < range.slotEndHour) return addDaysYmd(business, 1);
  return business;
}

/** 시작·종료 시각을 달력 기준으로 정규화 (INSERT/UPDATE용) */
export function normalizeReservationDateTimes(
  businessDateYmd: string,
  startTime: string,
  endTime: string,
  range: Pick<BusinessDayRange, 'slotStartHour' | 'slotEndHour' | 'crossesMidnight'>,
): { date: string; startTime: string; endTime: string } {
  const start = normalizeTimeHHmm(startTime);
  const end = normalizeTimeHHmm(endTime || startTime);
  const date = resolveCalendarDateForBusinessSlot(businessDateYmd, start, range);
  return { date, startTime: start, endTime: end };
}

export function filterReservationsForBusinessDayList<
  T extends { date: string; startTime: string },
>(list: T[], businessYmd: string, range: BusinessDayRange): T[] {
  return list.filter((r) =>
    reservationBelongsToBusinessDay(
      { date: r.date.slice(0, 10), startTime: normalizeTimeHHmm(r.startTime) },
      businessYmd,
      range,
    ),
  );
}

/**
 * 사장님 캘린더 칸: 영업일 규칙 + 해당 달력일(`date` 컬럼) 일치 예약.
 * (전화 일정 기본 14:00 등 영업 시작 전 시간도 선택한 날짜 칸에 표시)
 */
export function reservationShowsOnOwnerCalendarDay(
  res: { date: string; startTime: string },
  calendarCellYmd: string,
  range: BusinessDayRange,
): boolean {
  const normalized = {
    date: res.date.slice(0, 10),
    startTime: normalizeTimeHHmm(res.startTime),
  };
  const cell = calendarCellYmd.trim().slice(0, 10);
  if (reservationBelongsToBusinessDay(normalized, cell, range)) return true;
  if (range.closed || normalized.date !== cell) return false;
  const startMins = parseTimeToMinutes(normalized.startTime);
  if (startMins === null) return false;
  // 달력일은 같지만 영업 시간 밖(예: 저녁 영업 가게의 오후 전화 예약)
  return !isStartTimeInBusinessWindow(startMins, range);
}

export function filterReservationsForOwnerCalendarDay<
  T extends { date: string; startTime: string },
>(list: T[], calendarCellYmd: string, range: BusinessDayRange): T[] {
  return list
    .filter((r) =>
      reservationShowsOnOwnerCalendarDay(
        { date: r.date.slice(0, 10), startTime: r.startTime },
        calendarCellYmd,
        range,
      ),
    )
    .sort((a, b) =>
      compareReservationsForBusinessDay(
        { date: a.date.slice(0, 10), startTime: normalizeTimeHHmm(a.startTime) },
        { date: b.date.slice(0, 10), startTime: normalizeTimeHHmm(b.startTime) },
        range,
      ),
    );
}
