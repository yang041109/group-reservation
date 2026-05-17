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
  '?ˆì•½ ?ˆìŒ',
  '?¬ë£Œ ?Œì§„',
  '?´ë‹¹ ?¼ì‹œ ?˜ìš©???´ë µ?µë‹ˆ??,
  '?ì—… ?¼ì •??ë³€ê²½ë˜?ˆìŠµ?ˆë‹¤',
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
    if (!confirm('?ˆì•½ê¸??…ê¸ˆ???•ì¸?ˆìŠµ?ˆê¹Œ? ?•ì¸ ?„ì—??ìº˜ë¦°?”Â·ì”???¸ì›??ë°˜ì˜?©ë‹ˆ??')) return;
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
        alert(data.message || 'ì²˜ë¦¬ ?¤íŒ¨');
      }
    } catch {
      alert('?œë²„ ?¤ë¥˜ê°€ ë°œìƒ?ˆìŠµ?ˆë‹¤.');
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
        alert(data.message || 'ì²˜ë¦¬ ?¤íŒ¨');
      }
    } catch {
      alert('?œë²„ ?¤ë¥˜ê°€ ë°œìƒ?ˆìŠµ?ˆë‹¤.');
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
      alert('ê±°ì ˆ ?¬ìœ ë¥??…ë ¥?˜ê±°???„ë˜?ì„œ ? íƒ??ì£¼ì„¸??');
      return;
    }
    if (trimmed.length > REJECT_REASON_MAX) {
      alert(`ê±°ì ˆ ?¬ìœ ??${REJECT_REASON_MAX}???´ë‚´ë¡??…ë ¥??ì£¼ì„¸??`);
      return;
    }
    if (altTrimmed.length > REJECT_REASON_MAX) {
      alert(`?€???ˆë‚´??${REJECT_REASON_MAX}???´ë‚´ë¡??…ë ¥??ì£¼ì„¸??`);
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
        alert(data.message || 'ì²˜ë¦¬ ?¤íŒ¨');
      }
    } catch {
      alert('?œë²„ ?¤ë¥˜ê°€ ë°œìƒ?ˆìŠµ?ˆë‹¤.');
    } finally {
      setActionLoading(null);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <p className="text-gray-600">ë¡œë”© ì¤?..</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ?¤ë” (?Œë??? */}
      <header className="sticky top-0 z-10 bg-blue-600 text-white shadow-md">
        <div className="mx-auto flex max-w-md items-center gap-3 px-4 py-4">
          <Link href={base} className="rounded-lg p-1 text-white hover:bg-white/10" aria-label="?¤ë¡œê°€ê¸?>
            <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
          <div>
            <h1 className="text-base font-bold leading-tight">{store.name}</h1>
            <p className="text-xs leading-tight text-blue-100">?€ê¸?ì¤‘ì¸ ?ˆì•½ ê´€ë¦?/p>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-md px-4 py-6">
        <div className="mb-6">
          <h2 className="mb-1 text-2xl font-bold text-gray-900">?€ê¸?ì¤‘ì¸ ?ˆì•½</h2>
          <p className="text-sm text-gray-600">
            ì´?' '}
            <span className="font-semibold text-blue-600">
              {pendingReservations.length + depositPendingReservations.length}
            </span>
            ê±´ì˜ ?ˆì•½???€ê¸?ì¤‘ì…?ˆë‹¤
          </p>
        </div>

        {depositPendingReservations.length > 0 && (
          <div className="mb-8">
            <h3 className="mb-1 text-base font-bold text-blue-700">?ˆì•½ê¸??…ê¸ˆ ?€ê¸?/h3>
            <p className="mb-3 text-xs text-gray-600">
              ?…ê¸ˆ ?•ì¸ ???ˆì•½???„ë£Œ?˜ë©°, ìº˜ë¦°?”ì— ?œì‹œ?©ë‹ˆ??
            </p>
            <div className="space-y-3">
              {depositPendingReservations.map((reservation) => {
                const dateObj = new Date(reservation.date);
                const days = ['??, '??, '??, '??, 'ëª?, 'ê¸?, '??];
                const dateLabel = `${reservation.date.replace(/-/g, '.')} (${days[dateObj.getDay()] ?? ''})`;
                const isLoading = actionLoading === reservation.reservationId;
                return (
                  <div
                    key={reservation.reservationId}
                    className="rounded-2xl border border-blue-200 bg-white p-4 shadow-sm"
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex h-20 w-20 shrink-0 flex-col items-center justify-center rounded-xl bg-blue-50 text-center text-xs font-semibold text-blue-700">
                        <span className="leading-tight">?…ê¸ˆ</span>
                        <span className="leading-tight">?€ê¸?/span>
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
                          ?ˆì•½ë²ˆí˜¸ {reservation.reservationId}
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
                        ?‘¥ {reservation.headcount}ëª?Â· ?“ {reservation.userPhone}
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
                          'ì²˜ë¦¬ ì¤?..'
                        ) : (
                          <>
                            ?…ê¸ˆ ?•ì¸
                            <span className="block text-[11px] font-medium opacity-90">
                              (?ˆì•½ ?„ë£Œ)
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
                        ?ˆì•½ ì·¨ì†Œ
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
            <p className="text-gray-500">?€ê¸?ì¤‘ì¸ ?ˆì•½???†ìŠµ?ˆë‹¤</p>
          </div>
        ) : pendingReservations.length === 0 ? null : (
          <div className="mb-8">
            <h3 className="mb-3 text-base font-bold text-yellow-700">? ê·œ ?ˆì•½ ?€ê¸?/h3>
            <div className="space-y-3">
              {pendingReservations.map((reservation) => {
                const dateObj = new Date(reservation.date);
                const days = ['??, '??, '??, '??, 'ëª?, 'ê¸?, '??];
                const dateLabel = `${reservation.date.replace(/-/g, '.')} (${days[dateObj.getDay()] ?? ''})`;
                const isLoading = actionLoading === reservation.reservationId;
                return (
                  <div
                    key={reservation.reservationId}
                    className="rounded-2xl border border-yellow-200 bg-white p-4 shadow-sm"
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex h-20 w-20 shrink-0 flex-col items-center justify-center rounded-xl bg-yellow-50 text-center text-xs font-semibold text-yellow-700">
                        <span className="leading-tight">?ˆì•½</span>
                        <span className="leading-tight">?€ê¸?/span>
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
                          ?ˆì•½ë²ˆí˜¸ {reservation.reservationId}
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
                        ?‘¥ {reservation.headcount}ëª?Â· ?“ {reservation.userPhone}
                      </p>
                      <div className="mt-2 flex items-baseline justify-between">
                        <span className="text-xs text-gray-500">ì´?ê²°ì œ ê¸ˆì•¡</span>
                        <span className="text-base font-bold text-gray-900">
                          {reservation.totalAmount.toLocaleString()}??
                        </span>
                      </div>
                      {reservation.depositAmount > 0 && (
                        <div className="mt-1 flex items-baseline justify-between">
                          <span className="text-xs text-gray-500">?ˆì•½ê¸?/span>
                          <span className="text-sm font-bold text-red-600">
                            {reservation.depositAmount.toLocaleString()}??
                          </span>
                        </div>
                      )}
                    </div>

                    {reservation.menus.length > 0 && (
                      <div className="mt-3 rounded-xl bg-gray-50 p-3">
                        <div className="mb-1.5 text-xs font-semibold text-gray-700">
                          ì£¼ë¬¸ ë©”ë‰´
                        </div>
                        <div className="space-y-1">
                          {reservation.menus.map((menu, idx) => (
                            <div
                              key={idx}
                              className="flex justify-between text-xs text-gray-600"
                            >
                              <span>
                                {menu.name} Ã— {menu.quantity}
                              </span>
                              <span>
                                {(menu.priceAtTime * menu.quantity).toLocaleString()}??
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
                          'ì²˜ë¦¬ ì¤?..'
                        ) : reservation.depositAmount > 0 ? (
                          <>
                            ?˜ë½
                            <span className="block text-[11px] font-medium opacity-90">
                              (?…ê¸ˆ ?”ì²­)
                            </span>
                          </>
                        ) : (
                          <>
                            ?˜ë½
                            <span className="block text-[11px] font-medium opacity-90">
                              (ì¦‰ì‹œ ?•ì •)
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
                        ê±°ì ˆ
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ìº˜ë¦°??ë³´ê¸° ??ë²„íŠ¼ */}
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
            <span className="text-lg font-bold">ìº˜ë¦°??ë³´ê¸°</span>
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
            aria-label="?«ê¸°"
            onClick={() => {
              if (actionLoading !== rejectTargetId) closeRejectModal();
            }}
          />
          <div className="relative z-10 max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl bg-white p-5 shadow-xl">
            <h2 id="reject-dialog-title" className="text-lg font-bold text-gray-900">
              ?ˆì•½ ê±°ì ˆ
            </h2>
            <p className="mt-1 text-sm text-gray-600">
              ?…ë ¥?˜ì‹  ?¬ìœ ???ˆì•½?˜ì‹  ë¶„ì˜ &quot;???ˆì•½ ì¡°íšŒ&quot; ?”ë©´???œì‹œ?©ë‹ˆ??
            </p>

            <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-gray-500">?ì£¼ ?°ëŠ” ?¬ìœ </p>
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
              ê±°ì ˆ ?¬ìœ  (ì§ì ‘ ?‘ì„± ê°€??
            </label>
            <textarea
              id="reject-reason"
              rows={3}
              maxLength={REJECT_REASON_MAX}
              value={rejectReasonDraft}
              onChange={(e) => setRejectReasonDraft(e.target.value)}
              disabled={actionLoading === rejectTargetId}
              placeholder="?¬ìœ ë¥?? íƒ?˜ê±°??ì§ì ‘ ?…ë ¥??ì£¼ì„¸??"
              className="mt-1 w-full resize-none rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-gray-100"
            />
            <p className="mt-1 text-right text-xs text-gray-400">
              {rejectReasonDraft.length} / {REJECT_REASON_MAX}
            </p>

            <label htmlFor="reject-alternative" className="mt-4 block text-sm font-medium text-gray-700">
              ?€???ˆë‚´ (? íƒ)
            </label>
            <p className="mt-0.5 text-xs text-gray-500">
              ?? &quot;?´ë‹¹ ?œê°„?€ ë§ˆê°?˜ì—ˆ?¼ë‚˜, 21???´í›„ë¡œëŠ” ?ˆì•½ ê°€?¥í•©?ˆë‹¤.&quot;
            </p>
            <textarea
              id="reject-alternative"
              rows={3}
              maxLength={REJECT_REASON_MAX}
              value={rejectAlternativeDraft}
              onChange={(e) => setRejectAlternativeDraft(e.target.value)}
              disabled={actionLoading === rejectTargetId}
              placeholder="ê³ ê°?ê²Œ ?„ë‹¬???€?ˆì´ ?ˆë‹¤ë©??…ë ¥??ì£¼ì„¸??"
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
                ì·¨ì†Œ
              </button>
              <button
                type="button"
                onClick={() => void submitReject()}
                disabled={actionLoading === rejectTargetId}
                className="flex-1 rounded-lg bg-gray-900 py-3 text-sm font-semibold text-white transition hover:bg-gray-800 disabled:opacity-50"
              >
                {actionLoading === rejectTargetId ? 'ì²˜ë¦¬ ì¤?..' : '?„ë£Œ'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

