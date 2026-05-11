import { NextResponse } from 'next/server';
import { adminListReservationsByStore } from '@/lib/admin-mysql';

export const runtime = 'nodejs';

/**
 * 가게별 예약 목록 조회 (MySQL)
 * GET /api/admin/reservations?storeId=xxx&status=PENDING&date=2026-05-10
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const storeId = searchParams.get('storeId');
    const status = searchParams.get('status');
    const date = searchParams.get('date');

    if (!storeId) {
      return NextResponse.json(
        { success: false, message: '가게 ID가 필요합니다.' },
        { status: 400 },
      );
    }

    const result = await adminListReservationsByStore(storeId, status, date);

    if (!result.success) {
      const msg = result.message;
      const code =
        msg.includes('MySQL') || msg.includes('DB ') || msg.includes('데이터베이스') ? 503 : 400;
      return NextResponse.json(result, { status: code });
    }

    return NextResponse.json(result);
  } catch {
    return NextResponse.json(
      { success: false, message: '서버 오류가 발생했습니다.' },
      { status: 500 },
    );
  }
}
