import { NextResponse } from 'next/server';
import {
  listReservationsByNamePhone4Mysql,
  listReservationsByPhoneMysql,
  ReservationDbError,
} from '@/lib/mysql-data';
import { autoCheckInPastReservations } from '@/lib/admin-mysql';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const userPhone = url.searchParams.get('userPhone') ?? '';
  const userName = url.searchParams.get('userName') ?? '';
  const phoneLast4 = url.searchParams.get('phoneLast4') ?? '';

  // 2일 이상 지난 확정 예약 자동 방문 완료 처리 (best-effort)
  void autoCheckInPastReservations();

  try {
    let rows: unknown[];
    if (userName && phoneLast4) {
      rows = await listReservationsByNamePhone4Mysql(userName, phoneLast4);
    } else if (userPhone) {
      rows = await listReservationsByPhoneMysql(userPhone);
    } else {
      return NextResponse.json({ error: '조회 조건을 입력해주세요.' }, { status: 400 });
    }
    return NextResponse.json({ reservations: rows });
  } catch (error) {
    if (error instanceof ReservationDbError) {
      return NextResponse.json({ error: error.responseBody }, { status: error.statusCode });
    }
    console.error(error);
    return NextResponse.json({ error: '예약 정보를 불러올 수 없습니다' }, { status: 503 });
  }
}
