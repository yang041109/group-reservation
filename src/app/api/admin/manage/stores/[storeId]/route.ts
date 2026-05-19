import { NextResponse } from 'next/server';
import { serializeDepositTiersForDb } from '@/lib/deposit-tiers';
import { requireAdminManageAuth } from '@/lib/admin-manage-auth';
import { manageDeleteStore, manageUpdateStore } from '@/lib/admin-manage-mysql';
import type { DepositTier } from '@/types';

export const runtime = 'nodejs';

/** PATCH /api/admin/manage/stores/[storeId] — 이름·설명·이미지·sortOrder·예약금 */
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

  const patch: Parameters<typeof manageUpdateStore>[1] = {};
  if (body.name !== undefined) patch.name = String(body.name);
  if (body.locationLabel !== undefined) {
    patch.locationLabel = body.locationLabel === null ? null : String(body.locationLabel);
  }
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
  if (body.depositAmount !== undefined) {
    const n = Number(body.depositAmount);
    patch.depositAmount = Number.isFinite(n) ? Math.max(0, Math.floor(n)) : 0;
  }
  if (body.depositUseTiers !== undefined) {
    patch.depositUseTiers = Boolean(body.depositUseTiers);
  }
  if (body.depositTiers !== undefined) {
    if (body.depositTiers === null) {
      patch.depositTiersJson = null;
    } else if (Array.isArray(body.depositTiers)) {
      patch.depositTiersJson = serializeDepositTiersForDb(body.depositTiers as DepositTier[]);
    }
  }
  if (body.minGroupHeadcount !== undefined) {
    const n = Number(body.minGroupHeadcount);
    patch.minGroupHeadcount = Number.isFinite(n) ? Math.max(1, Math.floor(n)) : 2;
  }
  if (body.maxCapacity !== undefined) {
    const n = Number(body.maxCapacity);
    patch.maxCapacity = Number.isFinite(n) ? Math.max(0, Math.floor(n)) : 0;
  }
  if (body.ownerName !== undefined) {
    patch.ownerName = body.ownerName === null ? null : String(body.ownerName);
  }
  if (body.ownerBankAccount !== undefined) {
    patch.ownerBankAccount = body.ownerBankAccount === null ? null : String(body.ownerBankAccount);
  }
  if (body.weeklyHoursJson !== undefined) {
    patch.weeklyHoursJson =
      body.weeklyHoursJson === null ? null : String(body.weeklyHoursJson);
  }
  if (body.closedDatesJson !== undefined) {
    patch.closedDatesJson =
      body.closedDatesJson === null ? null : String(body.closedDatesJson);
  }
  if (body.slotStartHour !== undefined) {
    const n = body.slotStartHour === null ? null : Number(body.slotStartHour);
    patch.slotStartHour = n === null || Number.isNaN(n) ? null : Math.min(23, Math.max(0, Math.floor(n)));
  }
  if (body.slotEndHour !== undefined) {
    const n = body.slotEndHour === null ? null : Number(body.slotEndHour);
    patch.slotEndHour = n === null || Number.isNaN(n) ? null : Math.min(23, Math.max(0, Math.floor(n)));
  }

  const result = await manageUpdateStore(storeId, patch);
  if (!result.success) {
    const code = result.message.includes('MySQL') || result.message.includes('DB') ? 503 : 400;
    return NextResponse.json(result, { status: code });
  }
  return NextResponse.json({ success: true });
}

/** DELETE /api/admin/manage/stores/[storeId] — 가게 삭제(메뉴·규칙·예약 CASCADE) */
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ storeId: string }> },
) {
  const denied = requireAdminManageAuth(request);
  if (denied) return denied;

  const { storeId } = await params;
  const result = await manageDeleteStore(storeId);
  if (!result.success) {
    const code = result.message.includes('MySQL') || result.message.includes('DB') ? 503 : 400;
    return NextResponse.json(result, { status: code });
  }
  return NextResponse.json({ success: true });
}
