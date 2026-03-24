'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import type { GetStoreDetailResponse, MinOrderRule } from '@/types';
import HeadcountSelector from '@/components/HeadcountSelector';
import TimeSelector from '@/components/TimeSelector';
import MenuSection from '@/components/MenuSection';
import TotalPrice from '@/components/TotalPrice';
import ReserveButton from '@/components/ReserveButton';

function getMinOrderAmount(headcount: number, rules: MinOrderRule[]): number {
  const rule = rules.find(
    (r) => headcount >= r.minHeadcount && headcount <= r.maxHeadcount,
  );
  return rule ? rule.minOrderAmount : 0;
}

export default function StoreDetailPage() {
  const params = useParams();
  const router = useRouter();
  const storeId = params.id as string;

  const [data, setData] = useState<GetStoreDetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Shared state for later use by menu/reservation components (tasks 9.2, 9.3)
  const [selectedHeadcount, setSelectedHeadcount] = useState(1);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [menuQuantities, setMenuQuantities] = useState<Record<string, number>>({});

  useEffect(() => {
    async function fetchStore() {
      try {
        const res = await fetch(`/api/stores/${storeId}`);
        if (res.status === 404) {
          setError('가게를 찾을 수 없습니다.');
          return;
        }
        if (!res.ok) {
          setError('가게 정보를 불러오는 중 오류가 발생했습니다.');
          return;
        }
        const json: GetStoreDetailResponse = await res.json();
        setData(json);
      } catch {
        setError('가게 정보를 불러오는 중 오류가 발생했습니다.');
      } finally {
        setLoading(false);
      }
    }
    fetchStore();
  }, [storeId]);

  if (loading) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-8">
        <p className="text-center text-gray-500">불러오는 중...</p>
      </main>
    );
  }

  if (error || !data) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-8">
        <p className="text-center text-gray-500">{error ?? '알 수 없는 오류'}</p>
        <button
          type="button"
          onClick={() => router.push('/')}
          className="mx-auto mt-4 block text-sm text-blue-500 hover:underline"
        >
          홈으로 돌아가기
        </button>
      </main>
    );
  }

  const { store, menus, availableTimes } = data;
  const minOrderAmount = getMinOrderAmount(selectedHeadcount, store.minOrderRules);

  // Calculate total amount from menu quantities
  const totalAmount = Object.entries(menuQuantities).reduce((sum, [menuId, qty]) => {
    const menu = menus.find((m) => m.id === menuId);
    return sum + (menu ? menu.price * qty : 0);
  }, 0);

  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      {/* Store image */}
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

      {/* Store name */}
      <h1 className="mt-4 text-2xl font-bold text-gray-900">{store.name}</h1>

      {/* Selectors section */}
      <div className="mt-6 space-y-6 rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
        <HeadcountSelector
          maxCapacity={store.maxCapacity}
          selectedHeadcount={selectedHeadcount}
          onChange={setSelectedHeadcount}
        />

        <TimeSelector
          availableTimes={availableTimes}
          selectedTime={selectedTime}
          onChange={setSelectedTime}
        />

        {/* Minimum order amount display */}
        {minOrderAmount > 0 && (
          <div className="rounded-lg bg-blue-50 px-4 py-3 text-sm text-blue-700">
            💰 {selectedHeadcount}명 기준 최소 주문 금액:{' '}
            <span className="font-semibold">
              {minOrderAmount.toLocaleString()}원
            </span>
          </div>
        )}
      </div>

      {/* Menu section */}
      <MenuSection
        menus={menus}
        quantities={menuQuantities}
        onChange={setMenuQuantities}
      />

      {/* Total price and min order amount */}
      <TotalPrice totalAmount={totalAmount} minOrderAmount={minOrderAmount} />

      {/* Bottom padding so fixed button doesn't overlap content */}
      <div className="h-28" />

      {/* Fixed reserve button */}
      <ReserveButton
        selectedHeadcount={selectedHeadcount}
        selectedTime={selectedTime}
        totalAmount={totalAmount}
        minOrderAmount={minOrderAmount}
        storeId={storeId}
        storeName={store.name}
        menuQuantities={menuQuantities}
        menus={menus}
      />
    </main>
  );
}
