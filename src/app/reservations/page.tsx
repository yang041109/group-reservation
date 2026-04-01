'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

interface ReservationItem {
  id: string;
  storeName: string;
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

export default function MyReservationsPage() {
  const [reservations, setReservations] = useState<ReservationItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchReservations() {
      try {
        const res = await fetch('/api/reservations');
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
    fetchReservations();
  }, []);

  if (loading) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-8">
        <p className="text-center text-gray-500">불러오는 중...</p>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-900">내 예약</h1>

      {reservations.length === 0 ? (
        <div className="mt-12 text-center">
          <p className="text-gray-500">아직 예약 내역이 없습니다</p>
          <Link
            href="/"
            className="mt-4 inline-block text-sm text-blue-500 hover:underline"
          >
            가게 둘러보기
          </Link>
        </div>
      ) : (
        <div className="mt-6 space-y-4">
          {reservations.map((r) => {
            const status = STATUS_LABEL[r.status] ?? STATUS_LABEL.pending;
            return (
              <div
                key={r.id}
                className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm"
              >
                <div className="flex items-center justify-between">
                  <h2 className="text-base font-semibold text-gray-900">
                    {r.storeName}
                  </h2>
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-medium ${status.color}`}
                  >
                    {status.text}
                  </span>
                </div>

                <div className="mt-3 space-y-1 text-sm text-gray-600">
                  <p>📅 {r.date} · 👥 {r.headcount}명 · 🕐 {r.time}</p>
                  <p>💰 {r.totalAmount.toLocaleString()}원</p>
                </div>

                {r.menuItems.length > 0 && (
                  <div className="mt-3 text-sm text-gray-500">
                    {r.menuItems.map((m, i) => (
                      <span key={i}>
                        {m.name} ×{m.quantity}
                        {i < r.menuItems.length - 1 ? ', ' : ''}
                      </span>
                    ))}
                  </div>
                )}

                {r.adminNote && (
                  <div className="mt-3 rounded-lg bg-blue-50 px-3 py-2 text-sm text-blue-700">
                    📝 운영팀: {r.adminNote}
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
