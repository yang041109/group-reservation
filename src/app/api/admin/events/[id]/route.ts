import { NextResponse } from 'next/server';
import { adminDeleteStoreEvent } from '@/lib/admin-mysql';

export const runtime = 'nodejs';

/**
 * 일정 삭제
 * DELETE /api/admin/events/[id]?storeId=xxx
 */
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const storeId = searchParams.get('storeId') ?? '';

    if (!id || !storeId) {
      return NextResponse.json(
        { success: false, message: '가게 ID와 일정 ID가 필요합니다.' },
        { status: 400 },
      );
    }

    const result = await adminDeleteStoreEvent(storeId, id);
    if (!result.success) {
      const code =
        result.message.includes('MySQL') ||
        result.message.includes('DB ') ||
        result.message.includes('데이터베이스')
          ? 503
          : 404;
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
