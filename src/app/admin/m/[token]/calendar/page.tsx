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

type EventCategory = 'BLOCK' | 'NOTICE' | 'MEMO' | 'OTHER';

interface StoreEvent {
  eventId: string;
  storeId: string;
  title: string;
  memo: string;
  category: EventCategory;
  date: string;
  startTime: string;
  endTime: string;
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

function getEventDotColor(category: EventCategory): string {
  if (category === 'BLOCK') return 'bg-red-500';
  if (category === 'NOTICE') return 'bg-violet-500';
  if (category === 'MEMO') return 'bg-amber-500';
  return 'bg-slate-500';
}

function getEventCategoryLabel(category: EventCategory): string {
  if (category === 'BLOCK') return '예약 차단';
  if (category === 'NOTICE') return '공지';
  if (category === 'MEMO') return '메모';
  return '기타';
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
  const [editAgreed, setEditAgreed] = useState(false);
  const [editNotice, setEditNotice] = useState('');
  // 직권 취소 모달
  const [cancelTarget, setCancelTarget] = useState<Reservation | null>(null);
  const [cancelReasonDraft, setCancelReasonDraft] = useState('');
  const [cancelAlternativeDraft, setCancelAlternativeDraft] = useState('');

  // 일정(이벤트) 관련
  const [events, setEvents] = useState<StoreEvent[]>([]);
  const [eventCreateOpen, setEventCreateOpen] = useState(false);
  const [eventTitle, setEventTitle] = useState('');
  const [eventMemo, setEventMemo] = useState('');
  const [eventCategory, setEventCategory] = useState<EventCategory>('NOTICE');
  const [eventStartTime, setEventStartTime] = useState('09:00');
  const [eventEndTime, setEventEndTime] = useState('10:00');
  const [eventLoading, setEventLoading] = useState(false);

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
        `/api/admin/reservations?storeId=${encodeURIComponent(store.id)}&from=${from}&to=${to}&calendarVisible=1`,
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

  const fetchMonthEvents = useCallback(async () => {
    try {
      const { from, to } = monthRange;
      const res = await fetch(
        `/api/admin/events?storeId=${encodeURIComponent(store.id)}&from=${from}&to=${to}`,
      );
      const data = await res.json();
      if (data.success) {
        setEvents((data.data || []) as StoreEvent[]);
      }
    } catch {
      // 무시 (이벤트 테이블 미생성 환경에서 페이지 깨지지 않도록)
    }
  }, [store.id, monthRange]);

  useEffect(() => {
    void fetchMonthReservations();
    void fetchMonthEvents();
  }, [fetchMonthReservations, fetchMonthEvents]);

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

  const eventsByDate = useMemo(() => {
    const map = new Map<string, StoreEvent[]>();
    for (const e of events) {
      const d = e.date?.slice(0, 10) ?? '';
      if (!d) continue;
      const list = map.get(d) ?? [];
      list.push(e);
      map.set(d, list);
    }
    for (const [, list] of map) {
      list.sort((a, b) => a.startTime.localeCompare(b.startTime));
    }
    return map;
  }, [events]);

  const cells = useMemo(() => buildMonthCells(viewYear, viewMonth), [viewYear, viewMonth]);

  const selectedDateReservations = useMemo(() => {
    return byDate.get(selectedDate) ?? [];
  }, [byDate, selectedDate]);

  const selectedDateEvents = useMemo(() => {
    return eventsByDate.get(selectedDate) ?? [];
  }, [eventsByDate, selectedDate]);

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

  const openCancel = (r: Reservation) => {
    setCancelTarget(r);
    setCancelReasonDraft('');
    setCancelAlternativeDraft('');
  };

  const closeCancel = () => {
    setCancelTarget(null);
    setCancelReasonDraft('');
    setCancelAlternativeDraft('');
  };

  const submitCancel = async () => {
    if (!cancelTarget) return;
    const trimmed = cancelReasonDraft.trim();
    const altTrimmed = cancelAlternativeDraft.trim();
    if (!trimmed) {
      alert('취소 사유를 입력해 주세요. (예약자에게 안내됩니다)');
      return;
    }
    if (trimmed.length > 500) {
      alert('취소 사유는 500자 이내로 입력해 주세요.');
      return;
    }
    if (altTrimmed.length > 500) {
      alert('대안 안내는 500자 이내로 입력해 주세요.');
      return;
    }
    const ok = await callAction(cancelTarget.reservationId, {
      action: 'cancel',
      reason: trimmed,
      alternative: altTrimmed || undefined,
    });
    if (ok) {
      closeCancel();
      setDetail(null);
    }
  };

  const openEdit = (r: Reservation) => {
    setEditTarget(r);
    setEditStartTime((r.startTime ?? '').slice(0, 5));
    setEditEndTime((r.endTime ?? '').slice(0, 5));
    setEditHeadcount(String(r.headcount ?? ''));
    setEditAgreed(false);
    setEditNotice('');
  };

  const closeEdit = () => {
    setEditTarget(null);
    setEditStartTime('');
    setEditEndTime('');
    setEditHeadcount('');
    setEditAgreed(false);
    setEditNotice('');
  };

  const submitEdit = async () => {
    if (!editTarget) return;
    if (!editAgreed) {
      alert('예약자와 변경에 대해 합의된 상태인지 먼저 확인해 주세요.');
      return;
    }
    const headcountNum = parseInt(editHeadcount, 10);
    if (!Number.isFinite(headcountNum) || headcountNum < 1 || headcountNum > 999) {
      alert('인원수는 1 이상 999 이하의 숫자로 입력해 주세요.');
      return;
    }
    if (!/^\d{2}:\d{2}$/.test(editStartTime) || !/^\d{2}:\d{2}$/.test(editEndTime)) {
      alert('시간은 HH:MM 형식으로 입력해 주세요.');
      return;
    }
    const noticeTrimmed = editNotice.trim();
    if (noticeTrimmed.length > 500) {
      alert('안내 메시지는 500자 이내로 입력해 주세요.');
      return;
    }
    const ok = await callAction(editTarget.reservationId, {
      action: 'update',
      startTime: editStartTime,
      endTime: editEndTime,
      headcount: headcountNum,
      notice: noticeTrimmed || undefined,
    });
    if (ok) {
      closeEdit();
      setDetail(null);
    }
  };

  const openEventCreate = () => {
    setEventTitle('');
    setEventMemo('');
    setEventCategory('NOTICE');
    setEventStartTime('09:00');
    setEventEndTime('10:00');
    setEventCreateOpen(true);
  };

  const closeEventCreate = () => {
    setEventCreateOpen(false);
  };

  const submitEventCreate = async () => {
    const title = eventTitle.trim();
    if (!title) {
      alert('일정 제목을 입력해 주세요.');
      return;
    }
    if (!/^\d{2}:\d{2}$/.test(eventStartTime) || !/^\d{2}:\d{2}$/.test(eventEndTime)) {
      alert('시간은 HH:MM 형식으로 입력해 주세요.');
      return;
    }
    setEventLoading(true);
    try {
      const res = await fetch('/api/admin/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          storeId: store.id,
          title,
          memo: eventMemo.trim() || undefined,
          category: eventCategory,
          date: selectedDate,
          startTime: eventStartTime,
          endTime: eventEndTime,
        }),
      });
      const data = await res.json();
      if (data.success) {
        await fetchMonthEvents();
        closeEventCreate();
      } else {
        alert(data.message || '일정 등록에 실패했습니다.');
      }
    } catch {
      alert('서버 오류가 발생했습니다.');
    } finally {
      setEventLoading(false);
    }
  };

  const handleDeleteEvent = async (eventId: string) => {
    if (!confirm('이 일정을 삭제하시겠습니까?')) return;
    setEventLoading(true);
    try {
      const res = await fetch(
        `/api/admin/events/${encodeURIComponent(eventId)}?storeId=${encodeURIComponent(store.id)}`,
        { method: 'DELETE' },
      );
      const data = await res.json();
      if (data.success) {
        await fetchMonthEvents();
      } else {
        alert(data.message || '삭제에 실패했습니다.');
      }
    } catch {
      alert('서버 오류가 발생했습니다.');
    } finally {
      setEventLoading(false);
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
              const eventList = cell.dateStr ? eventsByDate.get(cell.dateStr) ?? [] : [];
              const isToday = cell.dateStr === todayStr;
              const isSelected = cell.dateStr === selectedDate;
              const hasReservations = list.length > 0;
              const hasEvents = eventList.length > 0;

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
                      {(hasReservations || hasEvents) && (
                        <div className="absolute bottom-1 left-1/2 flex -translate-x-1/2 gap-0.5">
                          {list.slice(0, 3).map((r, i) => (
                            <div
                              key={`r-${i}`}
                              className={`h-1 w-1 rounded-full ${getStatusColor(r.status)}`}
                            />
                          ))}
                          {eventList.slice(0, 3).map((e, i) => (
                            <div
                              key={`e-${i}`}
                              className={`h-1 w-1 rounded-full ${getEventDotColor(e.category)}`}
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

          {selectedDateReservations.length === 0 && selectedDateEvents.length === 0 ? (
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

              {selectedDateEvents.map((ev) => (
                <div
                  key={ev.eventId}
                  className="flex w-full items-center gap-3 rounded-lg border border-dashed border-gray-300 bg-gray-50 p-4"
                >
                  <div
                    className={`h-2 w-2 shrink-0 rounded-full ${getEventDotColor(ev.category)}`}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-gray-900">{ev.startTime}</span>
                      <span className="text-sm text-gray-500">~ {ev.endTime}</span>
                      <span className="ml-auto rounded-full bg-gray-200 px-2 py-0.5 text-[10px] font-semibold text-gray-700">
                        {getEventCategoryLabel(ev.category)}
                      </span>
                    </div>
                    <div className="mt-1 text-sm font-medium text-gray-900">{ev.title}</div>
                    {ev.memo ? (
                      <div className="mt-0.5 text-xs text-gray-500">{ev.memo}</div>
                    ) : null}
                  </div>
                  <button
                    type="button"
                    onClick={() => void handleDeleteEvent(ev.eventId)}
                    disabled={eventLoading}
                    className="shrink-0 rounded-lg p-1 text-gray-400 hover:bg-gray-200 hover:text-red-600 disabled:opacity-50"
                    aria-label="삭제"
                  >
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6M1 7h22M9 7V4a1 1 0 011-1h4a1 1 0 011 1v3"
                      />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* 일정 등록 버튼 */}
          <button
            type="button"
            onClick={openEventCreate}
            className="mt-6 w-full rounded-2xl bg-blue-600 py-4 text-base font-bold text-white shadow-md transition hover:bg-blue-700"
          >
            + 일정 등록
          </button>

          {/* 범례 */}
          <div className="mt-4 grid grid-cols-2 gap-x-3 gap-y-2 rounded-lg border border-gray-100 bg-gray-50 p-3 text-xs text-gray-700">
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
            <div className="flex items-center gap-1.5">
              <div className="h-2 w-2 rounded-full bg-violet-500" />
              <span>공지</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="h-2 w-2 rounded-full bg-amber-500" />
              <span>메모</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="h-2 w-2 rounded-full bg-red-500" />
              <span>예약 차단</span>
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
                  onClick={() => openCancel(detail)}
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
            className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl bg-white p-6 shadow-xl"
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

            <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
              <p className="font-semibold">⚠️ 예약자 합의 확인</p>
              <p className="mt-1 text-amber-800">
                예약자(<span className="font-medium">{editTarget.userName}</span>)와 시간/인원
                변경에 대해 미리 합의하셨나요? 합의되지 않은 임의 변경은 분쟁의 소지가 됩니다.
              </p>
              <label className="mt-3 flex cursor-pointer items-start gap-2">
                <input
                  type="checkbox"
                  checked={editAgreed}
                  onChange={(e) => setEditAgreed(e.target.checked)}
                  className="mt-0.5"
                />
                <span className="text-sm font-medium text-amber-900">
                  예약자와 합의된 변경입니다
                </span>
              </label>
            </div>

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

              <label className="block">
                <span className="text-xs text-gray-500">예약자에게 보일 안내 (선택)</span>
                <textarea
                  rows={3}
                  maxLength={500}
                  value={editNotice}
                  onChange={(e) => setEditNotice(e.target.value)}
                  placeholder="비워두면 '사장님이 예약 정보를 수정했어요. 변경된 내용을 확인해 주세요.' 라고 안내됩니다."
                  className="mt-1 w-full resize-none rounded-lg border border-gray-300 px-3 py-2 text-sm"
                />
                <span className="mt-1 block text-right text-xs text-gray-400">
                  {editNotice.length} / 500
                </span>
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
                disabled={actionLoading === editTarget.reservationId || !editAgreed}
                className="flex-1 rounded-lg bg-blue-600 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {actionLoading === editTarget.reservationId ? '저장 중…' : '저장'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 직권 취소 모달 */}
      {cancelTarget && (
        <div
          className="fixed inset-0 z-[60] flex items-end justify-center bg-black/40 p-4 sm:items-center"
          role="dialog"
          aria-modal="true"
          onClick={() => {
            if (actionLoading !== cancelTarget.reservationId) closeCancel();
          }}
        >
          <div
            className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl bg-white p-5 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-lg font-bold text-gray-900">예약 직권 취소</h2>
            <p className="mt-1 text-sm text-gray-600">
              매장 측 사정으로 확정된 예약을 취소합니다. 입력하신 사유는 예약자의 &quot;내 예약
              조회&quot; 화면에 표시됩니다.
            </p>

            <div className="mt-3 rounded-lg bg-gray-50 p-3 text-xs text-gray-700">
              <p>
                예약자: <span className="font-medium">{cancelTarget.userName}</span>
                {cancelTarget.groupName ? ` (${cancelTarget.groupName})` : ''}
              </p>
              <p className="mt-0.5">
                일시: {cancelTarget.date} {cancelTarget.startTime} ~ {cancelTarget.endTime}
              </p>
            </div>

            <label
              htmlFor="cancel-reason"
              className="mt-4 block text-sm font-medium text-gray-700"
            >
              취소 사유
            </label>
            <textarea
              id="cancel-reason"
              rows={3}
              maxLength={500}
              value={cancelReasonDraft}
              onChange={(e) => setCancelReasonDraft(e.target.value)}
              disabled={actionLoading === cancelTarget.reservationId}
              placeholder="예: 매장 누수로 영업 중단, 단체 행사 변경 등"
              className="mt-1 w-full resize-none rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-gray-100"
            />
            <p className="mt-1 text-right text-xs text-gray-400">
              {cancelReasonDraft.length} / 500
            </p>

            <label
              htmlFor="cancel-alternative"
              className="mt-4 block text-sm font-medium text-gray-700"
            >
              대안 안내 (선택)
            </label>
            <p className="mt-0.5 text-xs text-gray-500">
              예: &quot;다음 주 같은 시간대로 예약 가능합니다. 연락 주세요.&quot;
            </p>
            <textarea
              id="cancel-alternative"
              rows={3}
              maxLength={500}
              value={cancelAlternativeDraft}
              onChange={(e) => setCancelAlternativeDraft(e.target.value)}
              disabled={actionLoading === cancelTarget.reservationId}
              placeholder="고객에게 전달할 대안이 있다면 입력해 주세요."
              className="mt-1 w-full resize-none rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-gray-100"
            />
            <p className="mt-1 text-right text-xs text-gray-400">
              {cancelAlternativeDraft.length} / 500
            </p>

            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={closeCancel}
                disabled={actionLoading === cancelTarget.reservationId}
                className="flex-1 rounded-lg border border-gray-300 py-3 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 disabled:opacity-50"
              >
                닫기
              </button>
              <button
                type="button"
                onClick={() => void submitCancel()}
                disabled={actionLoading === cancelTarget.reservationId}
                className="flex-1 rounded-lg bg-red-600 py-3 text-sm font-semibold text-white transition hover:bg-red-700 disabled:opacity-50"
              >
                {actionLoading === cancelTarget.reservationId ? '처리 중...' : '취소 처리'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 일정 등록 모달 */}
      {eventCreateOpen && (
        <div
          className="fixed inset-0 z-[60] flex items-end justify-center bg-black/40 p-4 sm:items-center"
          role="dialog"
          aria-modal="true"
          onClick={() => {
            if (!eventLoading) closeEventCreate();
          }}
        >
          <div
            className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl bg-white p-5 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-start justify-between">
              <div>
                <h3 className="text-lg font-bold text-gray-900">일정 등록</h3>
                <p className="mt-0.5 text-xs text-gray-500">{selectedDate}에 등록됩니다</p>
              </div>
              <button
                type="button"
                onClick={closeEventCreate}
                disabled={eventLoading}
                className="rounded-lg px-2 py-1 text-sm text-gray-500 hover:bg-gray-100 disabled:opacity-50"
              >
                닫기
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-xs text-gray-500">분류</label>
                <div className="mt-1 grid grid-cols-4 gap-2">
                  {(['NOTICE', 'MEMO', 'BLOCK', 'OTHER'] as EventCategory[]).map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setEventCategory(c)}
                      disabled={eventLoading}
                      className={`flex flex-col items-center gap-1 rounded-lg border p-2 text-xs transition ${
                        eventCategory === c
                          ? 'border-blue-500 bg-blue-50 text-blue-700'
                          : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      <span className={`h-2 w-2 rounded-full ${getEventDotColor(c)}`} />
                      <span className="font-medium">{getEventCategoryLabel(c)}</span>
                    </button>
                  ))}
                </div>
              </div>

              <label className="block">
                <span className="text-xs text-gray-500">제목</span>
                <input
                  type="text"
                  value={eventTitle}
                  onChange={(e) => setEventTitle(e.target.value)}
                  disabled={eventLoading}
                  maxLength={120}
                  placeholder="예: 임시 휴무, 단체 행사 안내"
                  className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-gray-100"
                />
              </label>

              <div className="grid grid-cols-2 gap-3">
                <label className="block">
                  <span className="text-xs text-gray-500">시작 시간</span>
                  <input
                    type="time"
                    value={eventStartTime}
                    onChange={(e) => setEventStartTime(e.target.value)}
                    disabled={eventLoading}
                    className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm disabled:bg-gray-100"
                  />
                </label>
                <label className="block">
                  <span className="text-xs text-gray-500">종료 시간</span>
                  <input
                    type="time"
                    value={eventEndTime}
                    onChange={(e) => setEventEndTime(e.target.value)}
                    disabled={eventLoading}
                    className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm disabled:bg-gray-100"
                  />
                </label>
              </div>

              <label className="block">
                <span className="text-xs text-gray-500">메모 (선택)</span>
                <textarea
                  rows={3}
                  maxLength={500}
                  value={eventMemo}
                  onChange={(e) => setEventMemo(e.target.value)}
                  disabled={eventLoading}
                  placeholder="추가 메모"
                  className="mt-1 w-full resize-none rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-gray-100"
                />
                <span className="mt-1 block text-right text-xs text-gray-400">
                  {eventMemo.length} / 500
                </span>
              </label>
            </div>

            <div className="mt-5 flex gap-2">
              <button
                type="button"
                onClick={closeEventCreate}
                disabled={eventLoading}
                className="flex-1 rounded-lg border border-gray-300 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              >
                취소
              </button>
              <button
                type="button"
                onClick={() => void submitEventCreate()}
                disabled={eventLoading}
                className="flex-1 rounded-lg bg-blue-600 py-3 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {eventLoading ? '등록 중...' : '등록'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
