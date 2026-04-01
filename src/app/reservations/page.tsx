'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

interface ReservationItem {
  id: string;
  storeId: string;
  storeName: string;
  groupName: string;
  representativeName: string;
  phone: string;
  headcount: number;
  date: string;
  time: string;
  totalAmount: number;
  status: 'pending' | 'accepted' | 'rejected';
  adminNote: string | null;
  menuItems: { name: string; quantity: number; priceAtTime: number }[];
  createdAt: string;
}

const STATUS_LABEL: Record<string, { text: string; color: string }> = {
  pending: { text: '대기중', color: 'bg-yellow-100 text-yellow-700' },
  accepted: { text: '수락됨', color: 'bg-green-100 text-green-700' },
  rejected: { text: '거절됨', color: 'bg-red-100 text-red-700' },
};

function canCancel(dateStr: string): boolean {
  const reservationDate = new Date(dateStr + 'T00:00:00');
  const now = new Date();
  const diffMs = reservationDate.getTime() - now.getTime();
  return diffMs / (1000 * 60 * 60 * 24) >= 3;
}

export default function MyReservationsPage() {
  const router = useRouter();
  const [reservations, setReservations] = useState<ReservationItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');

  // Restore saved credentials from localStorage
  useEffect(() => {
    const savedName = localStorage.getItem('representativeName');
    const savedPhone = localStorage.getItem('phone');
    if (savedName) setName(savedName);
    if (savedPhone) setPhone(savedPhone);
    // Auto-search if both are saved
    if (savedName && savedPhone) {
      fetchReservations(savedName, savedPhone);
    }
  }, []);

  async function fetchReservations(searchName: string, searchPhone: string) {
    setLoading(true);
    setSearched(true);
    try {
      const params = new URLSearchParams({ name: searchName, phone: searchPhone });
      const res = await fetch(`/api/reservations?${params}`);
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
    if (!name.trim() || !phone.trim()) return;
    localStorage.setItem('representativeName', name.trim());
    localStorage.setItem('phone', phone.trim());
    fetchReservations(name.trim(), phone.trim());
  }

  async function handleCancel(id: string) {
    if (!confirm('예약을 취소하시겠습니까?')) return;
    setCancellingId(id);
    try {
      const res = await fetch(`/api/reservations/${id}/cancel`, { method: 'POST' });
      if (res.ok) {
        setReservations((prev) => prev.filter((r) => r.id !== id));
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

  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-900">내 예약</h1>

      {/* 조회 폼 */}
      <div className="mt-6 space-y-3 rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
        <p className="text-sm text-gray-500">대표자 이름과 전화번호로 예약을 조회합니다</p>
        <div className="flex gap-3">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="대표자 이름"
            className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
          />
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="전화번호"
            className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          />
        </div>
        <button
          type="button"
          onClick={handleSearch}
          disabled={!name.trim() || !phone.trim()}
          className={`w-full rounded-xl py-2.5 text-sm font-bold transition ${
            !name.trim() || !phone.trim()
              ? 'cursor-not-allowed bg-gray-200 text-gray-400'
              : 'bg-blue-500 text-white hover:bg-blue-600'
          }`}
        >
          조회하기
        </button>
      </div>

      {/* 결과 */}
      {loading ? (
        <p className="mt-8 text-center text-gray-500">불러오는 중...</p>
      ) : searched && reservations.length === 0 ? (
        <div className="mt-12 text-center">
          <p className="text-gray-500">예약 내역이 없습니다</p>
          <Link href="/" className="mt-4 inline-block text-sm text-blue-500 hover:underline">
            가게 둘러보기
          </Link>
        </div>
      ) : (
        <div className="mt-6 space-y-4">
          {reservations.map((r) => {
            const status = STATUS_LABEL[r.status] ?? STATUS_LABEL.pending;
            const cancellable = r.status === 'pending' && canCancel(r.date);
            const isCancelling = cancellingId === r.id;

            return (
              <div key={r.id} className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
                <div className="cursor-pointer" onClick={() => router.push(`/stores/${r.storeId}`)}>
                  <div className="flex items-center justify-between">
                    <h2 className="text-base font-semibold text-gray-900">{r.storeName}</h2>
                    <span className={`rounded-full px-3 py-1 text-xs font-medium ${status.color}`}>
                      {status.text}
                    </span>
                  </div>
                  {r.groupName && (
                    <p className="mt-1 text-sm text-gray-500">🏷️ {r.groupName}</p>
                  )}
                  <div className="mt-2 space-y-1 text-sm text-gray-600">
                    <p>📅 {r.date} · 👥 {r.headcount}명 · 🕐 {r.time}</p>
                    <p>💰 {r.totalAmount.toLocaleString()}원</p>
                  </div>
                  {r.menuItems.length > 0 && (
                    <div className="mt-2 text-sm text-gray-500">
                      {r.menuItems.map((m, i) => (
                        <span key={i}>{m.name} ×{m.quantity}{i < r.menuItems.length - 1 ? ', ' : ''}</span>
                      ))}
                    </div>
                  )}
                  {r.adminNote && (
                    <div className="mt-3 rounded-lg bg-blue-50 px-3 py-2 text-sm text-blue-700">
                      📝 운영팀: {r.adminNote}
                    </div>
                  )}
                </div>
                {cancellable && (
                  <div className="mt-4 border-t border-gray-100 pt-3">
                    <button
                      type="button"
                      disabled={isCancelling}
                      onClick={() => handleCancel(r.id)}
                      className={`text-sm font-medium transition ${isCancelling ? 'text-gray-400 cursor-not-allowed' : 'text-red-500 hover:text-red-600'}`}
                    >
                      {isCancelling ? '취소 중...' : '예약 취소'}
                    </button>
                  </div>
                )}
                {r.status === 'pending' && !canCancel(r.date) && (
                  <div className="mt-3 text-xs text-gray-400">예약일 3일 전까지만 취소 가능합니다</div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </main>
  );
}
