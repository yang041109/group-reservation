'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface Store {
  id: string;
  name: string;
  depositAmount: number;
}

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

export default function AdminDashboard() {
  const router = useRouter();
  const [store, setStore] = useState<Store | null>(null);
  const [pendingReservations, setPendingReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    // 로그인 확인
    const storeData = sessionStorage.getItem('adminStore');
    if (!storeData) {
      router.push('/admin');
      return;
    }

    const parsedStore = JSON.parse(storeData);
    setStore(parsedStore);

    // 대기 중인 예약 가져오기
    fetchPendingReservations(parsedStore.id);
  }, [router]);

  const fetchPendingReservations = async (storeId: string) => {
    try {
      const res = await fetch(
        `/api/admin/reservations?storeId=${storeId}&status=PENDING`
      );
      const data = await res.json();

      if (data.success) {
        setPendingReservations(data.data || []);
      }
    } catch (error) {
      console.error('예약 목록 로드 실패:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (
    reservationId: string,
    action: 'accept' | 'reject'
  ) => {
    if (!store) return;

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
        // 목록 새로고침
        fetchPendingReservations(store.id);
      } else {
        alert(data.message || '처리 실패');
      }
    } catch (error) {
      alert('서버 오류가 발생했습니다.');
    } finally {
      setActionLoading(null);
    }
  };

  const handleLogout = () => {
    sessionStorage.removeItem('adminStore');
    router.push('/admin');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-600">로딩 중...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 헤더 */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold text-gray-900">
                🏪 {store?.name}
              </h1>
              <p className="text-sm text-gray-500">대기 중인 예약 관리</p>
            </div>
            <div className="flex items-center gap-3">
              <Link
                href="/admin/calendar"
                className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition"
              >
                📅 날짜별 예약
              </Link>
              <button
                onClick={handleLogout}
                className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition"
              >
                로그아웃
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* 메인 컨텐츠 */}
      <main className="max-w-6xl mx-auto px-4 py-8">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            대기 중인 예약
          </h2>
          <p className="text-gray-600">
            총 {pendingReservations.length}건의 예약이 대기 중입니다
          </p>
        </div>

        {pendingReservations.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm p-12 text-center">
            <p className="text-gray-500">대기 중인 예약이 없습니다</p>
          </div>
        ) : (
          <div className="space-y-4">
            {pendingReservations.map((reservation) => (
              <div
                key={reservation.reservationId}
                className="bg-white rounded-lg shadow-sm p-6 border border-gray-200"
              >
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="px-3 py-1 bg-yellow-100 text-yellow-800 text-xs font-semibold rounded-full">
                        대기중
                      </span>
                      <span className="text-sm text-gray-500">
                        {reservation.reservationId}
                      </span>
                    </div>
                    <h3 className="text-lg font-bold text-gray-900">
                      {reservation.userName}
                      {reservation.groupName && (
                        <span className="text-gray-500 font-normal ml-2">
                          ({reservation.groupName})
                        </span>
                      )}
                    </h3>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-gray-900">
                      {reservation.totalAmount.toLocaleString()}원
                    </div>
                    {reservation.depositAmount > 0 && (
                      <div className="text-sm text-red-600 font-medium">
                        예약금 {reservation.depositAmount.toLocaleString()}원
                      </div>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
                  <div>
                    <span className="text-gray-500">날짜/시간:</span>
                    <span className="ml-2 font-medium">
                      {reservation.date} {reservation.startTime} ~{' '}
                      {reservation.endTime}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-500">인원:</span>
                    <span className="ml-2 font-medium">
                      {reservation.headcount}명
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-500">연락처:</span>
                    <span className="ml-2 font-medium">
                      {reservation.userPhone}
                    </span>
                  </div>
                </div>

                {reservation.menus.length > 0 && (
                  <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                    <div className="text-sm font-medium text-gray-700 mb-2">
                      주문 메뉴
                    </div>
                    <div className="space-y-1">
                      {reservation.menus.map((menu, idx) => (
                        <div
                          key={idx}
                          className="text-sm text-gray-600 flex justify-between"
                        >
                          <span>
                            {menu.name} x {menu.quantity}
                          </span>
                          <span>
                            {(menu.priceAtTime * menu.quantity).toLocaleString()}
                            원
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex gap-3">
                  <button
                    onClick={() =>
                      handleAction(reservation.reservationId, 'accept')
                    }
                    disabled={actionLoading === reservation.reservationId}
                    className="flex-1 bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition disabled:opacity-50"
                  >
                    {actionLoading === reservation.reservationId
                      ? '처리 중...'
                      : reservation.depositAmount > 0
                      ? '수락 (예약금 입금 요청)'
                      : '수락 (즉시 확정)'}
                  </button>
                  <button
                    onClick={() =>
                      handleAction(reservation.reservationId, 'reject')
                    }
                    disabled={actionLoading === reservation.reservationId}
                    className="flex-1 bg-gray-200 text-gray-700 py-3 rounded-lg font-semibold hover:bg-gray-300 transition disabled:opacity-50"
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
