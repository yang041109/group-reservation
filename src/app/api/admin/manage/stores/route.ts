import { NextResponse } from 'next/server';
import { requireAdminManageAuth } from '@/lib/admin-manage-auth';
import { manageListStores } from '@/lib/admin-manage-mysql';

export const runtime = 'nodejs';

/** GET /api/admin/manage/stores — 가게 목록 */
export async function GET(request: Request) {
  const denied = requireAdminManageAuth(request);
  if (denied) return denied;

  const result = await manageListStores();
  if (!result.success) {
    const code = result.message.includes('MySQL') || result.message.includes('DB') ? 503 : 400;
    return NextResponse.json(result, { status: code });
  }
  return NextResponse.json({ success: true, data: result.data });
}
