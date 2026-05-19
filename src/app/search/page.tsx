'use client';

import { useEffect, useMemo, useState } from 'react';
import StoreCard from '@/components/StoreCard';
import DateSelector from '@/components/DateSelector';
import HeadcountSelector from '@/components/HeadcountSelector';
import { resolveDepositForHeadcount } from '@/lib/deposit-tiers';
import { getSlotHourRangeForStoreOnDate, readMinGroupHeadcount } from '@/lib/store-weekly-hours';
import { computeAvailabilityScore, isStoreBookable } from '@/lib/store-timeline-score';
import { useAllData, buildSlotsForDate } from '@/lib/use-store-data';
import UrrLoading from '@/components/UrrLoading';
import type { StoreCard as StoreCardType } from '@/types';

type SortMode = 'recommended' | 'availability' | 'deposit';

const SORT_OPTIONS: { value: SortMode; label: string }[] = [
  { value: 'recommended', label: '추천순' },
  { value: 'availability', label: '여유순' },
  { value: 'deposit', label: '예약금 낮은순' },
];

export default function SearchPage() {
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedHeadcount, setSelectedHeadcount] = useState(0);
  const [sortMode, setSortMode] = useState<SortMode>('recommended');
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

  const storeCards: StoreCardType[] = useMemo(
    () =>
      stores.map((s) => {
        const storeMeta = {
          slotStartHour: s.slotStartHour,
          slotEndHour: s.slotEndHour,
          weeklyHoursJson: s.weeklyHoursJson,
          closedDatesJson: s.closedDatesJson,
        };
        const dayRange =
          selectedDate != null ? getSlotHourRangeForStoreOnDate(storeMeta, selectedDate) : null;
        const slotStart = dayRange?.slotStartHour ?? s.slotStartHour;
        const slotEnd = dayRange?.slotEndHour ?? s.slotEndHour;
        const timeline =
          selectedDate != null && dayRange && !dayRange.closed
            ? buildSlotsForDate(
                s.storeId,
                selectedDate,
                s.maxCapacity,
                reservations,
                slotStart,
                slotEnd,
                false,
              )
            : [];
        return {
          id: s.storeId,
          name: s.name,
          locationLabel: s.locationLabel ?? null,
          sortOrder: s.sortOrder ?? 0,
          images: s.imageUrl ? [s.imageUrl] : [],
          maxCapacity: s.maxCapacity,
          timeline,
          availableTimes: timeline.filter((t) => t.isAvailable).map((t) => t.timeBlock),
          reservedTimes: timeline.filter((t) => !t.isAvailable).map((t) => t.timeBlock),
          minOrderRules: s.minOrderRules,
          slotStartHour: slotStart,
          slotEndHour: slotEnd,
          minGroupHeadcount: s.minGroupHeadcount ?? readMinGroupHeadcount(storeMeta),
          closedOnDate: dayRange?.closed,
          depositAmount:
            selectedHeadcount >= 1
              ? resolveDepositForHeadcount(selectedHeadcount, {
                  depositUseTiers: !!s.depositUseTiers,
                  depositTiers: s.depositTiers ?? [],
                  flatDepositAmount: s.depositAmount ?? 0,
                })
              : 0,
        };
      }),
    [stores, reservations, selectedDate, selectedHeadcount],
  );

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

  const filteredStores = useMemo(() => {
    return storeCards.filter((store) => {
      if (selectedDate && store.closedOnDate) return false;
      if (selectedHeadcount === 0) return true;
      const minGroup = store.minGroupHeadcount ?? 2;
      if (selectedHeadcount < minGroup) return false;
      if (store.maxCapacity > 0 && selectedHeadcount > store.maxCapacity) return false;
      if (selectedDate && selectedHeadcount > 0) {
        return isStoreBookable(store.timeline, selectedHeadcount, store.closedOnDate);
      }
      return true;
    });
  }, [storeCards, selectedDate, selectedHeadcount]);

  const sortedStores = useMemo(() => {
    const arr = [...filteredStores];
    const hc = selectedHeadcount;
    if (sortMode === 'recommended') {
      arr.sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0) || a.name.localeCompare(b.name, 'ko'));
    } else if (sortMode === 'availability') {
      arr.sort((a, b) => {
        const sb = computeAvailabilityScore(b.timeline, hc);
        const sa = computeAvailabilityScore(a.timeline, hc);
        if (sb !== sa) return sb - sa;
        return (a.sortOrder ?? 0) - (b.sortOrder ?? 0);
      });
    } else {
      arr.sort((a, b) => {
        const da = a.depositAmount ?? 0;
        const db = b.depositAmount ?? 0;
        if (da !== db) return da - db;
        return (a.sortOrder ?? 0) - (b.sortOrder ?? 0);
      });
    }
    return arr;
  }, [filteredStores, sortMode, selectedHeadcount]);

  const bookableCount = useMemo(
    () =>
      filteredStores.filter((s) => isStoreBookable(s.timeline, selectedHeadcount, s.closedOnDate))
        .length,
    [filteredStores, selectedHeadcount],
  );

  const showStores = selectedDate !== null;

  const getUpdateTimeMessage = () => {
    const now = new Date();
    const currentHour = now.getHours();
    const hoursSinceUpdate = currentHour >= 12 ? currentHour - 12 : currentHour;
    return `${hoursSinceUpdate}시간 전 업데이트된 예약 현황입니다`;
  };

  return (
    <main className="mx-auto max-w-5xl px-4 py-8">
      <p className="text-sm text-gray-500">날짜와 인원수를 선택하면 예약 가능한 가게를 보여드립니다</p>

      {showStores && !isLoading && (
        <div className="mt-4 rounded-lg bg-blue-50 px-4 py-2">
          <p className="text-xs text-blue-600">⏰ {getUpdateTimeMessage()}</p>
        </div>
      )}

      <div className="search-booking-filters mt-6">
        <DateSelector
          selectedDate={selectedDate}
          onChange={setSelectedDate}
          fullWidth
          className="w-full"
        />
        <HeadcountSelector
          maxCapacity={999}
          minCapacity={0}
          selectedHeadcount={selectedHeadcount}
          onChange={setSelectedHeadcount}
          className="w-full"
        />
      </div>

      {!showStores ? (
        <div className="mt-16 flex flex-col items-center justify-center text-gray-400">
          <p className="text-base">날짜를 선택해주세요</p>
        </div>
      ) : isLoading ? (
        <UrrLoading message="가게 정보를 불러오는 중..." />
      ) : sortedStores.length === 0 ? (
        <div className="mt-16 flex flex-col items-center justify-center text-gray-500">
          <p className="text-lg">조건에 맞는 가게가 없습니다</p>
          <p className="mt-1 text-sm text-gray-400">인원수를 조정해보세요</p>
        </div>
      ) : (
        <>
          <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm">
              <span className="font-bold text-blue-600">{bookableCount}곳</span>
              <span className="font-medium text-gray-900"> 예약가능</span>
            </p>
            <div className="flex flex-wrap gap-2">
              {SORT_OPTIONS.map((o) => (
                <button
                  key={o.value}
                  type="button"
                  onClick={() => setSortMode(o.value)}
                  className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                    sortMode === o.value
                      ? 'bg-blue-500 text-white shadow-sm'
                      : 'border border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  {o.label}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-4 space-y-4">
            {sortedStores.map((store) => (
              <StoreCard
                key={store.id}
                store={store}
                selectedHeadcount={selectedHeadcount}
                selectedDate={selectedDate}
              />
            ))}
          </div>
        </>
      )}
    </main>
  );
}
