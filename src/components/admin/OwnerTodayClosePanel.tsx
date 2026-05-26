'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { formatHalfHourLabel, normalizeTimeHHMM } from '@/lib/half-hour-time';
import {
  formatOwnerClosedRangeLabel,
  groupOwnerClosedBlocks,
} from '@/lib/owner-closed-slots';
import { invalidateAllDataCache } from '@/lib/use-store-data';

type Props = {
  token: string;
  storeId: string;
};

function blockLabel(timeBlock: string): string {
  const norm = normalizeTimeHHMM(timeBlock);
  return norm ? formatHalfHourLabel(norm) : timeBlock;
}

export default function OwnerTodayClosePanel({ token, storeId }: Props) {
  const [allBlocks, setAllBlocks] = useState<string[]>([]);
  const [ownerClosed, setOwnerClosed] = useState<string[]>([]);
  const [closedOnDate, setClosedOnDate] = useState(false);
  const [date, setDate] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const closedSet = useMemo(() => new Set(ownerClosed), [ownerClosed]);

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
      void invalidateAllDataCache();
      return true;
    } catch {
      setErr('네트워크 오류');
      return false;
    } finally {
      setSaving(false);
    }
  };

  const toggleBlock = async (block: string) => {
    const next = closedSet.has(block)
      ? ownerClosed.filter((b) => b !== block)
      : [...ownerClosed, block];
    await persistBlocks(next);
  };

  const releaseRange = async (blocks: string[]) => {
    const remove = new Set(blocks);
    const next = ownerClosed.filter((b) => !remove.has(b));
    await persistBlocks(next);
  };

  const openCount = allBlocks.length - ownerClosed.length;

  return (
    <section className="mb-5 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
      <h2 className="text-base font-bold text-gray-900">오늘 예약 막기</h2>
      <p className="mt-1 text-sm leading-relaxed text-gray-600">
        예약을 받고 싶지 않은 시간을 누르세요.
        <span className="font-medium text-gray-800"> 회색(막음)</span>이면 고객이 그 시간에 예약할 수
        없어요.
      </p>

      {loading ? (
        <p className="mt-4 text-sm text-gray-400">불러오는 중…</p>
      ) : closedOnDate ? (
        <p className="mt-4 rounded-xl bg-amber-50 px-3 py-3 text-sm text-amber-900">
          오늘은 휴무일이라 예약 막기 설정을 쓸 수 없어요.
        </p>
      ) : allBlocks.length === 0 ? (
        <p className="mt-4 text-sm text-gray-500">오늘 예약 가능한 시간이 없습니다.</p>
      ) : (
        <>
          <p className="mt-3 text-xs text-gray-500">
            지금 예약 가능한 시간:{' '}
            <span className="font-semibold text-green-700">{openCount}칸</span>
            {' · '}
            막아 둔 시간:{' '}
            <span className="font-semibold text-gray-700">{ownerClosed.length}칸</span>
          </p>

          <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
            {allBlocks.map((block) => {
              const closed = closedSet.has(block);
              return (
                <button
                  key={block}
                  type="button"
                  disabled={saving}
                  onClick={() => void toggleBlock(block)}
                  className={`rounded-xl border px-2 py-3 text-sm font-semibold transition active:scale-[0.98] disabled:opacity-50 ${
                    closed
                      ? 'border-gray-300 bg-gray-200 text-gray-600'
                      : 'border-green-200 bg-green-50 text-green-900 hover:bg-green-100'
                  }`}
                >
                  <span className="block text-[10px] font-normal opacity-80">
                    {closed ? '막음' : '받음'}
                  </span>
                  {blockLabel(block)}
                </button>
              );
            })}
          </div>

          {closedRanges.length > 0 ? (
            <div className="mt-4 space-y-2 border-t border-gray-100 pt-4">
              <p className="text-sm font-semibold text-gray-800">막아 둔 시간대</p>
              {closedRanges.map((range) => (
                <div
                  key={`${range.start}-${range.endBlock}`}
                  className="flex items-center justify-between gap-2 rounded-xl bg-gray-50 px-3 py-2.5"
                >
                  <span className="text-sm text-gray-800">
                    {formatOwnerClosedRangeLabel(range.start, range.endBlock)
                      .split('~')
                      .map((part, i) => (
                        <span key={i}>
                          {i > 0 ? ' ~ ' : ''}
                          {blockLabel(part.trim())}
                        </span>
                      ))}
                  </span>
                  <button
                    type="button"
                    disabled={saving}
                    onClick={() => void releaseRange(range.blocks)}
                    className="shrink-0 rounded-lg bg-white px-3 py-1.5 text-xs font-semibold text-blue-600 ring-1 ring-blue-200 hover:bg-blue-50 disabled:opacity-50"
                  >
                    다시 받기
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-3 text-xs text-gray-400">아직 막아 둔 시간이 없어요.</p>
          )}
        </>
      )}

      {err ? <p className="mt-2 text-xs text-red-600">{err}</p> : null}
      {saving ? <p className="mt-1 text-xs text-blue-600">저장 중…</p> : null}
    </section>
  );
}
