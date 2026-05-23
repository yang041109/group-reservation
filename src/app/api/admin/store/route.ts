import { NextResponse } from 'next/server';
import { getStoreIdFromToken, requireOwnerStoreId } from '@/lib/admin-token-guard';
import { manageGetStoreById, manageUpdateStore } from '@/lib/admin-manage-mysql';
import { depositModeToDb, serializeDepositTiersForDb, type DepositMode } from '@/lib/deposit-tiers';
import type { DepositTier } from '@/types';

export const runtime = 'nodejs';

const pickStatus = (msg: string, fallback = 400) =>
  msg.includes('MySQL') || msg.includes('DB ') || msg.includes('데이터베이스') ? 503 : fallback;

/** GET /api/admin/store?token=xxx */
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
  const result = await manageGetStoreById(sid);
  if (!result.success) {
    return NextResponse.json(result, { status: pickStatus(result.message, 404) });
  }
  return NextResponse.json(result);
}

/**
 * PATCH /api/admin/store
 * body: { token, storeId, ...patchFields }
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
  if (body.depositAmount !== undefined) {
    const n = Number(body.depositAmount);
    patch.depositAmount = Number.isFinite(n) ? Math.max(0, Math.floor(n)) : 0;
  }
  if (body.depositMode !== undefined) {
    patch.depositUseTiers = depositModeToDb(String(body.depositMode) as DepositMode);
  } else if (body.depositUseTiers !== undefined) {
    const v = body.depositUseTiers;
    patch.depositUseTiers =
      typeof v === 'number' ? Math.min(2, Math.max(0, Math.floor(v))) : Boolean(v) ? 1 : 0;
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
  if (body.slotStartHour !== undefined) {
    const n = body.slotStartHour === null ? null : Number(body.slotStartHour);
    patch.slotStartHour =
      n === null || Number.isNaN(n) ? null : Math.min(23, Math.max(0, Math.floor(n)));
  }
  if (body.slotEndHour !== undefined) {
    const n = body.slotEndHour === null ? null : Number(body.slotEndHour);
    patch.slotEndHour =
      n === null || Number.isNaN(n) ? null : Math.min(23, Math.max(0, Math.floor(n)));
  }
  if (body.weeklyHoursJson !== undefined) {
    patch.weeklyHoursJson =
      body.weeklyHoursJson === null ? null : String(body.weeklyHoursJson);
  }
  if (body.allowSameDayBooking !== undefined) {
    patch.allowSameDayBooking = !!body.allowSameDayBooking;
  }
  if (body.closedWeekdaysJson !== undefined) {
    patch.closedWeekdaysJson =
      body.closedWeekdaysJson === null ? null : String(body.closedWeekdaysJson);
  }
  if (body.menuNoticeText !== undefined) {
    patch.menuNoticeText =
      body.menuNoticeText === null ? null : String(body.menuNoticeText);
  }
  if (body.depositActiveMonthRangesJson !== undefined) {
    patch.depositActiveMonthRangesJson =
      body.depositActiveMonthRangesJson === null
        ? null
        : String(body.depositActiveMonthRangesJson);
  }
  if (body.menuRequiredPeoplePerItem !== undefined) {
    if (body.menuRequiredPeoplePerItem === null) {
      patch.menuRequiredPeoplePerItem = null;
    } else {
      const n = Number(body.menuRequiredPeoplePerItem);
      patch.menuRequiredPeoplePerItem = Number.isFinite(n) && n > 0 ? Math.floor(n) : null;
    }
  }

  const result = await manageUpdateStore(sid, patch);
  if (!result.success) {
    return NextResponse.json(result, { status: pickStatus(result.message) });
  }
  return NextResponse.json({ success: true });
}
