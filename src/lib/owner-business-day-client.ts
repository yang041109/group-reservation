/** 사장님 홈·캘린더 공통 API 응답 타입 */
export type OwnerBusinessDayPayload = {
  businessDate: string;
  calendarDate: string;
  closedOnBusinessDay: boolean;
  slotStartHour: number;
  slotEndHour: number;
  crossesMidnight: boolean;
  reservations: Array<{
    reservationId: string;
    userName: string;
    groupName?: string;
    zoneId?: string;
    zoneName?: string;
    date: string;
    startTime: string;
    endTime: string;
    headcount: number;
    status: string;
    [key: string]: unknown;
  }>;
};

export async function fetchOwnerBusinessDayReservations(
  token: string,
  businessDate?: string,
): Promise<
  | { success: true; data: OwnerBusinessDayPayload }
  | { success: false; message: string }
> {
  const q = new URLSearchParams({ token });
  if (businessDate?.trim()) q.set('date', businessDate.trim().slice(0, 10));
  const res = await fetch(`/api/admin/store/business-day-reservations?${q.toString()}`);
  const json = (await res.json()) as {
    success: boolean;
    data?: OwnerBusinessDayPayload;
    message?: string;
  };
  if (!json.success || !json.data) {
    return { success: false, message: json.message || '예약 목록을 불러올 수 없습니다.' };
  }
  return { success: true, data: json.data };
}
