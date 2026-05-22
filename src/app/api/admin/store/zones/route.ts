import { NextResponse } from 'next/server';
import { getStoreIdFromToken } from '@/lib/admin-token-guard';
import { manageListZones } from '@/lib/admin-manage-mysql';

export const runtime = 'nodejs';

/** GET /api/admin/store/zones?token=xxx — 사장님 가게의 동 목록 (읽기 전용) */
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
  const result = await manageListZones(sid);
  if (!result.success) {
    const code =
      result.message.includes('MySQL') || result.message.includes('DB') ? 503 : 400;
    return NextResponse.json(result, { status: code });
  }
  return NextResponse.json({ success: true, data: result.data });
}
