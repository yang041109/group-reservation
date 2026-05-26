'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import UrrLoading from '@/components/UrrLoading';
import { formatReservationCreatedAt } from '@/lib/korea-time';
import { formatReservationStatus } from '@/lib/reservation-status-labels';

interface ReservationItem {
  id: string;
  reservationId: string;
  storeId: string;
  storeName: string;
  slotId: string;
  timeBlock: string;
  date: string;
  headcount: number;
  totalAmount: number;
  status: string;
  createdAt: string;
  depositAmount?: number;
  ownerRejectReason?: string;
  ownerEditNotice?: string;
  menus: { menuId: string; name: string; quantity: number; priceAtTime: number }[];
}

const STATUS_STYLE: Record<string, { color: string; emoji: string }> = {
  PENDING: { color: 'bg-yellow-100 text-yellow-700', emoji: '⏳' },
  CONFIRMED: { color: 'bg-green-100 text-green-700', emoji: '✅' },
  DEPOSIT_PENDING: { color: 'bg-blue-100 text-blue-700', emoji: '💳' },
  DEPOSIT_CONFIRMED: { color: 'bg-green-100 text-green-700', emoji: '✅' },
  CHECKED_IN: { color: 'bg-purple-100 text-purple-700', emoji: '🎉' },
  NO_SHOW: { color: 'bg-red-100 text-red-700', emoji: '🚫' },
  CANCELED: { color: 'bg-red-100 text-red-700', emoji: '❌' },
};

export function MyReservationsPanel({ onClose }: { onClose?: () => void }) {
  const [reservations, setReservations] = useState<ReservationItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [phoneLast4, setPhoneLast4] = useState('');

  async function fetchReservations(searchName: string, searchPhone4: string) {
    setLoading(true);
    setSearched(true);
    try {
      const res = await fetch(
        `/api/reservations/check?userName=${encodeURIComponent(searchName)}&phoneLast4=${encodeURIComponent(searchPhone4)}`,
      );
      if (res.ok) {
        const data = await res.json();
        setReservations(data.reservations ?? []);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }

  function handleSearch() {
    if (!name.trim() || phoneLast4.replace(/\D/g, '').length !== 4) return;
    void fetchReservations(name.trim(), phoneLast4.replace(/\D/g, ''));
  }

  async function handleCancel(id: string) {
    if (!confirm('예약을 취소하시겠습니까?')) return;
    setCancellingId(id);
    try {
      const res = await fetch(`/api/reservations/${id}/cancel`, { method: 'PATCH' });
      if (res.ok) {
        setReservations((prev) =>
          prev.map((r) =>
            r.id === id || r.reservationId === id ? { ...r, status: 'CANCELED' } : r,
          ),
        );
      } else {
        const data = await res.json();
        alert(data.error || '취소 처리 중 오류가 발생했습니다.');
      }
    } catch {
      alert('네트워크 오류가 발생했습니다.');
    } finally {
      setCancellingId(null);
    }
  }

  const phoneValid = name.trim().length > 0 && phoneLast4.replace(/\D/g, '').length === 4;
  const today = new Date().toISOString().slice(0, 10);
  const activeStatuses = new Set(['CONFIRMED', 'DEPOSIT_PENDING', 'DEPOSIT_CONFIRMED', 'PENDING']);

  const renderCard = (r: ReservationItem, isToday = false) => {
    const rid = r.reservationId || r.id;
    const ownerReject =
      r.status === 'CANCELED' && r.ownerRejectReason && r.ownerRejectReason.trim().length > 0;
    const baseStyle = STATUS_STYLE[r.status] ?? { color: 'bg-gray-100 text-gray-700', emoji: '📋' };
    const style = ownerReject
      ? { color: 'bg-amber-100 text-amber-900', emoji: '🚫' }
      : baseStyle;
    const label = ownerReject ? '예약 거절' : formatReservationStatus(r.status);
    const cancellable =
      (r.status === 'CONFIRMED' || r.status === 'DEPOSIT_PENDING') && (r.date || '') >= today;
    const isCancelling = cancellingId === rid;
    const cardBorder = isToday
      ? 'border-2 border-yellow-400 bg-yellow-50'
      : 'border border-gray-200 bg-white';

    return (
      <div key={rid} className={`rounded-xl p-4 shadow-sm ${cardBorder}`}>
        {isToday ? (
          <div className="mb-2 inline-block rounded-full bg-yellow-400 px-3 py-0.5 text-xs font-bold text-yellow-900">
            오늘 예약
          </div>
        ) : null}
        <div className="mb-2 flex items-center justify-between">
          <h3 className="text-base font-bold text-gray-900">{r.storeName || r.storeId}</h3>
          <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${style.color}`}>
            {style.emoji} {label}
          </span>
        </div>
        <div className="space-y-1 text-sm text-gray-600">
          {r.date ? <p>날짜: {r.date}</p> : null}
          <p>인원: {r.headcount}명</p>
          <p>시간: {r.timeBlock}</p>
          {r.createdAt ? (
            <p>접수일시: {formatReservationCreatedAt(r.createdAt)}</p>
          ) : null}
          <p>금액: {(r.totalAmount || 0).toLocaleString()}원</p>
        </div>
        {ownerReject
          ? (() => {
              const fullText = (r.ownerRejectReason ?? '').trim();
              const altMarker = '\n\n[대안 안내]\n';
              const idx = fullText.indexOf(altMarker);
              const reasonOnly = idx >= 0 ? fullText.slice(0, idx) : fullText;
              const alternative = idx >= 0 ? fullText.slice(idx + altMarker.length) : '';
              return (
                <div className="mt-3 space-y-2">
                  <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
                    <p className="font-semibold">가게에서 예약을 거절했습니다</p>
                    <p className="mt-1 whitespace-pre-line text-amber-800">{reasonOnly}</p>
                  </div>
                  {alternative ? (
                    <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm text-blue-900">
                      <p className="font-semibold">💡 가게에서 안내드린 대안</p>
                      <p className="mt-1 whitespace-pre-line text-blue-800">{alternative}</p>
                    </div>
                  ) : null}
                </div>
              );
            })()
          : null}
        {!ownerReject && r.ownerEditNotice ? (
          <div className="mt-3 rounded-lg border-2 border-orange-300 bg-orange-50 p-3 text-sm text-orange-900">
            <p className="font-semibold">⚠️ 예약이 변경되었어요! 확인해 주세요</p>
            <p className="mt-1 whitespace-pre-line text-orange-800">{r.ownerEditNotice}</p>
          </div>
        ) : null}
        {r.menus?.length > 0 ? (
          <div className="mt-2 border-t border-gray-100 pt-2 text-sm text-gray-600">
            {r.menus.map((m, i) => (
              <span key={i}>
                {m.name} ×{m.quantity}
                {i < r.menus.length - 1 ? ', ' : ''}
              </span>
            ))}
          </div>
        ) : null}
        {r.status === 'CHECKED_IN' ? (
          <div className="mt-3 rounded-lg border border-purple-200 bg-purple-50 p-3 text-sm text-purple-900">
            <p className="font-semibold">🎉 방문 확인이 완료되었어요</p>
            <p className="mt-1 text-purple-800">우르르를 이용해 주셔서 감사합니다!</p>
          </div>
        ) : null}
        {r.status === 'NO_SHOW' ? (
          <div className="mt-3 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-900">
            <p className="font-semibold">🚫 노쇼로 처리되었습니다</p>
            <p className="mt-1 text-red-800">
              예약 시간에 방문하지 않으셔서 노쇼 처리되었습니다. 재방문 시 가게에 직접 문의해 주세요.
            </p>
          </div>
        ) : null}
        {r.status === 'DEPOSIT_PENDING' && r.depositAmount && r.depositAmount > 0 ? (
          <div className="mt-2 rounded-lg bg-blue-50 p-2 text-sm text-blue-800">
            예약금 {r.depositAmount.toLocaleString()}원 입금 후 확정됩니다.
          </div>
        ) : null}
        {cancellable ? (
          <button
            type="button"
            disabled={isCancelling}
            onClick={() => void handleCancel(rid)}
            className={`mt-3 w-full rounded-lg py-2 text-sm font-bold ${
              isCancelling ? 'bg-gray-100 text-gray-400' : 'bg-red-50 text-red-600 hover:bg-red-100'
            }`}
          >
            {isCancelling ? '취소 처리 중...' : '예약 취소'}
          </button>
        ) : null}
      </div>
    );
  };

  const todayRes = reservations.filter(
    (r) => activeStatuses.has(r.status) && (r.date || '') === today,
  );
  const upcoming = reservations.filter(
    (r) => activeStatuses.has(r.status) && (r.date || '') > today,
  );
  const past = reservations.filter(
    (r) => !activeStatuses.has(r.status) || (r.date || '') < today,
  );

  return (
    <div className="flex max-h-[85vh] flex-col">
      <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4">
        <h2 className="text-lg font-bold text-gray-900">내 예약 조회</h2>
        {onClose ? (
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-2 py-1 text-sm text-gray-500 hover:bg-gray-100"
            aria-label="닫기"
          >
            ✕
          </button>
        ) : null}
      </div>
      <div className="overflow-y-auto px-5 py-4">
        <div className="space-y-3 rounded-xl border border-gray-200 bg-gray-50 p-4">
          <p className="text-sm text-gray-500">예약자 이름과 전화번호 뒷 4자리로 조회합니다</p>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="예약자 이름"
            className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-base focus:border-blue-500 focus:outline-none"
          />
          <input
            type="tel"
            value={phoneLast4}
            onChange={(e) => setPhoneLast4(e.target.value.replace(/\D/g, '').slice(0, 4))}
            placeholder="전화번호 뒷 4자리"
            maxLength={4}
            className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-base focus:border-blue-500 focus:outline-none"
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          />
          <button
            type="button"
            onClick={handleSearch}
            disabled={!phoneValid}
            className={`w-full rounded-xl py-2.5 text-sm font-bold transition ${
              !phoneValid
                ? 'cursor-not-allowed bg-gray-200 text-gray-400'
                : 'bg-blue-500 text-white hover:bg-blue-600'
            }`}
          >
            예약 조회하기
          </button>
        </div>
        {loading ? (
          <UrrLoading message="예약 내역을 조회하는 중..." />
        ) : searched && reservations.length === 0 ? (
          <div className="mt-8 text-center">
            <p className="text-gray-500">해당 정보로 등록된 예약이 없습니다</p>
            {onClose ? (
              <button type="button" onClick={onClose} className="mt-4 text-sm text-blue-500 hover:underline">
                닫기
              </button>
            ) : (
              <Link href="/" className="mt-4 inline-block text-sm text-blue-500 hover:underline">
                가게 둘러보기
              </Link>
            )}
          </div>
        ) : (
          <div className="mt-4 space-y-5">
            {todayRes.length > 0 ? (
              <div>
                <h3 className="mb-2 text-sm font-bold text-yellow-700">오늘 예약</h3>
                <div className="space-y-3">{todayRes.map((r) => renderCard(r, true))}</div>
              </div>
            ) : null}
            {upcoming.length > 0 ? (
              <div>
                <h3 className="mb-2 text-sm font-bold text-gray-900">다가오는 예약</h3>
                <div className="space-y-3">{upcoming.map((r) => renderCard(r))}</div>
              </div>
            ) : null}
            {past.length > 0 ? (
              <div>
                <h3 className="mb-2 text-sm font-bold text-gray-400">지난 예약</h3>
                <div className="space-y-3 opacity-70">{past.map((r) => renderCard(r))}</div>
              </div>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}

export default function MyReservationsModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="my-reservations-title"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <MyReservationsPanel onClose={onClose} />
      </div>
    </div>
  );
}