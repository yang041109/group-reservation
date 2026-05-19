'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { ADMIN_MANAGE_SECRET_HEADER } from '@/lib/admin-manage-constants';
import {
  formatReservationStatus,
  RESERVATION_STATUS_FILTER_OPTIONS,
} from '@/lib/reservation-status-labels';
import StoreBusinessHoursFields, {
  defaultWeeklyForm,
  type DayFormRow,
} from '@/components/admin/StoreBusinessHoursFields';
import {
  DAY_KEYS,
  type DayKey,
  isWeeklyHoursEnabled,
  parseClosedDatesJson,
  parseWeeklyHoursJson,
  serializeClosedDatesForDb,
  serializeWeeklyHoursForDb,
} from '@/lib/store-weekly-hours';
import { invalidateAllDataCache } from '@/lib/use-store-data';
import DepositSettingsFields, {
  defaultDepositTierRows,
  type DepositTierFormRow,
} from '@/components/admin/DepositSettingsFields';
import {
  depositModeFromDb,
  depositRequiresBankInfo,
  type DepositMode,
} from '@/lib/deposit-tiers';
import type { DepositTier } from '@/types';

const STORAGE_KEY = 'urr_admin_manage_secret';

type DbHealthJson = {
  ok?: boolean;
  mysqlEnvConfigured?: boolean;
  ping?: string;
  message?: string;
  hint?: string;
};

type ManageStore = {
  storeId: string;
  name: string;
  locationLabel: string | null;
  maxCapacity: number;
  minGroupHeadcount: number;
  imageUrl: string | null;
  slotStartHour: number | null;
  slotEndHour: number | null;
  depositAmount: number;
  depositMode?: DepositMode;
  depositUseTiers: boolean;
  depositTiers: DepositTier[];
  ownerName: string | null;
  ownerBankAccount: string | null;
  weeklyHoursJson: string | null;
  closedDatesJson: string | null;
  adminAccessToken: string | null;
  sortOrder: number;
};

type TierRow = DepositTierFormRow;

function defaultTierRows(): TierRow[] {
  return defaultDepositTierRows();
}

type ManageMenu = {
  storeId: string;
  menuId: string;
  name: string;
  price: number;
  category: string;
  isRequired: boolean;
  imageUrl: string | null;
};

type ManageReservation = {
  reservationId: string;
  storeId: string;
  storeName: string;
  userName: string;
  groupName: string;
  userPhone: string;
  date: string;
  startTime: string;
  endTime: string;
  headcount: number;
  totalAmount: number;
  status: string;
  depositAmount: number;
  createdAt: string;
};

/** 서버에 ADMIN_MANAGE_SECRET이 없으면 헤더 없이 호출(MVP). 있으면 sessionStorage 값 전달. */
function manageFetch(optionalSecret: string | null, path: string, init?: RequestInit) {
  const headers = new Headers(init?.headers);
  const s = optionalSecret?.trim();
  if (s) headers.set(ADMIN_MANAGE_SECRET_HEADER, s);
  if (init?.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }
  return fetch(path, { ...init, headers });
}

export default function ManagePageClient() {
  const [secretInput, setSecretInput] = useState('');
  /** 서버가 ADMIN_MANAGE_SECRET을 요구할 때만 sessionStorage에서 채움 (MVP에서는 null로 둬도 됨) */
  const [storedSecret, setStoredSecret] = useState<string | null>(null);
  const [showAuthHint, setShowAuthHint] = useState(false);
  const [tab, setTab] = useState<'stores' | 'reservations'>('stores');
  const [stores, setStores] = useState<ManageStore[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [locationLabel, setLocationLabel] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [depositFlat, setDepositFlat] = useState('0');
  const [depositMode, setDepositMode] = useState<DepositMode>('flat');
  const [tierRows, setTierRows] = useState<TierRow[]>(defaultTierRows);
  const [newStoreId, setNewStoreId] = useState('');
  const [newStoreName, setNewStoreName] = useState('');
  const [newStoreMaxCap, setNewStoreMaxCap] = useState('80');
  const [menus, setMenus] = useState<ManageMenu[]>([]);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const [newMenu, setNewMenu] = useState({
    menuId: '',
    name: '',
    price: '',
    isRequired: false,
    imageUrl: '',
  });

  const [reservations, setReservations] = useState<ManageReservation[]>([]);
  const [resTotal, setResTotal] = useState(0);
  const [resOffset, setResOffset] = useState(0);
  const [resFilterStoreId, setResFilterStoreId] = useState('');
  const [resFilterStatus, setResFilterStatus] = useState('');
  const [resDepositSum, setResDepositSum] = useState(0);
  const [minGroupHeadcount, setMinGroupHeadcount] = useState('2');
  const [maxCapacity, setMaxCapacity] = useState('80');
  const [ownerName, setOwnerName] = useState('');
  const [ownerBankAccount, setOwnerBankAccount] = useState('');
  const [slotStartHour, setSlotStartHour] = useState('11');
  const [slotEndHour, setSlotEndHour] = useState('20');
  const [useWeeklyHours, setUseWeeklyHours] = useState(false);
  const [weeklyForm, setWeeklyForm] = useState<Record<DayKey, DayFormRow>>(() => defaultWeeklyForm());
  const [closedDatesText, setClosedDatesText] = useState('');
  const resLimit = 50;
  const [dbHealth, setDbHealth] = useState<DbHealthJson | null>(null);

  const selected = useMemo(() => stores.find((s) => s.storeId === selectedId) ?? null, [stores, selectedId]);

  const showBankFields = depositRequiresBankInfo({
    depositMode,
    flatDepositAmount: parseInt(depositFlat, 10) || 0,
    depositTiers: tierRows.map((row) => ({
      minHeadcount: parseInt(row.min, 10) || 0,
      maxHeadcount: parseInt(row.max, 10) || 0,
      amount: parseInt(row.amount, 10) || 0,
      calcType: row.calcType,
    })),
  });

  useEffect(() => {
    void (async () => {
      try {
        const res = await fetch('/api/admin/health');
        const j = (await res.json()) as DbHealthJson;
        setDbHealth(j);
      } catch {
        setDbHealth({
          ok: false,
          hint: '/api/admin/health 요청에 실패했습니다. 네트워크·CORS를 확인하세요.',
        });
      }
    })();
  }, []);

  useEffect(() => {
    const s = typeof window !== 'undefined' ? sessionStorage.getItem(STORAGE_KEY) : null;
    if (s) setStoredSecret(s);
  }, []);

  const saveSecret = async () => {
    const t = secretInput.trim();
    if (t.length < 12) {
      setErr('비밀키는 12자 이상으로 입력하세요. (서버 ADMIN_MANAGE_SECRET과 동일)');
      return;
    }
    sessionStorage.setItem(STORAGE_KEY, t);
    setStoredSecret(t);
    setSecretInput('');
    setErr(null);
    setShowAuthHint(false);
    setMsg('비밀키를 저장했습니다.');
    await loadStores(t);
  };

  const clearSecret = () => {
    sessionStorage.removeItem(STORAGE_KEY);
    setStoredSecret(null);
    setShowAuthHint(false);
    setStores([]);
    setSelectedId(null);
    setMenus([]);
    setReservations([]);
  };

  const loadStores = useCallback(async (secretOverride?: string | null) => {
    const sec = secretOverride !== undefined ? secretOverride : storedSecret;
    setLoading(true);
    setErr(null);
    try {
      const res = await manageFetch(sec, '/api/admin/manage/stores');
      const data = await res.json();
      if (!res.ok) {
        setErr(data.message || '가게 목록을 불러오지 못했습니다.');
        if (res.status === 401) {
          sessionStorage.removeItem(STORAGE_KEY);
          setStoredSecret(null);
          setStores([]);
          setSelectedId(null);
          setShowAuthHint(true);
        }
        return;
      }
      setStores(data.data || []);
      setShowAuthHint(false);
    } catch {
      setErr('네트워크 오류');
    } finally {
      setLoading(false);
    }
  }, [storedSecret]);

  useEffect(() => {
    void loadStores();
  }, [loadStores]);

  useEffect(() => {
    if (!selected) {
      setName('');
      setLocationLabel('');
      setImageUrl('');
      setDepositFlat('0');
      setDepositMode('flat');
      setTierRows(defaultTierRows());
      setMinGroupHeadcount('2');
      setMaxCapacity('80');
      setOwnerName('');
      setOwnerBankAccount('');
      setSlotStartHour('11');
      setSlotEndHour('20');
      setUseWeeklyHours(false);
      setWeeklyForm(defaultWeeklyForm());
      setClosedDatesText('');
      setMenus([]);
      return;
    }
    setName(selected.name);
    setLocationLabel(selected.locationLabel ?? '');
    setImageUrl(selected.imageUrl ?? '');
    setMinGroupHeadcount(String(selected.minGroupHeadcount ?? 2));
    setMaxCapacity(String(selected.maxCapacity ?? 80));
    setOwnerName(selected.ownerName ?? '');
    setOwnerBankAccount(selected.ownerBankAccount ?? '');
    setSlotStartHour(String(selected.slotStartHour ?? 11));
    setSlotEndHour(String(selected.slotEndHour ?? 20));
    const parsedWeekly = parseWeeklyHoursJson(selected.weeklyHoursJson);
    setUseWeeklyHours(
      isWeeklyHoursEnabled(selected as unknown as Record<string, unknown>),
    );
    const wf = defaultWeeklyForm();
    if (parsedWeekly) {
      for (const key of DAY_KEYS) {
        const d = parsedWeekly[key];
        if (d) {
          wf[key] = {
            closed: !!d.closed,
            start: d.start != null ? String(d.start) : wf[key].start,
            end: d.end != null ? String(d.end) : wf[key].end,
          };
        }
      }
    }
    setWeeklyForm(wf);
    setClosedDatesText(parseClosedDatesJson(selected.closedDatesJson).join('\n'));
    setDepositFlat(String(selected.depositAmount ?? 0));
    setDepositMode(
      selected.depositMode ?? depositModeFromDb(selected.depositUseTiers ? 1 : 0),
    );
    setTierRows(
      selected.depositTiers?.length
        ? selected.depositTiers.map((t) => ({
            min: String(t.minHeadcount),
            max: String(t.maxHeadcount),
            amount: String(t.amount),
            calcType: t.calcType === 'per_person' ? 'per_person' : 'fixed',
          }))
        : defaultTierRows(),
    );
  }, [selected]);

  const loadMenus = useCallback(async () => {
    if (!selectedId) return;
    const res = await manageFetch(storedSecret, `/api/admin/manage/stores/${encodeURIComponent(selectedId)}/menus`);
    const data = await res.json();
    if (res.ok) setMenus(data.data || []);
  }, [storedSecret, selectedId]);

  useEffect(() => {
    if (selectedId) void loadMenus();
  }, [selectedId, loadMenus]);

  const saveStore = async () => {
    if (!selectedId) return;
    const minH = Math.max(1, parseInt(minGroupHeadcount, 10) || 2);
    const maxH = Math.max(0, parseInt(maxCapacity, 10) || 0);
    if (maxH > 0 && maxH < minH) {
      setErr('단체예약 최대 인원은 최소 인원 이상이어야 합니다.');
      return;
    }
    setLoading(true);
    setErr(null);
    try {
      const tiersPayload: DepositTier[] =
        depositMode === 'tiered'
          ? tierRows
              .map((row) => ({
                minHeadcount: Math.max(0, parseInt(row.min, 10) || 0),
                maxHeadcount: Math.max(0, parseInt(row.max, 10) || 0),
                amount: Math.max(0, parseInt(row.amount, 10) || 0),
                calcType: row.calcType,
              }))
              .filter((t) => t.maxHeadcount >= t.minHeadcount)
          : [];

      const weeklyPayload: Record<DayKey, DayFormRow> = { ...weeklyForm };
      const closedList = closedDatesText
        .split(/[\n,]+/)
        .map((s) => s.trim())
        .filter((s) => /^\d{4}-\d{2}-\d{2}$/.test(s));

      const res = await manageFetch(storedSecret, `/api/admin/manage/stores/${encodeURIComponent(selectedId)}`, {
        method: 'PATCH',
        body: JSON.stringify({
          name,
          locationLabel: locationLabel.trim() === '' ? null : locationLabel.trim(),
          imageUrl: imageUrl.trim() === '' ? null : imageUrl,
          minGroupHeadcount: minH,
          maxCapacity: maxH,
          depositAmount: Math.max(0, parseInt(depositFlat, 10) || 0),
          depositMode,
          depositTiers: depositMode === 'tiered' ? tiersPayload : null,
          ownerName: showBankFields ? ownerName.trim() || null : null,
          ownerBankAccount: showBankFields ? ownerBankAccount.trim() || null : null,
          slotStartHour: Math.min(23, Math.max(0, parseInt(slotStartHour, 10) || 11)),
          slotEndHour: Math.min(23, Math.max(0, parseInt(slotEndHour, 10) || 20)),
          weeklyHoursJson: useWeeklyHours
            ? serializeWeeklyHoursForDb(
                Object.fromEntries(
                  DAY_KEYS.map((k) => [
                    k,
                    {
                      closed: weeklyPayload[k].closed,
                      start: parseInt(weeklyPayload[k].start, 10),
                      end: parseInt(weeklyPayload[k].end, 10),
                    },
                  ]),
                ),
              )
            : null,
          closedDatesJson: serializeClosedDatesForDb(closedList),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErr(data.message || '저장 실패');
        return;
      }
      setMsg('가게 정보를 저장했습니다.');
      await loadStores();
      void invalidateAllDataCache();
    } catch {
      setErr('저장 중 오류');
    } finally {
      setLoading(false);
    }
  };

  const addStore = async () => {
    const id = newStoreId.trim();
    const nm = newStoreName.trim();
    const cap = parseInt(newStoreMaxCap, 10);
    if (!id || !nm) {
      setErr('새 가게: 가게 ID와 이름을 입력하세요.');
      return;
    }
    setLoading(true);
    setErr(null);
    try {
      const res = await manageFetch(storedSecret, '/api/admin/manage/stores', {
        method: 'POST',
        body: JSON.stringify({
          storeId: id,
          name: nm,
          maxCapacity: Number.isFinite(cap) && cap >= 0 ? cap : 80,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErr(data.message || '가게 추가 실패');
        return;
      }
      setMsg('가게를 추가했습니다.');
      setNewStoreId('');
      setNewStoreName('');
      setNewStoreMaxCap('80');
      setSelectedId(id);
      await loadStores();
    } catch {
      setErr('가게 추가 중 오류');
    } finally {
      setLoading(false);
    }
  };

  const deleteSelectedStore = async () => {
    if (!selectedId || !selected) return;
    if (
      !confirm(
        `「${selected.name}」(${selectedId}) 가게와 연결된 메뉴·최소주문 규칙·예약까지 모두 삭제됩니다. 계속할까요?`,
      )
    ) {
      return;
    }
    setLoading(true);
    setErr(null);
    try {
      const res = await manageFetch(storedSecret, `/api/admin/manage/stores/${encodeURIComponent(selectedId)}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (!res.ok) {
        setErr(data.message || '삭제 실패');
        return;
      }
      setMsg('가게를 삭제했습니다.');
      setSelectedId(null);
      await loadStores();
    } catch {
      setErr('삭제 중 오류');
    } finally {
      setLoading(false);
    }
  };

  /** 왼쪽 목록 순서 = 고객 화면과 동일. 이웃과 바꾼 뒤 sortOrder를 0,10,20… 으로 다시 매깁니다. */
  const moveStoreInList = async (index: number, delta: -1 | 1) => {
    const j = index + delta;
    if (j < 0 || j >= stores.length) return;
    const reordered = [...stores];
    const t = reordered[index];
    reordered[index] = reordered[j];
    reordered[j] = t;
    const step = 10;
    const updates = reordered.map((s, idx) => ({ storeId: s.storeId, sortOrder: idx * step }));

    setLoading(true);
    setErr(null);
    try {
      const results = await Promise.all(
        updates.map(({ storeId, sortOrder: so }) =>
          manageFetch(storedSecret, `/api/admin/manage/stores/${encodeURIComponent(storeId)}`, {
            method: 'PATCH',
            body: JSON.stringify({ sortOrder: so }),
          }).then(async (res) => {
            const data = (await res.json()) as { message?: string };
            return { ok: res.ok, message: data.message };
          }),
        ),
      );
      const failed = results.find((r) => !r.ok);
      if (failed) {
        setErr(failed.message || '목록 순서 저장에 실패했습니다.');
        await loadStores();
        return;
      }
      setMsg('목록 순서를 저장했습니다.');
      await loadStores();
    } catch {
      setErr('목록 순서 저장 중 오류');
      await loadStores();
    } finally {
      setLoading(false);
    }
  };

  const issueToken = async () => {
    if (!selectedId) return;
    const hadToken = !!selected?.adminAccessToken;
    setLoading(true);
    setErr(null);
    try {
      const res = await manageFetch(
        storedSecret,
        `/api/admin/manage/stores/${encodeURIComponent(selectedId)}/token`,
        { method: 'POST' },
      );
      const data = await res.json();
      if (!res.ok) {
        setErr(data.message || '발급 실패');
        return;
      }
      setMsg(hadToken ? '기존 사장님 링크입니다.' : '토큰을 발급했습니다.');
      await loadStores();
    } catch {
      setErr('발급 중 오류');
    } finally {
      setLoading(false);
    }
  };

  const addMenu = async () => {
    if (!selectedId) return;
    const n = newMenu.name.trim();
    const p = parseInt(newMenu.price, 10);
    if (!n || Number.isNaN(p)) {
      setErr('새 메뉴: 이름과 가격(숫자)을 입력하세요.');
      return;
    }
    setLoading(true);
    setErr(null);
    try {
      const res = await manageFetch(storedSecret, `/api/admin/manage/stores/${encodeURIComponent(selectedId)}/menus`, {
        method: 'POST',
        body: JSON.stringify({
          menuId: newMenu.menuId.trim() || undefined,
          name: n,
          price: p,
          category: '',
          isRequired: newMenu.isRequired,
          imageUrl: newMenu.imageUrl.trim() === '' ? null : newMenu.imageUrl.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErr(data.message || '메뉴 추가 실패');
        return;
      }
      setNewMenu({ menuId: '', name: '', price: '', isRequired: false, imageUrl: '' });
      setMsg('메뉴를 추가했습니다.');
      await loadMenus();
      await loadStores();
    } catch {
      setErr('메뉴 추가 오류');
    } finally {
      setLoading(false);
    }
  };

  const updateMenu = async (m: ManageMenu) => {
    if (!selectedId) return;
    setLoading(true);
    setErr(null);
    try {
      const res = await manageFetch(
        storedSecret,
        `/api/admin/manage/stores/${encodeURIComponent(selectedId)}/menus/${encodeURIComponent(m.menuId)}`,
        {
          method: 'PATCH',
          body: JSON.stringify({
            name: m.name,
            price: m.price,
            category: '',
            isRequired: m.isRequired,
            imageUrl: m.imageUrl === null || m.imageUrl === '' ? null : m.imageUrl,
          }),
        },
      );
      const data = await res.json();
      if (!res.ok) {
        setErr(data.message || '메뉴 수정 실패');
        return;
      }
      setMsg('메뉴를 수정했습니다.');
      await loadMenus();
    } catch {
      setErr('메뉴 수정 오류');
    } finally {
      setLoading(false);
    }
  };

  const deleteMenu = async (menuId: string) => {
    if (!selectedId) return;
    if (!confirm('이 메뉴를 삭제할까요?')) return;
    setLoading(true);
    setErr(null);
    try {
      const res = await manageFetch(
        storedSecret,
        `/api/admin/manage/stores/${encodeURIComponent(selectedId)}/menus/${encodeURIComponent(menuId)}`,
        { method: 'DELETE' },
      );
      const data = await res.json();
      if (!res.ok) {
        setErr(data.message || '삭제 실패');
        return;
      }
      setMsg('메뉴를 삭제했습니다.');
      await loadMenus();
    } catch {
      setErr('삭제 오류');
    } finally {
      setLoading(false);
    }
  };

  const loadReservations = useCallback(async () => {
    setLoading(true);
    setErr(null);
    try {
      const q = new URLSearchParams({ limit: String(resLimit), offset: String(resOffset) });
      if (resFilterStoreId.trim()) q.set('storeId', resFilterStoreId.trim());
      if (resFilterStatus.trim()) q.set('status', resFilterStatus.trim());
      const res = await manageFetch(storedSecret, `/api/admin/manage/reservations?${q}`);
      const data = await res.json();
      if (!res.ok) {
        setErr(data.message || '예약 목록 실패');
        if (res.status === 401) {
          sessionStorage.removeItem(STORAGE_KEY);
          setStoredSecret(null);
          setStores([]);
          setSelectedId(null);
          setShowAuthHint(true);
        }
        return;
      }
      setReservations(data.data || []);
      setResTotal(typeof data.total === 'number' ? data.total : 0);
      setResDepositSum(typeof data.depositSum === 'number' ? data.depositSum : 0);
      setShowAuthHint(false);
    } catch {
      setErr('예약 목록 오류');
    } finally {
      setLoading(false);
    }
  }, [storedSecret, resOffset, resFilterStoreId, resFilterStatus]);

  useEffect(() => {
    if (tab === 'reservations') void loadReservations();
  }, [tab, loadReservations]);

  const ownerLink = (token: string | null) => {
    if (!token || typeof window === 'undefined') return '';
    return `${window.location.origin}/admin/m/${encodeURIComponent(token)}`;
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">전역 관리</h1>
          <p className="text-sm text-gray-500">가게·메뉴·사장님 토큰·예약 조회</p>
        </div>
      </div>

      {dbHealth && dbHealth.ok !== true && (
        <div className="mb-6 rounded-xl border border-orange-200 bg-orange-50 p-4 text-sm text-orange-950">
          <p className="font-semibold text-orange-900">데이터베이스 연결 점검</p>
          {dbHealth.mysqlEnvConfigured === false ? (
            <p className="mt-2 leading-relaxed text-orange-900">
              {dbHealth.hint ??
                '서버 프로세스에 MYSQL_HOST, MYSQL_USER, MYSQL_DATABASE 가 없습니다. Vercel이면 Project → Settings → Environment Variables에 추가한 뒤 재배포하세요.'}
            </p>
          ) : (
            <div className="mt-2 space-y-2 leading-relaxed text-orange-900">
              <p>환경 변수는 인식됐지만 DB에 연결하지 못했습니다.</p>
              {dbHealth.message ? (
                <p className="rounded-md bg-white/80 px-2 py-1.5 font-medium text-orange-950">{dbHealth.message}</p>
              ) : null}
              <ul className="list-inside list-disc text-xs text-orange-900/95">
                <li>MySQL 방화벽·ACG에서 호스팅(Vercel 등) 출발 IP 허용(또는 테스트 시 0.0.0.0/0)</li>
                <li>bind-address, 사용자 호스트(%), 포트(3306), MYSQL_PASSWORD</li>
                <li>
                  최신 코드인데 &quot;Unknown column sortOrder&quot; 류면:{' '}
                  <code className="rounded bg-white px-1">docs/store-sort-order.sql</code> 실행
                </li>
                <li>
                  &quot;depositUseTiers&quot; / &quot;depositTiersJson&quot; 컬럼 오류면:{' '}
                  <code className="rounded bg-white px-1">docs/store-deposit-tiers.sql</code> 실행
                </li>
              </ul>
            </div>
          )}
          <a
            href="/api/admin/health"
            target="_blank"
            rel="noreferrer"
            className="mt-3 inline-block text-xs font-semibold text-orange-800 underline"
          >
            JSON 진단 열기 (/api/admin/health)
          </a>
        </div>
      )}

      {showAuthHint && (
        <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 p-4">
          <h2 className="font-semibold text-amber-900">관리자 비밀키 필요</h2>
          <p className="mt-1 text-sm text-amber-800">
            서버에 <code className="rounded bg-white px-1">ADMIN_MANAGE_SECRET</code> 이 설정되어 있습니다. 동일한 값을
            입력하면 요청 헤더로 전달됩니다 (sessionStorage 저장).
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <input
              type="password"
              value={secretInput}
              onChange={(e) => setSecretInput(e.target.value)}
              className="min-w-[200px] flex-1 rounded-lg border border-gray-300 px-3 py-2"
              placeholder="ADMIN_MANAGE_SECRET"
              autoComplete="off"
            />
            <button
              type="button"
              onClick={() => void saveSecret()}
              className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800"
            >
              저장 후 다시 시도
            </button>
          </div>
        </div>
      )}

      <p className="mb-4 text-xs text-gray-500">
        MVP: 서버에 <code className="rounded bg-gray-100 px-1">ADMIN_MANAGE_SECRET</code> 을 두지 않으면 별도 입력 없이
        바로 사용됩니다. 공개 배포 전에는 반드시 설정하세요.
      </p>

      <div className="mb-4 flex flex-wrap items-center gap-3">
            {storedSecret ? (
              <button
                type="button"
                onClick={() => clearSecret()}
                className="text-sm text-red-600 hover:underline"
              >
                저장된 비밀키 지우기
              </button>
            ) : null}
            <div className="flex rounded-lg border border-gray-200 bg-white p-0.5 text-sm">
              <button
                type="button"
                onClick={() => setTab('stores')}
                className={`rounded-md px-3 py-1.5 ${tab === 'stores' ? 'bg-gray-900 text-white' : 'text-gray-600'}`}
              >
                가게·메뉴
              </button>
              <button
                type="button"
                onClick={() => setTab('reservations')}
                className={`rounded-md px-3 py-1.5 ${tab === 'reservations' ? 'bg-gray-900 text-white' : 'text-gray-600'}`}
              >
                전체 예약
              </button>
            </div>
        {loading && <span className="text-sm text-gray-500">처리 중…</span>}
      </div>

      {err && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{err}</div>
      )}
      {msg && (
        <div className="mb-4 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-900">
          {msg}
          <button type="button" className="ml-2 underline" onClick={() => setMsg(null)}>
            닫기
          </button>
        </div>
      )}

      {tab === 'stores' && (
            <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
              <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
                <h2 className="mb-1 font-semibold text-gray-900">가게 목록</h2>
                <p className="mb-3 text-xs text-gray-500">
                  오른쪽 화살표로 순서를 바꿉니다. 고객 홈·검색 목록과 같은 순서입니다.
                </p>
                <ul className="max-h-[480px] space-y-1 overflow-y-auto text-sm">
                  {stores.map((s, index) => (
                    <li key={s.storeId} className="flex gap-1">
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedId(s.storeId);
                          setErr(null);
                        }}
                        className={`min-w-0 flex-1 rounded-lg px-3 py-2 text-left ${
                          selectedId === s.storeId ? 'bg-blue-600 text-white' : 'hover:bg-gray-100'
                        }`}
                      >
                        <div className="font-medium">{s.name}</div>
                        <div className={`text-xs ${selectedId === s.storeId ? 'text-blue-100' : 'text-gray-500'}`}>
                          {index + 1}번째 · {s.storeId}
                        </div>
                      </button>
                      <div className="flex shrink-0 flex-col justify-center gap-0.5 py-0.5">
                        <button
                          type="button"
                          aria-label="한 칸 위로"
                          disabled={loading || index === 0}
                          onClick={(e) => {
                            e.preventDefault();
                            void moveStoreInList(index, -1);
                          }}
                          className="flex h-7 w-8 items-center justify-center rounded-md border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-35"
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                            <path d="M18 15l-6-6-6 6" />
                          </svg>
                        </button>
                        <button
                          type="button"
                          aria-label="한 칸 아래로"
                          disabled={loading || index >= stores.length - 1}
                          onClick={(e) => {
                            e.preventDefault();
                            void moveStoreInList(index, 1);
                          }}
                          className="flex h-7 w-8 items-center justify-center rounded-md border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-35"
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                            <path d="M6 9l6 6 6-6" />
                          </svg>
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
                <button
                  type="button"
                  onClick={() => void loadStores()}
                  className="mt-3 w-full rounded-lg border border-gray-200 py-2 text-sm hover:bg-gray-50"
                >
                  새로고침
                </button>

                <div className="mt-4 border-t border-gray-100 pt-4">
                  <h3 className="text-sm font-semibold text-gray-800">가게 추가</h3>
                  <input
                    placeholder="가게 ID (예: store-new)"
                    className="mt-2 w-full rounded-lg border border-gray-300 px-2 py-1.5 text-xs"
                    value={newStoreId}
                    onChange={(e) => setNewStoreId(e.target.value)}
                    autoComplete="off"
                  />
                  <input
                    placeholder="이름"
                    className="mt-2 w-full rounded-lg border border-gray-300 px-2 py-1.5 text-sm"
                    value={newStoreName}
                    onChange={(e) => setNewStoreName(e.target.value)}
                  />
                  <input
                    type="number"
                    min={0}
                    placeholder="최대 인원"
                    className="mt-2 w-full rounded-lg border border-gray-300 px-2 py-1.5 text-sm"
                    value={newStoreMaxCap}
                    onChange={(e) => setNewStoreMaxCap(e.target.value)}
                  />
                  <button
                    type="button"
                    disabled={loading}
                    onClick={() => void addStore()}
                    className="mt-2 w-full rounded-lg bg-gray-900 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50"
                  >
                    가게 추가
                  </button>
                </div>
              </div>

              <div className="space-y-6">
                {!selectedId ? (
                  <p className="text-gray-500">왼쪽에서 가게를 선택하세요.</p>
                ) : (
                  <>
                    <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
                      <h3 className="font-semibold text-gray-900">가게 정보</h3>
                      <div className="mt-4 grid gap-3 sm:grid-cols-2">
                        <label className="block sm:col-span-2">
                          <span className="text-xs text-gray-500">이름</span>
                          <input
                            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                          />
                        </label>
                        <label className="block sm:col-span-2">
                          <span className="text-xs text-gray-500">위치 (간략, 검색 카드에 표시)</span>
                          <input
                            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2"
                            value={locationLabel}
                            onChange={(e) => setLocationLabel(e.target.value)}
                            placeholder="예: 강남역 도보 5분"
                          />
                        </label>
                        <label className="block sm:col-span-2">
                          <span className="text-xs text-gray-500">사진 URL (imageUrl)</span>
                          <input
                            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                            value={imageUrl}
                            onChange={(e) => setImageUrl(e.target.value)}
                          />
                        </label>

                        <DepositSettingsFields
                          depositMode={depositMode}
                          onDepositModeChange={setDepositMode}
                          depositFlat={depositFlat}
                          onDepositFlatChange={setDepositFlat}
                          tierRows={tierRows}
                          onTierRowsChange={setTierRows}
                          ownerName={ownerName}
                          onOwnerNameChange={setOwnerName}
                          ownerBankAccount={ownerBankAccount}
                          onOwnerBankAccountChange={setOwnerBankAccount}
                          showBankFields={showBankFields}
                          variant="manage"
                        />

                                                <label className="block sm:col-span-2">
                          <span className="text-xs text-gray-500">지정 휴무일 (YYYY-MM-DD, 줄바꿈)</span>
                          <textarea
                            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 font-mono text-sm"
                            rows={3}
                            value={closedDatesText}
                            onChange={(e) => setClosedDatesText(e.target.value)}
                          />
                        </label>
                      </div>
                      <div className="mt-4 flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => void saveStore()}
                          disabled={loading}
                          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                        >
                          가게 정보 저장
                        </button>
                        <button
                          type="button"
                          onClick={() => void deleteSelectedStore()}
                          disabled={loading}
                          className="rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-100 disabled:opacity-50"
                        >
                          가게 삭제
                        </button>
                      </div>
                    </section>

                    <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
                      <h3 className="font-semibold text-gray-900">사장님 전용 링크</h3>
                      <p className="mt-1 text-xs text-gray-500">
                        토큰은 최초 1회만 발급되며, 발급 후에는 변경되지 않습니다.
                      </p>
                      {selected?.adminAccessToken ? (
                        <div className="mt-3 break-all rounded-lg bg-gray-50 p-3 text-sm">
                          <div className="text-gray-600">현재 URL</div>
                          <div className="font-mono text-gray-900">{ownerLink(selected.adminAccessToken)}</div>
                        </div>
                      ) : (
                        <p className="mt-3 text-sm text-amber-700">아직 토큰이 없습니다. 아래에서 발급하세요.</p>
                      )}
                      <div className="mt-3 flex flex-wrap gap-2">
                        {!selected?.adminAccessToken ? (
                          <button
                            type="button"
                            onClick={() => void issueToken()}
                            disabled={loading}
                            className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
                          >
                            토큰 발급
                          </button>
                        ) : null}
                        {selected?.adminAccessToken ? (
                          <button
                            type="button"
                            onClick={() => {
                              const url = ownerLink(selected.adminAccessToken);
                              if (url) void navigator.clipboard.writeText(url);
                              setMsg('링크를 복사했습니다.');
                            }}
                            className="rounded-lg border border-gray-300 px-4 py-2 text-sm hover:bg-gray-50"
                          >
                            링크 복사
                          </button>
                        ) : null}
                      </div>
                    </section>

                    <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
                      <h3 className="mb-3 font-semibold text-gray-900">메뉴</h3>
                      <div className="overflow-x-auto">
                        <table className="min-w-full text-left text-sm">
                          <thead>
                            <tr className="border-b border-gray-200 text-gray-500">
                              <th className="py-2 pr-2">menuId</th>
                              <th className="py-2 pr-2">이름</th>
                              <th className="py-2 pr-2">가격</th>
                              <th className="py-2 pr-2">이미지 URL</th>
                              <th className="py-2 pr-2">필수</th>
                              <th className="py-2 pr-2" />
                            </tr>
                          </thead>
                          <tbody>
                            {menus.map((m) => (
                              <MenuEditRow key={m.menuId} initial={m} onSave={updateMenu} onDelete={deleteMenu} />
                            ))}
                          </tbody>
                        </table>
                      </div>

                      <div className="mt-6 border-t border-gray-100 pt-4">
                        <h4 className="text-sm font-medium text-gray-800">메뉴 추가</h4>
                        <div className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                          <input
                            placeholder="menuId (선택)"
                            className="rounded border border-gray-300 px-2 py-1.5 text-sm"
                            value={newMenu.menuId}
                            onChange={(e) => setNewMenu((n) => ({ ...n, menuId: e.target.value }))}
                          />
                          <input
                            placeholder="이름 *"
                            className="rounded border border-gray-300 px-2 py-1.5 text-sm"
                            value={newMenu.name}
                            onChange={(e) => setNewMenu((n) => ({ ...n, name: e.target.value }))}
                          />
                          <input
                            placeholder="가격 *"
                            className="rounded border border-gray-300 px-2 py-1.5 text-sm"
                            value={newMenu.price}
                            onChange={(e) => setNewMenu((n) => ({ ...n, price: e.target.value }))}
                          />
                          <input
                            placeholder="이미지 URL"
                            className="rounded border border-gray-300 px-2 py-1.5 text-sm sm:col-span-2"
                            value={newMenu.imageUrl}
                            onChange={(e) => setNewMenu((n) => ({ ...n, imageUrl: e.target.value }))}
                          />
                          <label className="flex items-center gap-2 text-sm">
                            <input
                              type="checkbox"
                              checked={newMenu.isRequired}
                              onChange={(e) => setNewMenu((n) => ({ ...n, isRequired: e.target.checked }))}
                            />
                            필수 메뉴
                          </label>
                        </div>
                        <button
                          type="button"
                          onClick={() => void addMenu()}
                          disabled={loading}
                          className="mt-3 rounded-lg bg-gray-900 px-4 py-2 text-sm text-white hover:bg-gray-800 disabled:opacity-50"
                        >
                          메뉴 추가
                        </button>
                      </div>
                    </section>
                  </>
                )}
              </div>
            </div>
          )}

          {tab === 'reservations' && (
            <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
              <div className="mb-4 flex flex-wrap items-end gap-3">
                <label className="text-sm">
                  <span className="text-gray-500">가게 필터</span>
                  <select
                    className="ml-2 rounded-lg border border-gray-300 px-2 py-1.5"
                    value={resFilterStoreId}
                    onChange={(e) => {
                      setResFilterStoreId(e.target.value);
                      setResOffset(0);
                    }}
                  >
                    <option value="">전체</option>
                    {stores.map((s) => (
                      <option key={s.storeId} value={s.storeId}>
                        {s.name} ({s.storeId})
                      </option>
                    ))}
                  </select>
                </label>
                <label className="text-sm">
                  <span className="text-gray-500">상태</span>
                  <select
                    className="ml-2 rounded-lg border border-gray-300 px-2 py-1.5"
                    value={resFilterStatus}
                    onChange={(e) => {
                      setResFilterStatus(e.target.value);
                      setResOffset(0);
                    }}
                  >
                    {RESERVATION_STATUS_FILTER_OPTIONS.map((o) => (
                      <option key={o.value || 'all'} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </label>
                <button
                  type="button"
                  onClick={() => void loadReservations()}
                  className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm hover:bg-gray-50"
                >
                  조회
                </button>
                <span className="text-sm text-gray-500">
                  총 {resTotal}건 · {resOffset + 1}–{Math.min(resOffset + resLimit, resTotal)}
                </span>
              </div>
              {(resFilterStoreId || resFilterStatus) && (
                <p className="mb-3 rounded-lg bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-900">
                  필터 적용 예약금 합계: {resDepositSum.toLocaleString()}원
                </p>
              )}
              <div className="overflow-x-auto">
                <table className="min-w-full text-left text-xs sm:text-sm">
                  <thead>
                    <tr className="border-b border-gray-200 text-gray-500">
                      <th className="py-2 pr-2">예약 ID</th>
                      <th className="py-2 pr-2">가게</th>
                      <th className="py-2 pr-2">단체/이름</th>
                      <th className="py-2 pr-2">일시</th>
                      <th className="py-2 pr-2">상태</th>
                      <th className="py-2 pr-2 text-right">주문금액</th>
                      <th className="py-2 pr-2 text-right">예약금</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reservations.map((r) => (
                      <tr key={r.reservationId} className="border-b border-gray-100">
                        <td className="py-2 pr-2 font-mono text-[11px] text-gray-600">{r.reservationId}</td>
                        <td className="py-2 pr-2">{r.storeName}</td>
                        <td className="py-2 pr-2">
                          {r.groupName || r.userName}
                          <div className="text-gray-400">{r.userPhone}</div>
                        </td>
                        <td className="py-2 pr-2 whitespace-nowrap">
                          {r.date} {r.startTime}
                        </td>
                        <td className="py-2 pr-2">{formatReservationStatus(r.status)}</td>
                        <td className="py-2 pr-2 text-right">{r.totalAmount.toLocaleString()}원</td>
                        <td className="py-2 pr-2 text-right">{r.depositAmount.toLocaleString()}원</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="mt-4 flex gap-2">
                <button
                  type="button"
                  disabled={resOffset <= 0}
                  onClick={() => setResOffset((o) => Math.max(0, o - resLimit))}
                  className="rounded border border-gray-300 px-3 py-1 text-sm disabled:opacity-40"
                >
                  이전
                </button>
                <button
                  type="button"
                  disabled={resOffset + resLimit >= resTotal}
                  onClick={() => setResOffset((o) => o + resLimit)}
                  className="rounded border border-gray-300 px-3 py-1 text-sm disabled:opacity-40"
                >
                  다음
                </button>
              </div>
            </div>
          )}
    </div>
  );
}

function MenuEditRow({
  initial,
  onSave,
  onDelete,
}: {
  initial: ManageMenu;
  onSave: (m: ManageMenu) => void | Promise<void>;
  onDelete: (menuId: string) => void | Promise<void>;
}) {
  const [m, setM] = useState(initial);
  useEffect(() => {
    setM(initial);
  }, [initial]);

  return (
    <tr className="border-b border-gray-50">
      <td className="py-2 pr-2 font-mono text-[11px] text-gray-600">{m.menuId}</td>
      <td className="py-2 pr-2">
        <input
          className="w-full min-w-[100px] rounded border border-gray-200 px-1 py-0.5"
          value={m.name}
          onChange={(e) => setM((x) => ({ ...x, name: e.target.value }))}
        />
      </td>
      <td className="py-2 pr-2">
        <input
          type="number"
          className="w-20 rounded border border-gray-200 px-1 py-0.5"
          value={m.price}
          onChange={(e) => setM((x) => ({ ...x, price: parseInt(e.target.value, 10) || 0 }))}
        />
      </td>
      <td className="py-2 pr-2">
        <input
          className="w-full min-w-[120px] max-w-[220px] rounded border border-gray-200 px-1 py-0.5 text-xs"
          value={m.imageUrl ?? ''}
          onChange={(e) => setM((x) => ({ ...x, imageUrl: e.target.value }))}
          placeholder="URL"
        />
      </td>
      <td className="py-2 pr-2">
        <input
          type="checkbox"
          checked={m.isRequired}
          onChange={(e) => setM((x) => ({ ...x, isRequired: e.target.checked }))}
        />
      </td>
      <td className="py-2 pr-2 whitespace-nowrap">
        <button type="button" className="text-blue-600 hover:underline" onClick={() => void onSave(m)}>
          저장
        </button>
        <button type="button" className="ml-2 text-red-600 hover:underline" onClick={() => void onDelete(m.menuId)}>
          삭제
        </button>
      </td>
    </tr>
  );
}
