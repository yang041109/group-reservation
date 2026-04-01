import { NextResponse } from 'next/server';
import { getAllStores, getStoreScheduleForDate } from '@/lib/mock-data';
import type { GetStoresResponse, StoreCard } from '@/types';

export async function GET(request: Request) {
  const stores = getAllStores();
  const url = new URL(request.url);
  const date = url.searchParams.get('date');

  const storeCards: StoreCard[] = stores.map((store) => {
    const schedule = date
      ? getStoreScheduleForDate(store, date)
      : { availableTimes: store.availableTimes, reservedTimes: store.reservedTimes };

    return {
      id: store.id,
      name: store.name,
      category: store.category,
      images: store.images,
      availableTimes: schedule.availableTimes,
      reservedTimes: schedule.reservedTimes,
      maxCapacity: store.maxCapacity,
      minOrderRules: store.minOrderRules,
    };
  });

  const response: GetStoresResponse = { stores: storeCards };
  return NextResponse.json(response);
}
