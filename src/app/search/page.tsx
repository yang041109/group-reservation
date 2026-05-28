'use client';

import { useEffect, useMemo, useState } from 'react';
import StoreCard from '@/components/StoreCard';
import DateSelector from '@/components/DateSelector';
import HeadcountSelector from '@/components/HeadcountSelector';
import { trackEvent } from '@/lib/analytics';
import { resolveDepositForHeadcount } from '@/lib/deposit-tiers';
import { koreaTodayYmd } from '@/lib/korea-time';
import { getSlotHourRangeForStoreOnDate, readMinGroupHeadcount } from '@/lib/store-weekly-hours';
import { compareStoresByDisplayOrder } from '@/lib/store-display-order';
import {
  PLATFORM_DEFAULT_HEADCOUNT,
  PLATFORM_MAX_HEADCOUNT,
  PLATFORM_MIN_HEADCOUNT,
  clampPlatformHeadcount,
} from '@/lib/platform-headcount';
import { computeAvailabilityScore, isStoreBookable } from '@/lib/store-timeline-score';
import { useAllData, buildSlotsForDate } from '@/lib/use-store-data';
import SameDayBookingNotice from '@/components/SameDayBookingNotice';
import UrrLoading from '@/components/UrrLoading';
import type { StoreCard as StoreCardType } from '@/types';

type SortMode = 'recommended' | 'availability' | 'deposit';

const SORT_OPTIONS: { value: SortMode; label: string }[] = [
  { value: 'recommended', label: '기본순' },
  { value: 'availability', label: '여유순' },
  { value: 'deposit', label: '예약금 낮은순' },
];

export default function SearchPage() {
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedHeadcount, setSelectedHeadcount] = useState(PLATFORM_DEFAULT_HEADCOUNT);
  const [sortMode, setSortMode] = useState<SortMode>('recommended');
  const { stores, reservations, isLoading } = useAllData();
  // 마운트 후 KST 오늘 날짜. SSR/CSR 사이 시간대 차이 회피.
  const [todayKr, setTodayKr] = useState<string | null>(null);
  useEffect(() => {
    setTodayKr(koreaTodayYmd(new Date()));
  }, []);

  // 검색 조건(날짜·인원)이 바뀐 뒤 800ms 멈추면 GA 이벤트 1회 (디바운스)
  useEffect(() => {
    if (!selectedDate || selectedHeadcount <= 0) return;
    const id = window.setTimeout(() => {
      trackEvent('searched_stores', {
        date: selectedDate,
        headcount: selectedHeadcount,
      });
    }, 800);
    return () => window.clearTimeout(id);
  }, [selectedDate, selectedHeadcount]);

  useEffect(() => {
    const savedDate = sessionStorage.getItem('selectedDate');
    const savedHeadcount = sessionStorage.getItem('selectedHeadcount');
    if (savedDate) setSelectedDate(savedDate);
    if (savedHeadcount) {
      const n = parseInt(savedHeadcount, 10);
      if (Number.isFinite(n)) setSelectedHeadcount(clampPlatformHeadcount(n));
    }
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
          // 매주 휴무 요일도 같이 넘겨야 isStoreClosedOnDate 가 토/일 같은 요일을 휴무 처리
          closedWeekdaysJson: s.closedWeekdaysJson,
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
                { ownerClosedSlotsJson: s.ownerClosedSlotsJson },
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
          allowSameDayBooking: s.allowSameDayBooking,
          depositAmount:
            selectedHeadcount >= 1
              ? resolveDepositForHeadcount(selectedHeadcount, {
                  depositMode: s.depositMode ?? (s.depositUseTiers ? 'tiered' : 'flat'),
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

  // 가게마다 "이 카드는 당일 차단 상태인가?" 표지. 화면에는 계속 노출하되 카드에 안내 문구 표시.
  const sameDayBlockedById = useMemo(() => {
    const m = new Map<string, boolean>();
    if (!selectedDate || !todayKr) return m;
    for (const s of storeCards) {
      const blocked = !s.allowSameDayBooking && selectedDate <= todayKr;
      m.set(s.id, blocked);
    }
    return m;
  }, [storeCards, selectedDate, todayKr]);

  const filteredStores = useMemo(() => {
    return storeCards.filter((store) => {
      if (selectedDate && store.closedOnDate) return false;
      const minGroup = store.minGroupHeadcount ?? 2;
      // 사용자 선택 인원이 가게 단체예약 최소 인원 미만이면 제외.
      if (selectedHeadcount < minGroup) return false;
      if (store.maxCapacity > 0 && selectedHeadcount > store.maxCapacity) return false;
      // 당일 예약 불가 가게는 시간 슬롯 가용성과 무관하게 카드는 그대로 노출.
      // (카드 내부에서 "당일 예약 불가" 안내 문구로 안내)
      if (sameDayBlockedById.get(store.id)) return true;
      if (selectedDate && selectedHeadcount > 0) {
        return isStoreBookable(store.timeline, selectedHeadcount, store.closedOnDate);
      }
      return true;
    });
  }, [storeCards, selectedDate, selectedHeadcount, sameDayBlockedById]);

  const sortedStores = useMemo(() => {
    const arr = [...filteredStores];
    const hc = selectedHeadcount;
    if (sortMode === 'recommended') {
      // 기본순 = 전역 관리(/admin/manage) sortOrder 와 동일
      arr.sort(compareStoresByDisplayOrder);
    } else if (sortMode === 'availability') {
      arr.sort((a, b) => {
        const sb = computeAvailabilityScore(b.timeline, hc);
        const sa = computeAvailabilityScore(a.timeline, hc);
        if (sb !== sa) return sb - sa;
        return compareStoresByDisplayOrder(a, b);
      });
    } else {
      arr.sort((a, b) => {
        const da = a.depositAmount ?? 0;
        const db = b.depositAmount ?? 0;
        if (da !== db) return da - db;
        return compareStoresByDisplayOrder(a, b);
      });
    }
    return arr;
  }, [filteredStores, sortMode, selectedHeadcount]);

  const bookableCount = useMemo(
    () =>
      filteredStores.filter(
        (s) =>
          !sameDayBlockedById.get(s.id) &&
          isStoreBookable(s.timeline, selectedHeadcount, s.closedOnDate),
      ).length,
    [filteredStores, selectedHeadcount, sameDayBlockedById],
  );

  const showStores = selectedDate !== null;

  // 서버/클라이언트 시간대 차이로 인한 hydration mismatch 방지:
  // 시간 메시지는 마운트 후 효과에서만 계산.
  const [updateTimeMessage, setUpdateTimeMessage] = useState<string | null>(null);
  useEffect(() => {
    const now = new Date();
    const currentHour = now.getHours();
    const hoursSinceUpdate = currentHour >= 12 ? currentHour - 12 : currentHour;
    setUpdateTimeMessage(`${hoursSinceUpdate}시간 전 업데이트된 예약 현황입니다`);
  }, []);

  return (
    <main className="mx-auto w-full max-w-5xl overflow-x-clip px-4 py-8">
      <p className="text-sm text-gray-500">날짜와 인원수를 선택하면 예약 가능한 가게를 보여드립니다</p>

      {showStores && !isLoading && selectedDate && todayKr && selectedDate === todayKr && (
        <SameDayBookingNotice className="mt-4" />
      )}

      {showStores && !isLoading && updateTimeMessage && selectedDate !== todayKr && (
        <div className="mt-4 rounded-lg bg-blue-50 px-4 py-2">
          <p className="text-xs text-blue-600">⏰ {updateTimeMessage}</p>
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
          maxCapacity={PLATFORM_MAX_HEADCOUNT}
          minCapacity={PLATFORM_MIN_HEADCOUNT}
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
                sameDayBlocked={sameDayBlockedById.get(store.id) ?? false}
              />
            ))}
          </div>
        </>
      )}
    </main>
  );
}
