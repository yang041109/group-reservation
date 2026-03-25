import StoreCard from '@/components/StoreCard';
import { getAllStores } from '@/lib/mock-data';
import type { StoreCard as StoreCardType } from '@/types';

export default function Home() {
  const stores = getAllStores();

  const storeCards: StoreCardType[] = stores.map((store) => ({
    id: store.id,
    name: store.name,
    category: store.category,
    images: store.images,
    availableTimes: store.availableTimes,
    reservedTimes: store.reservedTimes,
    maxCapacity: store.maxCapacity,
    minOrderRules: store.minOrderRules,
  }));

  return (
    <main className="mx-auto max-w-5xl px-4 py-8">
      <p className="text-sm text-gray-500">
        원하는 가게를 선택하고 단체 예약을 진행하세요
      </p>

      {storeCards.length === 0 ? (
        <div className="mt-16 flex flex-col items-center justify-center text-gray-500">
          <p className="text-lg">현재 등록된 가게가 없습니다</p>
        </div>
      ) : (
        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {storeCards.map((store) => (
            <StoreCard key={store.id} store={store} />
          ))}
        </div>
      )}
    </main>
  );
}
