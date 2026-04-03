import { NextResponse } from 'next/server';
import { getStores, BackendApiError } from '@/lib/backend-api';
import { getAllStores, getStoreScheduleForDate, buildTimeline } from '@/lib/mock-data';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const date = url.searchParams.get('date') ?? '';
  const headcount = Number(url.searchParams.get('headcount') ?? '0');

  try {
    // 백엔드 연결 시도
    const data = await getStores(date, headcount);
    return NextResponse.json({ stores: data });
  } catch (error) {
    // 백엔드 미연결 시 mock 데이터 폴백 (timeline 포함)
    if (error instanceof BackendApiError && error.statusCode >= 500) {
      const stores = getAllStores().map((store) => {
        const schedule = getStoreScheduleForDate(store, date);
        const timeline = buildTimeline(store, date);
        return {
          id: store.id,
          name: store.name,
          category: store.category,
          images: store.images,
          availableTimes: schedule.availableTimes,
          reservedTimes: schedule.reservedTimes,
          timeline,
          maxCapacity: store.maxCapacity,
          minOrderRules: store.minOrderRules,
        };
      });
      return NextResponse.json({ stores });
    }
    if (error instanceof BackendApiError) {
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
