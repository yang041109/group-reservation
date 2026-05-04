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
  if (ratio >= 1) return 'bg-[#f29da6]';       // 마감
  if (ratio >= 0.8) return 'bg-[#a7a7a8]';     // 거의 마감
  if (ratio >= 0.5) return 'bg-[#23f7ed]';     // 혼잡
  if (ratio > 0) return 'bg-[#23cdfc]';        // 보통
  return 'bg-[#2c9af5]';                       // 여유
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
      className="block rounded-2xl bg-white shadow-md transition hover:shadow-xl"
    >
      <div className="p-4">
        <div className="flex gap-3 mb-3">
          {/* 왼쪽: 가게 이미지 - 4:3 비율 (가로로 길게) */}
          <div className="relative flex-shrink-0">
            <div className="relative h-20 w-28 overflow-hidden rounded-xl bg-gray-100">
              {thumbnailUrl ? (
                <img
                  src={thumbnailUrl}
                  alt={store.name}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full items-center justify-center text-3xl text-gray-400">
                  {getCategoryEmoji(store.category)}
                </div>
              )}
            </div>
          </div>

          {/* 오른쪽: 가게 정보 */}
          <div className="flex-1 min-w-0">
            {/* 가게 이름 + 카테고리 아이콘 */}
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xl">{getCategoryEmoji(store.category)}</span>
              <h2 className="text-lg font-bold text-[#212121] truncate">
                {store.name}
              </h2>
            </div>

            {/* 인당 최소주문, 예약 가능 인원 */}
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-[#757575]">
              <span>인당 최소주문 {minOrderPerPerson > 0 ? `${minOrderPerPerson.toLocaleString()}원` : '없음'}</span>
              <span>예약 가능인원 {minCapacity}~{store.maxCapacity}명</span>
              {store.depositAmount && store.depositAmount > 0 && (
                <span className="font-semibold text-[#FF6D00]">
                  예약금 {store.depositAmount.toLocaleString()}원
                </span>
              )}
            </div>
          </div>
        </div>

        {/* 타임테이블 - 전체 너비 */}
        <div>
          <div className="flex mb-1.5">
            {hours.map((hour) => (
              <div
                key={hour}
                className="text-sm font-bold text-[#424242]"
                style={{ width: `${(1 / hours.length) * 100}%` }}
              >
                {hour}
              </div>
            ))}
          </div>
          <div className="flex h-10 overflow-hidden rounded-xl">
            {allSlots.map((time) => {
              const slot = timelineMap.get(time);
              let bg: string;
              let title: string;

              if (slot) {
                const remaining = slot.maxPeople - slot.currentHeadcount;
                const ratio = slot.currentHeadcount / slot.maxPeople;
                if (!slot.isAvailable && remaining <= 0) {
                  bg = 'bg-[#f29da6]';
                  title = `${time} (마감)`;
                } else if (!slot.isAvailable) {
                  bg = 'bg-[#f29da6]';
                  title = `${time} (마감)`;
                } else {
                  bg = getOccupancyColor(ratio);
                  title = `${time} — 잔여 ${remaining}명`;
                }
              } else {
                // 폴백: 기존 방식
                const isReserved = reservedSet.has(time);
                const isAvailable = availableSet.has(time);
                if (isReserved) { bg = 'bg-[#f29da6]'; title = `${time} (마감)`; }
                else if (isAvailable) { bg = 'bg-[#2c9af5]'; title = `${time}`; }
                else { bg = 'bg-[#f29da6]'; title = `${time} (마감)`; }
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
          {/* 범례 */}
          <div className="mt-2 flex items-center justify-center gap-3 text-xs text-[#616161]">
            <span className="flex items-center gap-1"><span className="inline-block h-3 w-3 rounded bg-[#2c9af5]" />여유</span>
            <span className="flex items-center gap-1"><span className="inline-block h-3 w-3 rounded bg-[#23cdfc]" />보통</span>
            <span className="flex items-center gap-1"><span className="inline-block h-3 w-3 rounded bg-[#23f7ed]" />혼잡</span>
            <span className="flex items-center gap-1"><span className="inline-block h-3 w-3 rounded bg-[#a7a7a8]" />거의마감</span>
            <span className="flex items-center gap-1"><span className="inline-block h-3 w-3 rounded bg-[#f29da6]" />마감</span>
          </div>
        </div>
      </div>
    </Link>
  );
}
