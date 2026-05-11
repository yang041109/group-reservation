import { NextResponse } from 'next/server';
import { requireAdminManageAuth } from '@/lib/admin-manage-auth';
import { manageCreateStore, manageListStores } from '@/lib/admin-manage-mysql';

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

/** POST /api/admin/manage/stores — 가게 추가 */
export async function POST(request: Request) {
  const denied = requireAdminManageAuth(request);
  if (denied) return denied;

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ success: false, message: 'JSON 본문이 필요합니다.' }, { status: 400 });
  }

  const result = await manageCreateStore({
    storeId: String(body.storeId ?? ''),
    name: String(body.name ?? ''),
    category: body.category !== undefined ? String(body.category) : undefined,
    maxCapacity: body.maxCapacity !== undefined ? Number(body.maxCapacity) : undefined,
  });
  if (!result.success) {
    const code = result.message.includes('MySQL') || result.message.includes('DB') ? 503 : 400;
    return NextResponse.json(result, { status: code });
  }
  return NextResponse.json({ success: true });
}
