'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAdminStore } from './AdminStoreContext';

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

export default function AdminDashboardByToken() {
  const store = useAdminStore();
  const [pendingReservations, setPendingReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const base = `/admin/m/${encodeURIComponent(store.token)}`;

  useEffect(() => {
    void (async () => {
      try {
        const res = await fetch(
          `/api/admin/reservations?storeId=${encodeURIComponent(store.id)}&status=PENDING`,
        );
        const data = await res.json();
        if (data.success) {
          setPendingReservations((data.data || []) as Reservation[]);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    })();
  }, [store.id]);

  const fetchPending = async () => {
    const res = await fetch(
      `/api/admin/reservations?storeId=${encodeURIComponent(store.id)}&status=PENDING`,
    );
    const data = await res.json();
    if (data.success) setPendingReservations((data.data || []) as Reservation[]);
  };

  const handleAction = async (reservationId: string, action: 'accept' | 'reject') => {
    setActionLoading(reservationId);
    try {
      const res = await fetch(`/api/admin/reservations/${reservationId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          depositAmount: store.depositAmount,
        }),
      });
      const data = await res.json();
      if (data.success) {
        void fetchPending();
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
          <div>
            <h1 className="text-xl font-bold text-gray-900">🏪 {store.name}</h1>
            <p className="text-sm text-gray-500">대기 중인 예약 관리</p>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href={`${base}/calendar`}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700"
            >
              📅 날짜별 예약
            </Link>
            <Link href="/" className="rounded-lg px-4 py-2 text-sm text-gray-600 transition hover:bg-gray-100">
              홈으로
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-8">
        <div className="mb-6">
          <h2 className="mb-2 text-2xl font-bold text-gray-900">대기 중인 예약</h2>
          <p className="text-gray-600">총 {pendingReservations.length}건의 예약이 대기 중입니다</p>
        </div>

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
                    onClick={() => void handleAction(reservation.reservationId, 'reject')}
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
    </div>
  );
}
