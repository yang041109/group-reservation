import { NextResponse } from 'next/server';
import { requireAdminManageAuth } from '@/lib/admin-manage-auth';
import { manageIssueAdminToken } from '@/lib/admin-manage-mysql';

export const runtime = 'nodejs';

/** POST /api/admin/manage/stores/[storeId]/token — adminAccessToken 재발급 */
export async function POST(request: Request, { params }: { params: Promise<{ storeId: string }> }) {
  const denied = requireAdminManageAuth(request);
  if (denied) return denied;

  const { storeId } = await params;
  const result = await manageIssueAdminToken(storeId);
  if (!result.success) {
    const code = result.message.includes('MySQL') || result.message.includes('DB') ? 503 : 400;
    return NextResponse.json(result, { status: code });
  }
  return NextResponse.json({ success: true, data: result.data });
}
