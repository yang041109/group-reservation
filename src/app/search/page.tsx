'use client';

import { useEffect, useState } from 'react';
import StoreCard from '@/components/StoreCard';
import DateSelector from '@/components/DateSelector';
import HeadcountSelector from '@/components/HeadcountSelector';
import { useAllData, buildSlotsForDate } from '@/lib/use-store-data';
import UrrLoading from '@/components/UrrLoading';
import type { StoreCard as StoreCardType } from '@/types';

export default function SearchPage() {
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedHeadcount, setSelectedHeadcount] = useState(0);
  const { stores, reservations, isLoading } = useAllData();

  useEffect(() => {
    const savedDate = sessionStorage.getItem('selectedDate');
    const savedHeadcount = sessionStorage.getItem('selectedHeadcount');
    if (savedDate) setSelectedDate(savedDate);
    if (savedHeadcount) setSelectedHeadcount(parseInt(savedHeadcount, 10));
  }, []);

  useEffect(() => {
    if (selectedDate) sessionStorage.setItem('selectedDate', selectedDate);
  }, [selectedDate]);
  useEffect(() => {
    sessionStorage.setItem('selectedHeadcount', String(selectedHeadcount));
  }, [selectedHeadcount]);

  const storeCards: StoreCardType[] = stores.map((s) => {
    const timeline = selectedDate
      ? buildSlotsForDate(
          s.storeId,
          selectedDate,
          s.maxCapacity,
          reservations,
          s.slotStartHour,
          s.slotEndHour,
        )
      : [];
    return {
      id: s.storeId,
      name: s.name,
      category: s.category,
      images: s.imageUrl ? [s.imageUrl] : [],
      maxCapacity: s.maxCapacity,
      timeline,
      availableTimes: timeline.filter((t) => t.isAvailable).map((t) => t.timeBlock),
      reservedTimes: timeline.filter((t) => !t.isAvailable).map((t) => t.timeBlock),
      minOrderRules: s.minOrderRules,
      slotStartHour: s.slotStartHour,
      slotEndHour: s.slotEndHour,
      depositAmount: s.depositAmount,
    };
  });

  useEffect(() => {
    if (storeCards.length > 0) {
      try {
        sessionStorage.setItem('cachedStores', JSON.stringify(storeCards));
      } catch {}
      try {
        sessionStorage.setItem('cachedStoresRaw', JSON.stringify(stores));
      } catch {}
      try {
        sessionStorage.setItem('cachedReservations', JSON.stringify(reservations));
      } catch {}
    }
  }, [storeCards, stores, reservations]);

  const filteredStores = storeCards.filter((store) => {
    if (selectedHeadcount === 0) return true;
    return store.maxCapacity >= selectedHeadcount;
  });

  const showStores = selectedDate !== null;

  // 업데이트 시간 계산 (0시 또는 12시 기준)
  const getUpdateTimeMessage = () => {
    const now = new Date();
    const currentHour = now.getHours();
    
    let hoursSinceUpdate: number;
    if (currentHour >= 12) {
      hoursSinceUpdate = currentHour - 12;
    } else {
      hoursSinceUpdate = currentHour;
    }
    
    return `${hoursSinceUpdate}시간 전 업데이트된 예약 현황입니다`;
  };

  return (
    <main className="mx-auto max-w-5xl px-4 py-8">
      <p className="text-sm text-gray-500">
        날짜와 인원수를 선택하면 예약 가능한 가게를 보여드립니다
      </p>

      {showStores && !isLoading && (
        <div className="mt-4 rounded-lg bg-blue-50 px-4 py-2">
          <p className="text-xs text-blue-600">
            ⏰ {getUpdateTimeMessage()}
          </p>
        </div>
      )}

      <div className="mt-6 space-y-5 rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
        <DateSelector selectedDate={selectedDate} onChange={setSelectedDate} />
        <HeadcountSelector
          maxCapacity={100}
          minCapacity={0}
          selectedHeadcount={selectedHeadcount}
          onChange={setSelectedHeadcount}
        />
      </div>

      {!showStores ? (
        <div className="mt-16 flex flex-col items-center justify-center text-gray-400">
          <p className="text-base">날짜를 선택해주세요</p>
        </div>
      ) : isLoading ? (
        <UrrLoading message="가게 정보를 불러오는 중..." />
      ) : filteredStores.length === 0 ? (
        <div className="mt-16 flex flex-col items-center justify-center text-gray-500">
          <p className="text-lg">조건에 맞는 가게가 없습니다</p>
          <p className="mt-1 text-sm text-gray-400">인원수를 조정해보세요</p>
        </div>
      ) : (
        <>
          {/* 타임라인 색상 범례 */}
          <div className="mt-6 rounded-lg border border-gray-200 bg-white p-4">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">타임라인 색상 안내</h3>
            <div className="flex flex-wrap gap-4">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded bg-emerald-400"></div>
                <span className="text-xs text-gray-600">여유</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded bg-emerald-300"></div>
                <span className="text-xs text-gray-600">보통</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded bg-yellow-400"></div>
                <span className="text-xs text-gray-600">혼잡</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded bg-orange-400"></div>
                <span className="text-xs text-gray-600">거의 마감</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded bg-red-500"></div>
                <span className="text-xs text-gray-600">마감</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded bg-gray-400"></div>
                <span className="text-xs text-gray-600">예약 불가</span>
              </div>
            </div>
          </div>

          <div className="mt-4 space-y-4">
            {filteredStores.map((store) => (
              <StoreCard key={store.id} store={store} />
            ))}
          </div>
        </>
      )}
    </main>
  );
}
