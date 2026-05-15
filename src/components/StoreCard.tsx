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

const TIMELINE_LEGEND = [
  { label: '여유', color: 'bg-[#2c9af5]' },
  { label: '보통', color: 'bg-[#23cdfc]' },
  { label: '혼잡', color: 'bg-[#23f7ed]' },
  { label: '거의 마감', color: 'bg-[#a7a7a8]' },
  { label: '마감', color: 'bg-[#f29da6]' },
] as const;

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
  const minCapacity = Math.max(
    minGroup,
    store.minOrderRules.length > 0
      ? Math.min(...store.minOrderRules.map((r) => r.minHeadcount))
      : 1,
  );

  const bookable = isStoreBookable(store.timeline, selectedHeadcount, store.closedOnDate);
  const deposit = store.depositAmount ?? 0;
  const reserveCount = selectedHeadcount > 0 ? selectedHeadcount : 0;
  const showReserveButton = selectedHeadcount > 0;

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
    if (!selectedDate || !bookable || reserveCount <= 0) return;
    sessionStorage.setItem('selectedDate', selectedDate);
    sessionStorage.setItem('selectedHeadcount', String(reserveCount));
    router.push(`/stores/${store.id}?date=${encodeURIComponent(selectedDate)}`);
  };

  return (
    <article className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
      <div className="p-4">
        <div className="flex gap-3">
          <div className="relative h-[88px] w-[88px] shrink-0 overflow-hidden rounded-2xl bg-[#3d2b1f]">
            {thumbnailUrl ? (
              <img src={thumbnailUrl} alt="" className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-3xl font-bold text-white/90">
                {store.name.slice(0, 1)}
              </div>
            )}
            <span
              className="absolute bottom-1.5 right-1.5 flex h-7 w-7 items-center justify-center rounded-lg bg-white/95 text-base shadow-sm"
              aria-hidden
            >
              {getCategoryEmoji(store.category)}
            </span>
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-2">
              <h2 className="min-w-0 flex-1 truncate text-lg font-bold leading-tight text-gray-900">
                {store.name}
              </h2>
              {showReserveButton ? (
                <button
                  type="button"
                  disabled={!bookable || !selectedDate}
                  onClick={goReserve}
                  className={`shrink-0 inline-flex items-center gap-0.5 rounded-xl px-3.5 py-2 text-xs font-bold shadow-md transition sm:px-4 sm:text-sm ${
                    bookable && selectedDate
                      ? 'bg-blue-500 text-white shadow-blue-500/30 hover:bg-blue-600'
                      : 'cursor-not-allowed bg-gray-200 text-gray-500 shadow-none'
                  }`}
                >
                  {reserveCount}명 예약하기
                  <span aria-hidden className="text-base leading-none">
                    ›
                  </span>
                </button>
              ) : null}
            </div>

            {store.locationLabel ? (
              <p className="mt-1.5 flex items-center gap-1 text-sm text-gray-500">
                <PinIcon size={14} className="shrink-0 text-gray-400" />
                <span className="truncate">{store.locationLabel}</span>
              </p>
            ) : null}

            <div className="mt-2.5 flex flex-wrap gap-1.5">
              <span className="rounded-lg border border-gray-200 bg-white px-2.5 py-1 text-[11px] font-medium text-gray-600">
                예약 가능 {minCapacity}~{store.maxCapacity}명
              </span>
              {deposit > 0 ? (
                <span className="rounded-lg border border-orange-200 bg-orange-50/50 px-2.5 py-1 text-[11px] font-semibold text-orange-700">
                  예약금 {deposit.toLocaleString()}원
                </span>
              ) : (
                <span className="rounded-lg border border-gray-200 bg-white px-2.5 py-1 text-[11px] font-medium text-gray-600">
                  예약금 없음
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="mt-4">
          <div className="mb-1 flex">
            {hours.map((hour) => (
              <div
                key={hour}
                className="text-center text-sm font-bold text-gray-800"
                style={{ width: `${(1 / hours.length) * 100}%` }}
              >
                {hour}
              </div>
            ))}
          </div>
          <div className="flex h-9 overflow-hidden rounded-lg">
            {allSlots.map((time) => {
              const slot = timelineMap.get(time);
              let bg: string;
              let title: string;

              if (slot) {
                const remaining = slot.maxPeople - slot.currentHeadcount;
                const ratio = slot.maxPeople > 0 ? slot.currentHeadcount / slot.maxPeople : 1;
                if (!slot.isAvailable) {
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
                  className={`flex-1 border-r border-white/80 last:border-r-0 ${bg}`}
                />
              );
            })}
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1">
            {TIMELINE_LEGEND.map((item) => (
              <span key={item.label} className="flex items-center gap-1 text-[11px] text-gray-600">
                <span className={`inline-block h-2.5 w-2.5 rounded-sm ${item.color}`} />
                {item.label}
              </span>
            ))}
          </div>
        </div>
      </div>
    </article>
  );
}
