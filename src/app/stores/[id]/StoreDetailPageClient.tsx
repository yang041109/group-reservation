'use client';

import { useEffect, useMemo, useState } from 'react';
import type { MenuReceiptLine } from '@/components/TotalPrice';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import {
  formatTierDepositLabel,
  isDepositActiveOnDate,
  resolveDepositForHeadcount,
} from '@/lib/deposit-tiers';
import type { DepositMode } from '@/types';
import { koreaTodayYmd } from '@/lib/korea-time';
import { DEFAULT_SLOT_END_HOUR, DEFAULT_SLOT_START_HOUR } from '@/lib/slot-hour-range';
import { getSlotHourRangeForStoreOnDate, readMinGroupHeadcount } from '@/lib/store-weekly-hours';
import { prefetchAllDataIntoCache } from '@/lib/use-store-data';
import type { GetStoreDetailResponse } from '@/types';
import TimeSelector from '@/components/TimeSelector';
import MenuSection from '@/components/MenuSection';
import TotalPrice from '@/components/TotalPrice';
import ReserveButton from '@/components/ReserveButton';
import BackLink from '@/components/BackLink';

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
  const [selectedZoneId, setSelectedZoneId] = useState<string | null>(null);
  const [menuQuantities, setMenuQuantities] = useState<Record<string, number>>({});
  const [navigatingToSearch, setNavigatingToSearch] = useState(false);
  // 마운트 후 KST 오늘 날짜 계산 (SSR/CSR hydration mismatch 방지)
  const [todayKr, setTodayKr] = useState<string | null>(null);
  useEffect(() => {
    setTodayKr(koreaTodayYmd(new Date()));
  }, []);

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

      let usedCache = false;
      try {
        const cachedRaw = sessionStorage.getItem('cachedStoresRaw');
        const cachedRes = sessionStorage.getItem('cachedReservations');
        if (cachedRaw) {
          const allStores = JSON.parse(cachedRaw);
          const found = allStores.find((s: { storeId: string }) => s.storeId === storeId);
          if (found) {
            const resData = cachedRes ? JSON.parse(cachedRes) : [];
            const { buildSlotsForDate } = await import('@/lib/use-store-data');
            const dayRange = dateVal
              ? getSlotHourRangeForStoreOnDate(found, dateVal)
              : null;

            type CachedZone = { zoneId: string; name: string; maxCapacity: number; sortOrder?: number };
            const cachedZones: CachedZone[] = Array.isArray(found.zones) ? found.zones : [];
            const hasCachedZones = cachedZones.length > 0;

            // store 전체 슬롯(zone 미운영 가게용, 또는 zone 운영 가게의 호환 필드용)
            const storeSlots =
              dateVal && dayRange && !dayRange.closed && !hasCachedZones
                ? buildSlotsForDate(
                    storeId,
                    dateVal,
                    found.maxCapacity,
                    resData,
                    dayRange.slotStartHour,
                    dayRange.slotEndHour,
                    false,
                    { ownerClosedSlotsJson: found.ownerClosedSlotsJson },
                  )
                : [];

            // zone 운영 가게: 동마다 슬롯을 별도로 계산
            const zonesPayload = hasCachedZones
              ? cachedZones.map((z) => {
                  const zSlots =
                    dateVal && dayRange && !dayRange.closed
                      ? buildSlotsForDate(
                          storeId,
                          dateVal,
                          z.maxCapacity,
                          resData,
                          dayRange.slotStartHour,
                          dayRange.slotEndHour,
                          false,
                          {
                            ownerClosedSlotsJson: found.ownerClosedSlotsJson,
                            zoneId: z.zoneId,
                          },
                        )
                      : [];
                  return {
                    zoneId: z.zoneId,
                    name: z.name,
                    maxCapacity: z.maxCapacity,
                    sortOrder: z.sortOrder ?? 0,
                    slotStartHour: dayRange?.slotStartHour ?? found.slotStartHour ?? 11,
                    slotEndHour: dayRange?.slotEndHour ?? found.slotEndHour ?? 20,
                    closedOnDate: dayRange?.closed ?? false,
                    slots: zSlots,
                    availableTimes: zSlots.filter((s) => s.isAvailable).map((s) => s.timeBlock),
                    reservedTimes: zSlots.filter((s) => !s.isAvailable).map((s) => s.timeBlock),
                  };
                })
              : [];

            const headlineSlots = hasCachedZones
              ? zonesPayload.find((z) => !z.closedOnDate)?.slots ?? zonesPayload[0]?.slots ?? []
              : storeSlots;

            const cacheData: GetStoreDetailResponse = {
              store: {
                id: found.storeId,
                name: found.name,
                images: found.imageUrl ? [found.imageUrl] : [],
                maxCapacity: hasCachedZones
                  ? zonesPayload.reduce((acc, z) => acc + z.maxCapacity, 0)
                  : found.maxCapacity,
                slotStartHour: dayRange?.slotStartHour ?? found.slotStartHour,
                slotEndHour: dayRange?.slotEndHour ?? found.slotEndHour,
                closedOnDate: dayRange?.closed,
                depositAmount: found.depositAmount ?? 0,
                depositMode:
                  found.depositMode ?? (found.depositUseTiers ? 'tiered' : 'flat'),
                depositUseTiers: !!found.depositUseTiers,
                depositTiers: found.depositTiers ?? [],
                minGroupHeadcount: found.minGroupHeadcount ?? readMinGroupHeadcount(found),
                ownerName: found.ownerName ?? null,
                ownerBankAccount: found.ownerBankAccount ?? null,
                availableTimes: headlineSlots.filter((s) => s.isAvailable).map((s) => s.timeBlock),
                slots: headlineSlots,
                minOrderRules: [],
                allowSameDayBooking: found.allowSameDayBooking,
                menuNoticeText: found.menuNoticeText ?? null,
                depositActiveMonthRanges: (() => {
                  try {
                    const raw = found.depositActiveMonthRangesJson;
                    if (!raw) return [];
                    const parsed = JSON.parse(String(raw));
                    return Array.isArray(parsed) ? parsed : [];
                  } catch {
                    return [];
                  }
                })(),
                menuRequiredPeoplePerItem: found.menuRequiredPeoplePerItem ?? null,
                ...(hasCachedZones ? { zones: zonesPayload } : {}),
              },
              menus: found.menus || [],
              slots: headlineSlots,
              availableTimes: headlineSlots.filter((s) => s.isAvailable).map((s) => s.timeBlock),
              reservedTimes: headlineSlots.filter((s) => !s.isAvailable).map((s) => s.timeBlock),
              ...(hasCachedZones ? { zones: zonesPayload } : {}),
            };
            if (!cancelled) {
              setData(cacheData);
              setLoading(false);
              usedCache = true;
            }
          }
        }
      } catch {
        // ignore cache errors
      }

      if (!usedCache) setLoading(true);

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

  // zone 운영 가게에서 데이터 로드 후 첫 zone 자동 선택. 이미 유효한 선택이 있으면 유지.
  useEffect(() => {
    const zonesFromData = data?.zones ?? data?.store?.zones ?? [];
    if (!zonesFromData.length) {
      if (selectedZoneId !== null) setSelectedZoneId(null);
      return;
    }
    const stillValid = zonesFromData.some((z) => z.zoneId === selectedZoneId);
    if (!stillValid) {
      setSelectedZoneId(zonesFromData[0].zoneId);
    }
  }, [data, selectedZoneId]);

  const menusForReceipt = data?.menus ?? [];

  const menuReceiptLines = useMemo((): MenuReceiptLine[] => {
    const order = new Map(menusForReceipt.map((m, i) => [m.id, i]));
    return Object.entries(menuQuantities)
      .filter(([, qty]) => qty > 0)
      .map(([menuId, quantity]) => {
        const menu = menusForReceipt.find((m) => m.id === menuId);
        if (!menu) return null;
        return {
          menuId,
          name: menu.name,
          quantity,
          unitPrice: menu.price,
          lineTotal: menu.price * quantity,
        };
      })
      .filter((line): line is MenuReceiptLine => line !== null)
      .sort((a, b) => (order.get(a.menuId) ?? 0) - (order.get(b.menuId) ?? 0));
  }, [menuQuantities, menusForReceipt]);

  const totalAmount = menuReceiptLines.reduce((sum, line) => sum + line.lineTotal, 0);

  if (loading) {
    return (
      <main className="mx-auto w-full max-w-3xl overflow-x-clip px-4 py-8">
        <div className="flex items-center justify-center py-16">
          <div className="text-center">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-500 border-r-transparent" />
            <p className="mt-4 text-sm text-gray-500">가게 정보를 불러오는 중...</p>
          </div>
        </div>
      </main>
    );
  }

  if (error || !data) {
    return (
      <main className="mx-auto w-full max-w-3xl overflow-x-clip px-4 py-8">
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

  const { store, menus } = data;
  const zones = data.zones ?? store.zones ?? [];
  const hasZones = zones.length > 0;

  // zone 운영 가게: 선택된 zone 정보 우선 사용
  const activeZone = hasZones
    ? zones.find((z) => z.zoneId === selectedZoneId) ?? zones[0]
    : null;

  const slots = activeZone ? activeZone.slots : data.slots ?? store.slots ?? [];
  const availableTimes = activeZone
    ? activeZone.availableTimes
    : data.availableTimes;
  const reservedTimes = activeZone
    ? activeZone.reservedTimes
    : data.reservedTimes;
  const startHour = activeZone
    ? activeZone.slotStartHour
    : store.slotStartHour ?? DEFAULT_SLOT_START_HOUR;
  const endHour = activeZone
    ? activeZone.slotEndHour
    : store.slotEndHour ?? DEFAULT_SLOT_END_HOUR;
  const crossesMidnight = endHour < startHour;
  const zoneClosed = activeZone ? activeZone.closedOnDate : false;

  const depositMode: DepositMode =
    store.depositMode ?? (store.depositUseTiers ? 'tiered' : 'flat');

  // 날짜별 예약금: store.depositActiveMonthRanges 가 비어있거나 선택 날짜가 범위 안이면 정상 부과,
  // 범위 밖이면 0원으로 표시.
  const depositRanges = store.depositActiveMonthRanges ?? [];
  const depositActiveOnSelectedDate =
    !selectedDate || depositRanges.length === 0
      ? true
      : isDepositActiveOnDate(selectedDate, depositRanges);

  const effectiveDeposit = depositActiveOnSelectedDate
    ? resolveDepositForHeadcount(selectedHeadcount, {
        depositMode,
        depositTiers: store.depositTiers ?? [],
        flatDepositAmount: store.depositAmount ?? 0,
      })
    : 0;

  const dateDisplay = selectedDate
    ? (() => {
        const d = new Date(`${selectedDate}T00:00:00`);
        const days = ['일', '월', '화', '수', '목', '금', '토'];
        return `${d.getMonth() + 1}/${d.getDate()} (${days[d.getDay()]})`;
      })()
    : null;

  const minGroup = store.minGroupHeadcount ?? 2;

  // 당일 예약 차단 여부: 가게가 명시적으로 허용하지 않았고 선택 날짜가 KST 오늘 이전(=오늘 포함)이면 차단.
  // todayKr 은 마운트 후에야 채워지므로 그 전까지는 false 로 취급해 hydration mismatch 방지.
  const sameDayBlocked =
    !!selectedDate && !store.allowSameDayBooking && !!todayKr && selectedDate <= todayKr;

  return (
    <main className="mx-auto w-full max-w-3xl overflow-x-clip px-4 py-8">
      <BackLink fallbackHref="/search" />
      {store.closedOnDate && (
        <p className="mb-4 rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-900">
          선택한 날짜는 휴무일입니다. 날짜를 변경해 주세요.
        </p>
      )}
      {sameDayBlocked && !store.closedOnDate && (
        <p className="mb-4 rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-900">
          이 가게는 당일 예약을 받지 않습니다. 내일 이후 날짜를 선택해 주세요.
        </p>
      )}
      <div className="relative aspect-[16/9] w-full overflow-hidden rounded-xl bg-gray-100">
        {store.images.length > 0 ? (
          <img src={store.images[0]} alt={store.name} className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full items-center justify-center text-gray-400">이미지 없음</div>
        )}
      </div>

      <h1 className="mt-4 text-2xl font-bold text-gray-900">{store.name}</h1>

      {(effectiveDeposit > 0 ||
        depositMode === 'tiered' ||
        depositMode === 'per_person' ||
        (store.depositAmount ?? 0) > 0) && (
        <div className="mt-3 space-y-2 rounded-lg bg-blue-50 px-4 py-3">
          {depositMode === 'tiered' && (store.depositTiers?.length ?? 0) > 0 ? (
            <>
              <p className="text-sm font-medium text-blue-900">인원 구간별 예약금</p>
              <ul className="space-y-1 text-sm text-blue-800">
                {(store.depositTiers ?? []).map((t, idx) => {
                  const active =
                    selectedHeadcount >= t.minHeadcount && selectedHeadcount <= t.maxHeadcount;
                  return (
                    <li
                      key={`${t.minHeadcount}-${t.maxHeadcount}-${idx}`}
                      className={active ? 'font-bold text-blue-950' : ''}
                    >
                      {t.minHeadcount}명 ~ {t.maxHeadcount}명: {formatTierDepositLabel(t)}
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
          ) : depositMode === 'per_person' ? (
            <p className="text-sm text-blue-700">
              💳 인당 {(store.depositAmount ?? 0).toLocaleString()}원 × {selectedHeadcount}명 ={' '}
              <span className="font-bold">{effectiveDeposit.toLocaleString()}원</span>
            </p>
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

        {hasZones ? (
          <div>
            <p className="mb-2 text-xs font-medium text-gray-500">예약할 동(zone) 선택</p>
            <div className="flex flex-wrap gap-2">
              {zones.map((z) => {
                const isActive = z.zoneId === (activeZone?.zoneId ?? '');
                return (
                  <button
                    key={z.zoneId}
                    type="button"
                    onClick={() => {
                      if (z.zoneId !== selectedZoneId) {
                        setSelectedZoneId(z.zoneId);
                        setSelectedTime(null);
                      }
                    }}
                    className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                      isActive
                        ? 'bg-blue-500 text-white shadow'
                        : 'border border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    {z.name}
                    <span className={`ml-1.5 text-xs ${isActive ? 'text-blue-100' : 'text-gray-400'}`}>
                      최대 {z.maxCapacity}명
                    </span>
                  </button>
                );
              })}
            </div>
            {zoneClosed ? (
              <p className="mt-2 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-900">
                선택한 동은 이 날짜에 영업하지 않습니다.
              </p>
            ) : null}
            {(() => {
              const largestZoneCap = Math.max(...zones.map((z) => z.maxCapacity));
              if (selectedHeadcount > largestZoneCap) {
                return (
                  <p className="mt-2 rounded-lg bg-amber-50 px-3 py-2 text-xs leading-relaxed text-amber-900">
                    <b>{selectedHeadcount}명 단체</b>는 한 동에서 받기 어려워요 (가장 큰 동 {largestZoneCap}명). 동을 나눠
                    각각 따로 예약하시거나 가게에 문의해 주세요.
                  </p>
                );
              }
              return null;
            })()}
          </div>
        ) : null}

        <TimeSelector
          availableTimes={sameDayBlocked ? [] : availableTimes}
          reservedTimes={sameDayBlocked ? [] : reservedTimes}
          slots={sameDayBlocked ? [] : slots}
          startHour={startHour}
          endHour={endHour}
          crossesMidnight={crossesMidnight}
          selectedTime={sameDayBlocked ? null : selectedTime}
          onChange={setSelectedTime}
        />
      </div>

      <MenuSection
        menus={menus}
        quantities={menuQuantities}
        onChange={setMenuQuantities}
        ownerNoticeText={store.menuNoticeText}
        requiredPeoplePerItem={store.menuRequiredPeoplePerItem}
        selectedHeadcount={selectedHeadcount}
      />

      <TotalPrice
        totalAmount={totalAmount}
        minOrderAmount={0}
        receiptLines={menuReceiptLines}
      />

      <div className="h-28" />

      <ReserveButton
        selectedHeadcount={selectedHeadcount}
        selectedDate={selectedDate}
        selectedTime={selectedTime}
        totalAmount={totalAmount}
        storeId={storeId}
        storeName={store.name}
        selectedZoneId={activeZone?.zoneId}
        selectedZoneName={activeZone?.name}
        zoneRequiredButNotSelected={hasZones && !activeZone}
        menuQuantities={menuQuantities}
        menus={menus}
        expectedDeposit={effectiveDeposit}
        ownerName={store.ownerName}
        ownerBankAccount={store.ownerBankAccount}
        minGroupHeadcount={minGroup}
        allowSameDayBooking={store.allowSameDayBooking}
        requiredPeoplePerItem={store.menuRequiredPeoplePerItem}
      />
    </main>
  );
}
