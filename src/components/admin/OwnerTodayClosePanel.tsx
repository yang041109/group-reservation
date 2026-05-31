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

type BlockMode = 'full' | 'noStart';

export default function OwnerTodayClosePanel({ token, storeId }: Props) {
  const [allBlocks, setAllBlocks] = useState<string[]>([]);
  const [ownerClosed, setOwnerClosed] = useState<string[]>([]);
  const [ownerNoStart, setOwnerNoStart] = useState<string[]>([]);
  const [closedOnDate, setClosedOnDate] = useState(false);
  const [date, setDate] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [rangeStart, setRangeStart] = useState('');
  const [rangeEnd, setRangeEnd] = useState('');
  const [mode, setMode] = useState<BlockMode>('full');

  const closedRanges = useMemo(
    () => groupOwnerClosedBlocks(ownerClosed, allBlocks),
    [ownerClosed, allBlocks],
  );
  const noStartRanges = useMemo(
    () => groupOwnerClosedBlocks(ownerNoStart, allBlocks),
    [ownerNoStart, allBlocks],
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
      setOwnerNoStart(d.ownerNoStartBlocks || []);
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

  const persistBlocks = async (nextBlocks: string[], nextNoStart: string[]) => {
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
          noStartBlocks: nextNoStart,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setErr(data.message || '저장에 실패했습니다.');
        return false;
      }
      setOwnerClosed(nextBlocks);
      setOwnerNoStart(nextNoStart);
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
    if (mode === 'full') {
      const next = [...new Set([...ownerClosed, ...inRange])];
      await persistBlocks(next, ownerNoStart);
    } else {
      const next = [...new Set([...ownerNoStart, ...inRange])];
      await persistBlocks(ownerClosed, next);
    }
  };

  const releaseRangeFull = async (blocks: string[]) => {
    const remove = new Set(blocks);
    const next = ownerClosed.filter((b) => !remove.has(b));
    await persistBlocks(next, ownerNoStart);
  };

  const releaseRangeNoStart = async (blocks: string[]) => {
    const remove = new Set(blocks);
    const next = ownerNoStart.filter((b) => !remove.has(b));
    await persistBlocks(ownerClosed, next);
  };

  return (
    <section className="mb-5 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
      <h2 className="text-base font-bold text-gray-900">오늘 예약 막기</h2>

      {loading ? (
        <p className="mt-3 text-sm text-gray-400">불러오는 중…</p>
      ) : closedOnDate ? (
        <p className="mt-3 text-sm text-amber-800">오늘은 휴무일입니다.</p>
      ) : allBlocks.length === 0 ? (
        <p className="mt-3 text-sm text-gray-500">오늘 예약 가능한 시간이 없습니다.</p>
      ) : (
        <>
          <div className="mt-4">
            <div className="mb-2 flex flex-wrap gap-2">
              <button
                type="button"
                disabled={saving}
                onClick={() => setMode('full')}
                className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                  mode === 'full'
                    ? 'bg-rose-500 text-white shadow'
                    : 'border border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
                }`}
              >
                전체 차단
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={() => setMode('noStart')}
                className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                  mode === 'noStart'
                    ? 'bg-amber-500 text-white shadow'
                    : 'border border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
                }`}
              >
                시작 시간만 차단
              </button>
            </div>
            <p className="mb-2 text-[11px] text-gray-500">
              {mode === 'full'
                ? '이 시간을 거치는 모든 예약 차단. (지나가는 예약도 막힘)'
                : '이 시간을 시작 시각으로 가진 새 예약만 차단. 예약이 거쳐가는 건 OK.'}
            </p>
            <div className="flex flex-wrap items-center gap-2">
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
                className={`rounded-xl px-4 py-2.5 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50 ${
                  mode === 'full' ? 'bg-[#f29da6]' : 'bg-amber-500'
                }`}
              >
                {mode === 'full' ? '마감하기' : '시작 차단'}
              </button>
            </div>
          </div>

          {closedRanges.length > 0 || noStartRanges.length > 0 ? (
            <div className="mt-4 space-y-2 border-t border-gray-100 pt-4">
              {closedRanges.length > 0 && (
                <p className="text-sm text-gray-700">
                  <span className="font-medium text-gray-800">전체 차단:</span>{' '}
                  {closedRanges.map((range, i) => (
                    <span key={`f-${range.start}-${range.endBlock}`}>
                      {i > 0 ? ' / ' : null}
                      <span className="inline-flex items-center gap-1 rounded-lg bg-rose-50 px-2 py-1 align-middle text-sm text-rose-800">
                        {formatOwnerClosedRangeLabel(range.start, range.endBlock)}
                        <button
                          type="button"
                          disabled={saving}
                          onClick={() => void releaseRangeFull(range.blocks)}
                          className="text-xs font-semibold text-blue-600 hover:underline disabled:opacity-50"
                        >
                          해제
                        </button>
                      </span>
                    </span>
                  ))}
                </p>
              )}
              {noStartRanges.length > 0 && (
                <p className="text-sm text-gray-700">
                  <span className="font-medium text-gray-800">시작 시간 차단:</span>{' '}
                  {noStartRanges.map((range, i) => (
                    <span key={`n-${range.start}-${range.endBlock}`}>
                      {i > 0 ? ' / ' : null}
                      <span className="inline-flex items-center gap-1 rounded-lg bg-amber-50 px-2 py-1 align-middle text-sm text-amber-800">
                        {formatOwnerClosedRangeLabel(range.start, range.endBlock)}
                        <button
                          type="button"
                          disabled={saving}
                          onClick={() => void releaseRangeNoStart(range.blocks)}
                          className="text-xs font-semibold text-blue-600 hover:underline disabled:opacity-50"
                        >
                          해제
                        </button>
                      </span>
                    </span>
                  ))}
                </p>
              )}
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
