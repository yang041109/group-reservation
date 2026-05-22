import { NextResponse } from 'next/server';
import { requireAdminManageAuth } from '@/lib/admin-manage-auth';
import { manageDeleteMenu, manageUpdateMenu } from '@/lib/admin-manage-mysql';

export const runtime = 'nodejs';

/** PATCH /api/admin/manage/stores/[storeId]/menus/[menuId] */
export async function PATCH(request: Request, { params }: { params: Promise<{ storeId: string; menuId: string }> }) {
  const denied = requireAdminManageAuth(request);
  if (denied) return denied;

  const { storeId, menuId } = await params;
  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ success: false, message: 'JSON 본문이 필요합니다.' }, { status: 400 });
  }

  const patch: {
    name?: string;
    price?: number;
    category?: string;
    isRequired?: boolean;
    imageUrl?: string | null;
    description?: string | null;
  } = {};
  if (body.name !== undefined) patch.name = String(body.name);
  if (body.price !== undefined) {
    const p = Number(body.price);
    if (Number.isNaN(p)) {
      return NextResponse.json({ success: false, message: 'price는 숫자여야 합니다.' }, { status: 400 });
    }
    patch.price = p;
  }
  if (body.category !== undefined) patch.category = String(body.category);
  if (body.isRequired !== undefined) patch.isRequired = Boolean(body.isRequired);
  if (body.imageUrl !== undefined) {
    patch.imageUrl = body.imageUrl === null ? null : String(body.imageUrl);
  }
  if (body.description !== undefined) {
    patch.description = body.description === null ? null : String(body.description);
  }

  const result = await manageUpdateMenu(storeId, menuId, patch);
  if (!result.success) {
    const code = result.message.includes('MySQL') || result.message.includes('DB') ? 503 : 400;
    return NextResponse.json(result, { status: code });
  }
  return NextResponse.json({ success: true });
}

/** DELETE /api/admin/manage/stores/[storeId]/menus/[menuId] */
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ storeId: string; menuId: string }> },
) {
  const denied = requireAdminManageAuth(request);
  if (denied) return denied;

  const { storeId, menuId } = await params;
  const result = await manageDeleteMenu(storeId, menuId);
  if (!result.success) {
    const code = result.message.includes('MySQL') || result.message.includes('DB') ? 503 : 400;
    return NextResponse.json(result, { status: code });
  }
  return NextResponse.json({ success: true });
}
