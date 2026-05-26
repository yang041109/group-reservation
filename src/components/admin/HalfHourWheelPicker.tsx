'use client';

import { useCallback, useEffect, useRef, useState, type CSSProperties } from 'react';
import {
  formatHalfHourLabel,
  HOUR12_OPTIONS,
  MINUTE_OPTIONS,
  parseHalfHourTime,
  PERIOD_OPTIONS,
  type Period,
  toHalfHourTime24,
} from '@/lib/half-hour-time';

const ITEM_H = 44;
const WHEEL_H = 220;
const PAD_ROWS = 2;
const WHEEL_CENTER = WHEEL_H / 2;

/** 중앙에서 멀수록 투명·작게 (iOS 휠 느낌) */
function wheelItemStyle(distanceFromCenter: number): CSSProperties {
  const t = Math.min(1, Math.abs(distanceFromCenter) / (ITEM_H * 2.2));
  const opacity = 1 - t * 0.72;
  const scale = 1 - t * 0.12;
  return {
    opacity,
    transform: `scale(${scale})`,
    transition: 'opacity 0.12s ease-out, transform 0.12s ease-out',
  };
}

type WheelColumnProps<T extends string | number> = {
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
  disabled?: boolean;
  ariaLabel: string;
};

function WheelColumn<T extends string | number>({
  options,
  value,
  onChange,
  disabled = false,
  ariaLabel,
}: WheelColumnProps<T>) {
  const listRef = useRef<HTMLUListElement>(null);
  const scrollEndTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const syncing = useRef(false);
  const [scrollTop, setScrollTop] = useState(0);

  const scrollToIndex = useCallback((index: number, smooth: boolean) => {
    const el = listRef.current;
    if (!el) return;
    syncing.current = true;
    el.scrollTo({ top: index * ITEM_H, behavior: smooth ? 'smooth' : 'auto' });
    window.setTimeout(() => {
      syncing.current = false;
    }, smooth ? 280 : 0);
  }, []);

  useEffect(() => {
    const idx = options.findIndex((o) => o.value === value);
    if (idx >= 0) {
      scrollToIndex(idx, false);
      const el = listRef.current;
      if (el) setScrollTop(el.scrollTop);
    }
  }, [value, options, scrollToIndex]);

  const onScroll = () => {
    const el = listRef.current;
    if (el) setScrollTop(el.scrollTop);
    if (syncing.current || disabled) return;
    if (scrollEndTimer.current) clearTimeout(scrollEndTimer.current);
    scrollEndTimer.current = setTimeout(() => {
      if (!el) return;
      const idx = Math.max(0, Math.min(options.length - 1, Math.round(el.scrollTop / ITEM_H)));
      const next = options[idx]?.value;
      if (next !== undefined && next !== value) onChange(next);
      scrollToIndex(idx, true);
    }, 80);
  };

  const pad = PAD_ROWS * ITEM_H;

  return (
    <div className="relative min-w-0 flex-1" aria-label={ariaLabel}>
      {/* 상·하단 페이드 */}
      <div
        className="pointer-events-none absolute inset-x-0 top-0 z-20 h-[72px] bg-gradient-to-b from-gray-50 via-gray-50/70 to-transparent"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-x-0 bottom-0 z-20 h-[72px] bg-gradient-to-t from-white via-white/70 to-transparent"
        aria-hidden
      />
      {/* 선택 영역 */}
      <div
        className="pointer-events-none absolute inset-x-2 top-1/2 z-10 -translate-y-1/2 rounded-xl border border-blue-200/60 bg-blue-500/[0.06] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.5)]"
        style={{ height: ITEM_H }}
      />
      <ul
        ref={listRef}
        className="h-[220px] overflow-y-auto overscroll-y-contain scroll-smooth [-webkit-overflow-scrolling:touch] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        style={{
          paddingTop: pad,
          paddingBottom: pad,
          scrollSnapType: 'y mandatory',
          WebkitMaskImage:
            'linear-gradient(to bottom, transparent 0%, black 22%, black 78%, transparent 100%)',
          maskImage:
            'linear-gradient(to bottom, transparent 0%, black 22%, black 78%, transparent 100%)',
        }}
        onScroll={onScroll}
      >
        {options.map((opt, index) => {
          const itemCenter = pad + index * ITEM_H + ITEM_H / 2;
          const dist = itemCenter - scrollTop - WHEEL_CENTER;
          const isSelected = Math.abs(dist) < ITEM_H / 2;
          return (
            <li
              key={String(opt.value)}
              className={`flex items-center justify-center text-center text-[17px] font-medium ${
                isSelected ? 'text-gray-900' : 'text-gray-500'
              }`}
              style={{
                height: ITEM_H,
                scrollSnapAlign: 'center',
                ...wheelItemStyle(dist),
              }}
            >
              {opt.label}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

type HalfHourWheelPickerProps = {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  defaultPeriod?: Period;
};

export function HalfHourWheelPicker({
  value,
  onChange,
  disabled = false,
  defaultPeriod = 'PM',
}: HalfHourWheelPickerProps) {
  const parsed =
    parseHalfHourTime(value) ??
    (defaultPeriod === 'PM'
      ? { period: 'PM' as const, hour12: 2, minute: 0 as const }
      : { period: 'AM' as const, hour12: 9, minute: 0 as const });

  const { period, hour12, minute } = parsed;

  const update = (next: Partial<{ period: Period; hour12: number; minute: 0 | 30 }>) => {
    onChange(
      toHalfHourTime24(
        next.period ?? period,
        next.hour12 ?? hour12,
        next.minute ?? minute,
      ),
    );
  };

  return (
    <div
      className={`relative flex overflow-hidden rounded-xl border border-gray-200/80 bg-gradient-to-b from-gray-50 to-white shadow-inner ${disabled ? 'pointer-events-none opacity-50' : ''}`}
    >
      <WheelColumn
        options={PERIOD_OPTIONS}
        value={period}
        onChange={(v) => update({ period: v })}
        disabled={disabled}
        ariaLabel="오전 또는 오후"
      />
      <div className="w-px bg-gray-200" />
      <WheelColumn
        options={HOUR12_OPTIONS}
        value={hour12}
        onChange={(v) => update({ hour12: v })}
        disabled={disabled}
        ariaLabel="시"
      />
      <div className="w-px bg-gray-200" />
      <WheelColumn
        options={MINUTE_OPTIONS}
        value={minute}
        onChange={(v) => update({ minute: v })}
        disabled={disabled}
        ariaLabel="분"
      />
    </div>
  );
}

type HalfHourWheelPickerFieldProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  defaultPeriod?: Period;
};

/** 탭하면 하단 시트에서 휠 피커로 시간 선택 */
export default function HalfHourWheelPickerField({
  label,
  value,
  onChange,
  disabled = false,
  defaultPeriod = 'PM',
}: HalfHourWheelPickerFieldProps) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(value);

  useEffect(() => {
    if (!open) setDraft(value);
  }, [value, open]);

  const confirm = () => {
    onChange(draft);
    setOpen(false);
  };

  return (
    <>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen(true)}
        className="flex w-full min-w-0 items-center justify-between rounded-xl border border-gray-300 bg-white px-4 py-3 text-left transition active:bg-gray-50 disabled:bg-gray-100"
      >
        <span className="text-xs text-gray-500">{label}</span>
        <span className="text-base font-semibold text-gray-900">{formatHalfHourLabel(value)}</span>
      </button>

      {open ? (
        <div
          className="fixed inset-0 z-[70] flex items-end justify-center bg-black/45"
          role="dialog"
          aria-modal="true"
          aria-label={`${label} 선택`}
          onClick={() => setOpen(false)}
        >
          <div
            className="w-full max-w-md overflow-hidden rounded-t-2xl bg-white px-4 pb-6 pt-3 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-2 flex items-center justify-between">
              <p className="text-sm font-bold text-gray-900">{label}</p>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-lg px-2 py-1 text-sm text-gray-500 hover:bg-gray-100"
              >
                취소
              </button>
            </div>
            <HalfHourWheelPicker value={draft} onChange={setDraft} defaultPeriod={defaultPeriod} />
            <button
              type="button"
              onClick={confirm}
              className="mt-4 w-full rounded-xl bg-blue-600 py-3 text-sm font-semibold text-white hover:bg-blue-700"
            >
              선택
            </button>
          </div>
        </div>
      ) : null}
    </>
  );
}
