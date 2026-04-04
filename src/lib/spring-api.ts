/**
 * Spring Boot reservation API (localhost:8080 또는 배포 URL)
 */
import type { GetStoreDetailResponse, MenuItemData, MinOrderRule, StoreCard, StoreDetail } from '@/types';

export function getSpringBaseUrl(): string {
  return (
    process.env.SPRING_API_BASE_URL?.replace(/\/$/, '') ||
    process.env.NEXT_PUBLIC_SPRING_API_BASE_URL?.replace(/\/$/, '') ||
    'http://127.0.0.1:8080'
  );
}

/** 서울 기준 오늘 YYYY-MM-DD */
export function seoulToday(): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}

function slotBookable(slot: { available?: boolean; isAvailable?: boolean }): boolean {
  if (typeof slot.available === 'boolean') return slot.available;
  if (typeof slot.isAvailable === 'boolean') return slot.isAvailable;
  return false;
}

type SpringApiOk<T> = { success: boolean; data: T };

/** GET /api/stores → StoreCard[] */
export async function fetchSpringStoreCards(
  date: string,
  headcount: number,
): Promise<StoreCard[]> {
  const base = getSpringBaseUrl();
  const url = `${base}/api/stores?date=${encodeURIComponent(date)}&headcount=${headcount}`;
  const res = await fetch(url, { cache: 'no-store' });
  if (!res.ok) {
    throw new Error(`stores list ${res.status}`);
  }
  const body = (await res.json()) as SpringApiOk<
    {
      storeId: string;
      name: string;
      maxCapacity: number;
      imageUrl: string | null;
      timeline: { timeBlock: string; available?: boolean; isAvailable?: boolean }[];
    }[]
  >;
  if (!body.success || !Array.isArray(body.data)) {
    return [];
  }
  return body.data.map((row) => {
    const availableTimes = row.timeline
      .filter((t) => slotBookable(t))
      .map((t) => t.timeBlock)
      .sort();
    const reservedTimes = row.timeline
      .filter((t) => !slotBookable(t))
      .map((t) => t.timeBlock)
      .sort();
    return {
      id: row.storeId,
      name: row.name,
      category: '음식점',
      images: row.imageUrl ? [row.imageUrl] : [],
      availableTimes,
      reservedTimes,
      maxCapacity: row.maxCapacity,
      minOrderRules: [] as MinOrderRule[],
    } satisfies StoreCard;
  });
}

/** GET /api/stores/:id → GetStoreDetailResponse */
export async function fetchSpringStoreDetail(
  storeId: string,
  date: string,
): Promise<GetStoreDetailResponse | null> {
  const base = getSpringBaseUrl();
  const url = `${base}/api/stores/${encodeURIComponent(storeId)}?date=${encodeURIComponent(date)}`;
  const res = await fetch(url, { cache: 'no-store' });
  if (res.status === 404) return null;
  if (!res.ok) {
    throw new Error(`store detail ${res.status}`);
  }
  const body = (await res.json()) as SpringApiOk<{
    store: { id: string; name: string; maxCapacity: number; imageUrl: string | null };
    slots: { timeBlock: string; available?: boolean; isAvailable?: boolean }[];
    menus: { menuId: string; name: string; price: number; required?: boolean; isRequired?: boolean }[];
    minOrderRules: { minHeadcount: number; maxHeadcount: number; minOrderAmount: number }[];
  }>;
  if (!body.success || !body.data) {
    return null;
  }
  const d = body.data;
  const storeDetail: StoreDetail = {
    id: d.store.id,
    name: d.store.name,
    images: d.store.imageUrl ? [d.store.imageUrl] : [],
    maxCapacity: d.store.maxCapacity,
    availableTimes: d.slots.filter((s) => slotBookable(s)).map((s) => s.timeBlock),
    minOrderRules: d.minOrderRules.map((r) => ({
      minHeadcount: r.minHeadcount,
      maxHeadcount: r.maxHeadcount,
      minOrderAmount: r.minOrderAmount,
    })),
  };
  const menus: MenuItemData[] = d.menus.map((m) => ({
    id: m.menuId,
    name: m.name,
    price: m.price,
  }));
  const availableTimes = d.slots.filter((s) => slotBookable(s)).map((s) => s.timeBlock);
  const reservedTimes = d.slots.filter((s) => !slotBookable(s)).map((s) => s.timeBlock);
  return {
    store: storeDetail,
    menus,
    availableTimes,
    reservedTimes,
  };
}
