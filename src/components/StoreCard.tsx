'use client';

import Link from 'next/link';
import type { StoreCard as StoreCardType, TimeSlot } from '@/types';

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

/** 점유율(0~1)에 따른 히트맵 색상 반환 */
function getOccupancyColor(ratio: number): string {
  if (ratio >= 1) return 'bg-red-500';       // 꽉 참
  if (ratio >= 0.8) return 'bg-orange-400';   // 거의 참
  if (ratio >= 0.5) return 'bg-yellow-400';   // 절반 이상
  if (ratio > 0) return 'bg-emerald-300';     // 여유
  return 'bg-emerald-400';                    // 비어있음
}

const START_HOUR = 11;
const END_HOUR = 20;

function toTimeStr(min: number) {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

/** 11:00~20:30 전체 슬롯 생성 */
function generateAllSlots(): string[] {
  const slots: string[] = [];
  for (let h = START_HOUR; h <= END_HOUR; h++) {
    slots.push(toTimeStr(h * 60));
    slots.push(toTimeStr(h * 60 + 30));
  }
  return slots;
}

export default function StoreCard({ store }: { store: StoreCardType }) {
  const thumbnailUrl = store.images[0];
  const minCapacity = store.minOrderRules.length > 0
    ? Math.min(...store.minOrderRules.map((r) => r.minHeadcount))
    : 1;

  const hours: number[] = [];
  for (let h = START_HOUR; h <= END_HOUR; h++) hours.push(h);

  // timeline이 있으면 히트맵, 없으면 기존 방식 폴백
  const timelineMap = new Map<string, TimeSlot>();
  if (store.timeline) {
    for (const slot of store.timeline) {
      timelineMap.set(slot.timeBlock, slot);
    }
  }

  const availableSet = new Set(store.availableTimes || []);
  const reservedSet = new Set(store.reservedTimes || []);
  const allSlots = generateAllSlots();

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
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">{store.name}</h2>
          <div
            className="flex h-9 w-9 items-center justify-center rounded-full bg-gray-100 text-lg"
            title={store.category ?? '음식점'}
          >
            {getCategoryEmoji(store.category)}
          </div>
        </div>

        <p className="mt-2 text-sm text-gray-600">
          <span className="mr-1">👥</span>
          {minCapacity}명 ~ {store.maxCapacity}명
        </p>

        {/* 히트맵 타임바 */}
        <div className="mt-3">
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
          <div className="flex h-5 overflow-hidden rounded-md">
            {allSlots.map((time) => {
              const slot = timelineMap.get(time);
              let bg: string;
              let title: string;

              if (slot) {
                const remaining = slot.maxPeople - slot.currentHeadcount;
                const ratio = slot.currentHeadcount / slot.maxPeople;
                if (!slot.isAvailable && remaining <= 0) {
                  bg = 'bg-red-500';
                  title = `${time} (마감)`;
                } else if (!slot.isAvailable) {
                  bg = 'bg-gray-400';
                  title = `${time} (예약불가)`;
                } else {
                  bg = getOccupancyColor(ratio);
                  title = `${time} — 잔여 ${remaining}명`;
                }
              } else {
                // 폴백: 기존 방식
                const isReserved = reservedSet.has(time);
                const isAvailable = availableSet.has(time);
                if (isReserved) { bg = 'bg-gray-400'; title = `${time} (예약됨)`; }
                else if (isAvailable) { bg = 'bg-emerald-400'; title = `${time}`; }
                else { bg = 'bg-gray-200'; title = `${time} (불가)`; }
              }

              return (
                <div
                  key={time}
                  title={title}
                  className={`flex-1 border-r border-white/30 last:border-r-0 ${bg}`}
                />
              );
            })}
          </div>
          {/* 범례 */}
          <div className="mt-1.5 flex items-center gap-3 text-[10px] text-gray-500">
            <span className="flex items-center gap-1"><span className="inline-block h-2.5 w-2.5 rounded-sm bg-emerald-400" />여유</span>
            <span className="flex items-center gap-1"><span className="inline-block h-2.5 w-2.5 rounded-sm bg-yellow-400" />보통</span>
            <span className="flex items-center gap-1"><span className="inline-block h-2.5 w-2.5 rounded-sm bg-orange-400" />혼잡</span>
            <span className="flex items-center gap-1"><span className="inline-block h-2.5 w-2.5 rounded-sm bg-red-500" />마감</span>
            <span className="flex items-center gap-1"><span className="inline-block h-2.5 w-2.5 rounded-sm bg-gray-200" />불가</span>
          </div>
        </div>
      </div>
    </Link>
  );
}
