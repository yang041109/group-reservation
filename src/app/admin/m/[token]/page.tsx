'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useAdminStore } from './AdminStoreContext';

interface Reservation {
  reservationId: string;
  date: string;
  startTime: string;
  endTime: string;
  status: string;
}

function pad2(n: number) {
  return String(n).padStart(2, '0');
}

function formatTodayLabel(): string {
  const d = new Date();
  const days = ['일', '월', '화', '수', '목', '금', '토'];
  const yyyy = d.getFullYear();
  const mm = pad2(d.getMonth() + 1);
  const dd = pad2(d.getDate());
  const hh = pad2(d.getHours());
  const mi = pad2(d.getMinutes());
  return `${yyyy}.${mm}.${dd} (${days[d.getDay()]}) ${hh}:${mi} 기준`;
}

function todayYmd(): string {
  const d = new Date();
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

export default function AdminDashboardByToken() {
  const store = useAdminStore();
  const base = `/admin/m/${encodeURIComponent(store.token)}`;

  const [pendingCount, setPendingCount] = useState<number>(0);
  const [depositPendingCount, setDepositPendingCount] = useState<number>(0);
  const [todayReservationsCount, setTodayReservationsCount] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [todayLabel, setTodayLabel] = useState<string>('');

  const today = useMemo(() => todayYmd(), []);

  const reload = useCallback(async () => {
    try {
      const [pRes, dRes, tRes] = await Promise.all([
        fetch(`/api/admin/reservations?storeId=${encodeURIComponent(store.id)}&status=PENDING`),
        fetch(`/api/admin/reservations?storeId=${encodeURIComponent(store.id)}&status=DEPOSIT_PENDING`),
        fetch(
          `/api/admin/reservations?storeId=${encodeURIComponent(store.id)}&from=${today}&to=${today}&calendarConfirmed=1`,
        ),
      ]);
      const [pJson, dJson, tJson] = await Promise.all([pRes.json(), dRes.json(), tRes.json()]);
      if (pJson.success) setPendingCount((pJson.data || []).length);
      if (dJson.success) setDepositPendingCount((dJson.data || []).length);
      if (tJson.success) {
        const list = (tJson.data || []) as Reservation[];
        // 캘린더에 표시되는 (취소 외) 모든 예약을 카운트
        const visible = list.filter((r) => r.status !== 'CANCELED');
        setTodayReservationsCount(visible.length);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [store.id, today]);

  useEffect(() => {
    setTodayLabel(formatTodayLabel());
    void reload();
    const onFocus = () => void reload();
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, [reload]);

  const totalPending = pendingCount + depositPendingCount;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 헤더 */}
      <header className="bg-blue-600 text-white">
        <div className="mx-auto flex max-w-md items-center justify-between px-5 py-5">
          <div className="flex items-center gap-2">
            <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24" aria-hidden>
              <path d="M12 2L4 6v6c0 5 3.5 9.5 8 10 4.5-.5 8-5 8-10V6l-8-4z" opacity="0.9" />
            </svg>
            <div>
              <p className="text-xs leading-tight text-blue-100">우르르 사장님</p>
              <h1 className="text-base font-bold leading-tight">{store.name}</h1>
            </div>
          </div>
          <button
            type="button"
            className="rounded-lg p-1 text-white transition hover:bg-white/10"
            aria-label="메뉴"
          >
            <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-md px-5 py-6">
        {/* 오늘의 현황 카드 컨테이너 */}
        <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="block h-4 w-1 rounded-full bg-blue-600" />
              <h2 className="text-base font-bold text-gray-900">오늘의 현황</h2>
            </div>
            <p className="text-xs text-gray-400">{todayLabel}</p>
          </div>

          {/* 그리드: 상단 2칸 통합 카드 + 하단 2개 카드 */}
          <div className="grid grid-cols-2 gap-3">
            {/* 대기 중인 예약 (col-span-2 = 2칸) */}
            <Link
              href={`${base}/pending`}
              className="col-span-2 rounded-xl border border-gray-100 bg-gradient-to-br from-blue-50 to-white p-5 transition hover:border-blue-200 hover:shadow-md"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100">
                    <svg
                      className="h-6 w-6 text-blue-600"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                  </div>
                  <span className="text-sm font-semibold text-gray-700">대기 중인 예약</span>
                </div>
                <svg
                  className="h-5 w-5 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
              <div className="mt-4">
                <span className="text-4xl font-extrabold text-gray-900">
                  {loading ? '—' : totalPending}
                </span>
                <span className="ml-1 text-xl font-bold text-gray-700">건</span>
                {depositPendingCount > 0 ? (
                  <p className="mt-1 text-xs text-gray-500">
                    예약 대기 {pendingCount}건 · 입금 대기 {depositPendingCount}건
                  </p>
                ) : (
                  <p className="mt-1 text-xs text-gray-500">탭하여 수락/거절을 진행하세요</p>
                )}
              </div>
            </Link>

            {/* 일정 등록 */}
            <Link
              href={`${base}/calendar`}
              className="rounded-xl border border-gray-100 bg-white p-4 text-left transition hover:border-violet-200 hover:shadow-md"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-violet-100">
                <svg
                  className="h-6 w-6 text-violet-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 4v16m8-8H4"
                  />
                </svg>
              </div>
              <p className="mt-3 text-sm font-medium text-gray-700">일정 등록</p>
              <div className="mt-1 flex items-end justify-between">
                <span className="text-2xl font-extrabold text-gray-900">+</span>
                <svg
                  className="h-5 w-5 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </Link>

            {/* 오늘의 단체 예약 확인하기 */}
            <Link
              href={`${base}/calendar`}
              className="rounded-xl border border-gray-100 bg-white p-4 transition hover:border-orange-200 hover:shadow-md"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-orange-100">
                <svg
                  className="h-6 w-6 text-orange-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M17 20h5v-2a3 3 0 00-3-3h-2m-3-7a4 4 0 11-8 0 4 4 0 018 0zm6 8a4 4 0 10-8 0 4 4 0 008 0z"
                  />
                </svg>
              </div>
              <p className="mt-3 text-sm font-medium text-gray-700">오늘의 단체 예약</p>
              <div className="mt-1 flex items-end justify-between">
                <span>
                  <span className="text-2xl font-extrabold text-gray-900">
                    {loading ? '—' : todayReservationsCount}
                  </span>
                  <span className="ml-0.5 text-base font-bold text-gray-700">건</span>
                </span>
                <svg
                  className="h-5 w-5 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </Link>
          </div>
        </section>

        {/* 캘린더 보기 큰 버튼 */}
        <Link
          href={`${base}/calendar`}
          className="mt-5 flex w-full items-center justify-between rounded-2xl bg-blue-600 px-6 py-5 text-white shadow-lg transition hover:bg-blue-700"
        >
          <div className="flex items-center gap-3">
            <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
            <span className="text-lg font-bold">캘린더 보기</span>
          </div>
          <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </Link>
      </main>
    </div>
  );
}
