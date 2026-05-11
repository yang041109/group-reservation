import { NextResponse } from 'next/server';
import { adminListReservationsByStore } from '@/lib/admin-mysql';

export const runtime = 'nodejs';

/**
 * 가게별 예약 목록 조회 (MySQL)
 * GET /api/admin/reservations?storeId=xxx&status=PENDING&date=2026-05-10
 * GET /api/admin/reservations?storeId=xxx&from=2026-05-01&to=2026-05-31  (기간, status 선택)
 * GET …&calendarConfirmed=1 — status 미지정 시 CONFIRMED·DEPOSIT_CONFIRMED만 (월 캘린더용)
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const storeId = searchParams.get('storeId');
    const status = searchParams.get('status');
    const date = searchParams.get('date');
    const from = searchParams.get('from');
    const to = searchParams.get('to');
    const calendarConfirmed =
      searchParams.get('calendarConfirmed') === '1' || searchParams.get('calendarConfirmed') === 'true';

    if (!storeId) {
      return NextResponse.json(
        { success: false, message: '가게 ID가 필요합니다.' },
        { status: 400 },
      );
    }

    if ((from && !to) || (!from && to)) {
      return NextResponse.json(
        { success: false, message: '기간 조회 시 from과 to를 함께 보내주세요. (예: from=2026-05-01&to=2026-05-31)' },
        { status: 400 },
      );
    }

    const result = await adminListReservationsByStore(storeId, status, date, from, to, {
      calendarConfirmed: calendarConfirmed && !status?.trim(),
    });

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
