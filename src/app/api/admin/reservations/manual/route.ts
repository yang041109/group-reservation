import { NextResponse } from 'next/server';
import { adminCreateManualReservation } from '@/lib/admin-mysql';

export const runtime = 'nodejs';

/**
 * 사장님이 직접 입력하는 수동 예약 / 예약 차단
 * POST /api/admin/reservations/manual
 * body: {
 *   storeId: string,
 *   mode: 'phone' | 'block',
 *   userName?: string,    // phone 모드 필수
 *   groupName?: string,
 *   userPhone?: string,
 *   userNote?: string,
 *   headcount?: number,
 *   date: string,         // YYYY-MM-DD
 *   startTime: string,    // HH:MM
 *   endTime: string,      // HH:MM
 * }
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      storeId,
      mode,
      userName,
      groupName,
      userPhone,
      userNote,
      headcount,
      date,
      startTime,
      endTime,
    } = body;

    if (!storeId) {
      return NextResponse.json(
        { success: false, message: '가게 ID가 필요합니다.' },
        { status: 400 },
      );
    }
    if (mode !== 'phone' && mode !== 'block') {
      return NextResponse.json(
        { success: false, message: 'mode는 phone 또는 block 이어야 합니다.' },
        { status: 400 },
      );
    }

    const result = await adminCreateManualReservation(String(storeId), mode, {
      userName: typeof userName === 'string' ? userName : undefined,
      groupName: typeof groupName === 'string' ? groupName : undefined,
      userPhone: typeof userPhone === 'string' ? userPhone : undefined,
      userNote: typeof userNote === 'string' ? userNote : undefined,
      headcount: typeof headcount === 'number' ? headcount : undefined,
      date: typeof date === 'string' ? date : undefined,
      startTime: typeof startTime === 'string' ? startTime : undefined,
      endTime: typeof endTime === 'string' ? endTime : undefined,
    });

    if (!result.success) {
      const code =
        result.message.includes('MySQL') ||
        result.message.includes('DB ') ||
        result.message.includes('데이터베이스')
          ? 503
          : 400;
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
