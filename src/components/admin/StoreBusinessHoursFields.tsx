'use client';

import {
  DAY_KEYS,
  DAY_LABELS,
  type DayKey,
} from '@/lib/store-weekly-hours';

export type DayFormRow = { closed: boolean; start: string; end: string };

type StoreBusinessHoursFieldsProps = {
  useWeeklyHours: boolean;
  onUseWeeklyHoursChange: (value: boolean) => void;
  slotStartHour: string;
  slotEndHour: string;
  onSlotStartHourChange: (value: string) => void;
  onSlotEndHourChange: (value: string) => void;
  weeklyForm: Record<DayKey, DayFormRow>;
  onWeeklyFormChange: (updater: (prev: Record<DayKey, DayFormRow>) => Record<DayKey, DayFormRow>) => void;
  /** compact = 사장님 모바일 UI */
  variant?: 'manage' | 'owner';
};

export function defaultWeeklyForm(): Record<DayKey, DayFormRow> {
  return {
    sun: { closed: false, start: '11', end: '20' },
    mon: { closed: false, start: '11', end: '20' },
    tue: { closed: false, start: '11', end: '20' },
    wed: { closed: false, start: '11', end: '20' },
    thu: { closed: false, start: '11', end: '20' },
    fri: { closed: false, start: '11', end: '20' },
    sat: { closed: false, start: '11', end: '20' },
  };
}

export default function StoreBusinessHoursFields({
  useWeeklyHours,
  onUseWeeklyHoursChange,
  slotStartHour,
  slotEndHour,
  onSlotStartHourChange,
  onSlotEndHourChange,
  weeklyForm,
  onWeeklyFormChange,
  variant = 'manage',
}: StoreBusinessHoursFieldsProps) {
  const isOwner = variant === 'owner';

  const hourSelect = (value: string, onChange: (v: string) => void, label: string) => (
    <label className="block">
      <span className={isOwner ? 'text-sm font-semibold text-gray-700' : 'text-xs text-gray-500'}>
        {label}
      </span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={
          isOwner
            ? 'mt-1.5 w-full rounded-lg border border-gray-300 px-3 py-2.5 text-base'
            : 'mt-1 w-full max-w-[8rem] rounded-lg border border-gray-300 px-3 py-2'
        }
      >
        {Array.from({ length: 24 }).map((_, h) => (
          <option key={h} value={h}>
            {String(h).padStart(2, '0')}시
          </option>
        ))}
      </select>
    </label>
  );

  return (
    <div className={isOwner ? '' : 'sm:col-span-2 space-y-3'}>
      <p className={isOwner ? 'mb-3 text-xs text-gray-500' : 'text-xs text-gray-500'}>
        모든 요일에 같은 영업 시간을 씁니다. 종료 시가 시작 시보다 작으면 다음 날까지로 처리됩니다. (예: 17시~2시)
      </p>
      <div className={isOwner ? 'grid grid-cols-2 gap-3' : 'flex flex-wrap gap-4'}>
        {hourSelect(slotStartHour, onSlotStartHourChange, '시작 시')}
        {hourSelect(slotEndHour, onSlotEndHourChange, '종료(마감) 시')}
      </div>
      <label
        className={
          isOwner
            ? 'mt-4 flex cursor-pointer items-start gap-2 rounded-lg border border-gray-200 bg-gray-50 p-3'
            : 'mt-3 flex cursor-pointer items-center gap-2 text-sm'
        }
      >
        <input
          type="checkbox"
          checked={useWeeklyHours}
          onChange={(e) => onUseWeeklyHoursChange(e.target.checked)}
          className={isOwner ? 'mt-0.5' : ''}
        />
        <span className={isOwner ? 'text-sm font-semibold text-gray-800' : 'font-medium text-gray-800'}>
          요일별로 다르게 하기
        </span>
      </label>
      {useWeeklyHours ? (
        <div className={isOwner ? 'mt-3 space-y-2' : 'rounded-lg border border-gray-100 bg-gray-50/80 p-3'}>
          {!isOwner ? <p className="text-sm font-medium text-gray-800">요일별 영업시간</p> : null}
          <div className={isOwner ? 'space-y-2' : 'mt-3 space-y-2'}>
            {DAY_KEYS.map((key) => (
              <div
                key={key}
                className={`flex flex-wrap items-center gap-2 ${isOwner ? 'rounded-lg border border-gray-100 bg-white p-2 text-sm' : 'text-sm'}`}
              >
                <span className="w-6 font-medium">{DAY_LABELS[key]}</span>
                <label className="flex items-center gap-1 text-xs">
                  <input
                    type="checkbox"
                    checked={weeklyForm[key].closed}
                    onChange={(e) =>
                      onWeeklyFormChange((w) => ({
                        ...w,
                        [key]: { ...w[key], closed: e.target.checked },
                      }))
                    }
                  />
                  휴무
                </label>
                <input
                  type="number"
                  min={0}
                  max={23}
                  disabled={weeklyForm[key].closed}
                  className="w-14 rounded border px-1 py-0.5 disabled:opacity-40"
                  value={weeklyForm[key].start}
                  onChange={(e) =>
                    onWeeklyFormChange((w) => ({
                      ...w,
                      [key]: { ...w[key], start: e.target.value },
                    }))
                  }
                />
                <span>~</span>
                <input
                  type="number"
                  min={0}
                  max={23}
                  disabled={weeklyForm[key].closed}
                  className="w-14 rounded border px-1 py-0.5 disabled:opacity-40"
                  value={weeklyForm[key].end}
                  onChange={(e) =>
                    onWeeklyFormChange((w) => ({
                      ...w,
                      [key]: { ...w[key], end: e.target.value },
                    }))
                  }
                />
                <span className="text-xs text-gray-400">시</span>
              </div>
            ))}
          </div>
        </div>
      ) : null}
      {!isOwner ? (
        <p className="text-xs text-gray-400">저장 시 고객 검색·가게 카드 타임슬롯에 반영됩니다.</p>
      ) : null}
    </div>
  );
}
