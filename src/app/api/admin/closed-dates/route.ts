import { NextResponse } from 'next/server';
import {
  adminAddClosedDate,
  adminGetClosedDates,
  adminRemoveClosedDate,
} from '@/lib/admin-mysql';

export const runtime = 'nodejs';

const pickStatus = (msg: string, fallback = 400) =>
  msg.includes('MySQL') || msg.includes('DB ') || msg.includes('데이터베이스') ? 503 : fallback;

/** GET /api/admin/closed-dates?storeId=xxx */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const storeId = searchParams.get('storeId') ?? '';
  if (!storeId) {
    return NextResponse.json(
      { success: false, message: '가게 ID가 필요합니다.' },
      { status: 400 },
    );
  }
  const result = await adminGetClosedDates(storeId);
  if (!result.success) {
    return NextResponse.json(result, { status: pickStatus(result.message, 404) });
  }
  return NextResponse.json(result);
}

/** POST /api/admin/closed-dates  body: { storeId, date } */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const storeId = String(body.storeId ?? '');
    const date = String(body.date ?? '');
    const result = await adminAddClosedDate(storeId, date);
    if (!result.success) {
      return NextResponse.json(result, { status: pickStatus(result.message) });
    }
    return NextResponse.json(result);
  } catch {
    return NextResponse.json(
      { success: false, message: '서버 오류가 발생했습니다.' },
      { status: 500 },
    );
  }
}

/** DELETE /api/admin/closed-dates?storeId=xxx&date=YYYY-MM-DD */
export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url);
  const storeId = searchParams.get('storeId') ?? '';
  const date = searchParams.get('date') ?? '';
  const result = await adminRemoveClosedDate(storeId, date);
  if (!result.success) {
    return NextResponse.json(result, { status: pickStatus(result.message) });
  }
  return NextResponse.json(result);
}
