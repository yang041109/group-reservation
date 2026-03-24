import { NextResponse } from 'next/server';
import { getNotificationById, markNotificationRead } from '@/lib/mock-data';
import type { MarkNotificationReadResponse } from '@/types';

export async function PATCH(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const notification = getNotificationById(id);

  if (!notification) {
    return NextResponse.json(
      { error: '알림을 찾을 수 없습니다.' },
      { status: 404 },
    );
  }

  markNotificationRead(id);

  const response: MarkNotificationReadResponse = {
    id: notification.id,
    isRead: true,
  };

  return NextResponse.json(response);
}
