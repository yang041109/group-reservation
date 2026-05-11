import { NextResponse } from 'next/server';

const SHEETS_URL = process.env.NEXT_PUBLIC_SHEETS_URL || '';

/**
 * 가게별 예약 목록 조회
 * GET /api/admin/reservations?storeId=xxx&status=PENDING&date=2026-05-10
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const storeId = searchParams.get('storeId');
    const status = searchParams.get('status'); // PENDING, CONFIRMED, etc.
    const date = searchParams.get('date'); // optional

    if (!storeId) {
      return NextResponse.json(
        { success: false, message: '가게 ID가 필요합니다.' },
        { status: 400 }
      );
    }

    // Google Sheets에서 예약 목록 가져오기
    const params = new URLSearchParams({
      action: 'getReservationsByStore',
      storeId,
    });
    
    if (status) params.append('status', status);
    if (date) params.append('date', date);

    const res = await fetch(`${SHEETS_URL}?${params.toString()}`, {
      cache: 'no-store',
    });

    if (!res.ok) {
      return NextResponse.json(
        { success: false, message: '예약 목록을 가져올 수 없습니다.' },
        { status: 500 }
      );
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json(
      { success: false, message: '서버 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
