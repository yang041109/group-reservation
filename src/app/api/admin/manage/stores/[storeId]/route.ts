import { NextResponse } from 'next/server';
import { requireAdminManageAuth } from '@/lib/admin-manage-auth';
import { manageUpdateStore } from '@/lib/admin-manage-mysql';

export const runtime = 'nodejs';

/** PATCH /api/admin/manage/stores/[storeId] — 이름·설명·이미지 URL·sortOrder */
export async function PATCH(request: Request, { params }: { params: Promise<{ storeId: string }> }) {
  const denied = requireAdminManageAuth(request);
  if (denied) return denied;

  const { storeId } = await params;
  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ success: false, message: 'JSON 본문이 필요합니다.' }, { status: 400 });
  }

  const patch: { name?: string; description?: string | null; imageUrl?: string | null; sortOrder?: number } = {};
  if (body.name !== undefined) patch.name = String(body.name);
  if (body.description !== undefined) {
    patch.description = body.description === null ? null : String(body.description);
  }
  if (body.imageUrl !== undefined) {
    patch.imageUrl = body.imageUrl === null ? null : String(body.imageUrl);
  }
  if (body.sortOrder !== undefined) {
    const n = Number(body.sortOrder);
    patch.sortOrder = Number.isFinite(n) ? Math.floor(n) : 0;
  }

  const result = await manageUpdateStore(storeId, patch);
  if (!result.success) {
    const code = result.message.includes('MySQL') || result.message.includes('DB') ? 503 : 400;
    return NextResponse.json(result, { status: code });
  }
  return NextResponse.json({ success: true });
}
