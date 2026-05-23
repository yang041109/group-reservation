'use client';

import Link from 'next/link';
import type { StoreCard as StoreCardType, TimeSlot } from '@/types';
import { PinIcon } from '@/components/icons/BookingFieldIcons';
import {
  DEFAULT_SLOT_END_HOUR,
  DEFAULT_SLOT_START_HOUR,
  generateSlotTimeBlocks,
  getHourLabels,
  getHourLabelsFromSlotBlocks,
  slotHourRangeFromSheet,
} from '@/lib/slot-hour-range';

import { getOccupancyColorClass, SLOT_CLOSED_CLASS, TIMELINE_LEGEND } from '@/lib/store-timeline-colors';

export interface StoreCardDisplayProps {
  store: StoreCardType;
  selectedHeadcount: number;
  selectedDate: string | null;
  /** 선택 날짜가 KST 오늘이고 가게가 당일 예약을 받지 않으면 true. /search 페이지에서 계산해 전달. */
  sameDayBlocked?: boolean;
}

export default function StoreCard({
  store,
  selectedHeadcount,
  selectedDate,
  sameDayBlocked = false,
}: StoreCardDisplayProps) {
  const thumbnailUrl = store.images[0];
  const minGroup = store.minGroupHeadcount ?? 2;
  const maxGroup = store.maxCapacity > 0 ? store.maxCapacity : minGroup;

  const deposit = store.depositAmount ?? 0;

  const storeHref = selectedDate
    ? `/stores/${store.id}?date=${encodeURIComponent(selectedDate)}`
    : `/stores/${store.id}`;

  const persistSelection = () => {
    if (selectedDate) sessionStorage.setItem('selectedDate', selectedDate);
    if (selectedHeadcount > 0) {
      sessionStorage.setItem('selectedHeadcount', String(selectedHeadcount));
    }
  };

  const fromSheet = slotHourRangeFromSheet(store.slotStartHour, store.slotEndHour);
  const { startHour: START_HOUR, endHour: END_HOUR, crossesMidnight } = fromSheet ?? {
    startHour: DEFAULT_SLOT_START_HOUR,
    endHour: DEFAULT_SLOT_END_HOUR,
    crossesMidnight: false,
  };

  const timelineMap = new Map<string, TimeSlot>();
  if (store.timeline) {
    for (const slot of store.timeline) {
      timelineMap.set(slot.timeBlock, slot);
    }
  }

  const availableSet = new Set(store.availableTimes || []);
  const reservedSet = new Set(store.reservedTimes || []);
  const allSlots =
    store.timeline && store.timeline.length > 0
      ? store.timeline.map((s) => s.timeBlock)
      : generateSlotTimeBlocks(START_HOUR, END_HOUR, crossesMidnight);
  const hours =
    allSlots.length > 0
      ? getHourLabelsFromSlotBlocks(allSlots)
      : getHourLabels(START_HOUR, END_HOUR, crossesMidnight);
  const closedOnDate = store.closedOnDate === true;

  return (
    <Link
      href={storeHref}
      onClick={persistSelection}
      className="block overflow-hidden rounded-2xl border border-gray-200 bg-white transition hover:border-blue-200 hover:shadow-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500"
    >
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
          </div>

          <div className="min-w-0 flex-1">
            <h2 className="truncate text-lg font-bold leading-tight text-gray-900">
              {store.name}
            </h2>

            {store.locationLabel ? (
              <p className="mt-1.5 flex items-center gap-1 text-sm text-gray-500">
                <PinIcon size={14} className="shrink-0 text-gray-400" />
                <span className="truncate">{store.locationLabel}</span>
              </p>
            ) : null}

            <div className="mt-2.5 flex flex-wrap gap-1.5">
              <span className="rounded-lg border border-gray-200 bg-white px-2.5 py-1 text-[11px] font-medium text-gray-600">
                예약 가능 {minGroup}~{maxGroup}명
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
          {closedOnDate ? (
            <p className="rounded-lg bg-gray-100 px-3 py-2 text-center text-sm text-gray-500">선택한 날짜 휴무</p>
          ) : (
          <>
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

              // 당일 예약 불가 가게는 슬롯 전체를 회색(마감)으로 표시.
              if (sameDayBlocked) {
                bg = SLOT_CLOSED_CLASS;
                title = `${time} (당일 예약 불가)`;
              } else if (slot) {
                const remaining = slot.maxPeople - slot.currentHeadcount;
                const ratio = slot.maxPeople > 0 ? slot.currentHeadcount / slot.maxPeople : 1;
                if (!slot.isAvailable) {
                  bg = SLOT_CLOSED_CLASS;
                  title = `${time} (마감)`;
                } else {
                  bg = getOccupancyColorClass(ratio);
                  title = `${time} — 잔여 ${remaining}명`;
                }
              } else {
                const isReserved = reservedSet.has(time);
                const isAvailable = availableSet.has(time);
                if (isReserved) {
                  bg = SLOT_CLOSED_CLASS;
                  title = `${time} (마감)`;
                } else if (isAvailable) {
                  bg = 'bg-[#2c9af5]';
                  title = time;
                } else {
                  bg = SLOT_CLOSED_CLASS;
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
          {sameDayBlocked ? (
            <p className="mt-2 text-center text-[11px] font-medium text-amber-700">
              당일 예약 불가 · 가게에서 받지 않습니다
            </p>
          ) : (
            <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1">
              {TIMELINE_LEGEND.map((item) => (
                <span key={item.label} className="flex items-center gap-1 text-[11px] text-gray-600">
                  <span className={`inline-block h-2.5 w-2.5 rounded-sm ${item.color}`} />
                  {item.label}
                </span>
              ))}
            </div>
          )}
          </>
          )}
        </div>
      </div>
    </Link>
  );
}
