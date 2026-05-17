import { NextResponse } from 'next/server';
import { adminCreateStoreEvent, adminListStoreEvents } from '@/lib/admin-mysql';

export const runtime = 'nodejs';

/**
 * 가게 일정 목록 조회
 * GET /api/admin/events?storeId=xxx&from=YYYY-MM-DD&to=YYYY-MM-DD
 * GET /api/admin/events?storeId=xxx&date=YYYY-MM-DD
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const storeId = searchParams.get('storeId');
    const from = searchParams.get('from');
    const to = searchParams.get('to');
    const date = searchParams.get('date');

    if (!storeId) {
      return NextResponse.json(
        { success: false, message: '가게 ID가 필요합니다.' },
        { status: 400 },
      );
    }
    if ((from && !to) || (!from && to)) {
      return NextResponse.json(
        { success: false, message: '기간 조회 시 from과 to를 함께 보내주세요.' },
        { status: 400 },
      );
    }

    const result = await adminListStoreEvents(storeId, from, to, date);
    if (!result.success) {
      const code =
        result.message.includes('MySQL') ||
        result.message.includes('DB ') ||
        result.message.includes('데이터베이스')
          ? 503
          : 400;
      return NextResponse.json(result, { status: code });
    }
    return NextResponse.json(result);
  } catch {
    return NextResponse.json(
      { success: false, message: '서버 오류가 발생했습니다.' },
      { status: 500 },
    );
  }
}

/**
 * 가게 일정 등록
 * POST /api/admin/events
 * body: { storeId, title, memo?, category?, date, startTime, endTime }
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { storeId, title, memo, category, date, startTime, endTime } = body;

    if (!storeId) {
      return NextResponse.json(
        { success: false, message: '가게 ID가 필요합니다.' },
        { status: 400 },
      );
    }

    const result = await adminCreateStoreEvent(String(storeId), {
      title: typeof title === 'string' ? title : undefined,
      memo: typeof memo === 'string' ? memo : undefined,
      category: typeof category === 'string' ? category : undefined,
      date: typeof date === 'string' ? date : undefined,
      startTime: typeof startTime === 'string' ? startTime : undefined,
      endTime: typeof endTime === 'string' ? endTime : undefined,
    });
    if (!result.success) {
      const code =
        result.message.includes('MySQL') ||
        result.message.includes('DB ') ||
        result.message.includes('데이터베이스')
          ? 503
          : 400;
      return NextResponse.json(result, { status: code });
    }
    return NextResponse.json(result);
  } catch {
    return NextResponse.json(
      { success: false, message: '서버 오류가 발생했습니다.' },
      { status: 500 },
    );
  }
}
