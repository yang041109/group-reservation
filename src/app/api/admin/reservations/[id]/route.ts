import { NextResponse } from 'next/server';

const SHEETS_URL = process.env.NEXT_PUBLIC_SHEETS_URL || '';

/**
 * 예약 상태 변경
 * PATCH /api/admin/reservations/[id]
 * body: { action: 'accept' | 'reject' | 'cancel', depositAmount?: number }
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { action, depositAmount } = body;

    console.log('PATCH /api/admin/reservations/[id]', { id, action, depositAmount });

    if (!id) {
      return NextResponse.json(
        { success: false, message: '예약 ID가 필요합니다.' },
        { status: 400 }
      );
    }

    if (!action || !['accept', 'reject', 'cancel'].includes(action)) {
      return NextResponse.json(
        { success: false, message: '유효하지 않은 액션입니다.' },
        { status: 400 }
      );
    }

    // 상태 결정
    let newStatus: string;
    if (action === 'accept') {
      // 예약금이 있으면 DEPOSIT_PENDING, 없으면 CONFIRMED
      newStatus = depositAmount && depositAmount > 0 ? 'DEPOSIT_PENDING' : 'CONFIRMED';
    } else if (action === 'reject' || action === 'cancel') {
      newStatus = 'CANCELED';
    } else {
      return NextResponse.json(
        { success: false, message: '알 수 없는 액션입니다.' },
        { status: 400 }
      );
    }

    console.log('Updating reservation:', { reservationId: id, status: newStatus });

    // Google Sheets 업데이트
    const res = await fetch(SHEETS_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'updateReservationStatus',
        reservationId: id,
        status: newStatus,
      }),
    });

    console.log('Apps Script response status:', res.status);

    if (!res.ok) {
      const errorText = await res.text();
      console.error('Apps Script error:', errorText);
      return NextResponse.json(
        { success: false, message: '예약 상태를 변경할 수 없습니다.' },
        { status: 500 }
      );
    }

    const data = await res.json();
    console.log('Apps Script response:', data);
    return NextResponse.json(data);
  } catch (error) {
    console.error('PATCH error:', error);
    return NextResponse.json(
      { success: false, message: '서버 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
