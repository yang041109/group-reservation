'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useAdminStore } from '../AdminStoreContext';

interface Reservation {
  reservationId: string;
  userName: string;
  groupName: string;
  userPhone: string;
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
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [rejectTargetId, setRejectTargetId] = useState<string | null>(null);
  const [rejectReasonDraft, setRejectReasonDraft] = useState('');
  const [rejectAlternativeDraft, setRejectAlternativeDraft] = useState('');

  const reloadLists = useCallback(async () => {
    const [pRes, dRes] = await Promise.all([
      fetch(`/api/admin/reservations?storeId=${encodeURIComponent(store.id)}&status=PENDING`),
      fetch(`/api/admin/reservations?storeId=${encodeURIComponent(store.id)}&status=DEPOSIT_PENDING`),
    ]);
    const [pJson, dJson] = await Promise.all([pRes.json(), dRes.json()]);
    if (pJson.success) setPendingReservations((pJson.data || []) as Reservation[]);
    if (dJson.success) setDepositPendingReservations((dJson.data || []) as Reservation[]);
  }, [store.id]);

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
      <header className="sticky top-0 z-10 border-b border-gray-200 bg-white shadow-sm">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
          <div className="flex items-center gap-3">
            <Link href={base} className="rounded-lg p-1 text-gray-500 hover:bg-gray-100" aria-label="뒤로가기">
              <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </Link>
            <div>
              <h1 className="text-xl font-bold text-gray-900">🏪 {store.name}</h1>
              <p className="text-sm text-gray-500">대기 중인 예약 관리</p>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-8">
        <div className="mb-6">
          <h2 className="mb-2 text-2xl font-bold text-gray-900">대기 중인 예약</h2>
          <p className="text-gray-600">총 {pendingReservations.length}건의 예약이 대기 중입니다</p>
        </div>

        {depositPendingReservations.length > 0 && (
          <div className="mb-10">
            <h2 className="mb-2 text-xl font-bold text-gray-900">예약금 입금 대기</h2>
            <p className="mb-4 text-sm text-gray-600">
              입금 확인 시 예약이 완료되며, 날짜별 캘린더에 표시됩니다.
            </p>
            <div className="space-y-4">
              {depositPendingReservations.map((reservation) => (
                <div
                  key={reservation.reservationId}
                  className="rounded-lg border border-blue-200 bg-white p-6 shadow-sm"
                >
                  <div className="mb-4 flex items-start justify-between">
                    <div>
                      <div className="mb-2 flex items-center gap-2">
                        <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-800">
                          입금 대기
                        </span>
                        <span className="text-sm text-gray-500">{reservation.reservationId}</span>
                      </div>
                      <h3 className="text-lg font-bold text-gray-900">
                        {reservation.userName}
                        {reservation.groupName && (
                          <span className="ml-2 font-normal text-gray-500">({reservation.groupName})</span>
                        )}
                      </h3>
                    </div>
                    <div className="text-right text-sm text-gray-600">
                      {reservation.date} {reservation.startTime} ~ {reservation.endTime}
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={() => void handleConfirmDeposit(reservation.reservationId)}
                      disabled={actionLoading === reservation.reservationId}
                      className="flex-1 rounded-lg bg-emerald-600 py-3 font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-50"
                    >
                      {actionLoading === reservation.reservationId ? '처리 중...' : '입금 확인 (예약 완료)'}
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleAction(reservation.reservationId, 'cancel')}
                      disabled={actionLoading === reservation.reservationId}
                      className="flex-1 rounded-lg bg-gray-200 py-3 font-semibold text-gray-700 transition hover:bg-gray-300 disabled:opacity-50"
                    >
                      예약 취소
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {pendingReservations.length === 0 ? (
          <div className="rounded-lg border border-gray-200 bg-white p-12 text-center shadow-sm">
            <p className="text-gray-500">대기 중인 예약이 없습니다</p>
          </div>
        ) : (
          <div className="space-y-4">
            {pendingReservations.map((reservation) => (
              <div
                key={reservation.reservationId}
                className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm"
              >
                <div className="mb-4 flex items-start justify-between">
                  <div>
                    <div className="mb-2 flex items-center gap-2">
                      <span className="rounded-full bg-yellow-100 px-3 py-1 text-xs font-semibold text-yellow-800">
                        대기중
                      </span>
                      <span className="text-sm text-gray-500">{reservation.reservationId}</span>
                    </div>
                    <h3 className="text-lg font-bold text-gray-900">
                      {reservation.userName}
                      {reservation.groupName && (
                        <span className="ml-2 font-normal text-gray-500">({reservation.groupName})</span>
                      )}
                    </h3>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-gray-900">
                      {reservation.totalAmount.toLocaleString()}원
                    </div>
                    {reservation.depositAmount > 0 && (
                      <div className="text-sm font-medium text-red-600">
                        예약금 {reservation.depositAmount.toLocaleString()}원
                      </div>
                    )}
                  </div>
                </div>

                <div className="mb-4 grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-500">날짜/시간:</span>
                    <span className="ml-2 font-medium">
                      {reservation.date} {reservation.startTime} ~ {reservation.endTime}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-500">인원:</span>
                    <span className="ml-2 font-medium">{reservation.headcount}명</span>
                  </div>
                  <div>
                    <span className="text-gray-500">연락처:</span>
                    <span className="ml-2 font-medium">{reservation.userPhone}</span>
                  </div>
                </div>

                {reservation.menus.length > 0 && (
                  <div className="mb-4 rounded-lg bg-gray-50 p-3">
                    <div className="mb-2 text-sm font-medium text-gray-700">주문 메뉴</div>
                    <div className="space-y-1">
                      {reservation.menus.map((menu, idx) => (
                        <div key={idx} className="flex justify-between text-sm text-gray-600">
                          <span>
                            {menu.name} x {menu.quantity}
                          </span>
                          <span>{(menu.priceAtTime * menu.quantity).toLocaleString()}원</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => void handleAction(reservation.reservationId, 'accept')}
                    disabled={actionLoading === reservation.reservationId}
                    className="flex-1 rounded-lg bg-blue-600 py-3 font-semibold text-white transition hover:bg-blue-700 disabled:opacity-50"
                  >
                    {actionLoading === reservation.reservationId
                      ? '처리 중...'
                      : reservation.depositAmount > 0
                        ? '수락 (예약금 입금 요청)'
                        : '수락 (즉시 확정)'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setRejectTargetId(reservation.reservationId);
                      setRejectReasonDraft('');
                      setRejectAlternativeDraft('');
                    }}
                    disabled={actionLoading === reservation.reservationId}
                    className="flex-1 rounded-lg bg-gray-200 py-3 font-semibold text-gray-700 transition hover:bg-gray-300 disabled:opacity-50"
                  >
                    거절
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
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
