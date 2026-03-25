import { NextResponse } from 'next/server';
import { getAllStores } from '@/lib/mock-data';
import type { GetStoresResponse, StoreCard } from '@/types';

export async function GET() {
  const stores = getAllStores();

  const storeCards: StoreCard[] = stores.map((store) => ({
    id: store.id,
    name: store.name,
    category: store.category,
    images: store.images,
    availableTimes: store.availableTimes,
    reservedTimes: store.reservedTimes,
    maxCapacity: store.maxCapacity,
    minOrderRules: store.minOrderRules,
  }));

  const response: GetStoresResponse = { stores: storeCards };
  return NextResponse.json(response);
}
