import { NextResponse } from 'next/server';
import { cancelReservation, BackendApiError } from '@/lib/backend-api';

export async function PATCH(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  try {
    const data = await cancelReservation(id);
    return NextResponse.json({ success: true, data });
  } catch (error) {
    if (error instanceof BackendApiError) {
      return NextResponse.json(
        { error: error.responseBody },
        { status: error.statusCode },
      );
    }
    return NextResponse.json(
      { error: '예약 취소 처리 중 오류가 발생했습니다' },
      { status: 503 },
    );
  }
}
