import { NextResponse } from 'next/server';
import { requireOwnerStoreId } from '@/lib/admin-token-guard';
import { koreaTodayYmd } from '@/lib/korea-time';
import { manageApplyOwnerCloseRange, manageSetOwnerClosedSlots } from '@/lib/admin-manage-mysql';

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

  const action = String(body.action ?? 'set').trim();

  if (action === 'applyRange') {
    const startDate = String(body.startDate ?? '').trim().slice(0, 10);
    const endDate = String(body.endDate ?? '').trim().slice(0, 10);
    const startTime = String(body.startTime ?? '').trim();
    const endTime = String(body.endTime ?? '').trim();
    const mode = body.mode === 'noStart' ? 'noStart' : 'full';
    if (!/^\d{4}-\d{2}-\d{2}$/.test(startDate) || !/^\d{4}-\d{2}-\d{2}$/.test(endDate)) {
      return NextResponse.json(
        { success: false, message: '시작·종료 날짜가 필요합니다.' },
        { status: 400 },
      );
    }
    const result = await manageApplyOwnerCloseRange(
      sid,
      startDate,
      startTime,
      endDate,
      endTime,
      mode,
    );
    if (!result.success) {
      return NextResponse.json(result, { status: pickStatus(result.message) });
    }
    return NextResponse.json({ success: true, ownerClosedSlotsJson: result.ownerClosedSlotsJson });
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
