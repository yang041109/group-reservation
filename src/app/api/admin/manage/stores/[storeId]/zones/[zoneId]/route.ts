import { NextResponse } from 'next/server';
import { requireAdminManageAuth } from '@/lib/admin-manage-auth';
import { manageDeleteZone, manageUpdateZone } from '@/lib/admin-manage-mysql';

export const runtime = 'nodejs';

/** PATCH /api/admin/manage/stores/[storeId]/zones/[zoneId] */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ storeId: string; zoneId: string }> },
) {
  const denied = requireAdminManageAuth(request);
  if (denied) return denied;

  const { storeId, zoneId } = await params;
  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ success: false, message: 'JSON 본문이 필요합니다.' }, { status: 400 });
  }

  const patch: Parameters<typeof manageUpdateZone>[2] = {};
  if (body.name !== undefined) patch.name = String(body.name);
  if (body.maxCapacity !== undefined) patch.maxCapacity = Number(body.maxCapacity);
  if (body.sortOrder !== undefined) patch.sortOrder = Number(body.sortOrder);
  if (body.minGroupHeadcount !== undefined) {
    patch.minGroupHeadcount =
      body.minGroupHeadcount === null ? null : Number(body.minGroupHeadcount);
  }
  if (body.slotStartHour !== undefined) {
    patch.slotStartHour = body.slotStartHour === null ? null : Number(body.slotStartHour);
  }
  if (body.slotEndHour !== undefined) {
    patch.slotEndHour = body.slotEndHour === null ? null : Number(body.slotEndHour);
  }
  if (body.weeklyHoursJson !== undefined) {
    patch.weeklyHoursJson = body.weeklyHoursJson === null ? null : String(body.weeklyHoursJson);
  }
  if (body.closedDatesJson !== undefined) {
    patch.closedDatesJson = body.closedDatesJson === null ? null : String(body.closedDatesJson);
  }
  if (body.ownerClosedSlotsJson !== undefined) {
    patch.ownerClosedSlotsJson =
      body.ownerClosedSlotsJson === null ? null : String(body.ownerClosedSlotsJson);
  }

  const result = await manageUpdateZone(storeId, zoneId, patch);
  if (!result.success) {
    const code = result.message.includes('MySQL') || result.message.includes('DB') ? 503 : 400;
    return NextResponse.json(result, { status: code });
  }
  return NextResponse.json({ success: true });
}

/** DELETE /api/admin/manage/stores/[storeId]/zones/[zoneId] */
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ storeId: string; zoneId: string }> },
) {
  const denied = requireAdminManageAuth(request);
  if (denied) return denied;

  const { storeId, zoneId } = await params;
  const result = await manageDeleteZone(storeId, zoneId);
  if (!result.success) {
    const code = result.message.includes('MySQL') || result.message.includes('DB') ? 503 : 400;
    return NextResponse.json(result, { status: code });
  }
  return NextResponse.json({ success: true });
}
