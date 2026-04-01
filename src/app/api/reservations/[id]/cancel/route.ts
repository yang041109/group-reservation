import { NextResponse } from 'next/server';
import { getReservationById, deleteReservation } from '@/lib/mock-data';

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const reservation = getReservationById(id);

  if (!reservation) {
    return NextResponse.json(
      { error: '예약을 찾을 수 없습니다.' },
      { status: 404 },
    );
  }

  // 예약 날짜 3일 전까지만 취소 가능
  const reservationDate = new Date(reservation.date + 'T00:00:00');
  const now = new Date();
  const diffMs = reservationDate.getTime() - now.getTime();
  const diffDays = diffMs / (1000 * 60 * 60 * 24);

  if (diffDays < 3) {
    return NextResponse.json(
      { error: '예약일 3일 전까지만 취소가 가능합니다.' },
      { status: 400 },
    );
  }

  const deleted = deleteReservation(id);
  if (!deleted) {
    return NextResponse.json(
      { error: '예약 취소 처리 중 오류가 발생했습니다.' },
      { status: 500 },
    );
  }

  return NextResponse.json({ success: true });
}
