import { NextResponse } from 'next/server';
import { getStoreIdFromToken } from '@/lib/admin-token-guard';
import { manageGetOwnerTodayTimeline } from '@/lib/admin-manage-mysql';

export const runtime = 'nodejs';

const pickStatus = (msg: string, fallback = 400) =>
  msg.includes('MySQL') || msg.includes('DB ') || msg.includes('데이터베이스') ? 503 : fallback;

/** GET /api/admin/store/today-timeline?token=xxx */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const token = searchParams.get('token') ?? '';
  const sid = await getStoreIdFromToken(token);
  if (!sid) {
    return NextResponse.json(
      { success: false, message: '유효하지 않은 토큰입니다.' },
      { status: 401 },
    );
  }

  const result = await manageGetOwnerTodayTimeline(sid);
  if (!result.success) {
    return NextResponse.json(result, { status: pickStatus(result.message) });
  }

  return NextResponse.json({ success: true, data: result });
}
