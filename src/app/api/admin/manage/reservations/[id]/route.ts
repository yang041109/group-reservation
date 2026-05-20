import { NextResponse } from 'next/server';
import { requireAdminManageAuth } from '@/lib/admin-manage-auth';
import {
  manageDeleteReservation,
  manageUpdateReservationStatus,
} from '@/lib/admin-manage-mysql';

export const runtime = 'nodejs';

const pickStatus = (msg: string, fallback = 400) =>
  msg.includes('MySQL') || msg.includes('DB ') || msg.includes('데이터베이스') ? 503 : fallback;

/**
 * PATCH /api/admin/manage/reservations/[id]
 * body: { status: 'PENDING' | 'CONFIRMED' | 'DEPOSIT_PENDING' | 'DEPOSIT_CONFIRMED' | 'CHECKED_IN' | 'NO_SHOW' | 'CANCELED' }
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const denied = requireAdminManageAuth(request);
  if (denied) return denied;

  const { id } = await params;
  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json(
      { success: false, message: 'JSON 본문이 필요합니다.' },
      { status: 400 },
    );
  }

  const status = String(body.status ?? '').trim();
  if (!status) {
    return NextResponse.json(
      { success: false, message: 'status가 필요합니다.' },
      { status: 400 },
    );
  }

  const result = await manageUpdateReservationStatus(id, status);
  if (!result.success) {
    return NextResponse.json(result, { status: pickStatus(result.message, 404) });
  }
  return NextResponse.json(result);
}

/** DELETE /api/admin/manage/reservations/[id] */
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const denied = requireAdminManageAuth(request);
  if (denied) return denied;

  const { id } = await params;
  const result = await manageDeleteReservation(id);
  if (!result.success) {
    return NextResponse.json(result, { status: pickStatus(result.message, 404) });
  }
  return NextResponse.json({ success: true });
}
