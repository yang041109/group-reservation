import { NextResponse } from 'next/server';
import { requireAdminManageAuth } from '@/lib/admin-manage-auth';
import { manageInsertZone, manageListZones } from '@/lib/admin-manage-mysql';

export const runtime = 'nodejs';

/** GET /api/admin/manage/stores/[storeId]/zones — 가게의 동 목록 */
export async function GET(request: Request, { params }: { params: Promise<{ storeId: string }> }) {
  const denied = requireAdminManageAuth(request);
  if (denied) return denied;

  const { storeId } = await params;
  const result = await manageListZones(storeId);
  if (!result.success) {
    const code = result.message.includes('MySQL') || result.message.includes('DB') ? 503 : 400;
    return NextResponse.json(result, { status: code });
  }
  return NextResponse.json({ success: true, data: result.data });
}

/** POST /api/admin/manage/stores/[storeId]/zones — 새 동 추가 */
export async function POST(request: Request, { params }: { params: Promise<{ storeId: string }> }) {
  const denied = requireAdminManageAuth(request);
  if (denied) return denied;

  const { storeId } = await params;
  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ success: false, message: 'JSON 본문이 필요합니다.' }, { status: 400 });
  }

  const name = String(body.name ?? '').trim();
  const maxCapacity = Number(body.maxCapacity);
  if (!name || !Number.isFinite(maxCapacity)) {
    return NextResponse.json(
      { success: false, message: 'name과 maxCapacity(숫자)가 필요합니다.' },
      { status: 400 },
    );
  }

  const result = await manageInsertZone(storeId, {
    name,
    maxCapacity,
    sortOrder: body.sortOrder !== undefined ? Number(body.sortOrder) : undefined,
    minGroupHeadcount:
      body.minGroupHeadcount === undefined
        ? undefined
        : body.minGroupHeadcount === null
          ? null
          : Number(body.minGroupHeadcount),
    slotStartHour:
      body.slotStartHour === undefined
        ? undefined
        : body.slotStartHour === null
          ? null
          : Number(body.slotStartHour),
    slotEndHour:
      body.slotEndHour === undefined
        ? undefined
        : body.slotEndHour === null
          ? null
          : Number(body.slotEndHour),
    weeklyHoursJson:
      body.weeklyHoursJson === undefined
        ? undefined
        : body.weeklyHoursJson === null
          ? null
          : String(body.weeklyHoursJson),
    closedDatesJson:
      body.closedDatesJson === undefined
        ? undefined
        : body.closedDatesJson === null
          ? null
          : String(body.closedDatesJson),
  });

  if (!result.success) {
    const code = result.message.includes('MySQL') || result.message.includes('DB') ? 503 : 400;
    return NextResponse.json(result, { status: code });
  }
  return NextResponse.json({ success: true, data: result.data });
}
