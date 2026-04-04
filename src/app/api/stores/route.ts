import { NextResponse } from 'next/server';
import { getStoresFromSheets, SheetsApiError } from '@/lib/sheets-api';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const date = url.searchParams.get('date') ?? '';
  const headcount = Number(url.searchParams.get('headcount') ?? '0');

  try {
    const data = await getStoresFromSheets(date, headcount) as Record<string, unknown>[];

    // Sheets 응답 → 프론트 StoreCard 형식 변환
    const stores = data.map((s: Record<string, unknown>) => ({
      id: s.storeId,
      name: s.name,
      category: s.category || '',
      images: s.imageUrl ? [s.imageUrl] : [],
      maxCapacity: s.maxCapacity,
      ...(typeof s.slotStartHour === 'number' ? { slotStartHour: s.slotStartHour } : {}),
      ...(typeof s.slotEndHour === 'number' ? { slotEndHour: s.slotEndHour } : {}),
      timeline: s.timeline,
      availableTimes: Array.isArray(s.timeline)
        ? (s.timeline as Record<string, unknown>[]).filter((t) => t.isAvailable).map((t) => t.timeBlock)
        : [],
      reservedTimes: Array.isArray(s.timeline)
        ? (s.timeline as Record<string, unknown>[]).filter((t) => !t.isAvailable).map((t) => t.timeBlock)
        : [],
      minOrderRules: s.minOrderRules || [],
    }));

    return NextResponse.json({ stores });
  } catch (error) {
    if (error instanceof SheetsApiError) {
      return NextResponse.json(
        { error: error.responseBody || '가게 정보를 불러올 수 없습니다' },
        { status: error.statusCode },
      );
    }
    return NextResponse.json(
      { error: '가게 정보를 불러올 수 없습니다' },
      { status: 503 },
    );
  }
}
