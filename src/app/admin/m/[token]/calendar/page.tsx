'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useAdminStore } from '../AdminStoreContext';

interface Reservation {
  reservationId: string;
  userName: string;
  groupName: string;
  userPhone: string;
  userNote?: string;
  date: string;
  startTime: string;
  endTime: string;
  headcount: number;
  totalAmount: number;
  depositAmount: number;
  status: string;
  menus: Array<{
    name: string;
    quantity: number;
    priceAtTime: number;
  }>;
}

const WEEK_LABELS = ['일', '월', '화', '수', '목', '금', '토'];

const CHIP_STYLES = [
  'bg-amber-50 border-l-[3px] border-l-amber-400 text-amber-950',
  'bg-sky-50 border-l-[3px] border-l-sky-400 text-sky-950',
  'bg-rose-50 border-l-[3px] border-l-rose-400 text-rose-950',
  'bg-violet-50 border-l-[3px] border-l-violet-400 text-violet-950',
  'bg-emerald-50 border-l-[3px] border-l-emerald-400 text-emerald-950',
  'bg-orange-50 border-l-[3px] border-l-orange-400 text-orange-950',
];

function pad2(n: number) {
  return String(n).padStart(2, '0');
}

function ymdToday(): string {
  const d = new Date();
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

function buildMonthCells(year: number, month1to12: number): { key: string; dateStr: string | null }[] {
  const mi = month1to12 - 1;
  const first = new Date(year, mi, 1);
  const lead = first.getDay();
  const daysInMonth = new Date(year, mi + 1, 0).getDate();
  const cells: { key: string; dateStr: string | null }[] = [];
  for (let i = 0; i < lead; i++) {
    cells.push({ key: `lead-${i}`, dateStr: null });
  }
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${year}-${pad2(month1to12)}-${pad2(d)}`;
    cells.push({ key: dateStr, dateStr });
  }
  while (cells.length % 7 !== 0) {
    cells.push({ key: `trail-${cells.length}`, dateStr: null });
  }
  while (cells.length < 42) {
    cells.push({ key: `pad-${cells.length}`, dateStr: null });
  }
  return cells;
}

function chipLabel(r: Reservation): string {
  const g = r.groupName?.trim();
  if (g) return g;
  return r.userName?.trim() || '단체명 없음';
}

function getStatusBadgeClass(status: string): string {
  const s = status.trim();
  if (s === 'PENDING') return 'bg-yellow-100 text-yellow-800';
  if (s === 'CONFIRMED' || s === 'DEPOSIT_CONFIRMED') return 'bg-green-100 text-green-800';
  if (s === 'DEPOSIT_PENDING') return 'bg-blue-100 text-blue-800';
  if (s === 'CANCELED' || s === 'CANCELLED') return 'bg-gray-200 text-gray-600 line-through';
  return 'bg-gray-100 text-gray-700';
}

/** 캘린더는 확정 건만 불러오지만, 모달 표기용 */
function statusLabelKo(status: string): string {
  const s = status.trim();
  if (s === 'CONFIRMED') return '예약 확정';
  if (s === 'DEPOSIT_CONFIRMED') return '예약 완료';
  return s;
}

export default function AdminCalendarByToken() {
  const store = useAdminStore();
  const base = `/admin/m/${encodeURIComponent(store.token)}`;

  const now = new Date();
  const [viewYear, setViewYear] = useState(now.getFullYear());
  const [viewMonth, setViewMonth] = useState(now.getMonth() + 1);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [detail, setDetail] = useState<Reservation | null>(null);

  const monthRange = useMemo(() => {
    const mi = viewMonth - 1;
    const last = new Date(viewYear, mi + 1, 0).getDate();
    const from = `${viewYear}-${pad2(viewMonth)}-01`;
    const to = `${viewYear}-${pad2(viewMonth)}-${pad2(last)}`;
    return { from, to };
  }, [viewYear, viewMonth]);

  const fetchMonthReservations = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { from, to } = monthRange;
      const res = await fetch(
        `/api/admin/reservations?storeId=${encodeURIComponent(store.id)}&from=${from}&to=${to}&calendarConfirmed=1`,
      );
      const data = await res.json();
      if (data.success) {
        setReservations((data.data || []) as Reservation[]);
      } else {
        setError(data.message || '예약 목록을 불러올 수 없습니다.');
      }
    } catch {
      setError('예약 목록을 불러오지 못했습니다.');
    } finally {
      setLoading(false);
    }
  }, [store.id, monthRange]);

  useEffect(() => {
    void fetchMonthReservations();
  }, [fetchMonthReservations]);

  const byDate = useMemo(() => {
    const map = new Map<string, Reservation[]>();
    for (const r of reservations) {
      const d = r.date?.slice(0, 10) ?? '';
      if (!d) continue;
      const list = map.get(d) ?? [];
      list.push(r);
      map.set(d, list);
    }
    for (const [, list] of map) {
      list.sort((a, b) => a.startTime.localeCompare(b.startTime));
    }
    return map;
  }, [reservations]);

  const cells = useMemo(() => buildMonthCells(viewYear, viewMonth), [viewYear, viewMonth]);

  const monthStats = useMemo(() => {
    let count = 0;
    let depositSum = 0;
    for (const r of reservations) {
      count += 1;
      depositSum += r.depositAmount ?? 0;
    }
    return { count, depositSum };
  }, [reservations]);

  const handleCancelReservation = async (reservationId: string) => {
    if (!confirm('이 예약을 취소하시겠습니까?')) return;
    setActionLoading(reservationId);
    try {
      const res = await fetch(`/api/admin/reservations/${reservationId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'cancel' }),
      });
      const data = await res.json();
      if (data.success) {
        setDetail(null);
        void fetchMonthReservations();
      } else {
        alert(data.message || '취소 처리 실패');
      }
    } catch {
      alert('취소 요청에 실패했습니다.');
    } finally {
      setActionLoading(null);
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

  const todayStr = ymdToday();

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="sticky top-0 z-20 border-b border-gray-200 bg-white shadow-sm">
        <div className="mx-auto max-w-7xl px-4 py-4">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="text-xl font-bold text-gray-900">🏪 {store.name}</h1>
              <p className="text-sm text-gray-500">날짜별 예약 · 월 캘린더</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Link
                href={base}
                className="rounded-lg px-4 py-2 text-sm font-medium text-blue-600 transition hover:bg-blue-50"
              >
                ← 대기 예약
              </Link>
            </div>
          </div>

          <div className="flex items-center justify-center gap-4">
            <button
              type="button"
              onClick={goPrevMonth}
              className="rounded-lg p-2 text-gray-600 hover:bg-gray-100"
              aria-label="이전 달"
            >
              ‹
            </button>
            <h2 className="min-w-[8rem] text-center text-2xl font-bold text-gray-900">
              {viewYear}년 {viewMonth}월
            </h2>
            <button
              type="button"
              onClick={goNextMonth}
              className="rounded-lg p-2 text-gray-600 hover:bg-gray-100"
              aria-label="다음 달"
            >
              ›
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-3 py-6 sm:px-4">
        <div className="mb-4 grid grid-cols-2 gap-2 sm:gap-4">
          <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
            <div className="text-xs text-gray-500 sm:text-sm">이 달 예약 건수</div>
            <div className="text-xl font-bold text-gray-900 sm:text-2xl">{monthStats.count}건</div>
          </div>
          <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
            <div className="text-xs text-gray-500 sm:text-sm">이 달 예약금 합</div>
            <div className="text-lg font-bold text-amber-700 sm:text-2xl">
              {monthStats.depositSum.toLocaleString()}원
            </div>
          </div>
        </div>

        {error && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-4">
            <p className="text-red-700">{error}</p>
          </div>
        )}

        <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm">
          <div className="grid min-w-[720px] grid-cols-7 border-b border-gray-200 bg-gray-50">
            {WEEK_LABELS.map((w) => (
              <div
                key={w}
                className={`border-r border-gray-100 py-2 text-center text-sm font-semibold last:border-r-0 ${
                  w === '일' ? 'text-red-600' : w === '토' ? 'text-blue-600' : 'text-gray-700'
                }`}
              >
                {w}
              </div>
            ))}
          </div>

          <div className="grid min-w-[720px] grid-cols-7">
            {cells.map((cell, idx) => {
              const col = idx % 7;
              const isSunCol = col === 0;
              const isSatCol = col === 6;
              const dayNum = cell.dateStr ? parseInt(cell.dateStr.slice(8, 10), 10) : null;
              const list = cell.dateStr ? byDate.get(cell.dateStr) ?? [] : [];
              const isToday = cell.dateStr === todayStr;

              return (
                <div
                  key={cell.key}
                  className={`min-h-[120px] border-b border-r border-gray-100 p-1.5 last:border-r-0 sm:min-h-[140px] md:min-h-[160px] ${
                    cell.dateStr ? 'bg-white' : 'bg-gray-50/80'
                  }`}
                >
                  {cell.dateStr && dayNum !== null && (
                    <>
                      <div
                        className={`mb-1 flex justify-end text-sm font-semibold ${
                          isSunCol ? 'text-red-600' : isSatCol ? 'text-blue-600' : 'text-gray-800'
                        }`}
                      >
                        {isToday ? (
                          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-blue-600 text-white">
                            {dayNum}
                          </span>
                        ) : (
                          <span className="pr-0.5 pt-0.5">{dayNum}</span>
                        )}
                      </div>
                      <div className="flex flex-col gap-1">
                        {list.map((r, i) => {
                          const style = CHIP_STYLES[i % CHIP_STYLES.length];
                          const muted = '';
                          return (
                            <button
                              key={r.reservationId}
                              type="button"
                              onClick={() => setDetail(r)}
                              className={`w-full truncate rounded-md px-1.5 py-1 text-left text-[10px] font-medium shadow-sm transition hover:brightness-95 sm:text-xs ${style} ${muted}`}
                            >
                              <span className="block text-[9px] font-normal text-gray-600 sm:text-[10px]">
                                {r.startTime}
                              </span>
                              <span className="block truncate font-semibold">{chipLabel(r)}</span>
                            </button>
                          );
                        })}
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {loading && reservations.length === 0 && !error && (
          <p className="mt-4 text-center text-sm text-gray-500">불러오는 중…</p>
        )}
      </main>

      {detail && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center"
          role="dialog"
          aria-modal="true"
          onClick={() => setDetail(null)}
        >
          <div
            className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl bg-white p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-start justify-between gap-2">
              <h3 className="text-lg font-bold text-gray-900">{chipLabel(detail)}</h3>
              <button
                type="button"
                onClick={() => setDetail(null)}
                className="rounded-lg px-2 py-1 text-sm text-gray-500 hover:bg-gray-100"
              >
                닫기
              </button>
            </div>

            <span
              className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${getStatusBadgeClass(detail.status)}`}
            >
              {statusLabelKo(detail.status)}
            </span>

            <dl className="mt-4 space-y-3 text-sm">
              <div>
                <dt className="text-gray-500">예약자 이름</dt>
                <dd className="font-medium text-gray-900">{detail.userName || '—'}</dd>
              </div>
              <div>
                <dt className="text-gray-500">날짜 및 시간</dt>
                <dd className="font-medium text-gray-900">
                  {detail.date} {detail.startTime} ~ {detail.endTime}
                </dd>
              </div>
              <div>
                <dt className="text-gray-500">인원</dt>
                <dd className="font-medium text-gray-900">{detail.headcount}명</dd>
              </div>
              <div>
                <dt className="text-gray-500">연락처</dt>
                <dd className="font-medium text-gray-900">{detail.userPhone || '—'}</dd>
              </div>
              {detail.userNote ? (
                <div>
                  <dt className="text-gray-500">요청사항</dt>
                  <dd className="text-gray-800">{detail.userNote}</dd>
                </div>
              ) : null}
            </dl>

            {detail.menus.length > 0 && (
              <div className="mt-4 rounded-lg bg-gray-50 p-3">
                <div className="mb-2 text-xs font-semibold text-gray-700">메뉴</div>
                <ul className="space-y-1 text-sm text-gray-700">
                  {detail.menus.map((m, idx) => (
                    <li key={idx} className="flex justify-between gap-2">
                      <span>
                        {m.name} × {m.quantity}
                      </span>
                      <span className="shrink-0 text-gray-500">
                        {(m.priceAtTime * m.quantity).toLocaleString()}원
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {(detail.status === 'CONFIRMED' || detail.status === 'DEPOSIT_CONFIRMED') && (
              <button
                type="button"
                onClick={() => void handleCancelReservation(detail.reservationId)}
                disabled={actionLoading === detail.reservationId}
                className="mt-6 w-full rounded-lg bg-red-50 py-2.5 text-sm font-semibold text-red-600 hover:bg-red-100 disabled:opacity-50"
              >
                {actionLoading === detail.reservationId ? '처리 중…' : '예약 취소'}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
