'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import BackLink from '@/components/BackLink';
import { trackEvent } from '@/lib/analytics';

interface PendingMenuItem {
  menuId: string;
  name: string;
  price: number;
  quantity: number;
}

interface PendingReservation {
  storeId: string;
  storeName: string;
  zoneId?: string | null;
  zoneName?: string | null;
  headcount: number;
  date: string;
  time: string;
  groupName: string;
  representativeName: string;
  phone: string;
  menuItems: PendingMenuItem[];
  totalAmount: number;
  minOrderAmount: number;
  /** 인원 기준 산출 예약금(원) */
  depositAmount?: number;
  ownerName?: string | null;
  ownerBankAccount?: string | null;
}

export default function ReservationConfirmPage() {
  const params = useParams();
  const router = useRouter();
  const storeId = params.id as string;

  const [reservation, setReservation] = useState<PendingReservation | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [groupName, setGroupName] = useState('');
  const [representativeName, setRepresentativeName] = useState('');
  const [phone, setPhone] = useState('');
  const [userNote, setUserNote] = useState('');

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
      trackEvent('started_reservation_flow', {
        store_id: parsed.storeId,
        store_name: parsed.storeName,
        zone_id: parsed.zoneId ?? null,
        zone_name: parsed.zoneName ?? null,
        headcount: parsed.headcount,
        date: parsed.date,
        time: parsed.time,
        total_amount: parsed.totalAmount,
      });
    } catch {
      router.replace(`/stores/${storeId}`);
    }
  }, [storeId, router]);

  const handleConfirm = async () => {
    if (!reservation || submitting) return;

    // Validate required fields
    if (!groupName.trim()) { setError('단체명(행사명)을 입력해주세요.'); return; }
    if (!representativeName.trim()) { setError('예약자 이름을 입력해주세요.'); return; }
    if (!phone.trim()) { setError('전화번호를 입력해주세요.'); return; }
    const phoneDigits = phone.replace(/\D/g, '');
    if (phoneDigits.length !== 11 || !phoneDigits.startsWith('010')) {
      setError('전화번호 11자리를 정확히 입력해주세요. (예: 010-0000-0000)');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch('/api/reservations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          storeId: reservation.storeId,
          storeName: reservation.storeName,
          zoneId: reservation.zoneId || undefined,
          headcount: reservation.headcount,
          date: reservation.date,
          time: reservation.time,
          groupName: groupName.trim(),
          representativeName: representativeName.trim(),
          phone: phone.trim(),
          userNote: userNote.trim(),
          menuItems: reservation.menuItems.map((item) => ({
            menuId: item.menuId,
            name: item.name,
            price: item.price,
            quantity: item.quantity,
          })),
          totalAmount: reservation.totalAmount,
          minOrderAmount: reservation.minOrderAmount || 0,
        }),
      });
      
      if (!res.ok) {
        const data = await res.json();
        const msg = data.errors?.join(', ') || data.error || '예약 처리 중 오류가 발생했습니다.';
        // 잔여 인원 초과 에러인 경우 친화적 메시지
        if (msg.includes('잔여 인원') || msg.includes('초과')) {
          setError(`⚠️ 방금 다른 예약이 들어왔어요!\n${msg}\n시간대를 변경하거나 인원수를 조정해주세요.`);
        } else {
          setError(msg);
        }
        setSubmitting(false);
        return;
      }

      trackEvent('submitted_reservation', {
        store_id: reservation.storeId,
        store_name: reservation.storeName,
        zone_id: reservation.zoneId ?? null,
        headcount: reservation.headcount,
        date: reservation.date,
        time: reservation.time,
        total_amount: reservation.totalAmount,
        deposit_amount: reservation.depositAmount ?? 0,
      });

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

  const hasDeposit = (reservation.depositAmount ?? 0) > 0;

  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <BackLink fallbackHref={`/stores/${storeId}`} />
      <h1 className="text-2xl font-bold text-gray-900">예약 확인</h1>

      {/* 예약 정보 요약 카드 */}
      <div className="mt-6 space-y-4 rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
        {/* 가게 이름 */}
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-500">가게</span>
          <span className="font-semibold text-gray-900">{reservation.storeName}</span>
        </div>

        {/* 동(zone) — 동 운영 가게만 표시 */}
        {reservation.zoneName ? (
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-500">동</span>
            <span className="font-semibold text-gray-900">{reservation.zoneName}</span>
          </div>
        ) : null}

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

      {/* 예약자 정보 입력 */}
      <div className="mt-4 space-y-3 rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
        <h2 className="text-base font-bold text-gray-900">예약자 정보</h2>
        <div>
          <label className="block text-sm text-gray-600 mb-1">단체명 (행사명)</label>
          <input
            type="text"
            value={groupName}
            onChange={(e) => setGroupName(e.target.value)}
            placeholder="예: OO동아리 회식"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
          />
        </div>
        <div>
          <label className="block text-sm text-gray-600 mb-1">예약자 이름</label>
          <input
            type="text"
            value={representativeName}
            onChange={(e) => setRepresentativeName(e.target.value)}
            placeholder="홍길동"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
          />
        </div>
        <div>
          <label className="block text-sm text-gray-600 mb-1">전화번호</label>
          <input
            type="tel"
            value={phone}
            onChange={(e) => {
              const nums = e.target.value.replace(/\D/g, '').slice(0, 11);
              let formatted = nums;
              if (nums.length > 3 && nums.length <= 7) formatted = `${nums.slice(0, 3)}-${nums.slice(3)}`;
              else if (nums.length > 7) formatted = `${nums.slice(0, 3)}-${nums.slice(3, 7)}-${nums.slice(7)}`;
              setPhone(formatted);
            }}
            placeholder="010-0000-0000"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
          />
          <p className="mt-1.5 text-xs text-blue-600">
            📱 예약 확인은 이름과 전화번호 뒷 4자리로 조회됩니다.
          </p>
        </div>
        <div>
          <label className="block text-sm text-gray-600 mb-1">요청사항 (선택)</label>
          <textarea
            value={userNote}
            onChange={(e) => setUserNote(e.target.value)}
            placeholder="예: 조용한 자리 원해요, 생일 파티입니다 등"
            rows={2}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none resize-none"
          />
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

      {hasDeposit ? (
        <div className="mt-4 rounded-xl border-2 border-blue-200 bg-blue-50 p-5">
          <h2 className="text-base font-bold text-blue-900">예약금 입금 안내</h2>
          <p className="mt-2 text-2xl font-extrabold text-blue-950">
            {reservation.depositAmount!.toLocaleString()}원
          </p>
          <p className="mt-1 text-sm text-blue-800">
            아래 계좌로 입금해 주세요. 예약 확정 후 가게에서 확인합니다.
          </p>
          <div className="mt-4 space-y-1 rounded-lg bg-white px-4 py-3 text-sm text-gray-900">
            {reservation.ownerName ? (
              <p>
                <span className="text-gray-500">예금주</span>{' '}
                <span className="font-semibold">{reservation.ownerName}</span>
              </p>
            ) : (
              <p className="text-amber-700">예금주 정보가 등록되지 않았습니다. 가게에 문의해 주세요.</p>
            )}
            {reservation.ownerBankAccount ? (
              <p>
                <span className="text-gray-500">계좌</span>{' '}
                <span className="font-mono font-semibold">{reservation.ownerBankAccount}</span>
              </p>
            ) : (
              <p className="text-amber-700">계좌번호가 등록되지 않았습니다. 가게에 문의해 주세요.</p>
            )}
          </div>
        </div>
      ) : null}

      {/* 에러 메시지 */}
      {error && (
        <div className="mt-4 rounded-xl border-2 border-red-300 bg-red-50 px-5 py-4 text-sm">
          <div className="whitespace-pre-line text-red-700 font-medium">{error}</div>
          <button
            type="button"
            onClick={() => { setError(null); router.back(); }}
            className="mt-3 w-full rounded-lg bg-red-100 py-2 text-xs font-bold text-red-600 hover:bg-red-200 transition"
          >
            ← 시간대 다시 선택하기
          </button>
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
          {submitting ? '처리 중...' : hasDeposit ? '예약금 확인 후 확정' : '예약 확정'}
        </button>
      </div>
    </main>
  );
}
