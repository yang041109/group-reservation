'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useAdminStore } from '../AdminStoreContext';

interface Reservation {
  reservationId: string;
  userName: string;
  groupName: string;
  userPhone: string;
  zoneId?: string;
  zoneName?: string;
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

interface ZoneSummary {
  zoneId: string;
  name: string;
  maxCapacity: number;
}

const REJECT_REASON_PRESETS = [
  '예약 있음',
  '재료 소진',
  '해당 일시 수용이 어렵습니다',
  '영업 일정이 변경되었습니다',
] as const;

const REJECT_REASON_MAX = 500;

export default function AdminPendingByToken() {
  const store = useAdminStore();
  const base = `/admin/m/${encodeURIComponent(store.token)}`;

  const [pendingReservations, setPendingReservations] = useState<Reservation[]>([]);
  const [depositPendingReservations, setDepositPendingReservations] = useState<Reservation[]>([]);
  const [zones, setZones] = useState<ZoneSummary[]>([]);
  const [zoneFilter, setZoneFilter] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [rejectTargetId, setRejectTargetId] = useState<string | null>(null);
  const [rejectReasonDraft, setRejectReasonDraft] = useState('');
  const [rejectAlternativeDraft, setRejectAlternativeDraft] = useState('');

  const reloadLists = useCallback(async () => {
    const zoneQp = zoneFilter ? `&zoneId=${encodeURIComponent(zoneFilter)}` : '';
    const [pRes, dRes] = await Promise.all([
      fetch(
        `/api/admin/reservations?storeId=${encodeURIComponent(store.id)}&status=PENDING${zoneQp}`,
      ),
      fetch(
        `/api/admin/reservations?storeId=${encodeURIComponent(store.id)}&status=DEPOSIT_PENDING${zoneQp}`,
      ),
    ]);
    const [pJson, dJson] = await Promise.all([pRes.json(), dRes.json()]);
    if (pJson.success) setPendingReservations((pJson.data || []) as Reservation[]);
    if (dJson.success) setDepositPendingReservations((dJson.data || []) as Reservation[]);
  }, [store.id, zoneFilter]);

  // 가게 zone 목록 (필터 드롭다운용). zone 0개 가게에선 비어 있어 필터 UI가 숨겨진다.
  useEffect(() => {
    void (async () => {
      try {
        const res = await fetch(
          `/api/admin/store/zones?token=${encodeURIComponent(store.token)}`,
        );
        const data = await res.json();
        if (data.success) setZones((data.data || []) as ZoneSummary[]);
      } catch {
        // ignore
      }
    })();
  }, [store.token]);

  useEffect(() => {
    if (!rejectTargetId) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && actionLoading !== rejectTargetId) {
        setRejectTargetId(null);
        setRejectReasonDraft('');
        setRejectAlternativeDraft('');
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [rejectTargetId, actionLoading]);

  useEffect(() => {
    void (async () => {
      try {
        await reloadLists();
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    })();
  }, [reloadLists]);

  const handleConfirmDeposit = async (reservationId: string) => {
    if (!confirm('예약금 입금을 확인했습니까? 확인 후에는 캘린더·잔여 인원에 반영됩니다.')) return;
    setActionLoading(reservationId);
    try {
      const res = await fetch(`/api/admin/reservations/${reservationId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'confirmDeposit' }),
      });
      const data = await res.json();
      if (data.success) {
        await reloadLists();
      } else {
        alert(data.message || '처리 실패');
      }
    } catch {
      alert('서버 오류가 발생했습니다.');
    } finally {
      setActionLoading(null);
    }
  };

  const handleAction = async (reservationId: string, action: 'accept' | 'cancel') => {
    setActionLoading(reservationId);
    try {
      const res = await fetch(`/api/admin/reservations/${reservationId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });
      const data = await res.json();
      if (data.success) {
        await reloadLists();
      } else {
        alert(data.message || '처리 실패');
      }
    } catch {
      alert('서버 오류가 발생했습니다.');
    } finally {
      setActionLoading(null);
    }
  };

  const closeRejectModal = () => {
    setRejectTargetId(null);
    setRejectReasonDraft('');
    setRejectAlternativeDraft('');
  };

  const submitReject = async () => {
    if (!rejectTargetId) return;
    const trimmed = rejectReasonDraft.trim();
    const altTrimmed = rejectAlternativeDraft.trim();
    if (!trimmed) {
      alert('거절 사유를 입력하거나 아래에서 선택해 주세요.');
      return;
    }
    if (trimmed.length > REJECT_REASON_MAX) {
      alert(`거절 사유는 ${REJECT_REASON_MAX}자 이내로 입력해 주세요.`);
      return;
    }
    if (altTrimmed.length > REJECT_REASON_MAX) {
      alert(`대안 안내는 ${REJECT_REASON_MAX}자 이내로 입력해 주세요.`);
      return;
    }
    setActionLoading(rejectTargetId);
    try {
      const res = await fetch(`/api/admin/reservations/${rejectTargetId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'reject',
          reason: trimmed,
          alternative: altTrimmed || undefined,
        }),
      });
      const data = await res.json();
      if (data.success) {
        closeRejectModal();
        await reloadLists();
      } else {
        alert(data.message || '처리 실패');
      }
    } catch {
      alert('서버 오류가 발생했습니다.');
    } finally {
      setActionLoading(null);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <p className="text-gray-600">로딩 중...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 헤더 (파란색) */}
      <header className="sticky top-0 z-10 bg-blue-600 text-white shadow-md">
        <div className="mx-auto flex max-w-md items-center gap-3 px-4 py-4">
          <Link href={base} className="rounded-lg p-1 text-white hover:bg-white/10" aria-label="뒤로가기">
            <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
          <div>
            <h1 className="text-base font-bold leading-tight">{store.name}</h1>
            <p className="text-xs leading-tight text-blue-100">대기 중인 예약 관리</p>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-md px-4 py-6">
        <div className="mb-6">
          <h2 className="mb-1 text-2xl font-bold text-gray-900">대기 중인 예약</h2>
          <p className="text-sm text-gray-600">
            총{' '}
            <span className="font-semibold text-blue-600">
              {pendingReservations.length + depositPendingReservations.length}
            </span>
            건의 예약이 대기 중입니다
          </p>
          {zones.length > 0 ? (
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setZoneFilter('')}
                className={`rounded-full px-3 py-1 text-xs font-medium ${
                  zoneFilter === ''
                    ? 'bg-blue-600 text-white'
                    : 'border border-gray-300 bg-white text-gray-700'
                }`}
              >
                전체 동
              </button>
              {zones.map((z) => (
                <button
                  key={z.zoneId}
                  type="button"
                  onClick={() => setZoneFilter(z.zoneId)}
                  className={`rounded-full px-3 py-1 text-xs font-medium ${
                    zoneFilter === z.zoneId
                      ? 'bg-blue-600 text-white'
                      : 'border border-gray-300 bg-white text-gray-700'
                  }`}
                >
                  {z.name}
                </button>
              ))}
            </div>
          ) : null}
        </div>

        {depositPendingReservations.length > 0 && (
          <div className="mb-8">
            <h3 className="mb-1 text-base font-bold text-blue-700">예약금 입금 대기</h3>
            <p className="mb-3 text-xs text-gray-600">
              입금 확인 시 예약이 완료되며, 캘린더에 표시됩니다.
            </p>
            <div className="space-y-3">
              {depositPendingReservations.map((reservation) => {
                const dateObj = new Date(reservation.date);
                const days = ['일', '월', '화', '수', '목', '금', '토'];
                const dateLabel = `${reservation.date.replace(/-/g, '.')} (${days[dateObj.getDay()] ?? ''})`;
                const isLoading = actionLoading === reservation.reservationId;
                return (
                  <div
                    key={reservation.reservationId}
                    className="rounded-2xl border border-blue-200 bg-white p-4 shadow-sm"
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex h-20 w-20 shrink-0 flex-col items-center justify-center rounded-xl bg-blue-50 text-center text-xs font-semibold text-blue-700">
                        <span className="leading-tight">입금</span>
                        <span className="leading-tight">대기</span>
                        <svg
                          className="mt-1 h-5 w-5"
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
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 text-blue-700">
                          <svg
                            className="h-4 w-4"
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
                          <span className="text-sm font-semibold">{dateLabel}</span>
                        </div>
                        <p className="text-lg font-bold text-blue-700">
                          {reservation.startTime} ~ {reservation.endTime}
                        </p>
                        <p className="mt-1 text-[11px] text-gray-500">
                          예약번호 {reservation.reservationId}
                        </p>
                      </div>
                    </div>

                    <div className="mt-3 border-t border-gray-100 pt-3">
                      <p className="text-base font-bold text-gray-900">
                        {reservation.userName}
                        {reservation.groupName ? (
                          <span className="text-sm font-normal text-gray-500"> / {reservation.groupName}</span>
                        ) : null}
                        {reservation.zoneName ? (
                          <span className="ml-2 rounded-full bg-purple-50 px-2 py-0.5 text-[10px] font-semibold text-purple-700">
                            {reservation.zoneName}
                          </span>
                        ) : null}
                      </p>
                      <p className="mt-0.5 text-xs text-gray-500">
                        👥 {reservation.headcount}명 · 📞 {reservation.userPhone}
                      </p>
                    </div>

                    <div className="mt-3 grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => void handleConfirmDeposit(reservation.reservationId)}
                        disabled={isLoading}
                        className="rounded-xl bg-blue-600 py-3 text-sm font-bold leading-tight text-white shadow-sm transition hover:bg-blue-700 disabled:opacity-50"
                      >
                        {isLoading ? (
                          '처리 중...'
                        ) : (
                          <>
                            입금 확인
                            <span className="block text-[11px] font-medium opacity-90">
                              (예약 완료)
                            </span>
                          </>
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={() => void handleAction(reservation.reservationId, 'cancel')}
                        disabled={isLoading}
                        className="rounded-xl bg-gray-200 py-3 text-sm font-bold text-gray-700 transition hover:bg-gray-300 disabled:opacity-50"
                      >
                        예약 취소
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {pendingReservations.length === 0 && depositPendingReservations.length === 0 ? (
          <div className="rounded-2xl border border-gray-200 bg-white p-12 text-center shadow-sm">
            <p className="text-gray-500">대기 중인 예약이 없습니다</p>
          </div>
        ) : pendingReservations.length === 0 ? null : (
          <div className="mb-8">
            <h3 className="mb-3 text-base font-bold text-yellow-700">신규 예약 대기</h3>
            <div className="space-y-3">
              {pendingReservations.map((reservation) => {
                const dateObj = new Date(reservation.date);
                const days = ['일', '월', '화', '수', '목', '금', '토'];
                const dateLabel = `${reservation.date.replace(/-/g, '.')} (${days[dateObj.getDay()] ?? ''})`;
                const isLoading = actionLoading === reservation.reservationId;
                return (
                  <div
                    key={reservation.reservationId}
                    className="rounded-2xl border border-yellow-200 bg-white p-4 shadow-sm"
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex h-20 w-20 shrink-0 flex-col items-center justify-center rounded-xl bg-yellow-50 text-center text-xs font-semibold text-yellow-700">
                        <span className="leading-tight">예약</span>
                        <span className="leading-tight">대기</span>
                        <svg
                          className="mt-1 h-5 w-5"
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
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 text-yellow-700">
                          <svg
                            className="h-4 w-4"
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
                          <span className="text-sm font-semibold">{dateLabel}</span>
                        </div>
                        <p className="text-lg font-bold text-yellow-700">
                          {reservation.startTime} ~ {reservation.endTime}
                        </p>
                        <p className="mt-1 text-[11px] text-gray-500">
                          예약번호 {reservation.reservationId}
                        </p>
                      </div>
                    </div>

                    <div className="mt-3 border-t border-gray-100 pt-3">
                      <p className="text-base font-bold text-gray-900">
                        {reservation.userName}
                        {reservation.groupName ? (
                          <span className="text-sm font-normal text-gray-500"> / {reservation.groupName}</span>
                        ) : null}
                      </p>
                      <p className="mt-0.5 text-xs text-gray-500">
                        👥 {reservation.headcount}명 · 📞 {reservation.userPhone}
                      </p>
                      <div className="mt-2 flex items-baseline justify-between">
                        <span className="text-xs text-gray-500">총 결제 금액</span>
                        <span className="text-base font-bold text-gray-900">
                          {reservation.totalAmount.toLocaleString()}원
                        </span>
                      </div>
                      {reservation.depositAmount > 0 && (
                        <div className="mt-1 flex items-baseline justify-between">
                          <span className="text-xs text-gray-500">예약금</span>
                          <span className="text-sm font-bold text-red-600">
                            {reservation.depositAmount.toLocaleString()}원
                          </span>
                        </div>
                      )}
                    </div>

                    {reservation.menus.length > 0 && (
                      <div className="mt-3 rounded-xl bg-gray-50 p-3">
                        <div className="mb-1.5 text-xs font-semibold text-gray-700">
                          주문 메뉴
                        </div>
                        <div className="space-y-1">
                          {reservation.menus.map((menu, idx) => (
                            <div
                              key={idx}
                              className="flex justify-between text-xs text-gray-600"
                            >
                              <span>
                                {menu.name} × {menu.quantity}
                              </span>
                              <span>
                                {(menu.priceAtTime * menu.quantity).toLocaleString()}원
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="mt-3 grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => void handleAction(reservation.reservationId, 'accept')}
                        disabled={isLoading}
                        className="rounded-xl bg-blue-600 py-3 text-sm font-bold leading-tight text-white shadow-sm transition hover:bg-blue-700 disabled:opacity-50"
                      >
                        {isLoading ? (
                          '처리 중...'
                        ) : reservation.depositAmount > 0 ? (
                          <>
                            수락
                            <span className="block text-[11px] font-medium opacity-90">
                              (입금 요청)
                            </span>
                          </>
                        ) : (
                          <>
                            수락
                            <span className="block text-[11px] font-medium opacity-90">
                              (즉시 확정)
                            </span>
                          </>
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setRejectTargetId(reservation.reservationId);
                          setRejectReasonDraft('');
                          setRejectAlternativeDraft('');
                        }}
                        disabled={isLoading}
                        className="rounded-xl bg-gray-200 py-3 text-sm font-bold text-gray-700 transition hover:bg-gray-300 disabled:opacity-50"
                      >
                        거절
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* 캘린더 보기 큰 버튼 */}
        <Link
          href={`${base}/calendar`}
          className="mt-2 flex w-full items-center justify-between rounded-2xl bg-blue-600 px-6 py-5 text-white shadow-lg transition hover:bg-blue-700"
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

      {rejectTargetId && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/45 p-4 sm:items-center"
          role="dialog"
          aria-modal="true"
          aria-labelledby="reject-dialog-title"
        >
          <button
            type="button"
            className="absolute inset-0 cursor-default"
            aria-label="닫기"
            onClick={() => {
              if (actionLoading !== rejectTargetId) closeRejectModal();
            }}
          />
          <div className="relative z-10 max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl bg-white p-5 shadow-xl">
            <h2 id="reject-dialog-title" className="text-lg font-bold text-gray-900">
              예약 거절
            </h2>
            <p className="mt-1 text-sm text-gray-600">
              입력하신 사유는 예약하신 분의 &quot;내 예약 조회&quot; 화면에 표시됩니다.
            </p>

            <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-gray-500">자주 쓰는 사유</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {REJECT_REASON_PRESETS.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setRejectReasonDraft(preset.slice(0, REJECT_REASON_MAX))}
                  disabled={actionLoading === rejectTargetId}
                  className="rounded-full border border-gray-200 bg-gray-50 px-3 py-1.5 text-sm text-gray-800 transition hover:border-blue-300 hover:bg-blue-50 disabled:opacity-50"
                >
                  {preset}
                </button>
              ))}
            </div>

            <label htmlFor="reject-reason" className="mt-4 block text-sm font-medium text-gray-700">
              거절 사유 (직접 작성 가능)
            </label>
            <textarea
              id="reject-reason"
              rows={3}
              maxLength={REJECT_REASON_MAX}
              value={rejectReasonDraft}
              onChange={(e) => setRejectReasonDraft(e.target.value)}
              disabled={actionLoading === rejectTargetId}
              placeholder="사유를 선택하거나 직접 입력해 주세요."
              className="mt-1 w-full resize-none rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-gray-100"
            />
            <p className="mt-1 text-right text-xs text-gray-400">
              {rejectReasonDraft.length} / {REJECT_REASON_MAX}
            </p>

            <label htmlFor="reject-alternative" className="mt-4 block text-sm font-medium text-gray-700">
              대안 안내 (선택)
            </label>
            <p className="mt-0.5 text-xs text-gray-500">
              예: &quot;해당 시간은 마감되었으나, 21시 이후로는 예약 가능합니다.&quot;
            </p>
            <textarea
              id="reject-alternative"
              rows={3}
              maxLength={REJECT_REASON_MAX}
              value={rejectAlternativeDraft}
              onChange={(e) => setRejectAlternativeDraft(e.target.value)}
              disabled={actionLoading === rejectTargetId}
              placeholder="고객에게 전달할 대안이 있다면 입력해 주세요."
              className="mt-1 w-full resize-none rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-gray-100"
            />
            <p className="mt-1 text-right text-xs text-gray-400">
              {rejectAlternativeDraft.length} / {REJECT_REASON_MAX}
            </p>

            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={closeRejectModal}
                disabled={actionLoading === rejectTargetId}
                className="flex-1 rounded-lg border border-gray-300 py-3 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 disabled:opacity-50"
              >
                취소
              </button>
              <button
                type="button"
                onClick={() => void submitReject()}
                disabled={actionLoading === rejectTargetId}
                className="flex-1 rounded-lg bg-gray-900 py-3 text-sm font-semibold text-white transition hover:bg-gray-800 disabled:opacity-50"
              >
                {actionLoading === rejectTargetId ? '처리 중...' : '완료'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
