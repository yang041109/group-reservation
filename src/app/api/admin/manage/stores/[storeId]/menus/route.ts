import { NextResponse } from 'next/server';
import { requireAdminManageAuth } from '@/lib/admin-manage-auth';
import { manageInsertMenu, manageListMenus } from '@/lib/admin-manage-mysql';

export const runtime = 'nodejs';

/** GET /api/admin/manage/stores/[storeId]/menus */
export async function GET(request: Request, { params }: { params: Promise<{ storeId: string }> }) {
  const denied = requireAdminManageAuth(request);
  if (denied) return denied;

  const { storeId } = await params;
  const result = await manageListMenus(storeId);
  if (!result.success) {
    const code = result.message.includes('MySQL') || result.message.includes('DB') ? 503 : 400;
    return NextResponse.json(result, { status: code });
  }
  return NextResponse.json({
    success: true,
    data: result.data,
    suggestedMenuId: result.suggestedMenuId,
  });
}

/** POST /api/admin/manage/stores/[storeId]/menus */
export async function POST(request: Request, { params }: { params: Promise<{ storeId: string }> }) {
  const denied = requireAdminManageAuth(request);
  if (denied) return denied;

  const { storeId } = await params;
  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ success: false, message: 'JSON 본문이 필요합니다.' }, { status: 400 });
  }

  const name = String(body.name ?? '').trim();
  const price = Number(body.price);
  if (!name || Number.isNaN(price)) {
    return NextResponse.json({ success: false, message: 'name과 price(숫자)가 필요합니다.' }, { status: 400 });
  }

  const result = await manageInsertMenu(storeId, {
    menuId: body.menuId != null ? String(body.menuId) : undefined,
    name,
    price,
    category: body.category != null ? String(body.category) : undefined,
    isRequired: Boolean(body.isRequired),
    imageUrl: body.imageUrl === null ? null : body.imageUrl !== undefined ? String(body.imageUrl) : undefined,
  });

  if (!result.success) {
    const code =
      result.message.includes('MySQL') || result.message.includes('DB') || result.message.includes('데이터베이스')
        ? 503
        : 400;
    return NextResponse.json(result, { status: code });
  }
  return NextResponse.json({ success: true, data: result.data });
}
