import { randomUUID } from 'crypto';

/**
 * 사이트 내 알림 엔티티
 */
export interface Notification {
  id: string;
  reservationId: string;
  type: 'accepted' | 'rejected';
  message: string;
  adminNote?: string;
  isRead: boolean;
  createdAt: Date;
}

/**
 * 예약 수락/거절 시 사이트 내 알림을 생성한다.
 *
 * - 수락 시: type='accepted', message='예약이 확정되었습니다'
 * - 거절 시: type='rejected', message='예약이 거절되었습니다'
 * - adminNote가 있으면 알림에 포함
 *
 * Requirements: 7.1, 7.2, 7.3
 */
export function createNotificationForReservation(
  reservation: { id: string },
  action: 'accept' | 'reject',
  adminNote?: string,
): Notification {
  return {
    id: randomUUID(),
    reservationId: reservation.id,
    type: action === 'accept' ? 'accepted' : 'rejected',
    message: action === 'accept' ? '예약이 확정되었습니다' : '예약이 거절되었습니다',
    adminNote,
    isRead: false,
    createdAt: new Date(),
  };
}

/**
 * 읽지 않은 알림 개수를 반환한다.
 *
 * Requirements: 7.5, 7.6
 */
export function getUnreadNotificationCount(notifications: Notification[]): number {
  return notifications.filter((n) => !n.isRead).length;
}
