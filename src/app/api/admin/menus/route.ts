import { NextResponse } from 'next/server';
import { getStoreIdFromToken, requireOwnerStoreId } from '@/lib/admin-token-guard';
import { manageInsertMenu, manageListMenus } from '@/lib/admin-manage-mysql';

export const runtime = 'nodejs';

const pickStatus = (msg: string, fallback = 400) =>
  msg.includes('MySQL') || msg.includes('DB ') || msg.includes('데이터베이스') ? 503 : fallback;

/** GET /api/admin/menus?token=xxx */
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
  const result = await manageListMenus(sid);
  if (!result.success) {
    return NextResponse.json(result, { status: pickStatus(result.message) });
  }
  return NextResponse.json({
    success: true,
    data: result.data,
    suggestedMenuId: result.suggestedMenuId,
  });
}

/**
 * POST /api/admin/menus
 * body: { token, storeId, name, price, category?, isRequired?, imageUrl? }
 * menuId 는 백엔드에서 자동 생성
 */
export async function POST(request: Request) {
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

  const name = String(body.name ?? '').trim();
  const price = Number(body.price);
  if (!name || Number.isNaN(price)) {
    return NextResponse.json(
      { success: false, message: '메뉴 이름과 가격(숫자)을 입력해 주세요.' },
      { status: 400 },
    );
  }

  const result = await manageInsertMenu(sid, {
    // menuId는 manageInsertMenu가 자동 생성 (전달 안 함)
    name,
    price,
    category: body.category != null ? String(body.category) : undefined,
    isRequired: Boolean(body.isRequired),
    imageUrl:
      body.imageUrl === null
        ? null
        : body.imageUrl !== undefined
          ? String(body.imageUrl)
          : undefined,
    description:
      body.description === null
        ? null
        : body.description !== undefined
          ? String(body.description)
          : undefined,
  });
  if (!result.success) {
    return NextResponse.json(result, { status: pickStatus(result.message) });
  }
  return NextResponse.json(result);
}
