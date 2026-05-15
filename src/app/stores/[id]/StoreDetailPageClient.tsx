'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { resolveDepositForHeadcount } from '@/lib/deposit-tiers';
import { resolveSlotHourRange, slotHourRangeFromSheet } from '@/lib/slot-hour-range';
import { prefetchAllDataIntoCache } from '@/lib/use-store-data';
import type { GetStoreDetailResponse, MinOrderRule } from '@/types';
import TimeSelector from '@/components/TimeSelector';
import MenuSection from '@/components/MenuSection';
import TotalPrice from '@/components/TotalPrice';
import ReserveButton from '@/components/ReserveButton';
import BackLink from '@/components/BackLink';

function getMinOrderAmount(headcount: number, rules: MinOrderRule[]): number {
  const rule = rules.find(
    (r) => headcount >= r.minHeadcount && headcount <= r.maxHeadcount,
  );
  return rule ? rule.minOrderAmount : 0;
}

function isYmd(s: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(s);
}

export default function StoreDetailPageClient() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const storeId = params.id as string;

  const [data, setData] = useState<GetStoreDetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedHeadcount, setSelectedHeadcount] = useState(1);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [menuQuantities, setMenuQuantities] = useState<Record<string, number>>({});
  const [navigatingToSearch, setNavigatingToSearch] = useState(false);

  const goToSearchWithPrefetch = async () => {
    if (navigatingToSearch) return;
    setNavigatingToSearch(true);
    try {
      await prefetchAllDataIntoCache();
    } catch {
      // prefetch 실패해도 사용자가 화면을 벗어날 수 있도록 이동은 진행
    } finally {
      router.push('/search');
    }
  };

  useEffect(() => {
    let cancelled = false;

    const dateParam = searchParams.get('date');
    const savedDate = sessionStorage.getItem('selectedDate');
    let dateVal: string | null = null;
    if (dateParam && isYmd(dateParam)) {
      dateVal = dateParam;
    } else if (savedDate && isYmd(savedDate)) {
      dateVal = savedDate;
    }

    const savedHeadcountRaw = sessionStorage.getItem('selectedHeadcount');
    let headcount = 1;
    if (savedHeadcountRaw) {
      const n = parseInt(savedHeadcountRaw, 10);
      if (!Number.isNaN(n) && n > 0) headcount = n;
    }

    let timeVal: string | null = null;
    const menuQty: Record<string, number> = {};

    const raw = sessionStorage.getItem('pendingReservation');
    if (raw) {
      try {
        const pending = JSON.parse(raw) as {
          storeId?: string;
          headcount?: number;
          date?: string;
          time?: string | null;
          menuItems?: { menuId: string; quantity: number }[];
        };
        if (pending.storeId === storeId) {
          if (pending.headcount && pending.headcount > 0) headcount = pending.headcount;
          if (pending.date && isYmd(pending.date)) dateVal = pending.date;
          timeVal = pending.time ?? null;
          if (pending.menuItems) {
            for (const item of pending.menuItems) {
              if (item.quantity > 0) menuQty[item.menuId] = item.quantity;
            }
          }
        }
      } catch {
        // ignore
      }
    }

    setSelectedDate(dateVal);
    setSelectedHeadcount(headcount);
    setSelectedTime(timeVal);
    setMenuQuantities(menuQty);

    async function fetchStore() {
      setError(null);

      // 1단계: SWR 캐시에서 즉시 표시
      let usedCache = false;
      try {
        const cachedRaw = sessionStorage.getItem('cachedStoresRaw');
        const cachedRes = sessionStorage.getItem('cachedReservations');
        if (cachedRaw) {
          const allStores = JSON.parse(cachedRaw);
          const found = allStores.find((s: any) => s.storeId === storeId);
          if (found) {
            const resData = cachedRes ? JSON.parse(cachedRes) : [];
            const { buildSlotsForDate } = await import('@/lib/use-store-data');
            const slots = dateVal
              ? buildSlotsForDate(storeId, dateVal, found.maxCapacity, resData, found.slotStartHour, found.slotEndHour)
              : [];
            const cacheData: GetStoreDetailResponse = {
              store: {
                id: found.storeId,
                name: found.name,
                images: found.imageUrl ? [found.imageUrl] : [],
                maxCapacity: found.maxCapacity,
                slotStartHour: found.slotStartHour,
                slotEndHour: found.slotEndHour,
                depositAmount: found.depositAmount ?? 0,
                depositUseTiers: !!found.depositUseTiers,
                depositTiers: found.depositTiers ?? [],
                availableTimes: slots.filter((s: any) => s.isAvailable).map((s: any) => s.timeBlock),
                slots,
                minOrderRules: found.minOrderRules || [],
              },
              menus: found.menus || [],
              slots,
              availableTimes: slots.filter((s: any) => s.isAvailable).map((s: any) => s.timeBlock),
              reservedTimes: slots.filter((s: any) => !s.isAvailable).map((s: any) => s.timeBlock),
            };
            if (!cancelled) {
              setData(cacheData);
              setLoading(false);
              usedCache = true;
            }
          }
        }
      } catch {}

      if (!usedCache) setLoading(true);

      // 2단계: API에서 최신 데이터 가져오기 (백그라운드)
      try {
        const qp = dateVal ? `?date=${encodeURIComponent(dateVal)}` : '';
        const res = await fetch(`/api/stores/${storeId}${qp}`, { cache: 'no-store' });
        if (res.status === 404) {
          if (!cancelled && !usedCache) setError('가게를 찾을 수 없습니다.');
          return;
        }
        if (!res.ok) {
          if (!cancelled && !usedCache) setError('가게 정보를 불러오는 중 오류가 발생했습니다.');
          return;
        }
        const json: GetStoreDetailResponse = await res.json();
        if (!cancelled) setData(json);
      } catch {
        if (!cancelled && !usedCache) setError('가게 정보를 불러오는 중 오류가 발생했습니다.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchStore();
    return () => {
      cancelled = true;
    };
  }, [storeId, searchParams]);

  if (loading) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-8">
        <div className="flex items-center justify-center py-16">
          <div className="text-center">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-500 border-r-transparent"></div>
            <p className="mt-4 text-sm text-gray-500">가게 정보를 불러오는 중...</p>
          </div>
        </div>
      </main>
    );
  }

  if (error || !data) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-8">
        <p className="text-center text-gray-500">{error ?? '알 수 없는 오류'}</p>
        <button
          type="button"
          onClick={goToSearchWithPrefetch}
          className="mx-auto mt-4 block text-sm text-blue-500 hover:underline"
        >
          {navigatingToSearch ? '이동 중...' : '홈으로 돌아가기'}
        </button>
      </main>
    );
  }

  const { store, menus, availableTimes, reservedTimes } = data;
  const slots = data.slots ?? store.slots ?? [];
  const orderedBlocks = slots.map((s) => s.timeBlock);
  const fromSheet = slotHourRangeFromSheet(store.slotStartHour, store.slotEndHour);
  const { startHour, endHour, crossesMidnight } =
    fromSheet ??
    resolveSlotHourRange({
      availableOnlyBlocks: availableTimes.length > 0 ? availableTimes : undefined,
      orderedSlotTimeBlocks: orderedBlocks.length >= 2 ? orderedBlocks : undefined,
      timeBlocks: [
        ...availableTimes,
        ...reservedTimes,
        ...orderedBlocks,
      ],
    });
  const minOrderAmount = getMinOrderAmount(selectedHeadcount, store.minOrderRules);

  const effectiveDeposit = resolveDepositForHeadcount(selectedHeadcount, {
    depositUseTiers: !!store.depositUseTiers,
    depositTiers: store.depositTiers ?? [],
    flatDepositAmount: store.depositAmount ?? 0,
  });

  const totalAmount = Object.entries(menuQuantities).reduce((sum, [menuId, qty]) => {
    const menu = menus.find((m) => m.id === menuId);
    return sum + (menu ? menu.price * qty : 0);
  }, 0);

  const dateDisplay = selectedDate
    ? (() => {
        const d = new Date(`${selectedDate}T00:00:00`);
        const days = ['일', '월', '화', '수', '목', '금', '토'];
        return `${d.getMonth() + 1}/${d.getDate()} (${days[d.getDay()]})`;
      })()
    : null;

  const minGroup = store.minGroupHeadcount ?? 2;

  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <BackLink fallbackHref="/search" />
      {store.closedOnDate && (
        <p className="mb-4 rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-900">
          선택한 날짜는 휴무일입니다. 날짜를 변경해 주세요.
        </p>
      )}
      <div className="relative aspect-[16/9] w-full overflow-hidden rounded-xl bg-gray-100">
        {store.images.length > 0 ? (
          <img
            src={store.images[0]}
            alt={store.name}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-gray-400">
            이미지 없음
          </div>
        )}
      </div>

      <h1 className="mt-4 text-2xl font-bold text-gray-900">{store.name}</h1>

      {(effectiveDeposit > 0 || (store.depositUseTiers && (store.depositTiers?.length ?? 0) > 0)) && (
        <div className="mt-3 space-y-2 rounded-lg bg-blue-50 px-4 py-3">
          {store.depositUseTiers && (store.depositTiers?.length ?? 0) > 0 ? (
            <>
              <p className="text-sm font-medium text-blue-900">인원별 예약금</p>
              <ul className="space-y-1 text-sm text-blue-800">
                {(store.depositTiers ?? []).map((t, idx) => {
                  const active =
                    selectedHeadcount >= t.minHeadcount && selectedHeadcount <= t.maxHeadcount;
                  return (
                    <li
                      key={`${t.minHeadcount}-${t.maxHeadcount}-${idx}`}
                      className={active ? 'font-bold text-blue-950' : ''}
                    >
                      {t.minHeadcount}명 ~ {t.maxHeadcount}명: {t.amount.toLocaleString()}원
                      {active ? ' ← 현재 선택 인원' : ''}
                    </li>
                  );
                })}
              </ul>
              {effectiveDeposit > 0 ? (
                <p className="border-t border-blue-200 pt-2 text-sm text-blue-900">
                  선택 인원({selectedHeadcount}명) 예약금:{' '}
                  <span className="font-bold">{effectiveDeposit.toLocaleString()}원</span>
                </p>
              ) : (
                <p className="border-t border-blue-200 pt-2 text-xs text-amber-800">
                  선택한 인원에 해당하는 예약금 구간이 없습니다. 가게에 문의해 주세요.
                </p>
              )}
            </>
          ) : effectiveDeposit > 0 ? (
            <p className="text-sm text-blue-700">
              💳 예약금: <span className="font-bold">{effectiveDeposit.toLocaleString()}원</span>
            </p>
          ) : null}
        </div>
      )}

      <div className="mt-4 flex items-center gap-4 rounded-lg bg-gray-50 px-4 py-3 text-sm text-gray-700">
        {dateDisplay && <span>📅 {dateDisplay}</span>}
        <span>👥 {selectedHeadcount}명</span>
        <button
          type="button"
          onClick={goToSearchWithPrefetch}
          className="ml-auto text-xs text-blue-500 hover:underline"
        >
          {navigatingToSearch ? '이동 중...' : '변경'}
        </button>
      </div>

      <div className="mt-6 space-y-6 rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
        {selectedHeadcount < minGroup && (
          <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900">
            이 가게는 단체예약 최소 {minGroup}명부터 가능합니다. 검색 화면에서 인원을 변경해 주세요.
          </p>
        )}

        <TimeSelector
          availableTimes={availableTimes}
          reservedTimes={reservedTimes}
          slots={slots}
          startHour={startHour}
          endHour={endHour}
          crossesMidnight={crossesMidnight}
          selectedTime={selectedTime}
          onChange={setSelectedTime}
        />

        {minOrderAmount > 0 && (
          <div className="rounded-lg bg-blue-50 px-4 py-3 text-sm text-blue-700">
            💰 {selectedHeadcount}명 기준 최소 주문 금액:{' '}
            <span className="font-semibold">
              {minOrderAmount.toLocaleString()}원
            </span>
          </div>
        )}
      </div>

      <MenuSection
        menus={menus}
        quantities={menuQuantities}
        onChange={setMenuQuantities}
      />

      <TotalPrice totalAmount={totalAmount} minOrderAmount={minOrderAmount} />

      <div className="h-28" />

      <ReserveButton
        selectedHeadcount={selectedHeadcount}
        selectedDate={selectedDate}
        selectedTime={selectedTime}
        totalAmount={totalAmount}
        minOrderAmount={minOrderAmount}
        storeId={storeId}
        storeName={store.name}
        menuQuantities={menuQuantities}
        menus={menus}
        expectedDeposit={effectiveDeposit}
        ownerName={store.ownerName}
        ownerBankAccount={store.ownerBankAccount}
        minGroupHeadcount={minGroup}
      />
    </main>
  );
}
