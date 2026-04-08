'use client';

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
let allDataPrefetchPromise: Promise<AllData> | null = null;

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
  return data;
}

// ── SWR 훅 ──────────────────────────────────────────────────────

export function useAllData() {
  const { data, error, isLoading, mutate } = useSWR<AllData>(
    ALL_DATA_KEY,
    fetchAllData,
    {
      revalidateOnFocus: true,
      refreshInterval: 30000, // 30초마다 자동 갱신
      dedupingInterval: 5000, // 5초 내 중복 요청 방지
    },
  );

  return {
    stores: data?.stores ?? [],
    reservations: data?.reservations ?? [],
    isLoading,
    error,
    refresh: mutate,
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
