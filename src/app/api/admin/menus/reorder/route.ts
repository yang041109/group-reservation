import { NextResponse } from 'next/server';
import { requireOwnerStoreId } from '@/lib/admin-token-guard';
import { manageReorderMenus } from '@/lib/admin-manage-mysql';

export const runtime = 'nodejs';

const pickStatus = (msg: string, fallback = 400) =>
  msg.includes('MySQL') || msg.includes('DB ') || msg.includes('데이터베이스') ? 503 : fallback;

/** PATCH /api/admin/menus/reorder — body: { token, storeId, menuIds: string[] } */
export async function PATCH(request: Request) {
  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json(
      { success: false, message: 'JSON 본문이 필요합니다.' },
      { status: 400 },
    );
  }

  const token = String(body.token ?? '');
  const requestedStoreId = String(body.storeId ?? '');
  const sid = await requireOwnerStoreId(token, requestedStoreId);
  if (!sid) {
    return NextResponse.json(
      { success: false, message: '권한이 없습니다.' },
      { status: 401 },
    );
  }

  const menuIds = Array.isArray(body.menuIds)
    ? body.menuIds.map((id) => String(id).trim()).filter(Boolean)
    : null;
  if (!menuIds) {
    return NextResponse.json(
      { success: false, message: 'menuIds 배열이 필요합니다.' },
      { status: 400 },
    );
  }

  const result = await manageReorderMenus(sid, menuIds);
  if (!result.success) {
    return NextResponse.json(result, { status: pickStatus(result.message) });
  }
  return NextResponse.json({ success: true });
}
