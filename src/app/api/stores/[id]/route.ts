import { NextResponse } from 'next/server';
import { getStoreDetail, BackendApiError } from '@/lib/backend-api';
import { getStoreById, getStoreScheduleForDate, buildTimeline } from '@/lib/mock-data';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const url = new URL(request.url);
  const date = url.searchParams.get('date') ?? '';

  try {
    const data = await getStoreDetail(id, date);
    return NextResponse.json(data);
  } catch (error) {
    if (error instanceof BackendApiError) {
      // 백엔드 5xx → mock 폴백 (slots 포함)
      if (error.statusCode >= 500) {
        const store = getStoreById(id);
        if (!store) {
          return NextResponse.json(
            { error: '가게를 찾을 수 없습니다.' },
            { status: 404 },
          );
        }
        const schedule = getStoreScheduleForDate(store, date);
        const slots = buildTimeline(store, date);
        return NextResponse.json({
          store: {
            id: store.id,
            name: store.name,
            images: store.images,
            maxCapacity: store.maxCapacity,
            availableTimes: schedule.availableTimes,
            slots,
            minOrderRules: store.minOrderRules,
          },
          menus: store.menus,
          slots,
          availableTimes: schedule.availableTimes,
          reservedTimes: schedule.reservedTimes,
        });
      }
      if (error.statusCode === 404) {
        return NextResponse.json(
          { error: '가게를 찾을 수 없습니다.' },
          { status: 404 },
        );
      }
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
