import { NextResponse } from 'next/server';
import {
  adminAcceptReservation,
  adminCancelConfirmedReservation,
  adminCheckInReservation,
  adminConfirmDeposit,
  adminMarkNoShow,
  adminRejectReservation,
  adminSetReservationStatus,
  adminUpdateReservation,
} from '@/lib/admin-mysql';

export const runtime = 'nodejs';

/**
 * 예약 상태 변경 (MySQL)
 * PATCH /api/admin/reservations/[id]
 * body:
 *  - { action: 'accept' }
 *  - { action: 'reject', reason: string, alternative?: string }
 *  - { action: 'cancel', reason?: string, alternative?: string }
 *  - { action: 'confirmDeposit' }
 *  - { action: 'checkIn' }
 *  - { action: 'noShow' }
 *  - { action: 'update', startTime?: string, endTime?: string, headcount?: number, notice?: string }
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { action, reason, alternative, startTime, endTime, headcount, notice } = body;

    if (!id) {
      return NextResponse.json(
        { success: false, message: '예약 ID가 필요합니다.' },
        { status: 400 },
      );
    }

    const validActions = [
      'accept',
      'reject',
      'cancel',
      'confirmDeposit',
      'checkIn',
      'noShow',
      'update',
    ];
    if (!action || !validActions.includes(action)) {
      return NextResponse.json(
        { success: false, message: '유효하지 않은 액션입니다.' },
        { status: 400 },
      );
    }

    const pickStatusCode = (msg: string, fallback = 400) =>
      msg.includes('MySQL') || msg.includes('DB ') || msg.includes('데이터베이스') ? 503 : fallback;

    if (action === 'confirmDeposit') {
      const result = await adminConfirmDeposit(id);
      if (!result.success) {
        return NextResponse.json(result, { status: pickStatusCode(result.message) });
      }
      return NextResponse.json(result);
    }

    if (action === 'accept') {
      const result = await adminAcceptReservation(id);
      if (!result.success) {
        return NextResponse.json(result, { status: pickStatusCode(result.message, 404) });
      }
      return NextResponse.json(result);
    }

    if (action === 'reject') {
      const reasonText = typeof reason === 'string' ? reason : '';
      const altText = typeof alternative === 'string' ? alternative.trim() : '';
      const fullReason = altText ? `${reasonText.trim()}\n\n[대안 안내]\n${altText}` : reasonText;
      const result = await adminRejectReservation(id, fullReason);
      if (!result.success) {
        return NextResponse.json(result, { status: pickStatusCode(result.message) });
      }
      return NextResponse.json(result);
    }

    if (action === 'checkIn') {
      const result = await adminCheckInReservation(id);
      if (!result.success) {
        return NextResponse.json(result, { status: pickStatusCode(result.message) });
      }
      return NextResponse.json(result);
    }

    if (action === 'noShow') {
      const result = await adminMarkNoShow(id);
      if (!result.success) {
        return NextResponse.json(result, { status: pickStatusCode(result.message) });
      }
      return NextResponse.json(result);
    }

    if (action === 'update') {
      const result = await adminUpdateReservation(id, {
        startTime: typeof startTime === 'string' ? startTime : undefined,
        endTime: typeof endTime === 'string' ? endTime : undefined,
        headcount: typeof headcount === 'number' ? headcount : undefined,
        notice: typeof notice === 'string' ? notice : undefined,
      });
      if (!result.success) {
        return NextResponse.json(result, { status: pickStatusCode(result.message) });
      }
      return NextResponse.json(result);
    }

    // action === 'cancel'
    // 사유가 있으면 ownerRejectReason 컬럼에 기록 (확정 예약 직권 취소).
    // 사유가 없으면 기존 동작(단순 상태 변경) 유지 — 호환성 보존.
    const reasonText = typeof reason === 'string' ? reason.trim() : '';
    const altText = typeof alternative === 'string' ? alternative.trim() : '';
    if (reasonText) {
      const fullReason = altText ? `${reasonText}\n\n[대안 안내]\n${altText}` : reasonText;
      const result = await adminCancelConfirmedReservation(id, fullReason);
      if (!result.success) {
        return NextResponse.json(result, { status: pickStatusCode(result.message, 404) });
      }
      return NextResponse.json(result);
    }
    const result = await adminSetReservationStatus(id, 'CANCELED');
    if (!result.success) {
      return NextResponse.json(result, { status: pickStatusCode(result.message, 404) });
    }
    return NextResponse.json(result);
  } catch {
    return NextResponse.json(
      { success: false, message: '서버 오류가 발생했습니다.' },
      { status: 500 },
    );
  }
}
