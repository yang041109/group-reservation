'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

interface Store {
  id: string;
  name: string;
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

export default function AdminCalendarPage() {
  const router = useRouter();
  const [store, setStore] = useState<Store | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
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

    // 오늘 날짜로 초기화
    const today = new Date().toISOString().split('T')[0];
    setSelectedDate(today);
  }, [router]);

  useEffect(() => {
    if (store && selectedDate) {
      fetchReservationsByDate();
    }
  }, [store, selectedDate]);

  const fetchReservationsByDate = async () => {
    if (!store || !selectedDate) return;

    setLoading(true);
    setError(null);

    try {
      const res = await fetch(
        `/api/admin/reservations?storeId=${store.id}&date=${selectedDate}`
      );
      const data = await res.json();

      if (data.success) {
        setReservations(data.data || []);
      } else {
        setError(data.message || '예약 목록을 불러올 수 없습니다.');
      }
    } catch (err) {
      setError('서버 오류가 발생했습니다.');
      console.error('예약 목록 로드 실패:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    sessionStorage.removeItem('adminStore');
    router.push('/admin');
  };

  const handleCancelReservation = async (reservationId: string) => {
    if (!confirm('이 예약을 취소하시겠습니까?')) {
      return;
    }

    setActionLoading(reservationId);

    try {
      const res = await fetch(`/api/admin/reservations/${reservationId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'cancel',
        }),
      });

      const data = await res.json();

      if (data.success) {
        alert('예약이 취소되었습니다.');
        // 목록 새로고침
        fetchReservationsByDate();
      } else {
        alert(data.message || '취소 처리 실패');
      }
    } catch (error) {
      alert('서버 오류가 발생했습니다.');
      console.error('예약 취소 실패:', error);
    } finally {
      setActionLoading(null);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { label: string; className: string }> = {
      PENDING: { label: '대기중', className: 'bg-yellow-100 text-yellow-800' },
      CONFIRMED: { label: '확정', className: 'bg-green-100 text-green-800' },
      DEPOSIT_PENDING: { label: '입금대기', className: 'bg-blue-100 text-blue-800' },
      CANCELLED: { label: '취소됨', className: 'bg-gray-100 text-gray-800' },
      REJECTED: { label: '거절됨', className: 'bg-red-100 text-red-800' },
    };

    const statusInfo = statusMap[status] || { label: status, className: 'bg-gray-100 text-gray-800' };

    return (
      <span className={`px-3 py-1 text-xs font-semibold rounded-full ${statusInfo.className}`}>
        {statusInfo.label}
      </span>
    );
  };

  const getTotalStats = () => {
    const totalReservations = reservations.length;
    const totalHeadcount = reservations.reduce((sum, r) => sum + r.headcount, 0);
    const totalAmount = reservations
      .filter(r => r.status === 'CONFIRMED' || r.status === 'DEPOSIT_PENDING')
      .reduce((sum, r) => sum + r.totalAmount, 0);

    return { totalReservations, totalHeadcount, totalAmount };
  };

  const stats = getTotalStats();

  // 날짜 변경 핸들러
  const changeDate = (days: number) => {
    const current = new Date(selectedDate);
    current.setDate(current.getDate() + days);
    setSelectedDate(current.toISOString().split('T')[0]);
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr + 'T00:00:00');
    const days = ['일', '월', '화', '수', '목', '금', '토'];
    return `${date.getFullYear()}년 ${date.getMonth() + 1}월 ${date.getDate()}일 (${days[date.getDay()]})`;
  };

  if (!store) {
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
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-xl font-bold text-gray-900">
                🏪 {store.name}
              </h1>
              <p className="text-sm text-gray-500">날짜별 예약 조회</p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => router.push('/admin/dashboard')}
                className="px-4 py-2 text-sm text-blue-600 hover:bg-blue-50 rounded-lg transition font-medium"
              >
                ← 대시보드
              </button>
              <button
                onClick={handleLogout}
                className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition"
              >
                로그아웃
              </button>
            </div>
          </div>

          {/* 날짜 선택 */}
          <div className="flex items-center justify-center gap-4">
            <button
              onClick={() => changeDate(-1)}
              className="p-2 hover:bg-gray-100 rounded-lg transition"
            >
              ← 이전
            </button>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg text-center font-medium"
            />
            <button
              onClick={() => changeDate(1)}
              className="p-2 hover:bg-gray-100 rounded-lg transition"
            >
              다음 →
            </button>
          </div>
        </div>
      </header>

      {/* 메인 컨텐츠 */}
      <main className="max-w-6xl mx-auto px-4 py-8">
        {/* 통계 카드 */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
            <div className="text-sm text-gray-500 mb-1">총 예약 건수</div>
            <div className="text-3xl font-bold text-gray-900">{stats.totalReservations}건</div>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
            <div className="text-sm text-gray-500 mb-1">총 예약 인원</div>
            <div className="text-3xl font-bold text-blue-600">{stats.totalHeadcount}명</div>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
            <div className="text-sm text-gray-500 mb-1">예상 매출</div>
            <div className="text-3xl font-bold text-green-600">
              {stats.totalAmount.toLocaleString()}원
            </div>
          </div>
        </div>

        {/* 선택된 날짜 표시 */}
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            {formatDate(selectedDate)}
          </h2>
          <p className="text-gray-600">
            {loading ? '예약 정보를 불러오는 중...' : `총 ${reservations.length}건의 예약`}
          </p>
        </div>

        {/* 에러 메시지 */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <p className="text-red-700">{error}</p>
          </div>
        )}

        {/* 예약 목록 */}
        {loading ? (
          <div className="bg-white rounded-lg shadow-sm p-12 text-center">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-500 border-r-transparent"></div>
            <p className="mt-4 text-gray-500">예약 정보를 불러오는 중...</p>
          </div>
        ) : reservations.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm p-12 text-center">
            <p className="text-gray-500">이 날짜에 예약이 없습니다</p>
          </div>
        ) : (
          <div className="space-y-4">
            {reservations
              .sort((a, b) => a.startTime.localeCompare(b.startTime))
              .map((reservation) => (
                <div
                  key={reservation.reservationId}
                  className="bg-white rounded-lg shadow-sm p-6 border border-gray-200 hover:shadow-md transition"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        {getStatusBadge(reservation.status)}
                        <span className="text-xs text-gray-400">
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
                      <span className="text-gray-500">시간:</span>
                      <span className="ml-2 font-medium text-blue-600">
                        {reservation.startTime} ~ {reservation.endTime}
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
                    <div className="p-3 bg-gray-50 rounded-lg">
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
                              {(menu.priceAtTime * menu.quantity).toLocaleString()}원
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* 예약 취소 버튼 - 확정된 예약만 취소 가능 */}
                  {(reservation.status === 'CONFIRMED' || reservation.status === 'DEPOSIT_PENDING') && (
                    <div className="mt-4 pt-4 border-t border-gray-200">
                      <button
                        onClick={() => handleCancelReservation(reservation.reservationId)}
                        disabled={actionLoading === reservation.reservationId}
                        className="w-full bg-red-50 text-red-600 py-2.5 rounded-lg font-medium hover:bg-red-100 transition disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {actionLoading === reservation.reservationId ? '처리 중...' : '예약 취소'}
                      </button>
                    </div>
                  )}
                </div>
              ))}
          </div>
        )}
      </main>
    </div>
  );
}
