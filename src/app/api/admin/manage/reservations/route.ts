import { NextResponse } from 'next/server';
import { requireAdminManageAuth } from '@/lib/admin-manage-auth';
import { manageListReservations } from '@/lib/admin-manage-mysql';

export const runtime = 'nodejs';

/**
 * GET /api/admin/manage/reservations?storeId=&limit=100&offset=0
 * storeId 생략 시 전체 가게
 */
export async function GET(request: Request) {
  const denied = requireAdminManageAuth(request);
  if (denied) return denied;

  const { searchParams } = new URL(request.url);
  const storeId = searchParams.get('storeId');
  const limit = parseInt(searchParams.get('limit') || '100', 10);
  const offset = parseInt(searchParams.get('offset') || '0', 10);

  const result = await manageListReservations({
    storeId: storeId?.trim() || null,
    limit: Number.isNaN(limit) ? 100 : limit,
    offset: Number.isNaN(offset) ? 0 : offset,
  });

  if (!result.success) {
    const code = result.message.includes('MySQL') || result.message.includes('DB') ? 503 : 400;
    return NextResponse.json(result, { status: code });
  }
  return NextResponse.json({ success: true, data: result.data, total: result.total });
}
