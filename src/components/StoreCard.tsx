'use client';

import Link from 'next/link';
import type { StoreCard as StoreCardType } from '@/types';

export default function StoreCard({ store }: { store: StoreCardType }) {
  const thumbnailUrl = store.images[0];

  return (
    <Link
      href={`/stores/${store.id}`}
      className="block rounded-xl border border-gray-200 bg-white shadow-sm transition hover:shadow-md"
    >
      {/* 가게 이미지 */}
      <div className="relative aspect-[4/3] w-full overflow-hidden rounded-t-xl bg-gray-100">
        {thumbnailUrl ? (
          <img
            src={thumbnailUrl}
            alt={store.name}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-gray-400">
            이미지 없음
          </div>
        )}
      </div>

      {/* 가게 정보 */}
      <div className="p-4">
        <h2 className="text-lg font-semibold text-gray-900">{store.name}</h2>

        <div className="mt-2 flex flex-col gap-1 text-sm text-gray-600">
          <p>
            <span className="mr-1">👥</span>
            최대 {store.maxCapacity}명
          </p>
          <p>
            <span className="mr-1">🕐</span>
            {store.availableTimes.length > 0
              ? store.availableTimes.join(', ')
              : '예약 가능 시간 없음'}
          </p>
        </div>
      </div>
    </Link>
  );
}
