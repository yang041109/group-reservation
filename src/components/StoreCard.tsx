'use client';

import Link from 'next/link';
import type { StoreCard as StoreCardType, TimeSlot } from '@/types';
import {
  generateSlotTimeBlocks,
  getHourLabels,
  resolveSlotHourRange,
  slotHourRangeFromSheet,
} from '@/lib/slot-hour-range';

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

export default function StoreCard({ store }: { store: StoreCardType }) {
  const thumbnailUrl = store.images[0];
  const minCapacity = store.minOrderRules.length > 0
    ? Math.min(...store.minOrderRules.map((r) => r.minHeadcount))
    : 1;
  
  // 인당 최소 주문 금액 계산
  const minOrderPerPerson = store.minOrderRules.length > 0
    ? Math.min(...store.minOrderRules.map((r) => r.minOrderAmount / r.minHeadcount))
    : 0;

  const timelineBlocks =
    store.timeline?.map((t) => t.timeBlock) ?? [];

  const avail = store.availableTimes || [];
  const fromSheet = slotHourRangeFromSheet(store.slotStartHour, store.slotEndHour);
  const { startHour: START_HOUR, endHour: END_HOUR, crossesMidnight } =
    fromSheet ??
    resolveSlotHourRange({
      availableOnlyBlocks: avail.length > 0 ? avail : undefined,
      orderedSlotTimeBlocks:
        timelineBlocks.length >= 2 ? timelineBlocks : undefined,
      timeBlocks: [
        ...timelineBlocks,
        ...avail,
        ...(store.reservedTimes || []),
      ],
    });

  const hours = getHourLabels(START_HOUR, END_HOUR, crossesMidnight);

  // timeline이 있으면 히트맵, 없으면 기존 방식 폴백
  const timelineMap = new Map<string, TimeSlot>();
  if (store.timeline) {
    for (const slot of store.timeline) {
      timelineMap.set(slot.timeBlock, slot);
    }
  }

  const availableSet = new Set(store.availableTimes || []);
  const reservedSet = new Set(store.reservedTimes || []);
  const allSlots = generateSlotTimeBlocks(START_HOUR, END_HOUR, crossesMidnight);

  return (
    <Link
      href={`/stores/${store.id}`}
      className="block rounded-2xl border border-gray-200 bg-white shadow-sm transition hover:shadow-lg"
    >
      <div className="flex gap-4 p-4">
        {/* 왼쪽: 가게 이미지 + 예약금 배지 */}
        <div className="relative flex-shrink-0">
          <div className="relative h-40 w-40 overflow-hidden rounded-xl bg-gray-100">
            {thumbnailUrl ? (
              <img
                src={thumbnailUrl}
                alt={store.name}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full items-center justify-center text-gray-400 text-4xl">
                {getCategoryEmoji(store.category)}
              </div>
            )}
          </div>
          {store.depositAmount && store.depositAmount > 0 && (
            <div className="absolute bottom-0 left-0 right-0 bg-red-500 px-3 py-1.5 text-center rounded-b-xl">
              <p className="text-white text-sm font-bold">
                최소 {store.depositAmount.toLocaleString()}원 할인
              </p>
            </div>
          )}
        </div>

        {/* 오른쪽: 가게 정보 + 타임테이블 */}
        <div className="flex-1 min-w-0">
          {/* 가게 이름 */}
          <h2 className="text-xl font-bold text-gray-900 mb-2">
            {store.name}
          </h2>

          {/* 인당 최소주문, 예약 가능 인원 */}
          <p className="text-sm text-gray-600 mb-3">
            인당 최소주문 {minOrderPerPerson > 0 ? `${minOrderPerPerson.toLocaleString()}원` : '없음'}, 
            예약 가능인원 {minCapacity}~{store.maxCapacity}명
          </p>

          {/* 타임테이블 */}
          <div>
            <div className="flex mb-1">
              {hours.map((hour) => (
                <div
                  key={hour}
                  className="text-xs font-semibold text-gray-700"
                  style={{ width: `${(1 / hours.length) * 100}%` }}
                >
                  {hour}
                </div>
              ))}
            </div>
            <div className="flex h-8 overflow-hidden rounded-lg">
              {allSlots.map((time) => {
                const slot = timelineMap.get(time);
                let bg: string;
                let title: string;

                if (slot) {
                  const remaining = slot.maxPeople - slot.currentHeadcount;
                  const ratio = slot.currentHeadcount / slot.maxPeople;
                  if (!slot.isAvailable && remaining <= 0) {
                    bg = 'bg-gray-400';
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
                  else if (isAvailable) { bg = 'bg-cyan-400'; title = `${time}`; }
                  else { bg = 'bg-gray-200'; title = `${time} (불가)`; }
                }

                return (
                  <div
                    key={time}
                    title={title}
                    className={`flex-1 border-r border-white last:border-r-0 ${bg}`}
                  />
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}
