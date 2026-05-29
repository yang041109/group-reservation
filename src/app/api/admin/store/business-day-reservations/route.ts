import { NextResponse } from 'next/server';
import { getStoreIdFromToken } from '@/lib/admin-token-guard';
import { manageGetOwnerBusinessDayReservations } from '@/lib/admin-manage-mysql';

export const runtime = 'nodejs';

const pickStatus = (msg: string, fallback = 400) =>
  msg.includes('MySQL') || msg.includes('DB ') || msg.includes('데이터베이스') ? 503 : fallback;

/**
 * GET /api/admin/store/business-day-reservations?token=xxx
 * GET …&date=2026-05-29 — 해당 영업일(캘린더 날짜 칸과 동일 기준)
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const token = searchParams.get('token') ?? '';
  const date = searchParams.get('date')?.trim().slice(0, 10) || undefined;
  const sid = await getStoreIdFromToken(token);
  if (!sid) {
    return NextResponse.json(
      { success: false, message: '유효하지 않은 토큰입니다.' },
      { status: 401 },
    );
  }

  const result = await manageGetOwnerBusinessDayReservations(sid, date);
  if (!result.success) {
    return NextResponse.json(result, { status: pickStatus(result.message) });
  }

  return NextResponse.json({ success: true, data: result });
}
