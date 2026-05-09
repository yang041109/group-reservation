import { NextResponse } from 'next/server';
import { getAllDataFromMysql, ReservationDbError } from '@/lib/mysql-data';

/** 클라이언트 SWR 프리패치 — 구 시트 `getAllData` 와 동일한 envelope */
export async function GET() {
  try {
    const data = await getAllDataFromMysql();
    return NextResponse.json({ success: true, data });
  } catch (error) {
    if (error instanceof ReservationDbError) {
      return NextResponse.json(
        { success: false, message: error.responseBody },
        { status: error.statusCode },
      );
    }
    console.error(error);
    return NextResponse.json(
      { success: false, message: '데이터를 불러올 수 없습니다.' },
      { status: 503 },
    );
  }
}
