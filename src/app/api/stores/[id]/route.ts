import { NextResponse } from 'next/server';
import { getStoreDetailFromMysql, ReservationDbError } from '@/lib/mysql-data';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const url = new URL(request.url);
  const date = url.searchParams.get('date') ?? '';

  try {
    const data = await getStoreDetailFromMysql(id, date);
    return NextResponse.json(data);
  } catch (error) {
    if (error instanceof ReservationDbError) {
      return NextResponse.json(
        { error: error.responseBody || '가게 정보를 불러올 수 없습니다' },
        { status: error.statusCode },
      );
    }
    return NextResponse.json(
      { error: '가게 정보를 불러올 수 없습니다' },
      { status: 503 },
    );
  }
}
