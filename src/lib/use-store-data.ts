'use client';

import { useState } from 'react';
import useSWR, { mutate as globalMutate } from 'swr';
import type { TimeSlot, MinOrderRule, MenuItemData } from '@/types';

// ── 타입 ────────────────────────────────────────────────────────

export interface CachedStore {
  storeId: string;
  name: string;
  category: string;
  maxCapacity: number;
  imageUrl: string;
  description: string;
  slotStartHour?: number;
  slotEndHour?: number;
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

const SHEETS_URL = process.env.NEXT_PUBLIC_SHEETS_URL || '';
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
  if (!SHEETS_URL) throw new Error('SHEETS_URL not set');
  const res = await fetch(`${SHEETS_URL}?action=getAllData`, { cache: 'no-store' });
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

// ── SWR 훅 ──────────────────────────────────────────────────────

export function useAllData() {
  const [fallbackData] = useState(readAllDataSnapshot);
  const hadBootstrap = fallbackData !== undefined;

  const { data, error, isLoading, mutate, isValidating } = useSWR<AllData>(
    ALL_DATA_KEY,
    fetchAllData,
    {
      fallbackData,
      /** 랜딩/프리패치로 받아 둔 스냅샷이 있으면 첫 진입 시 재요청하지 않음 → 날짜 탭 시 로딩 깜빡임 방지 */
      revalidateOnMount: !hadBootstrap,
      revalidateIfStale: !hadBootstrap,
      revalidateOnFocus: false,
      refreshInterval: 30000,
      dedupingInterval: 5000,
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
): TimeSlot[] {
  const startH = slotStartHour ?? 11;
  const endH = slotEndHour ?? 20;
  const crossesMidnight = endH < startH;

  // 해당 가게 + 날짜의 확정 예약 필터
  const matching = reservations.filter(
    (r) => r.storeId === storeId && r.date === date,
  );

  const slots: TimeSlot[] = [];
  const pushSlots = (h: number) => {
    for (let m = 0; m < 60; m += 30) {
      const time = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
      let booked = 0;
      matching.forEach((r) => {
        if (time >= r.startTime && time <= r.endTime) {
          booked += r.headcount;
        }
      });
      const remaining = Math.max(0, maxPeople - booked);
      slots.push({
        slotId: `slot-${time.replace(':', '')}`,
        timeBlock: time,
        isAvailable: remaining > 0,
        maxPeople,
        currentHeadcount: booked,
      });
    }
  };

  if (!crossesMidnight) {
    for (let h = startH; h <= endH; h++) pushSlots(h);
  } else {
    for (let h = startH; h <= 23; h++) pushSlots(h);
    for (let h = 0; h <= endH; h++) pushSlots(h);
  }

  return slots;
}
