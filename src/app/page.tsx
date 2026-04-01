'use client';

import { useEffect, useState } from 'react';
import StoreCard from '@/components/StoreCard';
import DateSelector from '@/components/DateSelector';
import HeadcountSelector from '@/components/HeadcountSelector';
import { getAllStores } from '@/lib/mock-data';
import type { StoreCard as StoreCardType } from '@/types';

export default function Home() {
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedHeadcount, setSelectedHeadcount] = useState(1);

  // Restore from sessionStorage
  useEffect(() => {
    const savedDate = sessionStorage.getItem('selectedDate');
    const savedHeadcount = sessionStorage.getItem('selectedHeadcount');
    if (savedDate) setSelectedDate(savedDate);
    if (savedHeadcount) setSelectedHeadcount(parseInt(savedHeadcount, 10));
  }, []);

  // Persist to sessionStorage
  useEffect(() => {
    if (selectedDate) sessionStorage.setItem('selectedDate', selectedDate);
  }, [selectedDate]);
  useEffect(() => {
    sessionStorage.setItem('selectedHeadcount', String(selectedHeadcount));
  }, [selectedHeadcount]);

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

  // Filter stores by headcount capacity
  const filteredStores = storeCards.filter((store) => {
    return store.maxCapacity >= selectedHeadcount;
  });

  const showStores = selectedDate !== null;

  return (
    <main className="mx-auto max-w-5xl px-4 py-8">
      <p className="text-sm text-gray-500">
        날짜와 인원수를 선택하면 예약 가능한 가게를 보여드립니다
      </p>

      {/* 날짜 + 인원수 선택 영역 */}
      <div className="mt-6 space-y-5 rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
        <DateSelector selectedDate={selectedDate} onChange={setSelectedDate} />

        <HeadcountSelector
          maxCapacity={100}
          minCapacity={1}
          selectedHeadcount={selectedHeadcount}
          onChange={setSelectedHeadcount}
        />
      </div>

      {/* 가게 리스트 */}
      {!showStores ? (
        <div className="mt-16 flex flex-col items-center justify-center text-gray-400">
          <p className="text-base">날짜를 선택해주세요</p>
        </div>
      ) : filteredStores.length === 0 ? (
        <div className="mt-16 flex flex-col items-center justify-center text-gray-500">
          <p className="text-lg">조건에 맞는 가게가 없습니다</p>
          <p className="mt-1 text-sm text-gray-400">인원수를 조정해보세요</p>
        </div>
      ) : (
        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredStores.map((store) => (
            <StoreCard key={store.id} store={store} />
          ))}
        </div>
      )}
    </main>
  );
}
