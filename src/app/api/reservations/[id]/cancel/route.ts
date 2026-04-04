import { NextResponse } from 'next/server';
import { cancelReservationInSheets, SheetsApiError } from '@/lib/sheets-api';

export async function PATCH(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  try {
    const data = await cancelReservationInSheets(id);
    return NextResponse.json({ success: true, data });
  } catch (error) {
    if (error instanceof SheetsApiError) {
      return NextResponse.json(
        { error: error.responseBody },
        { status: error.statusCode },
      );
    }
    return NextResponse.json(
      { error: '예약 취소 처리 중 오류가 발생했습니다' },
      { status: 503 },
    );
  }
}
