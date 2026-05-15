/** DB 예약 상태 → 관리자·고객 화면용 한글 */
export const RESERVATION_STATUS_LABELS: Record<string, string> = {
  PENDING: '예약 확인중',
  CONFIRMED: '예약 확정',
  DEPOSIT_PENDING: '예약금 입금 대기',
  DEPOSIT_CONFIRMED: '예약 완료',
  CANCELED: '취소됨',
};

export function formatReservationStatus(status: string): string {
  const key = String(status ?? '').trim().toUpperCase();
  return RESERVATION_STATUS_LABELS[key] ?? status;
}

export const RESERVATION_STATUS_FILTER_OPTIONS = [
  { value: '', label: '전체 상태' },
  { value: 'PENDING', label: RESERVATION_STATUS_LABELS.PENDING },
  { value: 'CONFIRMED', label: RESERVATION_STATUS_LABELS.CONFIRMED },
  { value: 'DEPOSIT_PENDING', label: RESERVATION_STATUS_LABELS.DEPOSIT_PENDING },
  { value: 'DEPOSIT_CONFIRMED', label: RESERVATION_STATUS_LABELS.DEPOSIT_CONFIRMED },
  { value: 'CANCELED', label: RESERVATION_STATUS_LABELS.CANCELED },
] as const;
