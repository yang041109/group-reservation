'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import OwnerTodayTimelinePanel from '@/components/admin/OwnerTodayTimelinePanel';
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
        <OwnerTodayTimelinePanel token={store.token} storeId={store.id} />

        {/* 오늘의 현황 카드 컨테이너 */}
        <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="block h-4 w-1 rounded-full bg-blue-600" />
              <h2 className="text-base font-bold text-gray-900">오늘의 현황</h2>
            </div>
            <p className="text-xs text-gray-400">{todayLabel}</p>
          </div>

          {/* 그리드: 상단 2칸 통합 카드 (대기 중인 예약) + 하단 4개 카드 */}
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

            {/* 일정 추가 */}
            <Link
              href={`${base}/calendar`}
              className="rounded-xl border border-gray-100 bg-white p-4 transition hover:border-blue-200 hover:shadow-md"
            >
              <div className="flex items-start justify-between">
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
                      d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                    />
                  </svg>
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
              <p className="mt-3 text-sm font-bold text-gray-900">일정 추가</p>
              <p className="mt-0.5 text-xs text-gray-500">새로운 일정 등록</p>
            </Link>

            {/* 오늘의 단체 예약 */}
            <Link
              href={`${base}/calendar`}
              className="rounded-xl border border-gray-100 bg-white p-4 transition hover:border-orange-200 hover:shadow-md"
            >
              <div className="flex items-start justify-between">
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
                <svg
                  className="h-5 w-5 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
              <p className="mt-3 text-sm font-bold text-gray-900">오늘의 단체 예약</p>
              <p className="mt-0.5 text-xs text-gray-500">
                {loading ? '단체 예약 현황 확인' : `${todayReservationsCount}건 · 현황 확인`}
              </p>
            </Link>

            {/* 지정 휴무일 설정 */}
            <Link
              href={`${base}/closed-dates`}
              className="rounded-xl border border-gray-100 bg-white p-4 transition hover:border-emerald-200 hover:shadow-md"
            >
              <div className="flex items-start justify-between">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-100">
                  <svg
                    className="h-6 w-6 text-emerald-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                    />
                  </svg>
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
              <p className="mt-3 text-sm font-bold text-gray-900">지정 휴무일 설정</p>
              <p className="mt-0.5 text-xs text-gray-500">휴무일 관리 및 설정</p>
            </Link>

            {/* 가게 설정 변경 */}
            <Link
              href={`${base}/settings`}
              className="rounded-xl border border-gray-100 bg-white p-4 transition hover:border-blue-200 hover:shadow-md"
            >
              <div className="flex items-start justify-between">
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
                      d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                    />
                  </svg>
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
              <p className="mt-3 text-sm font-bold text-gray-900">가게 설정 변경</p>
              <p className="mt-0.5 text-xs text-gray-500">가게 정보 및 설정 관리</p>
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
