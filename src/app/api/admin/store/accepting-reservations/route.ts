import { NextResponse } from 'next/server';
import { requireOwnerStoreId } from '@/lib/admin-token-guard';
import { manageSetAcceptingReservations } from '@/lib/admin-manage-mysql';

export const runtime = 'nodejs';

const pickStatus = (msg: string, fallback = 400) =>
  msg.includes('MySQL') || msg.includes('DB ') || msg.includes('데이터베이스') ? 503 : fallback;

/**
 * PATCH /api/admin/store/accepting-reservations
 * body: { token, storeId, acceptingReservations: boolean }
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

  if (body.acceptingReservations === undefined) {
    return NextResponse.json(
      { success: false, message: 'acceptingReservations 값이 필요합니다.' },
      { status: 400 },
    );
  }

  const accepting = Boolean(body.acceptingReservations);
  const result = await manageSetAcceptingReservations(sid, accepting);
  if (!result.success) {
    return NextResponse.json(result, { status: pickStatus(result.message) });
  }

  return NextResponse.json({
    success: true,
    acceptingReservations: result.acceptingReservations,
    acceptingReservationsAt: result.acceptingReservationsAt,
  });
}
