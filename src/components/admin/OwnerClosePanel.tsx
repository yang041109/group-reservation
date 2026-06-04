'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  allHalfHourTimeOptions,
  formatOwnerClosedRangeLabel,
  groupOwnerClosedBlocks,
  type OwnerClosedSlotsPayload,
} from '@/lib/owner-closed-slots';
import { koreaTodayYmd } from '@/lib/korea-time';
import { generateSlotTimeBlocks } from '@/lib/slot-hour-range';
import { invalidateAllDataCache } from '@/lib/use-store-data';

type Props = {
  token: string;
  storeId: string;
};

type BlockMode = 'full' | 'noStart';

const HALF_HOUR_OPTIONS = allHalfHourTimeOptions();

function formatYmdLabel(ymd: string): string {
  const [, m, d] = ymd.split('-');
  return `${parseInt(m, 10)}월 ${parseInt(d, 10)}일`;
}

export default function OwnerClosePanel({ token, storeId }: Props) {
  const today = koreaTodayYmd();
  const [viewDate, setViewDate] = useState(today);
  const [allBlocks, setAllBlocks] = useState<string[]>([]);
  const [ownerClosed, setOwnerClosed] = useState<string[]>([]);
  const [ownerNoStart, setOwnerNoStart] = useState<string[]>([]);
  const [closedEntries, setClosedEntries] = useState<OwnerClosedSlotsPayload[]>([]);
  const [closedOnDate, setClosedOnDate] = useState(false);
  const [crossesMidnight, setCrossesMidnight] = useState(false);
  const [slotStartHour, setSlotStartHour] = useState(11);
  const [slotEndHour, setSlotEndHour] = useState(20);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [rangeStartDate, setRangeStartDate] = useState(today);
  const [rangeEndDate, setRangeEndDate] = useState(today);
  const [rangeStartTime, setRangeStartTime] = useState('14:00');
  const [rangeEndTime, setRangeEndTime] = useState('17:00');
  const [mode, setMode] = useState<BlockMode>('full');

  const closedRanges = useMemo(
    () => groupOwnerClosedBlocks(ownerClosed, allBlocks),
    [ownerClosed, allBlocks],
  );
  const noStartRanges = useMemo(
    () => groupOwnerClosedBlocks(ownerNoStart, allBlocks),
    [ownerNoStart, allBlocks],
  );

  const allEntriesDisplay = useMemo(() => {
    return closedEntries.map((entry) => {
      const blocks = generateSlotTimeBlocks(slotStartHour, slotEndHour, crossesMidnight);
      const fullRanges = groupOwnerClosedBlocks(entry.blocks, blocks);
      const noRanges = groupOwnerClosedBlocks(entry.noStartBlocks ?? [], blocks);
      return { entry, fullRanges, noRanges };
    });
  }, [closedEntries, slotStartHour, slotEndHour, crossesMidnight]);

  const load = useCallback(
    async (ymd: string) => {
      setLoading(true);
      setErr(null);
      try {
        const q = new URLSearchParams({ token });
        if (ymd) q.set('date', ymd);
        const res = await fetch(`/api/admin/store/today-timeline?${q.toString()}`);
        const data = await res.json();
        if (!res.ok || !data.success) {
          setErr(data.message || '설정을 불러오지 못했습니다.');
          return;
        }
        const d = data.data;
        const blocks = (d.slots || []).map((s: { timeBlock: string }) => s.timeBlock);
        setViewDate(d.date);
        setAllBlocks(blocks);
        setOwnerClosed(d.ownerClosedBlocks || []);
        setOwnerNoStart(d.ownerNoStartBlocks || []);
        setClosedEntries(d.closedEntries || []);
        setClosedOnDate(d.closedOnDate);
        setCrossesMidnight(!!d.crossesMidnight);
        setSlotStartHour(d.slotStartHour ?? 11);
        setSlotEndHour(d.slotEndHour ?? 20);
        if (blocks.length) {
          setRangeStartTime((prev) => (HALF_HOUR_OPTIONS.includes(prev) ? prev : blocks[0]));
          setRangeEndTime((prev) =>
            HALF_HOUR_OPTIONS.includes(prev) ? prev : blocks[blocks.length - 1],
          );
        }
      } catch {
        setErr('네트워크 오류');
      } finally {
        setLoading(false);
      }
    },
    [token],
  );

  useEffect(() => {
    void load(viewDate);
  }, [load, viewDate]);

  const persistBlocks = async (date: string, nextBlocks: string[], nextNoStart: string[]) => {
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
      await load(viewDate);
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
    if (!rangeStartDate || !rangeEndDate || !rangeStartTime || !rangeEndTime) return;
    setSaving(true);
    setErr(null);
    try {
      const res = await fetch('/api/admin/store/closed-slots', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          storeId,
          action: 'applyRange',
          startDate: rangeStartDate,
          startTime: rangeStartTime,
          endDate: rangeEndDate,
          endTime: rangeEndTime,
          mode,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setErr(data.message || '저장에 실패했습니다.');
        return;
      }
      await load(viewDate);
      void invalidateAllDataCache();
    } catch {
      setErr('네트워크 오류');
    } finally {
      setSaving(false);
    }
  };

  const releaseRangeFull = async (date: string, blocks: string[]) => {
    const entry = closedEntries.find((e) => e.date === date);
    if (!entry) return;
    const remove = new Set(blocks);
    const next = entry.blocks.filter((b) => !remove.has(b));
    await persistBlocks(date, next, entry.noStartBlocks ?? []);
  };

  const releaseRangeNoStart = async (date: string, blocks: string[]) => {
    const entry = closedEntries.find((e) => e.date === date);
    if (!entry) return;
    const remove = new Set(blocks);
    const next = (entry.noStartBlocks ?? []).filter((b) => !remove.has(b));
    await persistBlocks(date, entry.blocks, next);
  };

  return (
    <section className="mb-5 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
      <h2 className="text-base font-bold text-gray-900">예약 막기</h2>
      <p className="mt-1 text-xs text-gray-500">
        날짜·시간 구간을 지정해 예약을 막을 수 있습니다. (30분 단위)
      </p>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <label className="text-xs font-medium text-gray-600">목록 보기</label>
        <input
          type="date"
          value={viewDate}
          onChange={(e) => setViewDate(e.target.value)}
          disabled={saving}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
        />
      </div>

      {loading ? (
        <p className="mt-3 text-sm text-gray-400">불러오는 중…</p>
      ) : closedOnDate ? (
        <p className="mt-3 text-sm text-amber-800">선택한 날짜는 휴무일입니다.</p>
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

            <div className="space-y-3 rounded-xl border border-gray-100 bg-gray-50 p-3">
              <div className="flex flex-wrap items-center gap-2">
                <input
                  type="date"
                  value={rangeStartDate}
                  onChange={(e) => setRangeStartDate(e.target.value)}
                  disabled={saving}
                  className="rounded-lg border border-gray-300 bg-white px-2 py-2 text-sm"
                  aria-label="시작 날짜"
                />
                <select
                  className="rounded-lg border border-gray-300 bg-white px-2 py-2 text-sm font-medium text-gray-900"
                  value={rangeStartTime}
                  onChange={(e) => setRangeStartTime(e.target.value)}
                  disabled={saving}
                  aria-label="시작 시간"
                >
                  {HALF_HOUR_OPTIONS.map((t) => (
                    <option key={`rs-${t}`} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
                <span className="text-sm text-gray-600">부터</span>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <input
                  type="date"
                  value={rangeEndDate}
                  onChange={(e) => setRangeEndDate(e.target.value)}
                  disabled={saving}
                  className="rounded-lg border border-gray-300 bg-white px-2 py-2 text-sm"
                  aria-label="종료 날짜"
                />
                <select
                  className="rounded-lg border border-gray-300 bg-white px-2 py-2 text-sm font-medium text-gray-900"
                  value={rangeEndTime}
                  onChange={(e) => setRangeEndTime(e.target.value)}
                  disabled={saving}
                  aria-label="종료 시간"
                >
                  {HALF_HOUR_OPTIONS.map((t) => (
                    <option key={`re-${t}`} value={t}>
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
          </div>

          {viewDate && !closedOnDate ? (
            <div className="mt-4 border-t border-gray-100 pt-3">
              <p className="text-xs font-semibold text-gray-600">
                {formatYmdLabel(viewDate)} 마감 내역
              </p>
              {closedRanges.length === 0 && noStartRanges.length === 0 ? (
                <p className="mt-1 text-xs text-gray-400">차단된 시간이 없습니다.</p>
              ) : (
                <div className="mt-2 space-y-2 text-sm text-gray-700">
                  {closedRanges.length > 0 && (
                    <p>
                      <span className="font-medium text-gray-800">전체 차단:</span>{' '}
                      {closedRanges.map((range, i) => (
                        <span key={`vf-${range.start}`}>
                          {i > 0 ? ' / ' : null}
                          <span className="inline-flex items-center gap-1 rounded-lg bg-rose-50 px-2 py-1 align-middle text-sm text-rose-800">
                            {formatOwnerClosedRangeLabel(range.start, range.endBlock)}
                            <button
                              type="button"
                              disabled={saving}
                              onClick={() => void releaseRangeFull(viewDate, range.blocks)}
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
                    <p>
                      <span className="font-medium text-gray-800">시작 시간 차단:</span>{' '}
                      {noStartRanges.map((range, i) => (
                        <span key={`vn-${range.start}`}>
                          {i > 0 ? ' / ' : null}
                          <span className="inline-flex items-center gap-1 rounded-lg bg-amber-50 px-2 py-1 align-middle text-sm text-amber-800">
                            {formatOwnerClosedRangeLabel(range.start, range.endBlock)}
                            <button
                              type="button"
                              disabled={saving}
                              onClick={() => void releaseRangeNoStart(viewDate, range.blocks)}
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
              )}
            </div>
          ) : null}

          {closedEntries.length > 1 ||
          closedEntries.some((e) => e.date !== viewDate) ? (
            <div className="mt-4 space-y-3 border-t border-gray-100 pt-4">
              <p className="text-xs font-semibold text-gray-600">다른 날짜 마감</p>
              {allEntriesDisplay
                .filter((row) => row.entry.date !== viewDate)
                .map(({ entry, fullRanges, noRanges }) => (
                  <div key={entry.date} className="text-sm text-gray-700">
                    <span className="font-medium text-gray-900">{formatYmdLabel(entry.date)}</span>
                    {fullRanges.map((range) => (
                      <span key={`${entry.date}-f-${range.start}`} className="ml-2 inline-flex items-center gap-1 rounded-lg bg-rose-50 px-2 py-0.5 text-xs text-rose-800">
                        {formatOwnerClosedRangeLabel(range.start, range.endBlock)}
                        <button
                          type="button"
                          disabled={saving}
                          onClick={() => void releaseRangeFull(entry.date, range.blocks)}
                          className="font-semibold text-blue-600 hover:underline"
                        >
                          해제
                        </button>
                      </span>
                    ))}
                    {noRanges.map((range) => (
                      <span key={`${entry.date}-n-${range.start}`} className="ml-2 inline-flex items-center gap-1 rounded-lg bg-amber-50 px-2 py-0.5 text-xs text-amber-800">
                        {formatOwnerClosedRangeLabel(range.start, range.endBlock)}
                        <button
                          type="button"
                          disabled={saving}
                          onClick={() => void releaseRangeNoStart(entry.date, range.blocks)}
                          className="font-semibold text-blue-600 hover:underline"
                        >
                          해제
                        </button>
                      </span>
                    ))}
                  </div>
                ))}
            </div>
          ) : null}
        </>
      )}

      {err ? <p className="mt-2 text-xs text-red-600">{err}</p> : null}
      {saving ? <p className="mt-1 text-xs text-blue-600">저장 중…</p> : null}
    </section>
  );
}
