'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import DateSelector from '@/components/DateSelector';
import { prefetchAllDataIntoCache } from '@/lib/use-store-data';

function getTodayYmd(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function formatKoreanDateChip(ymd: string | null): string {
  if (!ymd) return '날짜 선택';
  const d = new Date(`${ymd}T12:00:00`);
  const w = ['일', '월', '화', '수', '목', '금', '토'][d.getDay()];
  return `${w} · ${d.getMonth() + 1}/${d.getDate()}`;
}

export default function LandingSearchWidget() {
  const router = useRouter();
  const [selectedDate, setSelectedDate] = useState<string | null>(() => getTodayYmd());
  const [headcount, setHeadcount] = useState(4);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [prefetching, setPrefetching] = useState(false);
  const [prefetchReady, setPrefetchReady] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    void (async () => {
      try {
        await prefetchAllDataIntoCache();
        sessionStorage.setItem('landingPrefetchedAllData', '1');
        setPrefetchReady(true);
      } catch {
        setPrefetchReady(false);
      }
    })();
  }, []);

  useEffect(() => {
    if (!calendarOpen) return;
    const onDoc = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setCalendarOpen(false);
      }
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [calendarOpen]);

  const goSearch = async () => {
    if (!selectedDate) {
      setCalendarOpen(true);
      return;
    }
    setPrefetching(true);
    try {
      if (!prefetchReady) {
        await prefetchAllDataIntoCache();
        sessionStorage.setItem('landingPrefetchedAllData', '1');
      }
      sessionStorage.setItem('selectedDate', selectedDate);
      sessionStorage.setItem('selectedHeadcount', String(headcount));
      router.push('/search');
    } catch {
      setPrefetching(false);
    }
  };

  const bump = (delta: number) => {
    setHeadcount((h) => Math.min(100, Math.max(1, h + delta)));
  };

  return (
    <div ref={wrapRef} className="mx-auto w-full max-w-3xl">
      <div className="flex flex-col gap-3 rounded-[2rem] border border-gray-200/80 bg-white p-2 shadow-[0_8px_40px_rgba(15,23,42,0.08)] sm:flex-row sm:items-stretch sm:gap-0 sm:p-1.5">
        {/* 어디서 */}
        <div className="flex min-h-[4.5rem] flex-1 flex-col justify-center border-b border-gray-100 px-4 py-2 sm:border-b-0 sm:border-r sm:border-gray-100">
          <span className="flex items-center gap-1.5 text-[11px] font-medium tracking-wide text-gray-400">
            <span aria-hidden>📍</span>
            어디서
          </span>
          <span className="mt-0.5 text-base font-semibold text-gray-900">우르르 가게</span>
        </div>

        {/* 언제 */}
        <div className="relative flex min-h-[4.5rem] flex-1 flex-col justify-center border-b border-gray-100 px-4 py-2 sm:border-b-0 sm:border-r sm:border-gray-100">
          <button
            type="button"
            onClick={() => setCalendarOpen((o) => !o)}
            className="w-full text-left"
          >
            <span className="flex items-center gap-1.5 text-[11px] font-medium tracking-wide text-gray-400">
              <span aria-hidden>📅</span>
              언제
            </span>
            <span className="mt-0.5 block text-base font-semibold text-gray-900">
              {formatKoreanDateChip(selectedDate)}
            </span>
          </button>
        </div>

        {/* 몇 시 — 목록 단계에서는 가게 내에서 선택 */}
        <div className="flex min-h-[4.5rem] flex-1 flex-col justify-center border-b border-gray-100 px-4 py-2 sm:border-b-0 sm:border-r sm:border-gray-100">
          <span className="flex items-center gap-1.5 text-[11px] font-medium tracking-wide text-gray-400">
            <span aria-hidden>🕐</span>
            몇 시
          </span>
          <span className="mt-0.5 text-base font-semibold text-gray-900">가게에서 선택</span>
        </div>

        {/* 몇 명 */}
        <div className="flex min-h-[4.5rem] flex-1 items-center justify-between gap-2 px-4 py-2 sm:justify-center sm:border-r sm:border-gray-100">
          <div className="flex flex-col">
            <span className="flex items-center gap-1.5 text-[11px] font-medium tracking-wide text-gray-400">
              <span aria-hidden>👥</span>
              몇 명
            </span>
            <div className="mt-1 flex items-center gap-2">
              <button
                type="button"
                aria-label="인원 한 명 줄이기"
                onClick={() => bump(-1)}
                className="flex h-9 w-9 items-center justify-center rounded-full border border-gray-200 bg-gray-50 text-lg text-gray-600 transition hover:bg-gray-100"
              >
                −
              </button>
              <span className="min-w-[3.5rem] text-center text-base font-semibold text-gray-900">{headcount}명</span>
              <button
                type="button"
                aria-label="인원 한 명 늘리기"
                onClick={() => bump(1)}
                className="flex h-9 w-9 items-center justify-center rounded-full border border-gray-200 bg-gray-50 text-lg text-gray-600 transition hover:bg-gray-100"
              >
                +
              </button>
            </div>
          </div>
        </div>

        {/* 자리 찾기 */}
        <div className="flex items-stretch px-1 pb-1 sm:px-1 sm:pb-0">
          <button
            type="button"
            disabled={prefetching}
            onClick={() => void goSearch()}
            className="flex w-full flex-1 items-center justify-center gap-2 rounded-2xl bg-[#0095F6] px-6 py-3.5 text-base font-semibold text-white shadow-sm transition hover:bg-[#0086e0] disabled:opacity-60 sm:min-w-[8.5rem] sm:rounded-full sm:py-0"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden>
              <circle cx="11" cy="11" r="7" />
              <path d="M21 21l-4.35-4.35" strokeLinecap="round" />
            </svg>
            {prefetching ? '이동 중…' : '자리 찾기'}
          </button>
        </div>
      </div>

      {calendarOpen && (
        <div className="relative z-20 mt-3 rounded-2xl border border-gray-200 bg-white p-4 shadow-lg">
          <DateSelector
            selectedDate={selectedDate}
            onChange={(d) => {
              setSelectedDate(d);
              setCalendarOpen(false);
            }}
          />
        </div>
      )}
    </div>
  );
}
