'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import StoreTimelineBar from '@/components/StoreTimelineBar';
import { timeBlocksInRange } from '@/lib/owner-closed-slots';
import { invalidateAllDataCache } from '@/lib/use-store-data';
import type { TimeSlot } from '@/types';

type Props = {
  token: string;
  storeId: string;
};

export default function OwnerTodayTimelinePanel({ token, storeId }: Props) {
  const [slots, setSlots] = useState<TimeSlot[]>([]);
  const [ownerClosed, setOwnerClosed] = useState<string[]>([]);
  const [slotStartHour, setSlotStartHour] = useState(11);
  const [slotEndHour, setSlotEndHour] = useState(20);
  const [crossesMidnight, setCrossesMidnight] = useState(false);
  const [closedOnDate, setClosedOnDate] = useState(false);
  const [date, setDate] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [rangeStart, setRangeStart] = useState('');
  const [rangeEnd, setRangeEnd] = useState('');
  const [pickAnchor, setPickAnchor] = useState<string | null>(null);

  const allBlocks = useMemo(() => slots.map((s) => s.timeBlock), [slots]);

  const load = useCallback(async () => {
    setLoading(true);
    setErr(null);
    try {
      const res = await fetch(`/api/admin/store/today-timeline?token=${encodeURIComponent(token)}`);
      const data = await res.json();
      if (!res.ok || !data.success) {
        setErr(data.message || '타임라인을 불러오지 못했습니다.');
        return;
      }
      const d = data.data;
      setDate(d.date);
      setSlots(d.slots || []);
      setOwnerClosed(d.ownerClosedBlocks || []);
      setSlotStartHour(d.slotStartHour);
      setSlotEndHour(d.slotEndHour);
      setCrossesMidnight(d.crossesMidnight);
      setClosedOnDate(d.closedOnDate);
      if (d.slots?.length) {
        setRangeStart((prev) => prev || d.slots[0].timeBlock);
        setRangeEnd((prev) => prev || d.slots[d.slots.length - 1].timeBlock);
      }
    } catch {
      setErr('네트워크 오류');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    void load();
  }, [load]);

  const persistBlocks = async (nextBlocks: string[]) => {
    setSaving(true);
    setErr(null);
    try {
      const res = await fetch('/api/admin/store/closed-slots', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          storeId,
          date,
          blocks: nextBlocks,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setErr(data.message || '저장에 실패했습니다.');
        return false;
      }
      setOwnerClosed(nextBlocks);
      await load();
      void invalidateAllDataCache();
      return true;
    } catch {
      setErr('네트워크 오류');
      return false;
    } finally {
      setSaving(false);
    }
  };

  const closeRange = async () => {
    if (!rangeStart || !rangeEnd) return;
    const inRange = timeBlocksInRange(rangeStart, rangeEnd, allBlocks);
    const next = [...new Set([...ownerClosed, ...inRange])];
    await persistBlocks(next);
  };

  const openRange = async () => {
    if (!rangeStart || !rangeEnd) return;
    const inRange = new Set(timeBlocksInRange(rangeStart, rangeEnd, allBlocks));
    const next = ownerClosed.filter((b) => !inRange.has(b));
    await persistBlocks(next);
  };

  const onBarClick = (time: string) => {
    if (!pickAnchor) {
      setPickAnchor(time);
      setRangeStart(time);
      setRangeEnd(time);
      return;
    }
    setRangeStart(pickAnchor);
    setRangeEnd(time);
    setPickAnchor(null);
  };

  const highlightRange: [string, string] | null =
    rangeStart && rangeEnd ? [rangeStart, rangeEnd] : null;

  return (
    <section className="mb-5 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between gap-2">
        <div>
          <h2 className="text-base font-bold text-gray-900">오늘 예약 타임라인</h2>
          <p className="mt-0.5 text-xs text-gray-500">
            메인·검색과 동일한 막대입니다. 구간을 선택해 예약을 막으면 고객 화면에 마감으로 보입니다.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void load()}
          disabled={loading || saving}
          className="shrink-0 rounded-lg border border-gray-200 px-2 py-1 text-xs text-gray-600 hover:bg-gray-50"
        >
          새로고침
        </button>
      </div>

      {loading ? (
        <p className="text-sm text-gray-400">불러오는 중…</p>
      ) : (
        <>
          <StoreTimelineBar
            slots={slots}
            slotStartHour={slotStartHour}
            slotEndHour={slotEndHour}
            crossesMidnight={crossesMidnight}
            ownerClosedBlocks={ownerClosed}
            closedOnDate={closedOnDate}
            showLegend
            barHeightClass="h-10"
            onBlockClick={closedOnDate ? undefined : onBarClick}
            highlightRange={highlightRange}
          />

          {!closedOnDate && allBlocks.length > 0 ? (
            <div className="mt-4 space-y-3 border-t border-gray-100 pt-4">
              <p className="text-xs text-gray-500">
                막대를 두 번 탭하면 시작·끝 시간이 잡힙니다. 또는 아래에서 구간을 고르세요.
              </p>
              <div className="grid grid-cols-2 gap-2">
                <label className="block text-xs text-gray-600">
                  시작
                  <select
                    className="mt-1 w-full rounded-lg border border-gray-300 px-2 py-2 text-sm"
                    value={rangeStart}
                    onChange={(e) => setRangeStart(e.target.value)}
                  >
                    {allBlocks.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block text-xs text-gray-600">
                  끝
                  <select
                    className="mt-1 w-full rounded-lg border border-gray-300 px-2 py-2 text-sm"
                    value={rangeEnd}
                    onChange={(e) => setRangeEnd(e.target.value)}
                  >
                    {allBlocks.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => void closeRange()}
                  className="flex-1 rounded-xl bg-[#f29da6] px-3 py-2.5 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50"
                >
                  선택 구간 예약 받지 않기
                </button>
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => void openRange()}
                  className="flex-1 rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-sm font-semibold text-gray-800 hover:bg-gray-50 disabled:opacity-50"
                >
                  선택 구간 다시 받기
                </button>
              </div>
              {ownerClosed.length > 0 ? (
                <p className="text-xs text-gray-500">
                  사장님 마감: {ownerClosed.join(', ')}
                </p>
              ) : (
                <p className="text-xs text-gray-400">사장님이 막은 구간이 없습니다.</p>
              )}
            </div>
          ) : null}
        </>
      )}

      {err ? <p className="mt-2 text-xs text-red-600">{err}</p> : null}
      {saving ? <p className="mt-1 text-xs text-blue-600">저장 중…</p> : null}
    </section>
  );
}
