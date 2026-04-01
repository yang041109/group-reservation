'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';

interface PendingMenuItem {
  menuId: string;
  name: string;
  price: number;
  quantity: number;
}

interface PendingReservation {
  storeId: string;
  storeName: string;
  headcount: number;
  date: string;
  time: string;
  menuItems: PendingMenuItem[];
  totalAmount: number;
  minOrderAmount: number;
}

export default function ReservationConfirmPage() {
  const params = useParams();
  const router = useRouter();
  const storeId = params.id as string;

  const [reservation, setReservation] = useState<PendingReservation | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const raw = sessionStorage.getItem('pendingReservation');
    if (!raw) {
      router.replace(`/stores/${storeId}`);
      return;
    }
    try {
      const parsed: PendingReservation = JSON.parse(raw);
      if (parsed.storeId !== storeId) {
        router.replace(`/stores/${storeId}`);
        return;
      }
      setReservation(parsed);
    } catch {
      router.replace(`/stores/${storeId}`);
    }
  }, [storeId, router]);

  const handleConfirm = async () => {
    if (!reservation || submitting) return;
    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch('http://localhost:8080/api/reservations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          storeId: reservation.storeId,
          headcount: reservation.headcount,
          date: reservation.date,
          time: reservation.time,
          // [수정 포인트!] item.name과 item.price를 추가해서 백엔드로 보냅니다.
          menuItems: reservation.menuItems.map((item) => ({
            menuId: item.menuId,
            name: item.name,      // 백엔드 엔티티의 'name' 필드와 일치
            quantity: item.quantity,
            price: item.price     // 백엔드 엔티티의 'price' 필드와 일치
          })),
          totalAmount: reservation.totalAmount,
          minOrderAmount: reservation.minOrderAmount || 0,
        }),
      });
      
      if (!res.ok) {
        const data = await res.json();
        const msg = data.errors?.join(', ') || data.error || '예약 처리 중 오류가 발생했습니다.';
        setError(msg);
        setSubmitting(false);
        return;
      }

      sessionStorage.removeItem('pendingReservation');
      router.push(`/stores/${storeId}/complete`);
    } catch {
      setError('네트워크 오류가 발생했습니다. 다시 시도해주세요.');
      setSubmitting(false);
    }
  };

  if (!reservation) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-8">
        <p className="text-center text-gray-500">불러오는 중...</p>
      </main>
    );
  }

  const meetsMinOrder = reservation.minOrderAmount <= 0 || reservation.totalAmount >= reservation.minOrderAmount;

  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-900">예약 확인</h1>

      {/* 예약 정보 요약 카드 */}
      <div className="mt-6 space-y-4 rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
        {/* 가게 이름 */}
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-500">가게</span>
          <span className="font-semibold text-gray-900">{reservation.storeName}</span>
        </div>

        {/* 인원수 */}
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-500">인원수</span>
          <span className="font-semibold text-gray-900">{reservation.headcount}명</span>
        </div>

        {/* 날짜 */}
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-500">날짜</span>
          <span className="font-semibold text-gray-900">{reservation.date}</span>
        </div>

        {/* 시간 */}
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-500">시간</span>
          <span className="font-semibold text-gray-900">{reservation.time}</span>
        </div>
      </div>

      {/* 메뉴 목록 */}
      <div className="mt-4 rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
        <h2 className="mb-3 text-base font-bold text-gray-900">선택 메뉴</h2>
        <ul className="space-y-2">
          {reservation.menuItems.map((item) => (
            <li key={item.menuId} className="flex items-center justify-between text-sm">
              <span className="text-gray-700">
                {item.name} × {item.quantity}
              </span>
              <span className="font-medium text-gray-900">
                {(item.price * item.quantity).toLocaleString()}원
              </span>
            </li>
          ))}
        </ul>

        {/* 총 금액 */}
        <div className="mt-4 border-t border-gray-100 pt-3 flex items-center justify-between">
          <span className="text-sm font-bold text-gray-900">총 금액</span>
          <span className="text-lg font-bold text-blue-600">
            {reservation.totalAmount.toLocaleString()}원
          </span>
        </div>
      </div>

      {/* 최소 주문 금액 충족 여부 */}
      {reservation.minOrderAmount > 0 && (
        <div
          className={`mt-4 flex items-center gap-2 rounded-xl px-5 py-3 text-sm ${
            meetsMinOrder
              ? 'bg-green-50 text-green-700'
              : 'bg-red-50 text-red-700'
          }`}
        >
          {meetsMinOrder ? (
            <>
              <span className="text-green-500">✅</span>
              <span>최소 주문 금액 {reservation.minOrderAmount.toLocaleString()}원 충족</span>
            </>
          ) : (
            <>
              <span className="text-red-500">❌</span>
              <span>
                최소 주문 금액 {reservation.minOrderAmount.toLocaleString()}원 미달 (
                {(reservation.minOrderAmount - reservation.totalAmount).toLocaleString()}원 부족)
              </span>
            </>
          )}
        </div>
      )}

      {/* 에러 메시지 */}
      {error && (
        <div className="mt-4 rounded-xl bg-red-50 px-5 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* 버튼 영역 */}
      <div className="mt-8 flex gap-3">
        <button
          type="button"
          onClick={() => router.back()}
          className="flex-1 rounded-xl border border-gray-300 bg-white py-3.5 text-base font-bold text-gray-700 transition hover:bg-gray-50 active:bg-gray-100"
        >
          뒤로 가기
        </button>
        <button
          type="button"
          disabled={submitting}
          onClick={handleConfirm}
          className={`flex-1 rounded-xl py-3.5 text-base font-bold transition ${
            submitting
              ? 'cursor-not-allowed bg-gray-300 text-gray-500'
              : 'bg-blue-500 text-white hover:bg-blue-600 active:bg-blue-700'
          }`}
        >
          {submitting ? '처리 중...' : '예약 확정'}
        </button>
      </div>
    </main>
  );
}
