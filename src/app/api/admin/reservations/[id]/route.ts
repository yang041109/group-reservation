import { NextResponse } from 'next/server';
import { adminAcceptReservation, adminConfirmDeposit, adminSetReservationStatus } from '@/lib/admin-mysql';

export const runtime = 'nodejs';

/**
 * 예약 상태 변경 (MySQL)
 * PATCH /api/admin/reservations/[id]
 * body: { action: 'accept' | 'reject' | 'cancel' | 'confirmDeposit' }
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { action } = body;

    if (!id) {
      return NextResponse.json(
        { success: false, message: '예약 ID가 필요합니다.' },
        { status: 400 },
      );
    }

    if (!action || !['accept', 'reject', 'cancel', 'confirmDeposit'].includes(action)) {
      return NextResponse.json(
        { success: false, message: '유효하지 않은 액션입니다.' },
        { status: 400 },
      );
    }

    if (action === 'confirmDeposit') {
      const result = await adminConfirmDeposit(id);
      if (!result.success) {
        const msg = result.message;
        const code =
          msg.includes('MySQL') || msg.includes('DB ') || msg.includes('데이터베이스') ? 503 : 400;
        return NextResponse.json(result, { status: code });
      }
      return NextResponse.json(result);
    }

    if (action === 'accept') {
      const result = await adminAcceptReservation(id);
      if (!result.success) {
        const msg = result.message;
        const code =
          msg.includes('MySQL') || msg.includes('DB ') || msg.includes('데이터베이스') ? 503 : 404;
        return NextResponse.json(result, { status: code });
      }
      return NextResponse.json(result);
    }

    const newStatus = 'CANCELED';
    const result = await adminSetReservationStatus(id, newStatus);

    if (!result.success) {
      const msg = result.message;
      const code =
        msg.includes('MySQL') || msg.includes('DB ') || msg.includes('데이터베이스') ? 503 : 404;
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
