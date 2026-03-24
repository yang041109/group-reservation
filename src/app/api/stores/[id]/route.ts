import { NextResponse } from 'next/server';
import { getStoreById } from '@/lib/mock-data';
import type { GetStoreDetailResponse, StoreDetail } from '@/types';

export async function GET(
  _request: Request,
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

  const storeDetail: StoreDetail = {
    id: store.id,
    name: store.name,
    images: store.images,
    maxCapacity: store.maxCapacity,
    availableTimes: store.availableTimes,
    minOrderRules: store.minOrderRules,
  };

  const response: GetStoreDetailResponse = {
    store: storeDetail,
    menus: store.menus,
    availableTimes: store.availableTimes,
  };

  return NextResponse.json(response);
}
