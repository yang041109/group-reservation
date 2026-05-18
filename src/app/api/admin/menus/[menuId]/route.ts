import { NextResponse } from 'next/server';
import { requireOwnerStoreId } from '@/lib/admin-token-guard';
import { manageDeleteMenu, manageUpdateMenu } from '@/lib/admin-manage-mysql';

export const runtime = 'nodejs';

const pickStatus = (msg: string, fallback = 400) =>
  msg.includes('MySQL') || msg.includes('DB ') || msg.includes('데이터베이스') ? 503 : fallback;

/**
 * PATCH /api/admin/menus/[menuId]
 * body: { token, storeId, name?, price?, category?, isRequired?, imageUrl? }
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ menuId: string }> },
) {
  const { menuId } = await params;
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

  const patch: {
    name?: string;
    price?: number;
    category?: string;
    isRequired?: boolean;
    imageUrl?: string | null;
  } = {};
  if (body.name !== undefined) patch.name = String(body.name);
  if (body.price !== undefined) {
    const p = Number(body.price);
    if (Number.isNaN(p)) {
      return NextResponse.json(
        { success: false, message: 'price는 숫자여야 합니다.' },
        { status: 400 },
      );
    }
    patch.price = p;
  }
  if (body.category !== undefined) patch.category = String(body.category);
  if (body.isRequired !== undefined) patch.isRequired = Boolean(body.isRequired);
  if (body.imageUrl !== undefined) {
    patch.imageUrl = body.imageUrl === null ? null : String(body.imageUrl);
  }

  const result = await manageUpdateMenu(sid, menuId, patch);
  if (!result.success) {
    return NextResponse.json(result, { status: pickStatus(result.message) });
  }
  return NextResponse.json({ success: true });
}

/**
 * DELETE /api/admin/menus/[menuId]?token=xxx&storeId=xxx
 */
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ menuId: string }> },
) {
  const { menuId } = await params;
  const { searchParams } = new URL(request.url);
  const token = searchParams.get('token') ?? '';
  const requestedStoreId = searchParams.get('storeId') ?? '';
  const sid = await requireOwnerStoreId(token, requestedStoreId);
  if (!sid) {
    return NextResponse.json(
      { success: false, message: '권한이 없습니다.' },
      { status: 401 },
    );
  }

  const result = await manageDeleteMenu(sid, menuId);
  if (!result.success) {
    return NextResponse.json(result, { status: pickStatus(result.message) });
  }
  return NextResponse.json({ success: true });
}
