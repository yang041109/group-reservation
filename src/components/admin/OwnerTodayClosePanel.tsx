'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  formatOwnerClosedRangeLabel,
  groupOwnerClosedBlocks,
  timeBlocksInRange,
} from '@/lib/owner-closed-slots';
import { invalidateAllDataCache } from '@/lib/use-store-data';

type Props = {
  token: string;
  storeId: string;
};

export default function OwnerTodayClosePanel({ token, storeId }: Props) {
  const [allBlocks, setAllBlocks] = useState<string[]>([]);
  const [ownerClosed, setOwnerClosed] = useState<string[]>([]);
  const [closedOnDate, setClosedOnDate] = useState(false);
  const [date, setDate] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [rangeStart, setRangeStart] = useState('');
  const [rangeEnd, setRangeEnd] = useState('');

  const closedRanges = useMemo(
    () => groupOwnerClosedBlocks(ownerClosed, allBlocks),
    [ownerClosed, allBlocks],
  );

  const load = useCallback(async () => {
    setLoading(true);
    setErr(null);
    try {
      const res = await fetch(`/api/admin/store/today-timeline?token=${encodeURIComponent(token)}`);
      const data = await res.json();
      if (!res.ok || !data.success) {
        setErr(data.message || '설정을 불러오지 못했습니다.');
        return;
      }
      const d = data.data;
      const blocks = (d.slots || []).map((s: { timeBlock: string }) => s.timeBlock);
      setDate(d.date);
      setAllBlocks(blocks);
      setOwnerClosed(d.ownerClosedBlocks || []);
      setClosedOnDate(d.closedOnDate);
      if (blocks.length) {
        setRangeStart((prev) => (prev && blocks.includes(prev) ? prev : blocks[0]));
        setRangeEnd((prev) =>
          prev && blocks.includes(prev) ? prev : blocks[blocks.length - 1],
        );
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
    if (!inRange.length) return;
    const next = [...new Set([...ownerClosed, ...inRange])];
    await persistBlocks(next);
  };

  const releaseRange = async (blocks: string[]) => {
    const remove = new Set(blocks);
    const next = ownerClosed.filter((b) => !remove.has(b));
    await persistBlocks(next);
  };

  return (
    <section className="mb-5 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
      <h2 className="text-base font-bold text-gray-900">오늘 예약 마감 설정</h2>

      {loading ? (
        <p className="mt-3 text-sm text-gray-400">불러오는 중…</p>
      ) : closedOnDate ? (
        <p className="mt-3 text-sm text-amber-800">오늘은 휴무일입니다.</p>
      ) : allBlocks.length === 0 ? (
        <p className="mt-3 text-sm text-gray-500">오늘 예약 가능한 시간이 없습니다.</p>
      ) : (
        <>
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <select
              className="rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm font-medium text-gray-900"
              value={rangeStart}
              onChange={(e) => setRangeStart(e.target.value)}
              disabled={saving}
              aria-label="마감 시작 시간"
            >
              {allBlocks.map((t) => (
                <option key={`s-${t}`} value={t}>
                  {t}
                </option>
              ))}
            </select>
            <span className="text-sm text-gray-600">부터</span>
            <select
              className="rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm font-medium text-gray-900"
              value={rangeEnd}
              onChange={(e) => setRangeEnd(e.target.value)}
              disabled={saving}
              aria-label="마감 종료 시간"
            >
              {allBlocks.map((t) => (
                <option key={`e-${t}`} value={t}>
                  {t}
                </option>
              ))}
            </select>
            <span className="text-sm text-gray-600">까지</span>
            <button
              type="button"
              disabled={saving}
              onClick={() => void closeRange()}
              className="rounded-xl bg-[#f29da6] px-4 py-2.5 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50"
            >
              마감하기
            </button>
          </div>

          {closedRanges.length > 0 ? (
            <div className="mt-4 border-t border-gray-100 pt-4">
              <p className="text-sm text-gray-700">
                <span className="font-medium text-gray-800">차단된 시간:</span>{' '}
                {closedRanges.map((range, i) => (
                  <span key={`${range.start}-${range.endBlock}`}>
                    {i > 0 ? ' / ' : null}
                    <span className="inline-flex items-center gap-1 rounded-lg bg-gray-100 px-2 py-1 align-middle text-sm">
                      {formatOwnerClosedRangeLabel(range.start, range.endBlock)}
                      <button
                        type="button"
                        disabled={saving}
                        onClick={() => void releaseRange(range.blocks)}
                        className="text-xs font-semibold text-blue-600 hover:underline disabled:opacity-50"
                      >
                        해제
                      </button>
                    </span>
                  </span>
                ))}
              </p>
            </div>
          ) : (
            <p className="mt-3 text-xs text-gray-400">차단된 시간이 없습니다.</p>
          )}
        </>
      )}

      {err ? <p className="mt-2 text-xs text-red-600">{err}</p> : null}
      {saving ? <p className="mt-1 text-xs text-blue-600">저장 중…</p> : null}
    </section>
  );
}
