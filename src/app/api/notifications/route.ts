import { NextResponse } from 'next/server';
import { getAllNotifications, getUnreadCount } from '@/lib/mock-data';
import type { GetNotificationsResponse, NotificationData } from '@/types';

export async function GET() {
  const notifications = getAllNotifications();
  const unreadCount = getUnreadCount();

  const data: NotificationData[] = notifications.map((n) => ({
    id: n.id,
    reservationId: n.reservationId,
    storeName: n.storeName,
    type: n.type,
    message: n.message,
    adminNote: n.adminNote ?? undefined,
    isRead: n.isRead,
    createdAt: n.createdAt,
  }));

  const response: GetNotificationsResponse = {
    notifications: data,
    unreadCount,
  };

  return NextResponse.json(response);
}
