import { NextResponse } from 'next/server';
import {
  getReservationById,
  updateReservation,
  addNotification,
  getStoreById,
} from '@/lib/mock-data';
import { validateStatusTransition } from '@/lib/validation';
import type { ReservationStatus, RespondReservationRequest } from '@/types';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const body = (await request.json()) as Partial<RespondReservationRequest>;

    if (!body.action || !['accept', 'reject'].includes(body.action)) {
      return NextResponse.json(
        { error: '유효하지 않은 액션입니다. accept 또는 reject를 지정해주세요.' },
        { status: 400 },
      );
    }

    const reservation = getReservationById(id);
    if (!reservation) {
      return NextResponse.json(
        { error: '예약을 찾을 수 없습니다.' },
        { status: 404 },
      );
    }

    const newStatus: ReservationStatus =
      body.action === 'accept' ? 'accepted' : 'rejected';
    const transition = validateStatusTransition(
      reservation.status as ReservationStatus,
      newStatus,
    );

    if (!transition.valid) {
      return NextResponse.json(
        { error: transition.error },
        { status: 409 },
      );
    }

    // 상태 업데이트
    updateReservation(id, {
      status: newStatus,
      adminNote: body.note ?? null,
    });

    // 알림 생성
    const store = getStoreById(reservation.storeId);
    const notification = addNotification({
      reservationId: id,
      storeName: store?.name ?? '',
      type: newStatus,
      message:
        newStatus === 'accepted'
          ? '예약이 확정되었습니다'
          : '예약이 거절되었습니다',
      adminNote: body.note ?? null,
    });

    return NextResponse.json({
      reservation: {
        id: reservation.id,
        status: newStatus,
        adminNote: body.note ?? null,
      },
      notification: {
        id: notification.id,
        type: notification.type,
        message: notification.message,
      },
    });
  } catch {
    return NextResponse.json(
      { error: '예약 응답 처리 중 오류가 발생했습니다.' },
      { status: 500 },
    );
  }
}
