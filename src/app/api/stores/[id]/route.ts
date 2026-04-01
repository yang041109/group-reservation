import { NextResponse } from 'next/server';
import { getStoreById, getStoreScheduleForDate } from '@/lib/mock-data';
import type { GetStoreDetailResponse, StoreDetail } from '@/types';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const store = getStoreById(id);

  if (!store) {
    return NextResponse.json(
      { error: '가게를 찾을 수 없습니다.' },
      { status: 404 },
    );
  }

  // 날짜 쿼리 파라미터로 해당 날짜의 시간 데이터 반환
  const url = new URL(request.url);
  const date = url.searchParams.get('date');
  const schedule = date
    ? getStoreScheduleForDate(store, date)
    : { availableTimes: store.availableTimes, reservedTimes: store.reservedTimes };

  const storeDetail: StoreDetail = {
    id: store.id,
    name: store.name,
    images: store.images,
    maxCapacity: store.maxCapacity,
    availableTimes: schedule.availableTimes,
    minOrderRules: store.minOrderRules,
  };

  const response: GetStoreDetailResponse = {
    store: storeDetail,
    menus: store.menus,
    availableTimes: schedule.availableTimes,
    reservedTimes: schedule.reservedTimes,
  };

  return NextResponse.json(response);
}
