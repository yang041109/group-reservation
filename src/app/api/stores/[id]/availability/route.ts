import { NextResponse } from 'next/server';
import { getStoreDetailFromMysql, ReservationDbError } from '@/lib/mysql-data';
import type { TimeSlot } from '@/types';

/** MySQL 예약·가게 설정을 반영한 슬롯별 잔여 인원 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const url = new URL(request.url);
  const date = url.searchParams.get('date') ?? '';

  try {
    const data = (await getStoreDetailFromMysql(id, date)) as { slots?: TimeSlot[] };
    return NextResponse.json({ slots: data.slots ?? [] });
  } catch (error) {
    if (error instanceof ReservationDbError && error.statusCode === 404) {
      return NextResponse.json({ error: '가게를 찾을 수 없습니다.' }, { status: 404 });
    }
    const message =
      error instanceof ReservationDbError
        ? error.responseBody || '슬롯 정보를 불러올 수 없습니다.'
        : '슬롯 정보를 불러올 수 없습니다.';
    const status =
      error instanceof ReservationDbError ? error.statusCode : 503;
    return NextResponse.json({ error: message, slots: [] as TimeSlot[] }, { status });
  }
}
