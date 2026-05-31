import { NextResponse } from 'next/server';
import { requireOwnerStoreId } from '@/lib/admin-token-guard';
import { koreaTodayYmd } from '@/lib/korea-time';
import { manageSetOwnerClosedSlots } from '@/lib/admin-manage-mysql';

export const runtime = 'nodejs';

const pickStatus = (msg: string, fallback = 400) =>
  msg.includes('MySQL') || msg.includes('DB ') || msg.includes('데이터베이스') ? 503 : fallback;

/**
 * PATCH /api/admin/store/closed-slots
 * body: { token, storeId, date?, blocks: string[] }
 */
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

  const date = body.date != null ? String(body.date).trim().slice(0, 10) : undefined;
  const blocks = Array.isArray(body.blocks)
    ? body.blocks.map((b) => String(b).trim()).filter(Boolean)
    : null;
  if (!blocks) {
    return NextResponse.json(
      { success: false, message: 'blocks 배열이 필요합니다.' },
      { status: 400 },
    );
  }
  // 시작 시간만 차단 (선택 — 빈 배열도 허용). 지정 안 하면 [] 로 처리.
  const noStartBlocks = Array.isArray(body.noStartBlocks)
    ? body.noStartBlocks.map((b) => String(b).trim()).filter(Boolean)
    : [];

  const result = await manageSetOwnerClosedSlots(
    sid,
    date ?? koreaTodayYmd(),
    blocks,
    noStartBlocks,
  );
  if (!result.success) {
    return NextResponse.json(result, { status: pickStatus(result.message) });
  }

  return NextResponse.json({
    success: true,
    ownerClosedSlotsJson: result.ownerClosedSlotsJson,
    blocks,
    noStartBlocks,
  });
}
