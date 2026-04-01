'use client';

import Link from 'next/link';
import type { StoreCard as StoreCardType } from '@/types';

/** Category → emoji mapping */
const CATEGORY_EMOJI: Record<string, string> = {
  한식: '🍚',
  양식: '🍕',
  일식: '🍣',
  중식: '🥟',
  호프: '🍺',
  카페: '☕',
  분식: '🍜',
  고기: '🥩',
  치킨: '🍗',
  해산물: '🦐',
};

function getCategoryEmoji(category?: string): string {
  if (!category) return '🍽️';
  return CATEGORY_EMOJI[category] ?? '🍽️';
}

export default function StoreCard({ store }: { store: StoreCardType }) {
  const thumbnailUrl = store.images[0];
  const minCapacity = store.minOrderRules.length > 0
    ? Math.min(...store.minOrderRules.map((r) => r.minHeadcount))
    : 1;

  const availableSet = new Set(store.availableTimes || []);
  const reservedSet = new Set(store.reservedTimes || []);

  // Fixed 11~20 hours, 2 slots per hour
  const START_HOUR = 11;
  const END_HOUR = 20;
  const hours: number[] = [];
  for (let h = START_HOUR; h <= END_HOUR; h++) hours.push(h);

  const toTimeStr = (min: number) => {
    const h = Math.floor(min / 60);
    const m = min % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  };

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
        {/* 이름 + 카테고리 아이콘 */}
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">{store.name}</h2>
          <div
            className="flex h-9 w-9 items-center justify-center rounded-full bg-gray-100 text-lg"
            title={store.category ?? '음식점'}
          >
            {getCategoryEmoji(store.category)}
          </div>
        </div>

        {/* 인원 정보 */}
        <p className="mt-2 text-sm text-gray-600">
          <span className="mr-1">👥</span>
          {minCapacity}명 ~ {store.maxCapacity}명
        </p>

        {/* 타임테이블 바 */}
        <div className="mt-3">
          {/* Hour labels */}
          <div className="flex">
            {hours.map((hour) => (
              <div
                key={hour}
                className="text-[10px] font-medium text-gray-400"
                style={{ width: `${(1 / hours.length) * 100}%` }}
              >
                {hour}
              </div>
            ))}
          </div>
          {/* Slot bar */}
          <div className="flex h-5 overflow-hidden rounded-md">
            {hours.flatMap((hour) => {
              const slot0 = toTimeStr(hour * 60);
              const slot1 = toTimeStr(hour * 60 + 30);
              return [slot0, slot1].map((time) => {
                const isReserved = reservedSet.has(time);
                const isAvailable = availableSet.has(time);
                let bg: string;
                if (isReserved) bg = 'bg-gray-400';
                else if (isAvailable) bg = 'bg-cyan-400';
                else bg = 'bg-gray-200';
                return (
                  <div
                    key={time}
                    title={`${time}${isReserved ? ' (예약됨)' : isAvailable ? '' : ' (불가)'}`}
                    className={`flex-1 border-r border-white/30 last:border-r-0 ${bg}`}
                  />
                );
              });
            })}
          </div>
        </div>
      </div>
    </Link>
  );
}
