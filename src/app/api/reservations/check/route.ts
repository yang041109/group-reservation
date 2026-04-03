import { NextResponse } from 'next/server';
import { getReservationsByPhone, BackendApiError } from '@/lib/backend-api';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const userPhone = url.searchParams.get('userPhone') ?? '';

  if (!userPhone) {
    return NextResponse.json(
      { error: '전화번호를 입력해주세요.' },
      { status: 400 },
    );
  }

  try {
    const data = await getReservationsByPhone(userPhone);
    return NextResponse.json({ reservations: data ?? [] });
  } catch (error) {
    if (error instanceof BackendApiError) {
      return NextResponse.json(
        { error: error.responseBody || '예약 정보를 불러올 수 없습니다' },
        { status: error.statusCode },
      );
    }
    return NextResponse.json(
      { error: '예약 정보를 불러올 수 없습니다' },
      { status: 503 },
    );
  }
}
