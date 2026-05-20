'use client';

import { useCallback, useEffect, useState } from 'react';
import { invalidateAllDataCache } from '@/lib/use-store-data';

type Props = {
  token: string;
  storeId: string;
};

export default function OwnerBookingAcceptToggle({ token, storeId }: Props) {
  const [accepting, setAccepting] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setErr(null);
    try {
      const res = await fetch(`/api/admin/store?token=${encodeURIComponent(token)}`);
      const data = await res.json();
      if (!res.ok || !data.success) {
        setErr(data.message || '설정을 불러오지 못했습니다.');
        return;
      }
      setAccepting(data.data?.acceptingReservations !== false);
    } catch {
      setErr('네트워크 오류');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    void load();
  }, [load]);

  const onToggle = async (next: boolean) => {
    if (saving) return;
    setSaving(true);
    setErr(null);
    const prev = accepting;
    setAccepting(next);
    try {
      const res = await fetch('/api/admin/store/accepting-reservations', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          storeId,
          acceptingReservations: next,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setAccepting(prev);
        setErr(data.message || '저장에 실패했습니다.');
        return;
      }
      setAccepting(data.acceptingReservations !== false);
      void invalidateAllDataCache();
    } catch {
      setAccepting(prev);
      setErr('네트워크 오류');
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="mb-5 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-gray-900">예약 받기</h2>
          <p className="mt-1 text-xs text-gray-500">
            {accepting
              ? '지금부터 오늘 남은 시간대에 예약을 받습니다. 이미 지난 시간은 마감됩니다.'
              : '지금 시각 이후 오늘 예약이 모두 마감됩니다. 다시 켜면 그 시각부터 예약이 열립니다.'}
          </p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={accepting}
          disabled={loading || saving}
          onClick={() => void onToggle(!accepting)}
          className={`relative h-8 w-14 shrink-0 rounded-full transition-colors disabled:opacity-50 ${
            accepting ? 'bg-emerald-500' : 'bg-gray-300'
          }`}
        >
          <span
            className={`absolute top-1 left-1 h-6 w-6 rounded-full bg-white shadow transition-transform ${
              accepting ? 'translate-x-6' : 'translate-x-0'
            }`}
          />
        </button>
      </div>
      <p className="mt-2 text-right text-xs font-semibold text-gray-600">
        {loading ? '…' : accepting ? 'ON · 예약 받는 중' : 'OFF · 예약 마감'}
      </p>
      {err ? <p className="mt-2 text-xs text-red-600">{err}</p> : null}
    </section>
  );
}
