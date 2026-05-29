import { adminListReservationsByStore } from '@/lib/admin-mysql';
import {
  reservationQueryRangeForBusinessDay,
  resolveOwnerBusinessDayYmd,
  type BusinessDayRange,
} from '@/lib/business-day-reservations';
import { getKoreaDateParts, koreaTodayYmd } from '@/lib/korea-time';
import { filterReservationsForBusinessDayList } from '@/lib/reservation-calendar-date';
import { getSlotHourRangeForStoreOnDate } from '@/lib/store-weekly-hours';

export type OwnerBusinessDayContext = {
  businessDate: string;
  calendarDate: string;
  closedOnBusinessDay: boolean;
  slotStartHour: number;
  slotEndHour: number;
  crossesMidnight: boolean;
  range: BusinessDayRange;
};

/** 사장님 화면 공통: 지금 시각(한국) 기준 영업일·슬롯 범위 */
export function resolveOwnerBusinessDayContext(
  storeRec: Record<string, unknown>,
  explicitBusinessYmd?: string,
): OwnerBusinessDayContext {
  const now = new Date();
  const calendarYmd = koreaTodayYmd(now);
  const { hour } = getKoreaDateParts(now);
  const lookup = (ymd: string) => getSlotHourRangeForStoreOnDate(storeRec, ymd);
  const businessDate =
    explicitBusinessYmd?.trim().slice(0, 10) ||
    resolveOwnerBusinessDayYmd(calendarYmd, hour, lookup);
  const range = getSlotHourRangeForStoreOnDate(storeRec, businessDate);
  return {
    businessDate,
    calendarDate: calendarYmd,
    closedOnBusinessDay: range.closed,
    slotStartHour: range.slotStartHour,
    slotEndHour: range.slotEndHour,
    crossesMidnight: range.crossesMidnight,
    range,
  };
}

/** 캘린더·홈과 동일: 영업일 기준 + calendarVisible(확정·방문완료·노쇼) */
export async function listOwnerBusinessDayReservations(
  storeId: string,
  ctx: OwnerBusinessDayContext,
): Promise<
  | { success: true; reservations: Record<string, unknown>[] }
  | { success: false; message: string }
> {
  if (ctx.closedOnBusinessDay) {
    return { success: true, reservations: [] };
  }

  const { from, to } = reservationQueryRangeForBusinessDay(ctx.businessDate, ctx.range);
  const listed = await adminListReservationsByStore(storeId, null, null, from, to, {
    calendarVisible: true,
  });
  if (!listed.success) return listed;

  const reservations = filterReservationsForBusinessDayList(
    (listed.data as { date: string; startTime: string }[]).map((r) => ({
      ...r,
      date: String(r.date ?? '').slice(0, 10),
      startTime: String(r.startTime ?? '').trim(),
    })),
    ctx.businessDate,
    ctx.range,
  ) as Record<string, unknown>[];

  return { success: true, reservations };
}
