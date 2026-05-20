'use client';

import { useState } from 'react';
import useSWR, { mutate as globalMutate } from 'swr';
import { buildSlots } from '@/lib/booking-slots';
import { applyOwnerClosedBlocksToSlots } from '@/lib/owner-closed-slots';
import type { TimeSlot, MinOrderRule, MenuItemData, DepositTier } from '@/types';

// ── 타입 ────────────────────────────────────────────────────────

export interface CachedStore {
  storeId: string;
  name: string;
  locationLabel?: string | null;
  sortOrder?: number;
  maxCapacity: number;
  minGroupHeadcount?: number;
  imageUrl: string;
  slotStartHour?: number;
  slotEndHour?: number;
  weeklyHoursJson?: string | null;
  closedDatesJson?: string | null;
  depositAmount?: number;
  depositMode?: import('@/types').DepositMode;
  depositUseTiers?: boolean;
  depositTiers?: DepositTier[];
  ownerName?: string | null;
  ownerBankAccount?: string | null;
  ownerClosedSlotsJson?: string | null;
  menus: MenuItemData[];
  minOrderRules: MinOrderRule[];
}

export interface CachedReservation {
  reservationId: string;
  storeId: string;
  headcount: number;
  date: string;
  startTime: string;
  endTime: string;
}

interface AllData {
  stores: CachedStore[];
  reservations: CachedReservation[];
}

// ── fetcher ─────────────────────────────────────────────────────

export const ALL_DATA_KEY = 'allData';
const ALL_DATA_SNAPSHOT_KEY = 'allDataSnapshot';

let allDataPrefetchPromise: Promise<AllData> | null = null;

export function readAllDataSnapshot(): AllData | undefined {
  if (typeof window === 'undefined') return undefined;
  try {
    const raw = sessionStorage.getItem(ALL_DATA_SNAPSHOT_KEY);
    if (!raw) return undefined;
    return JSON.parse(raw) as AllData;
  } catch {
    return undefined;
  }
}

function writeAllDataSnapshot(data: AllData) {
  try {
    sessionStorage.setItem(ALL_DATA_SNAPSHOT_KEY, JSON.stringify(data));
  } catch {
    /* ignore quota */
  }
}

export async function fetchAllData(): Promise<AllData> {
  const res = await fetch('/api/data/all', { cache: 'no-store' });
  if (!res.ok) throw new Error('Failed to fetch');
  const json = await res.json();
  if (!json.success) throw new Error(json.message || 'Failed');
  return json.data;
}

export async function prefetchAllDataIntoCache(): Promise<AllData> {
  if (!allDataPrefetchPromise) {
    allDataPrefetchPromise = fetchAllData().finally(() => {
      allDataPrefetchPromise = null;
    });
  }
  const data = await allDataPrefetchPromise;
  await globalMutate(ALL_DATA_KEY, data, { populateCache: true, revalidate: false });
  writeAllDataSnapshot(data);
  return data;
}

/** 관리자 저장 후 고객 화면 캐시 즉시 갱신 */
export async function invalidateAllDataCache(): Promise<AllData> {
  if (typeof window !== 'undefined') {
    try {
      sessionStorage.removeItem(ALL_DATA_SNAPSHOT_KEY);
      sessionStorage.removeItem('cachedStores');
      sessionStorage.removeItem('cachedStoresRaw');
      sessionStorage.removeItem('cachedReservations');
    } catch {
      /* ignore */
    }
  }
  const data = await fetchAllData();
  writeAllDataSnapshot(data);
  await globalMutate(ALL_DATA_KEY, data, { revalidate: false });
  return data;
}

// ── SWR 훅 ──────────────────────────────────────────────────────

export function useAllData() {
  const [fallbackData] = useState(readAllDataSnapshot);

  const { data, error, isLoading, mutate, isValidating } = useSWR<AllData>(
    ALL_DATA_KEY,
    fetchAllData,
    {
      fallbackData,
      /** 스냅샷은 즉시 보여 주고, 마운트 시 백그라운드로 최신 데이터 동기화 */
      revalidateOnMount: true,
      revalidateIfStale: true,
      revalidateOnFocus: true,
      refreshInterval: 15000,
      dedupingInterval: 2000,
      onSuccess: (d) => writeAllDataSnapshot(d),
    },
  );

  const resolved = data ?? fallbackData;
  const hasPayload = resolved !== undefined;

  return {
    stores: resolved?.stores ?? [],
    reservations: resolved?.reservations ?? [],
    /** 스냅샷/캐시가 이미 있으면 목록 로딩 스피너를 띄우지 않음 */
    isLoading: hasPayload ? false : isLoading,
    isValidating,
    error,
    refresh: mutate,
    /** 원본 페이로드 존재 여부 (빈 가게 목록과 구분) */
    hasPayload,
  };
}

// ── 슬롯 계산 헬퍼 ─────────────────────────────────────────────

export function buildSlotsForDate(
  storeId: string,
  date: string,
  maxPeople: number,
  reservations: CachedReservation[],
  slotStartHour?: number,
  slotEndHour?: number,
  closed?: boolean,
  storeMeta?: Pick<CachedStore, 'ownerClosedSlotsJson'>,
): TimeSlot[] {
  if (closed) return [];
  const startH = slotStartHour ?? 11;
  const endH = slotEndHour ?? 20;
  const crossesMidnight = endH < startH;

  const matching = reservations.filter(
    (r) => r.storeId === storeId && r.date === date,
  );

  const base = buildSlots(
    maxPeople,
    matching.map((r) => ({
      headcount: r.headcount,
      startTime: r.startTime,
      endTime: r.endTime,
    })),
    startH,
    endH,
    crossesMidnight,
  );

  return applyOwnerClosedBlocksToSlots(
    base,
    date,
    storeMeta?.ownerClosedSlotsJson ?? null,
    undefined,
    { slotStartHour: startH, slotEndHour: endH, crossesMidnight },
  );
}
