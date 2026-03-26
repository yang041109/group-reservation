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

/** Parse "HH:mm" → hour number */
function parseHour(time: string): number {
  return parseInt(time.split(':')[0], 10);
}

export default function StoreCard({ store }: { store: StoreCardType }) {
  const thumbnailUrl = store.images[0];
  const minCapacity = store.minOrderRules.length > 0
    ? Math.min(...store.minOrderRules.map((r) => r.minHeadcount))
    : 1;

  // Build timetable data
  const allTimes = [...new Set([...(store.availableTimes || []), ...(store.reservedTimes || [])])].sort();
  const reservedSet = new Set(store.reservedTimes || []);

  const hourGroups = new Map<number, string[]>();
  for (const time of allTimes) {
    const hour = parseHour(time);
    if (!hourGroups.has(hour)) hourGroups.set(hour, []);
    hourGroups.get(hour)!.push(time);
  }
  const sortedHours = [...hourGroups.keys()].sort((a, b) => a - b);

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
        {allTimes.length > 0 && (
          <div className="mt-3">
            {/* Hour labels */}
            <div className="flex">
              {sortedHours.map((hour) => {
                const slots = hourGroups.get(hour)!;
                return (
                  <div
                    key={hour}
                    className="text-[10px] font-medium text-gray-400"
                    style={{ width: `${(slots.length / allTimes.length) * 100}%` }}
                  >
                    {hour}
                  </div>
                );
              })}
            </div>
            {/* Slot bar */}
            <div className="flex h-5 overflow-hidden rounded-md">
              {allTimes.map((time) => {
                const isReserved = reservedSet.has(time);
                return (
                  <div
                    key={time}
                    title={`${time}${isReserved ? ' (예약됨)' : ''}`}
                    className={`flex-1 border-r border-white/30 last:border-r-0 ${
                      isReserved ? 'bg-gray-400' : 'bg-cyan-400'
                    }`}
                  />
                );
              })}
            </div>
          </div>
        )}
      </div>
    </Link>
  );
}
