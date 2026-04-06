'use client';

import { useState } from 'react';
import Link from 'next/link';
import LoadingStickmen from '@/components/LoadingStickmen';

interface ReservationItem {
  id: string;
  reservationId: string;
  storeId: string;
  storeName: string;
  slotId: string;
  timeBlock: string;
  headcount: number;
  totalAmount: number;
  status: string;
  createdAt: string;
  menus: { menuId: string; name: string; quantity: number; priceAtTime: number }[];
}

const STATUS_LABEL: Record<string, { text: string; color: string; emoji: string }> = {
  CONFIRMED: { text: '예약 확정', color: 'bg-green-100 text-green-700', emoji: '✅' },
  CANCELED: { text: '취소됨', color: 'bg-red-100 text-red-700', emoji: '❌' },
};

function formatPhone(value: string): string {
  const nums = value.replace(/\D/g, '').slice(0, 11);
  if (nums.length <= 3) return nums;
  if (nums.length <= 7) return `${nums.slice(0, 3)}-${nums.slice(3)}`;
  return `${nums.slice(0, 3)}-${nums.slice(3, 7)}-${nums.slice(7)}`;
}

export default function MyReservationsPage() {
  const [reservations, setReservations] = useState<ReservationItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [phone, setPhone] = useState('010');

  async function fetchReservations(searchPhone: string) {
    setLoading(true);
    setSearched(true);
    try {
      const raw = searchPhone.replace(/\D/g, '');
      const res = await fetch(`/api/reservations/check?userPhone=${encodeURIComponent(raw)}`);
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
    const raw = phone.replace(/\D/g, '');
    if (raw.length < 10) return;
    fetchReservations(raw);
  }

  async function handleCancel(id: string) {
    if (!confirm('예약을 취소하시겠습니까?')) return;
    setCancellingId(id);
    try {
      const res = await fetch(`/api/reservations/${id}/cancel`, { method: 'PATCH' });
      if (res.ok) {
        setReservations((prev) =>
          prev.map((r) => (r.id === id || r.reservationId === id) ? { ...r, status: 'CANCELED' } : r)
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

  const phoneValid = phone.replace(/\D/g, '').length >= 10;

  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-900">내 예약 조회</h1>

      {/* 조회 폼 */}
      <div className="mt-6 space-y-3 rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
        <p className="text-sm text-gray-500">예약 시 입력한 전화번호로 조회합니다</p>
        <input
          type="tel"
          value={phone}
          onChange={(e) => setPhone(formatPhone(e.target.value))}
          placeholder="010-0000-0000"
          className="w-full rounded-lg border border-gray-300 px-4 py-3 text-base focus:border-blue-500 focus:outline-none"
          onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
        />
        <button
          type="button"
          onClick={handleSearch}
          disabled={!phoneValid}
          className={`w-full rounded-xl py-3 text-sm font-bold transition ${
            !phoneValid
              ? 'cursor-not-allowed bg-gray-200 text-gray-400'
              : 'bg-blue-500 text-white hover:bg-blue-600'
          }`}
        >
          예약 조회하기
        </button>
      </div>

      {/* 결과 */}
      {loading ? (
        <LoadingStickmen message="예약 내역을 조회하는 중..." />
      ) : searched && reservations.length === 0 ? (
        <div className="mt-12 text-center">
          <p className="text-4xl mb-3">🔍</p>
          <p className="text-gray-500">해당 번호로 등록된 예약이 없습니다</p>
          <Link href="/" className="mt-4 inline-block text-sm text-blue-500 hover:underline">
            가게 둘러보기
          </Link>
        </div>
      ) : (
        <div className="mt-6 space-y-4">
          {reservations.map((r) => {
            const rid = r.reservationId || r.id;
            const status = STATUS_LABEL[r.status] ?? { text: r.status, color: 'bg-gray-100 text-gray-700', emoji: '📋' };
            const cancellable = r.status === 'CONFIRMED';
            const isCancelling = cancellingId === rid;

            return (
              <div key={rid} className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
                {/* 가게명 + 상태 */}
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-base font-bold text-gray-900">
                    {r.storeName || r.storeId}
                  </h2>
                  <span className={`rounded-full px-3 py-1 text-xs font-bold ${status.color}`}>
                    {status.emoji} {status.text}
                  </span>
                </div>

                {/* 예약 정보 */}
                <div className="space-y-1.5 text-sm text-gray-600">
                  <p>👥 인원: {r.headcount}명</p>
                  <p>🕐 시간: {r.timeBlock}</p>
                  <p>💰 금액: {(r.totalAmount || 0).toLocaleString()}원</p>
                </div>

                {/* 메뉴 */}
                {r.menus && r.menus.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-gray-100">
                    <p className="text-xs font-semibold text-gray-500 mb-1">🍽️ 주문 메뉴</p>
                    <div className="text-sm text-gray-600">
                      {r.menus.map((m, i) => (
                        <span key={i}>
                          {m.name} ×{m.quantity}
                          {m.priceAtTime > 0 && ` (${(m.priceAtTime * m.quantity).toLocaleString()}원)`}
                          {i < r.menus.length - 1 ? ', ' : ''}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* 취소 버튼 */}
                {cancellable && (
                  <div className="mt-4 pt-3 border-t border-gray-100">
                    <button
                      type="button"
                      disabled={isCancelling}
                      onClick={() => handleCancel(rid)}
                      className={`w-full rounded-lg py-2 text-sm font-bold transition ${
                        isCancelling
                          ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                          : 'bg-red-50 text-red-500 hover:bg-red-100'
                      }`}
                    >
                      {isCancelling ? '취소 처리 중...' : '예약 취소'}
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </main>
  );
}
