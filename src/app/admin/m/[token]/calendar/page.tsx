'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useAdminStore } from '../AdminStoreContext';

interface Reservation {
  reservationId: string;
  userName: string;
  groupName: string;
  userPhone: string;
  userNote?: string;
  date: string;
  startTime: string;
  endTime: string;
  headcount: number;
  totalAmount: number;
  depositAmount: number;
  status: string;
  menus: Array<{
    name: string;
    quantity: number;
    priceAtTime: number;
  }>;
}

const WEEK_LABELS = ['일', '월', '화', '수', '목', '금', '토'];

function pad2(n: number) {
  return String(n).padStart(2, '0');
}

function ymdToday(): string {
  const d = new Date();
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

function buildMonthCells(
  year: number,
  month1to12: number,
): { key: string; dateStr: string | null; dayNum: number | null }[] {
  const mi = month1to12 - 1;
  const first = new Date(year, mi, 1);
  const lead = first.getDay();
  const daysInMonth = new Date(year, mi + 1, 0).getDate();
  const cells: { key: string; dateStr: string | null; dayNum: number | null }[] = [];

  for (let i = 0; i < lead; i++) {
    cells.push({ key: `lead-${i}`, dateStr: null, dayNum: null });
  }

  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${year}-${pad2(month1to12)}-${pad2(d)}`;
    cells.push({ key: dateStr, dateStr, dayNum: d });
  }

  while (cells.length % 7 !== 0) {
    cells.push({ key: `trail-${cells.length}`, dateStr: null, dayNum: null });
  }

  return cells;
}

function getStatusColor(status: string): string {
  const s = status.trim();
  if (s === 'PENDING') return 'bg-yellow-400';
  if (s === 'CONFIRMED') return 'bg-green-400';
  if (s === 'DEPOSIT_PENDING') return 'bg-orange-400';
  if (s === 'DEPOSIT_CONFIRMED') return 'bg-blue-400';
  if (s === 'CHECKED_IN') return 'bg-purple-400';
  if (s === 'NO_SHOW') return 'bg-red-400';
  if (s === 'CANCELED') return 'bg-gray-300';
  return 'bg-gray-400';
}

function getStatusLabel(status: string): string {
  const s = status.trim();
  if (s === 'PENDING') return '대기중';
  if (s === 'CONFIRMED') return '예약확정';
  if (s === 'DEPOSIT_PENDING') return '입금대기';
  if (s === 'DEPOSIT_CONFIRMED') return '결제완료';
  if (s === 'CHECKED_IN') return '방문완료';
  if (s === 'NO_SHOW') return '노쇼';
  if (s === 'CANCELED') return '취소됨';
  return s;
}

function getStatusBadgeClass(status: string): string {
  const s = status.trim();
  if (s === 'PENDING') return 'bg-yellow-100 text-yellow-800';
  if (s === 'CONFIRMED' || s === 'DEPOSIT_CONFIRMED') return 'bg-green-100 text-green-800';
  if (s === 'DEPOSIT_PENDING') return 'bg-orange-100 text-orange-800';
  if (s === 'CHECKED_IN') return 'bg-purple-100 text-purple-800';
  if (s === 'NO_SHOW') return 'bg-red-100 text-red-800';
  if (s === 'CANCELED') return 'bg-gray-200 text-gray-600 line-through';
  return 'bg-gray-100 text-gray-700';
}

export default function AdminCalendarByToken() {
  const store = useAdminStore();
  const base = `/admin/m/${encodeURIComponent(store.token)}`;

  const now = new Date();
  const [viewYear, setViewYear] = useState(now.getFullYear());
  const [viewMonth, setViewMonth] = useState(now.getMonth() + 1);
  const [selectedDate, setSelectedDate] = useState<string>(ymdToday());

  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // 상세/액션 모달
  const [detail, setDetail] = useState<Reservation | null>(null);
  // 수정 모달
  const [editTarget, setEditTarget] = useState<Reservation | null>(null);
  const [editStartTime, setEditStartTime] = useState('');
  const [editEndTime, setEditEndTime] = useState('');
  const [editHeadcount, setEditHeadcount] = useState('');

  const monthRange = useMemo(() => {
    const mi = viewMonth - 1;
    const last = new Date(viewYear, mi + 1, 0).getDate();
    const from = `${viewYear}-${pad2(viewMonth)}-01`;
    const to = `${viewYear}-${pad2(viewMonth)}-${pad2(last)}`;
    return { from, to };
  }, [viewYear, viewMonth]);

  const fetchMonthReservations = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { from, to } = monthRange;
      // 캘린더는 모든 상태 포함 (CHECKED_IN, NO_SHOW 등도 보이게)
      const res = await fetch(
        `/api/admin/reservations?storeId=${encodeURIComponent(store.id)}&from=${from}&to=${to}&calendarConfirmed=1`,
      );
      const data = await res.json();
      if (data.success) {
        setReservations((data.data || []) as Reservation[]);
      } else {
        setError(data.message || '예약 목록을 불러올 수 없습니다.');
      }
    } catch {
      setError('예약 목록을 불러오지 못했습니다.');
    } finally {
      setLoading(false);
    }
  }, [store.id, monthRange]);

  useEffect(() => {
    void fetchMonthReservations();
  }, [fetchMonthReservations]);

  const byDate = useMemo(() => {
    const map = new Map<string, Reservation[]>();
    for (const r of reservations) {
      const d = r.date?.slice(0, 10) ?? '';
      if (!d) continue;
      const list = map.get(d) ?? [];
      list.push(r);
      map.set(d, list);
    }
    for (const [, list] of map) {
      list.sort((a, b) => a.startTime.localeCompare(b.startTime));
    }
    return map;
  }, [reservations]);

  const cells = useMemo(() => buildMonthCells(viewYear, viewMonth), [viewYear, viewMonth]);

  const selectedDateReservations = useMemo(() => {
    return byDate.get(selectedDate) ?? [];
  }, [byDate, selectedDate]);

  const callAction = useCallback(
    async (reservationId: string, body: Record<string, unknown>, confirmMessage?: string) => {
      if (confirmMessage && !confirm(confirmMessage)) return false;
      setActionLoading(reservationId);
      try {
        const res = await fetch(`/api/admin/reservations/${reservationId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
        const data = await res.json();
        if (data.success) {
          await fetchMonthReservations();
          return true;
        }
        alert(data.message || '처리에 실패했습니다.');
        return false;
      } catch {
        alert('서버 오류가 발생했습니다.');
        return false;
      } finally {
        setActionLoading(null);
      }
    },
    [fetchMonthReservations],
  );

  const handleCheckIn = async (id: string) => {
    const ok = await callAction(id, { action: 'checkIn' }, '이 예약을 방문 완료로 처리할까요?');
    if (ok) setDetail(null);
  };

  const handleNoShow = async (id: string) => {
    const ok = await callAction(
      id,
      { action: 'noShow' },
      '노쇼로 처리하시겠습니까? 위약금/환불 규정은 가게 정책에 따릅니다.',
    );
    if (ok) setDetail(null);
  };

  const handleCancelReservation = async (id: string) => {
    const ok = await callAction(
      id,
      { action: 'cancel' },
      '이 예약을 취소하시겠습니까? 매장 측 사정으로 직권 취소 처리됩니다.',
    );
    if (ok) setDetail(null);
  };

  const openEdit = (r: Reservation) => {
    setEditTarget(r);
    setEditStartTime((r.startTime ?? '').slice(0, 5));
    setEditEndTime((r.endTime ?? '').slice(0, 5));
    setEditHeadcount(String(r.headcount ?? ''));
  };

  const closeEdit = () => {
    setEditTarget(null);
    setEditStartTime('');
    setEditEndTime('');
    setEditHeadcount('');
  };

  const submitEdit = async () => {
    if (!editTarget) return;
    const headcountNum = parseInt(editHeadcount, 10);
    if (!Number.isFinite(headcountNum) || headcountNum < 1 || headcountNum > 999) {
      alert('인원수는 1 이상 999 이하의 숫자로 입력해 주세요.');
      return;
    }
    if (!/^\d{2}:\d{2}$/.test(editStartTime) || !/^\d{2}:\d{2}$/.test(editEndTime)) {
      alert('시간은 HH:MM 형식으로 입력해 주세요.');
      return;
    }
    const ok = await callAction(editTarget.reservationId, {
      action: 'update',
      startTime: editStartTime,
      endTime: editEndTime,
      headcount: headcountNum,
    });
    if (ok) {
      closeEdit();
      setDetail(null);
    }
  };

  const goPrevMonth = () => {
    setViewMonth((m) => {
      if (m <= 1) {
        setViewYear((y) => y - 1);
        return 12;
      }
      return m - 1;
    });
  };

  const goNextMonth = () => {
    setViewMonth((m) => {
      if (m >= 12) {
        setViewYear((y) => y + 1);
        return 1;
      }
      return m + 1;
    });
  };

  const todayStr = ymdToday();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 헤더 */}
      <header className="sticky top-0 z-20 bg-blue-600 text-white shadow-md">
        <div className="mx-auto max-w-md px-4 py-4">
          <div className="flex items-center justify-between">
            <Link href={base} className="text-white">
              <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </Link>
            <h1 className="text-lg font-bold">캘린더</h1>
            <span className="w-6" />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-md bg-white">
        {/* 월 네비게이션 */}
        <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3">
          <button onClick={goPrevMonth} className="rounded p-2 text-gray-600 hover:bg-gray-100">
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h2 className="text-lg font-bold text-gray-900">
            {viewYear}년 {viewMonth}월
          </h2>
          <button onClick={goNextMonth} className="rounded p-2 text-gray-600 hover:bg-gray-100">
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>

        {/* 캘린더 그리드 */}
        <div className="border-b border-gray-200">
          {/* 요일 헤더 */}
          <div className="grid grid-cols-7 border-b border-gray-200 bg-gray-50">
            {WEEK_LABELS.map((label, idx) => (
              <div
                key={label}
                className={`py-2 text-center text-xs font-semibold ${
                  idx === 0 ? 'text-red-500' : idx === 6 ? 'text-blue-500' : 'text-gray-700'
                }`}
              >
                {label}
              </div>
            ))}
          </div>

          {/* 날짜 셀 */}
          <div className="grid grid-cols-7">
            {cells.map((cell, idx) => {
              const col = idx % 7;
              const isSunCol = col === 0;
              const isSatCol = col === 6;
              const list = cell.dateStr ? byDate.get(cell.dateStr) ?? [] : [];
              const isToday = cell.dateStr === todayStr;
              const isSelected = cell.dateStr === selectedDate;
              const hasReservations = list.length > 0;

              return (
                <button
                  key={cell.key}
                  onClick={() => cell.dateStr && setSelectedDate(cell.dateStr)}
                  disabled={!cell.dateStr}
                  className={`relative min-h-[60px] border-b border-r border-gray-100 p-1 text-center transition ${
                    cell.dateStr ? 'hover:bg-blue-50' : 'bg-gray-50'
                  } ${isSelected ? 'bg-blue-100' : ''}`}
                >
                  {cell.dayNum !== null && (
                    <>
                      <div
                        className={`mx-auto flex h-7 w-7 items-center justify-center text-sm font-medium ${
                          isToday
                            ? 'rounded-full bg-blue-600 text-white'
                            : isSunCol
                              ? 'text-red-500'
                              : isSatCol
                                ? 'text-blue-500'
                                : 'text-gray-800'
                        }`}
                      >
                        {cell.dayNum}
                      </div>
                      {hasReservations && (
                        <div className="absolute bottom-1 left-1/2 flex -translate-x-1/2 gap-0.5">
                          {list.slice(0, 3).map((r, i) => (
                            <div
                              key={i}
                              className={`h-1 w-1 rounded-full ${getStatusColor(r.status)}`}
                            />
                          ))}
                        </div>
                      )}
                    </>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* 선택된 날짜의 예약 목록 */}
        <div className="p-4">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-base font-bold text-gray-900">
              {selectedDate.slice(5, 7)}월 {selectedDate.slice(8, 10)}일 (
              {WEEK_LABELS[new Date(selectedDate).getDay()]}) 예약
            </h3>
            {loading && <span className="text-xs text-gray-400">로딩…</span>}
          </div>

          {error && (
            <div className="mb-3 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              {error}
            </div>
          )}

          {selectedDateReservations.length === 0 ? (
            <div className="py-12 text-center text-gray-500">
              <p>예약이 없습니다</p>
            </div>
          ) : (
            <div className="space-y-3">
              {selectedDateReservations.map((reservation) => (
                <button
                  key={reservation.reservationId}
                  type="button"
                  onClick={() => setDetail(reservation)}
                  className="flex w-full items-center gap-3 rounded-lg border border-gray-200 p-4 text-left transition hover:bg-gray-50"
                >
                  <div
                    className={`h-2 w-2 shrink-0 rounded-full ${getStatusColor(reservation.status)}`}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-gray-900">{reservation.startTime}</span>
                      <span className="text-sm text-gray-500">~ {reservation.endTime}</span>
                      <span
                        className={`ml-auto rounded-full px-2 py-0.5 text-[10px] font-semibold ${getStatusBadgeClass(reservation.status)}`}
                      >
                        {getStatusLabel(reservation.status)}
                      </span>
                    </div>
                    <div className="mt-1 text-sm font-medium text-gray-900">
                      {reservation.groupName || reservation.userName}
                    </div>
                    <div className="mt-0.5 text-xs text-gray-500">{reservation.headcount}명</div>
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* 범례 */}
          <div className="mt-6 grid grid-cols-2 gap-x-3 gap-y-2 rounded-lg border border-gray-100 bg-gray-50 p-3 text-xs text-gray-700">
            <div className="flex items-center gap-1.5">
              <div className="h-2 w-2 rounded-full bg-yellow-400" />
              <span>대기중</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="h-2 w-2 rounded-full bg-green-400" />
              <span>예약확정</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="h-2 w-2 rounded-full bg-orange-400" />
              <span>입금대기</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="h-2 w-2 rounded-full bg-blue-400" />
              <span>결제완료</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="h-2 w-2 rounded-full bg-purple-400" />
              <span>방문완료</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="h-2 w-2 rounded-full bg-red-400" />
              <span>노쇼</span>
            </div>
          </div>
        </div>
      </main>

      {/* 상세 + 액션 모달 */}
      {detail && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center"
          role="dialog"
          aria-modal="true"
          onClick={() => setDetail(null)}
        >
          <div
            className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl bg-white p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-start justify-between gap-2">
              <div>
                <h3 className="text-lg font-bold text-gray-900">
                  {detail.groupName || detail.userName}
                </h3>
                <span
                  className={`mt-1 inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${getStatusBadgeClass(detail.status)}`}
                >
                  {getStatusLabel(detail.status)}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setDetail(null)}
                className="rounded-lg px-2 py-1 text-sm text-gray-500 hover:bg-gray-100"
              >
                닫기
              </button>
            </div>

            <dl className="space-y-3 text-sm">
              <div>
                <dt className="text-gray-500">예약자 이름</dt>
                <dd className="font-medium text-gray-900">{detail.userName || '—'}</dd>
              </div>
              <div>
                <dt className="text-gray-500">날짜 및 시간</dt>
                <dd className="font-medium text-gray-900">
                  {detail.date} {detail.startTime} ~ {detail.endTime}
                </dd>
              </div>
              <div>
                <dt className="text-gray-500">인원</dt>
                <dd className="font-medium text-gray-900">{detail.headcount}명</dd>
              </div>
              <div>
                <dt className="text-gray-500">연락처</dt>
                <dd className="font-medium text-gray-900">{detail.userPhone || '—'}</dd>
              </div>
              {detail.userNote ? (
                <div>
                  <dt className="text-gray-500">요청사항</dt>
                  <dd className="text-gray-800">{detail.userNote}</dd>
                </div>
              ) : null}
            </dl>

            {detail.menus.length > 0 && (
              <div className="mt-4 rounded-lg bg-gray-50 p-3">
                <div className="mb-2 text-xs font-semibold text-gray-700">메뉴</div>
                <ul className="space-y-1 text-sm text-gray-700">
                  {detail.menus.map((m, idx) => (
                    <li key={idx} className="flex justify-between gap-2">
                      <span>
                        {m.name} × {m.quantity}
                      </span>
                      <span className="shrink-0 text-gray-500">
                        {(m.priceAtTime * m.quantity).toLocaleString()}원
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* 액션 버튼 영역 */}
            {(detail.status === 'CONFIRMED' || detail.status === 'DEPOSIT_CONFIRMED') && (
              <div className="mt-6 space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => void handleCheckIn(detail.reservationId)}
                    disabled={actionLoading === detail.reservationId}
                    className="rounded-lg bg-purple-600 py-2.5 text-sm font-semibold text-white hover:bg-purple-700 disabled:opacity-50"
                  >
                    🎉 방문 완료
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleNoShow(detail.reservationId)}
                    disabled={actionLoading === detail.reservationId}
                    className="rounded-lg bg-red-600 py-2.5 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50"
                  >
                    🚫 노쇼 처리
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => openEdit(detail)}
                  disabled={actionLoading === detail.reservationId}
                  className="w-full rounded-lg border border-gray-300 bg-white py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                >
                  ✏️ 시간 / 인원 수정
                </button>
                <button
                  type="button"
                  onClick={() => void handleCancelReservation(detail.reservationId)}
                  disabled={actionLoading === detail.reservationId}
                  className="w-full rounded-lg bg-red-50 py-2.5 text-sm font-semibold text-red-600 hover:bg-red-100 disabled:opacity-50"
                >
                  {actionLoading === detail.reservationId ? '처리 중…' : '예약 직권 취소'}
                </button>
              </div>
            )}

            {detail.status === 'CHECKED_IN' && (
              <div className="mt-6 rounded-lg border border-purple-200 bg-purple-50 p-3 text-sm text-purple-900">
                🎉 방문 완료 처리된 예약입니다.
              </div>
            )}

            {detail.status === 'NO_SHOW' && (
              <div className="mt-6 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-900">
                🚫 노쇼 처리된 예약입니다.
              </div>
            )}

            {detail.status === 'CANCELED' && (
              <div className="mt-6 rounded-lg border border-gray-200 bg-gray-50 p-3 text-sm text-gray-700">
                취소된 예약입니다.
              </div>
            )}
          </div>
        </div>
      )}

      {/* 시간/인원 수정 모달 */}
      {editTarget && (
        <div
          className="fixed inset-0 z-[60] flex items-end justify-center bg-black/40 p-4 sm:items-center"
          role="dialog"
          aria-modal="true"
          onClick={closeEdit}
        >
          <div
            className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-start justify-between">
              <h3 className="text-lg font-bold text-gray-900">예약 시간 / 인원 수정</h3>
              <button
                type="button"
                onClick={closeEdit}
                className="rounded-lg px-2 py-1 text-sm text-gray-500 hover:bg-gray-100"
              >
                닫기
              </button>
            </div>

            <p className="mb-4 text-xs text-gray-500">
              고객 요청에 따라 시간이나 인원을 변경할 수 있습니다. 잔여 좌석 검증은 적용되지
              않으니 신중히 입력해 주세요.
            </p>

            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <label className="block">
                  <span className="text-xs text-gray-500">시작 시간</span>
                  <input
                    type="time"
                    value={editStartTime}
                    onChange={(e) => setEditStartTime(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                  />
                </label>
                <label className="block">
                  <span className="text-xs text-gray-500">종료 시간</span>
                  <input
                    type="time"
                    value={editEndTime}
                    onChange={(e) => setEditEndTime(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                  />
                </label>
              </div>
              <label className="block">
                <span className="text-xs text-gray-500">인원수</span>
                <input
                  type="number"
                  min={1}
                  max={999}
                  value={editHeadcount}
                  onChange={(e) => setEditHeadcount(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                />
              </label>
            </div>

            <div className="mt-5 flex gap-2">
              <button
                type="button"
                onClick={closeEdit}
                disabled={actionLoading === editTarget.reservationId}
                className="flex-1 rounded-lg border border-gray-300 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              >
                취소
              </button>
              <button
                type="button"
                onClick={() => void submitEdit()}
                disabled={actionLoading === editTarget.reservationId}
                className="flex-1 rounded-lg bg-blue-600 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {actionLoading === editTarget.reservationId ? '저장 중…' : '저장'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
