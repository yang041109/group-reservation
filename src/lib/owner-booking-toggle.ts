import type { TimeSlot } from '@/types';

const KOREA_TZ = 'Asia/Seoul';

export type OwnerBookingToggle = {
  accepting: boolean;
  /** 마지막 토글 시각 (KST 달력일·시각) */
  changedAtYmd: string | null;
  changedAtTimeBlock: string | null;
};

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

/** 현재 시각이 속한 30분 슬롯 시작 시각 (예: 15:37 → 15:30) */
export function timeBlockFromKoreaDate(d: Date): string {
  const { hour, minute } = getKoreaDateParts(d);
  const slotM = minute < 30 ? 0 : 30;
  return `${String(hour).padStart(2, '0')}:${String(slotM).padStart(2, '0')}`;
}

export function formatKoreaMysqlDatetime(d = new Date()): string {
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

function minutesFromTimeBlock(tb: string): number {
  const [h, m] = String(tb).trim().split(':').map((x) => parseInt(x, 10));
  return (h || 0) * 60 + (m || 0);
}

export function readOwnerBookingToggle(store: Record<string, unknown>): OwnerBookingToggle {
  const accepting =
    store.acceptingReservations === undefined || store.acceptingReservations === null
      ? true
      : Number(store.acceptingReservations) === 1;

  const raw = store.acceptingReservationsAt;
  if (raw == null || raw === '') {
    return { accepting, changedAtYmd: null, changedAtTimeBlock: null };
  }

  const d = raw instanceof Date ? raw : new Date(String(raw));
  if (Number.isNaN(d.getTime())) {
    return { accepting, changedAtYmd: null, changedAtTimeBlock: null };
  }

  const { ymd } = getKoreaDateParts(d);
  return {
    accepting,
    changedAtYmd: ymd,
    changedAtTimeBlock: timeBlockFromKoreaDate(d),
  };
}

function isSlotPastForToday(slotTime: string, now: Date): boolean {
  const slotMin = minutesFromTimeBlock(slotTime);
  const { hour, minute } = getKoreaDateParts(now);
  const nowMin = hour * 60 + minute;
  return slotMin < nowMin;
}

function shouldForceCloseByToggle(
  slotTime: string,
  toggle: OwnerBookingToggle,
): boolean {
  if (!toggle.changedAtTimeBlock) return false;
  const slotMin = minutesFromTimeBlock(slotTime);
  const cutMin = minutesFromTimeBlock(toggle.changedAtTimeBlock);
  if (toggle.accepting) {
    return slotMin < cutMin;
  }
  return slotMin >= cutMin;
}

function closeSlot(slot: TimeSlot): TimeSlot {
  return {
    ...slot,
    isAvailable: false,
    currentHeadcount: slot.maxPeople,
  };
}

/** 오늘 날짜에만 사장님 예약받기 토글·지난 슬롯 반영 */
export function applyOwnerBookingToggleToSlots(
  slots: TimeSlot[],
  dateYmd: string,
  toggle: OwnerBookingToggle,
  now = new Date(),
): TimeSlot[] {
  const today = koreaTodayYmd(now);
  if (dateYmd !== today) return slots;

  return slots.map((slot) => {
    if (isSlotPastForToday(slot.timeBlock, now)) {
      return closeSlot(slot);
    }
    if (toggle.changedAtYmd === dateYmd && shouldForceCloseByToggle(slot.timeBlock, toggle)) {
      return closeSlot(slot);
    }
    return slot;
  });
}

export function isSlotOpenForOwnerToggle(
  slotTime: string,
  dateYmd: string,
  toggle: OwnerBookingToggle,
  now = new Date(),
): boolean {
  const today = koreaTodayYmd(now);
  if (dateYmd !== today) return true;
  if (isSlotPastForToday(slotTime, now)) return false;
  if (toggle.changedAtYmd === dateYmd && shouldForceCloseByToggle(slotTime, toggle)) {
    return false;
  }
  return true;
}
