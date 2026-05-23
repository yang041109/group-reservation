'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useAdminStore } from '../AdminStoreContext';
import {
  DAY_KEYS,
  DAY_LABELS,
  parseClosedWeekdaysJson,
  type DayKey,
} from '@/lib/store-weekly-hours';

const WEEK_LABELS = ['일', '월', '화', '수', '목', '금', '토'];

function pad2(n: number) {
  return String(n).padStart(2, '0');
}

function buildMonthCells(
  year: number,
  month1to12: number,
): { key: string; dateStr: string | null; dayNum: number | null }[] {
  const mi = month1to12 - 1;
  const first = new Date(year, mi, 1);
  const lead = first.getDay();
  const daysInMonth = new Date(year, mi + 1, 0).getDate();
  const cells: { key: string; dateStr: string | null; dayNum: number | null }[] = [];
  for (let i = 0; i < lead; i++) {
    cells.push({ key: `lead-${i}`, dateStr: null, dayNum: null });
  }
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${year}-${pad2(month1to12)}-${pad2(d)}`;
    cells.push({ key: dateStr, dateStr, dayNum: d });
  }
  while (cells.length % 7 !== 0) {
    cells.push({ key: `trail-${cells.length}`, dateStr: null, dayNum: null });
  }
  return cells;
}

function ymdToday(): string {
  const d = new Date();
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

export default function AdminClosedDatesPage() {
  const store = useAdminStore();
  const base = `/admin/m/${encodeURIComponent(store.token)}`;
  const now = new Date();
  const [viewYear, setViewYear] = useState(now.getFullYear());
  const [viewMonth, setViewMonth] = useState(now.getMonth() + 1);
  const [closedDates, setClosedDates] = useState<string[]>([]);
  const [closedWeekdays, setClosedWeekdays] = useState<DayKey[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 매주 휴무 요일은 가게 설정에서 가져와 캘린더에 시각적으로만 표시 (이 페이지에선 토글 안함)
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch(`/api/admin/store?token=${encodeURIComponent(store.token)}`);
        const data = await res.json();
        if (!cancelled && data?.success) {
          setClosedWeekdays(parseClosedWeekdaysJson(data.data?.closedWeekdaysJson ?? null));
        }
      } catch {
        // 매주 휴무 요일은 보조 표시이므로 실패해도 페이지 작동에 영향 없음
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [store.token]);

  const todayStr = ymdToday();

  const fetchClosedDates = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/admin/closed-dates?storeId=${encodeURIComponent(store.id)}`,
      );
      const data = await res.json();
      if (data.success) {
        setClosedDates(data.data || []);
      } else {
        setError(data.message || '휴무일을 불러올 수 없습니다.');
      }
    } catch {
      setError('휴무일을 불러오지 못했습니다.');
    } finally {
      setLoading(false);
    }
  }, [store.id]);

  useEffect(() => {
    void fetchClosedDates();
  }, [fetchClosedDates]);

  const cells = useMemo(() => buildMonthCells(viewYear, viewMonth), [viewYear, viewMonth]);
  const closedSet = useMemo(() => new Set(closedDates), [closedDates]);
  const closedWeekdaysSet = useMemo(() => new Set(closedWeekdays), [closedWeekdays]);
  /** col(0=일..6=토) → 매주 휴무 요일이면 true */
  const isWeeklyClosedCol = (col: number): boolean => {
    const k = DAY_KEYS[col];
    return !!k && closedWeekdaysSet.has(k);
  };

  const monthClosedDates = useMemo(() => {
    const prefix = `${viewYear}-${pad2(viewMonth)}`;
    return closedDates.filter((d) => d.startsWith(prefix)).sort();
  }, [closedDates, viewYear, viewMonth]);

  const toggleDate = async (date: string) => {
    if (loading) return;
    const isClosed = closedSet.has(date);
    if (
      isClosed
        ? !confirm(`${date} 휴무 지정을 해제할까요?`)
        : !confirm(`${date}을(를) 지정 휴무일로 설정할까요? 해당 날짜는 우르르에서 예약이 막힙니다.`)
    ) {
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        isClosed
          ? `/api/admin/closed-dates?storeId=${encodeURIComponent(store.id)}&date=${encodeURIComponent(date)}`
          : '/api/admin/closed-dates',
        isClosed
          ? { method: 'DELETE' }
          : {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ storeId: store.id, date }),
            },
      );
      const data = await res.json();
      if (data.success) {
        setClosedDates(data.data || []);
      } else {
        alert(data.message || '처리에 실패했습니다.');
      }
    } catch {
      alert('서버 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const goPrevMonth = () => {
    setViewMonth((m) => {
      if (m <= 1) {
        setViewYear((y) => y - 1);
        return 12;
      }
      return m - 1;
    });
  };

  const goNextMonth = () => {
    setViewMonth((m) => {
      if (m >= 12) {
        setViewYear((y) => y + 1);
        return 1;
      }
      return m + 1;
    });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="sticky top-0 z-20 bg-blue-600 text-white shadow-md">
        <div className="mx-auto max-w-md px-4 py-4">
          <div className="flex items-center justify-between">
            <Link href={base} className="text-white" aria-label="뒤로가기">
              <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </Link>
            <h1 className="text-lg font-bold">지정 휴무일 설정</h1>
            <span className="w-6" />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-md bg-white">
        <div className="border-b border-gray-100 p-4">
          <p className="rounded-lg bg-emerald-50 p-3 text-xs text-emerald-900">
            <span className="font-semibold">📌 안내</span><br />
            날짜를 누르면 해당 날 우르르에서 예약을 받지 않습니다. 다시 누르면 휴무 지정이 해제됩니다.
          </p>
        </div>

        {/* 월 네비게이션 */}
        <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3">
          <button onClick={goPrevMonth} className="rounded p-2 text-gray-600 hover:bg-gray-100">
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h2 className="text-lg font-bold text-gray-900">
            {viewYear}년 {viewMonth}월
          </h2>
          <button onClick={goNextMonth} className="rounded p-2 text-gray-600 hover:bg-gray-100">
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>

        {error && (
          <div className="mx-4 mt-3 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* 캘린더 */}
        <div className="border-b border-gray-200">
          <div className="grid grid-cols-7 border-b border-gray-200 bg-gray-50">
            {WEEK_LABELS.map((label, idx) => (
              <div
                key={label}
                className={`py-2 text-center text-xs font-semibold ${
                  idx === 0 ? 'text-red-500' : idx === 6 ? 'text-blue-500' : 'text-gray-700'
                }`}
              >
                {label}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7">
            {cells.map((cell, idx) => {
              const col = idx % 7;
              const isSunCol = col === 0;
              const isSatCol = col === 6;
              const isClosed = cell.dateStr ? closedSet.has(cell.dateStr) : false;
              const isToday = cell.dateStr === todayStr;
              const weeklyClosed = isWeeklyClosedCol(col);

              return (
                <button
                  key={cell.key}
                  onClick={() => cell.dateStr && !weeklyClosed && void toggleDate(cell.dateStr)}
                  disabled={!cell.dateStr || loading || weeklyClosed}
                  title={weeklyClosed ? '매주 휴무 요일로 설정돼 있어 항상 휴무입니다' : undefined}
                  className={`relative min-h-[60px] border-b border-r border-gray-100 p-1 text-center transition ${
                    cell.dateStr ? 'hover:bg-emerald-50' : 'bg-gray-50'
                  } ${isClosed || weeklyClosed ? 'bg-red-50' : ''} ${
                    weeklyClosed ? 'cursor-not-allowed opacity-90' : ''
                  }`}
                >
                  {cell.dayNum !== null && (
                    <>
                      <div
                        className={`mx-auto flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium ${
                          isClosed || weeklyClosed
                            ? 'bg-red-500 text-white line-through'
                            : isToday
                              ? 'bg-blue-600 text-white'
                              : isSunCol
                                ? 'text-red-500'
                                : isSatCol
                                  ? 'text-blue-500'
                                  : 'text-gray-800'
                        }`}
                      >
                        {cell.dayNum}
                      </div>
                      {(isClosed || weeklyClosed) && (
                        <p className="mt-0.5 text-[9px] font-semibold text-red-700">
                          {weeklyClosed && !isClosed ? '매주' : '휴무'}
                        </p>
                      )}
                    </>
                  )}
                </button>
              );
            })}
          </div>
          {closedWeekdays.length > 0 && (
            <p className="border-t border-gray-100 bg-amber-50 px-4 py-2 text-[11px] text-amber-900">
              매주{' '}
              {closedWeekdays.map((k) => DAY_LABELS[k]).join('·')}요일은 가게 설정에서 항상 휴무로 지정돼 있습니다. (변경은 가게 정보 페이지에서)
            </p>
          )}
        </div>

        {/* 이번 달 휴무 요약 */}
        <div className="p-4">
          <h3 className="mb-2 text-sm font-bold text-gray-900">
            이번 달 휴무일 ({monthClosedDates.length}일)
          </h3>
          {monthClosedDates.length === 0 ? (
            <p className="rounded-lg border border-dashed border-gray-200 p-4 text-center text-xs text-gray-500">
              지정된 휴무일이 없습니다
            </p>
          ) : (
            <ul className="space-y-2">
              {monthClosedDates.map((d) => {
                const dt = new Date(d);
                const day = WEEK_LABELS[dt.getDay()] ?? '';
                return (
                  <li
                    key={d}
                    className="flex items-center justify-between rounded-lg border border-red-100 bg-red-50 px-3 py-2"
                  >
                    <span className="text-sm font-medium text-red-900">
                      {d.replace(/-/g, '.')} ({day})
                    </span>
                    <button
                      type="button"
                      onClick={() => void toggleDate(d)}
                      disabled={loading}
                      className="rounded-md bg-white px-2.5 py-1 text-xs font-semibold text-red-600 hover:bg-red-100 disabled:opacity-50"
                    >
                      해제
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </main>
    </div>
  );
}
