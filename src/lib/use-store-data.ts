'use client';

import useSWR from 'swr';
import type { TimeSlot, MinOrderRule, MenuItemData } from '@/types';

// ── 타입 ────────────────────────────────────────────────────────

export interface CachedStore {
  storeId: string;
  name: string;
  category: string;
  maxCapacity: number;
  imageUrl: string;
  description: string;
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

async function fetchAllData(): Promise<AllData> {
  if (!SHEETS_URL) throw new Error('SHEETS_URL not set');
  const res = await fetch(`${SHEETS_URL}?action=getAllData`, { cache: 'no-store' });
  if (!res.ok) throw new Error('Failed to fetch');
  const json = await res.json();
  if (!json.success) throw new Error(json.message || 'Failed');
  return json.data;
}

// ── SWR 훅 ──────────────────────────────────────────────────────

export function useAllData() {
  const { data, error, isLoading, mutate } = useSWR<AllData>(
    'allData',
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
): TimeSlot[] {
  // 해당 가게 + 날짜의 확정 예약 필터
  const matching = reservations.filter(
    (r) => r.storeId === storeId && r.date === date,
  );

  const slots: TimeSlot[] = [];
  for (let h = 11; h <= 20; h++) {
    for (let m = 0; m < 60; m += 30) {
      const time = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
      // 해당 시간대에 걸치는 예약의 인원 합산
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
  }
  return slots;
}
