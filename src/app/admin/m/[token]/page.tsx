'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import OwnerClosePanel from '@/components/admin/OwnerClosePanel';
import { fetchOwnerBusinessDayReservations } from '@/lib/owner-business-day-client';
import { useAdminStore } from './AdminStoreContext';

interface Reservation {
  reservationId: string;
  userName: string;
  groupName?: string;
  zoneId?: string;
  zoneName?: string;
  date: string;
  startTime: string;
  endTime: string;
  headcount: number;
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

function formatBusinessDateShort(ymd: string): string {
  const [y, m, d] = ymd.split('-').map((x) => parseInt(x, 10));
  const dt = new Date(y, m - 1, d);
  const days = ['일', '월', '화', '수', '목', '금', '토'];
  return `${m}/${d}(${days[dt.getDay()]})`;
}

function formatReservationTimeLine(
  r: Reservation,
  businessDate: string,
  crossesMidnight: boolean,
): string {
  const time = `${r.startTime}${r.endTime ? ` – ${r.endTime}` : ''}`;
  if (!crossesMidnight) return time;
  const resDate = r.date.slice(0, 10);
  if (resDate !== businessDate) {
    const [, mo, da] = resDate.split('-');
    return `${mo}/${da} ${time}`;
  }
  return time;
}

function todayStatusLabel(status: string): string {
  const s = status.toUpperCase();
  if (s === 'CONFIRMED' || s === 'DEPOSIT_CONFIRMED') return '예약확정';
  if (s === 'CHECKED_IN') return '방문완료';
  if (s === 'NO_SHOW') return '노쇼';
  if (s === 'DEPOSIT_PENDING') return '입금대기';
  if (s === 'PENDING') return '승인대기';
  if (s === 'CANCELED') return '취소';
  return status;
}

function todayStatusClass(status: string): string {
  const s = status.toUpperCase();
  if (s === 'CONFIRMED' || s === 'DEPOSIT_CONFIRMED') return 'bg-green-100 text-green-800';
  if (s === 'CHECKED_IN') return 'bg-purple-100 text-purple-800';
  if (s === 'NO_SHOW') return 'bg-red-100 text-red-800';
  if (s === 'DEPOSIT_PENDING') return 'bg-amber-100 text-amber-800';
  if (s === 'PENDING') return 'bg-blue-100 text-blue-800';
  return 'bg-gray-100 text-gray-600';
}

export default function AdminDashboardByToken() {
  const store = useAdminStore();
  const base = `/admin/m/${encodeURIComponent(store.token)}`;

  const [pendingCount, setPendingCount] = useState<number>(0);
  const [depositPendingCount, setDepositPendingCount] = useState<number>(0);
  const [todayReservations, setTodayReservations] = useState<Reservation[]>([]);
  const [businessDate, setBusinessDate] = useState('');
  const [crossesMidnight, setCrossesMidnight] = useState(false);
  const [closedOnBusinessDay, setClosedOnBusinessDay] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [todayLabel, setTodayLabel] = useState<string>('');

  const reload = useCallback(async () => {
    setLoadError(null);
    try {
      const [pRes, dRes, todayResult] = await Promise.all([
        fetch(`/api/admin/reservations?storeId=${encodeURIComponent(store.id)}&status=PENDING`),
        fetch(`/api/admin/reservations?storeId=${encodeURIComponent(store.id)}&status=DEPOSIT_PENDING`),
        fetchOwnerBusinessDayReservations(store.token),
      ]);
      const [pJson, dJson] = await Promise.all([pRes.json(), dRes.json()]);
      if (pJson.success) setPendingCount((pJson.data || []).length);
      if (dJson.success) setDepositPendingCount((dJson.data || []).length);

      if (!todayResult.success) {
        setLoadError(todayResult.message);
        setTodayReservations([]);
        return;
      }
      const d = todayResult.data;
      setBusinessDate(d.businessDate ?? '');
      setCrossesMidnight(!!d.crossesMidnight);
      setClosedOnBusinessDay(!!d.closedOnBusinessDay);
      setTodayReservations((d.reservations || []) as unknown as Reservation[]);
    } catch (e) {
      console.error(e);
      setLoadError('예약 현황을 불러오지 못했습니다.');
    } finally {
      setLoading(false);
    }
  }, [store.id, store.token]);

  useEffect(() => {
    setTodayLabel(formatTodayLabel());
    void reload();
    const onFocus = () => void reload();
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, [reload]);

  const totalPending = pendingCount + depositPendingCount;
  const todayCount = todayReservations.length;
  const previewReservations = todayReservations.slice(0, 5);
  const moreCount = Math.max(0, todayCount - previewReservations.length);

  return (
    <div className="min-h-screen w-full max-w-full overflow-x-clip bg-gray-50">
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

      <main className="mx-auto max-w-md space-y-5 px-5 py-6">
        {/* 1. 오늘의 예약 현황 */}
        <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="block h-4 w-1 rounded-full bg-orange-500" />
              <h2 className="text-base font-bold text-gray-900">오늘의 예약 현황</h2>
            </div>
            <div className="text-right text-xs text-gray-400">
              <p>{todayLabel}</p>
              {businessDate ? (
                <p className="mt-0.5 text-gray-500">{formatBusinessDateShort(businessDate)} 영업 기준</p>
              ) : null}
            </div>
          </div>

          <div className="mb-4 flex items-baseline gap-1">
            <span className="text-4xl font-extrabold text-gray-900">{loading ? '—' : todayCount}</span>
            <span className="text-lg font-bold text-gray-600">건</span>
          </div>

          {loading ? (
            <p className="text-sm text-gray-400">불러오는 중…</p>
          ) : loadError ? (
            <p className="rounded-xl bg-red-50 px-4 py-6 text-center text-sm text-red-700">{loadError}</p>
          ) : closedOnBusinessDay ? (
            <p className="rounded-xl bg-amber-50 px-4 py-6 text-center text-sm text-amber-800">
              오늘은 휴무일입니다.
            </p>
          ) : todayCount === 0 ? (
            <p className="rounded-xl bg-gray-50 px-4 py-6 text-center text-sm text-gray-500">
              이번 영업일 확정 예약이 없습니다.
              <br />
              전화 예약은 캘린더에서 일정을 등록하세요.
            </p>
          ) : (
            <ul className="divide-y divide-gray-100 rounded-xl border border-gray-100">
              {previewReservations.map((r) => (
                <li key={r.reservationId} className="flex items-start justify-between gap-2 px-4 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-gray-900">
                      {formatReservationTimeLine(r, businessDate, crossesMidnight)}
                      {r.zoneName ? (
                        <span className="ml-2 rounded-full bg-purple-50 px-2 py-0.5 text-[10px] font-semibold text-purple-700">
                          {r.zoneName}
                        </span>
                      ) : null}
                    </p>
                    <p className="mt-0.5 truncate text-sm text-gray-700">
                      {r.userName}
                      {r.groupName ? (
                        <span className="font-normal text-gray-500"> / {r.groupName}</span>
                      ) : null}
                    </p>
                    <p className="mt-0.5 text-xs text-gray-500">{r.headcount}명</p>
                  </div>
                  <span
                    className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${todayStatusClass(r.status)}`}
                  >
                    {todayStatusLabel(r.status)}
                  </span>
                </li>
              ))}
            </ul>
          )}

          {!loading && moreCount > 0 ? (
            <p className="mt-2 text-center text-xs text-gray-500">외 {moreCount}건</p>
          ) : null}

          <Link
            href={
              businessDate
                ? `${base}/calendar?date=${encodeURIComponent(businessDate)}`
                : `${base}/calendar`
            }
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl border border-orange-200 bg-orange-50 py-3 text-sm font-semibold text-orange-700 transition hover:bg-orange-100"
          >
            캘린더에서 자세히 보기
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        </section>

        {/* 2. 오늘 예약 막기 */}
        <OwnerClosePanel token={store.token} storeId={store.id} />

        {/* 3. 대기 중인 예약 */}
        <Link
          href={`${base}/pending`}
          className="block rounded-2xl border border-gray-200 bg-white p-5 shadow-sm transition hover:border-blue-200 hover:shadow-md"
        >
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100">
                <svg className="h-6 w-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
              <span className="text-base font-bold text-gray-900">대기 중인 예약</span>
            </div>
            <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </div>
          <div className="mt-4">
            <span className="text-4xl font-extrabold text-gray-900">{loading ? '—' : totalPending}</span>
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

        {/* 4. 설정 · 기타 */}
        <section>
          <p className="mb-3 text-xs font-medium text-gray-500">설정 · 기타</p>
          <div className="grid grid-cols-1 gap-3">
            <Link
              href={`${base}/calendar`}
              className="flex items-center gap-4 rounded-xl border border-gray-100 bg-white p-4 transition hover:border-blue-200 hover:shadow-md"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-100">
                <svg className="h-6 w-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                  />
                </svg>
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold text-gray-900">캘린더로 보기</p>
                <p className="mt-0.5 text-xs text-gray-500">월별 일정 · 전화 예약 등록</p>
              </div>
              <svg className="h-5 w-5 shrink-0 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>

            <Link
              href={`${base}/closed-dates`}
              className="flex items-center gap-4 rounded-xl border border-gray-100 bg-white p-4 transition hover:border-emerald-200 hover:shadow-md"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-100">
                <svg className="h-6 w-6 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                  />
                </svg>
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold text-gray-900">지정 휴무일</p>
                <p className="mt-0.5 text-xs text-gray-500">휴무일 관리 및 설정</p>
              </div>
              <svg className="h-5 w-5 shrink-0 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>

            <Link
              href={`${base}/settings`}
              className="flex items-center gap-4 rounded-xl border border-gray-100 bg-white p-4 transition hover:border-blue-200 hover:shadow-md"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gray-100">
                <svg className="h-6 w-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold text-gray-900">가게 설정 변경</p>
                <p className="mt-0.5 text-xs text-gray-500">가게 정보 및 설정 관리</p>
              </div>
              <svg className="h-5 w-5 shrink-0 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
}
