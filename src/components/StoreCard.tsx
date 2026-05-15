'use client';

import { useRouter } from 'next/navigation';
import type { StoreCard as StoreCardType, TimeSlot } from '@/types';
import { PinIcon } from '@/components/icons/BookingFieldIcons';
import {
  generateSlotTimeBlocks,
  getHourLabels,
  resolveSlotHourRange,
  slotHourRangeFromSheet,
} from '@/lib/slot-hour-range';
import { isStoreBookable } from '@/lib/store-timeline-score';

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

function getOccupancyColor(ratio: number): string {
  if (ratio >= 1) return 'bg-[#f29da6]';
  if (ratio >= 0.8) return 'bg-[#a7a7a8]';
  if (ratio >= 0.5) return 'bg-[#23f7ed]';
  if (ratio > 0) return 'bg-[#23cdfc]';
  return 'bg-[#2c9af5]';
}

export interface StoreCardDisplayProps {
  store: StoreCardType;
  selectedHeadcount: number;
  selectedDate: string | null;
}

export default function StoreCard({
  store,
  selectedHeadcount,
  selectedDate,
}: StoreCardDisplayProps) {
  const router = useRouter();
  const thumbnailUrl = store.images[0];
  const minGroup = store.minGroupHeadcount ?? 2;
  const minCapacity = Math.max(minGroup, store.minOrderRules.length > 0
    ? Math.min(...store.minOrderRules.map((r) => r.minHeadcount))
    : 1);

  const bookable = isStoreBookable(store.timeline, selectedHeadcount, store.closedOnDate);
  const deposit = store.depositAmount ?? 0;

  const timelineBlocks = store.timeline?.map((t) => t.timeBlock) ?? [];
  const avail = store.availableTimes || [];
  const fromSheet = slotHourRangeFromSheet(store.slotStartHour, store.slotEndHour);
  const { startHour: START_HOUR, endHour: END_HOUR, crossesMidnight } =
    fromSheet ??
    resolveSlotHourRange({
      availableOnlyBlocks: avail.length > 0 ? avail : undefined,
      orderedSlotTimeBlocks: timelineBlocks.length >= 2 ? timelineBlocks : undefined,
      timeBlocks: [...timelineBlocks, ...avail, ...(store.reservedTimes || [])],
    });

  const hours = getHourLabels(START_HOUR, END_HOUR, crossesMidnight);
  const timelineMap = new Map<string, TimeSlot>();
  if (store.timeline) {
    for (const slot of store.timeline) {
      timelineMap.set(slot.timeBlock, slot);
    }
  }

  const availableSet = new Set(store.availableTimes || []);
  const reservedSet = new Set(store.reservedTimes || []);
  const allSlots = generateSlotTimeBlocks(START_HOUR, END_HOUR, crossesMidnight);

  const goReserve = () => {
    if (!selectedDate || !bookable) return;
    const hc = selectedHeadcount > 0 ? selectedHeadcount : minCapacity;
    sessionStorage.setItem('selectedDate', selectedDate);
    sessionStorage.setItem('selectedHeadcount', String(hc));
    router.push(`/stores/${store.id}?date=${encodeURIComponent(selectedDate)}`);
  };

  return (
    <article className="overflow-hidden rounded-2xl bg-white shadow-md transition hover:shadow-lg">
      <div className="p-4">
        <div className="mb-3 flex gap-3">
          <div className="relative h-20 w-28 shrink-0 overflow-hidden rounded-xl bg-gray-100">
            {thumbnailUrl ? (
              <img src={thumbnailUrl} alt={store.name} className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full items-center justify-center text-3xl text-gray-400">
                {getCategoryEmoji(store.category)}
              </div>
            )}
          </div>

          <div className="min-w-0 flex-1">
            <h2 className="truncate text-lg font-bold text-gray-900">{store.name}</h2>

            {store.locationLabel ? (
              <p className="mt-1 flex items-start gap-1 text-sm text-gray-500">
                <PinIcon size={14} className="mt-0.5 shrink-0 text-gray-400" />
                <span className="line-clamp-2">{store.locationLabel}</span>
              </p>
            ) : null}

            <div className="mt-2 flex flex-wrap gap-1.5">
              <span className="rounded-lg bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-700">
                {minCapacity}~{store.maxCapacity}명
              </span>
              {deposit > 0 ? (
                <span className="rounded-lg bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700">
                  예약금 {deposit.toLocaleString()}원
                </span>
              ) : (
                <span className="rounded-lg bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-600">
                  예약금 없음
                </span>
              )}
            </div>
          </div>
        </div>

        <div>
          <div className="mb-1.5 flex">
            {hours.map((hour) => (
              <div
                key={hour}
                className="text-sm font-bold text-gray-700"
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
                const isReserved = reservedSet.has(time);
                const isAvailable = availableSet.has(time);
                if (isReserved) {
                  bg = 'bg-[#f29da6]';
                  title = `${time} (마감)`;
                } else if (isAvailable) {
                  bg = 'bg-[#2c9af5]';
                  title = time;
                } else {
                  bg = 'bg-[#f29da6]';
                  title = `${time} (마감)`;
                }
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

      <div className="border-t border-gray-100 px-4 py-3">
        <button
          type="button"
          disabled={!bookable || !selectedDate}
          onClick={goReserve}
          className={`w-full rounded-xl py-3 text-sm font-bold transition ${
            bookable && selectedDate
              ? 'bg-blue-500 text-white hover:bg-blue-600 active:bg-blue-700'
              : 'cursor-not-allowed bg-gray-200 text-gray-500'
          }`}
        >
          {selectedHeadcount > 0
            ? `${selectedHeadcount}명 예약하기`
            : `${minCapacity}명 이상 예약하기`}
        </button>
      </div>
    </article>
  );
}
