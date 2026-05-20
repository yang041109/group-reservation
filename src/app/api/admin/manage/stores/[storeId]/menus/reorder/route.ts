import { NextResponse } from 'next/server';
import { requireAdminManageAuth } from '@/lib/admin-manage-auth';
import { manageReorderMenus } from '@/lib/admin-manage-mysql';

export const runtime = 'nodejs';

/** PATCH /api/admin/manage/stores/[storeId]/menus/reorder — body: { menuIds: string[] } */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ storeId: string }> },
) {
  const denied = requireAdminManageAuth(request);
  if (denied) return denied;

  const { storeId } = await params;
  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ success: false, message: 'JSON 본문이 필요합니다.' }, { status: 400 });
  }

  const menuIds = Array.isArray(body.menuIds)
    ? body.menuIds.map((id) => String(id).trim()).filter(Boolean)
    : null;
  if (!menuIds) {
    return NextResponse.json({ success: false, message: 'menuIds 배열이 필요합니다.' }, { status: 400 });
  }

  const result = await manageReorderMenus(storeId, menuIds);
  if (!result.success) {
    const code =
      result.message.includes('MySQL') || result.message.includes('DB') ? 503 : 400;
    return NextResponse.json(result, { status: code });
  }
  return NextResponse.json({ success: true });
}
