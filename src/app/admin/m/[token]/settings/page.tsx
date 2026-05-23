'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import StoreBusinessHoursFields, {
  defaultWeeklyForm,
} from '@/components/admin/StoreBusinessHoursFields';
import { useAdminStore } from '../AdminStoreContext';
import {
  DAY_KEYS,
  DAY_LABELS,
  isWeeklyHoursEnabled,
  parseClosedWeekdaysJson,
  parseWeeklyHoursJson,
  serializeClosedWeekdaysForDb,
  serializeWeeklyHoursForDb,
  type DayKey,
} from '@/lib/store-weekly-hours';
import { swapMenuOrderIds } from '@/lib/menu-order';
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

interface ManageStore {
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
  closedWeekdaysJson?: string | null;
  allowSameDayBooking?: boolean;
  menuNoticeText?: string | null;
  depositActiveMonthRangesJson?: string | null;
  menuRequiredPeoplePerItem?: number | null;
}

interface MenuItem {
  storeId: string;
  menuId: string;
  name: string;
  price: number;
  category: string;
  isRequired: boolean;
  imageUrl: string | null;
}

type TierRow = DepositTierFormRow;

function defaultTierRows(): TierRow[] {
  return defaultDepositTierRows();
}

export default function AdminSettingsPage() {
  const adminStore = useAdminStore();
  const base = `/admin/m/${encodeURIComponent(adminStore.token)}`;

  const [storeData, setStoreData] = useState<ManageStore | null>(null);
  const [menus, setMenus] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  // 가게 정보 폼 state
  const [name, setName] = useState('');
  const [locationLabel, setLocationLabel] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [minGroupHeadcount, setMinGroupHeadcount] = useState('2');
  const [maxCapacity, setMaxCapacity] = useState('80');
  const [slotStartHour, setSlotStartHour] = useState('11');
  const [slotEndHour, setSlotEndHour] = useState('20');
  const [useWeeklyHours, setUseWeeklyHours] = useState(false);
  const [weeklyForm, setWeeklyForm] = useState(() => defaultWeeklyForm());
  const [depositFlat, setDepositFlat] = useState('0');
  const [depositMode, setDepositMode] = useState<DepositMode>('flat');
  const [tierRows, setTierRows] = useState<TierRow[]>(defaultTierRows);
  const [ownerName, setOwnerName] = useState('');
  const [ownerBankAccount, setOwnerBankAccount] = useState('');
  const [menuNoticeText, setMenuNoticeText] = useState('');
  const [depositRangeStart, setDepositRangeStart] = useState('');
  const [depositRangeEnd, setDepositRangeEnd] = useState('');
  const [menuPeoplePerItem, setMenuPeoplePerItem] = useState('');
  // 매주 항상 휴무 요일 / 당일 예약 허용 — admin/manage 와 동일한 데이터로 연결
  const [closedWeekdaysSet, setClosedWeekdaysSet] = useState<Set<DayKey>>(() => new Set());
  const [allowSameDay, setAllowSameDay] = useState(false);

  // 메뉴 추가 폼
  const [newMenuName, setNewMenuName] = useState('');
  const [newMenuPrice, setNewMenuPrice] = useState('');
  const [newMenuCategory, setNewMenuCategory] = useState('');
  const [newMenuImageUrl, setNewMenuImageUrl] = useState('');
  const [newMenuRequired, setNewMenuRequired] = useState(false);
  const [menuActionLoading, setMenuActionLoading] = useState<string | null>(null);

  // 메뉴 인라인 편집
  const [editingMenuId, setEditingMenuId] = useState<string | null>(null);
  const [editMenu, setEditMenu] = useState<{
    name: string;
    price: string;
    category: string;
    imageUrl: string;
    isRequired: boolean;
  } | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [sRes, mRes] = await Promise.all([
        fetch(`/api/admin/store?token=${encodeURIComponent(adminStore.token)}`),
        fetch(`/api/admin/menus?token=${encodeURIComponent(adminStore.token)}`),
      ]);
      const sData = await sRes.json();
      const mData = await mRes.json();
      if (sData.success) {
        const s = sData.data as ManageStore;
        setStoreData(s);
        setName(s.name ?? '');
        setLocationLabel(s.locationLabel ?? '');
        setImageUrl(s.imageUrl ?? '');
        setMinGroupHeadcount(String(s.minGroupHeadcount ?? 2));
        setMaxCapacity(String(s.maxCapacity ?? 80));
        setSlotStartHour(String(s.slotStartHour ?? 11));
        setSlotEndHour(String(s.slotEndHour ?? 20));
        const parsedWeekly = parseWeeklyHoursJson(s.weeklyHoursJson);
        setUseWeeklyHours(isWeeklyHoursEnabled(s as unknown as Record<string, unknown>));
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
        setDepositFlat(String(s.depositAmount ?? 0));
        setDepositMode(s.depositMode ?? depositModeFromDb(s.depositUseTiers ? 1 : 0));
        setTierRows(
          s.depositTiers && s.depositTiers.length
            ? s.depositTiers.map((t) => ({
                min: String(t.minHeadcount),
                max: String(t.maxHeadcount),
                amount: String(t.amount),
                calcType: t.calcType === 'per_person' ? 'per_person' : 'fixed',
              }))
            : defaultTierRows(),
        );
        setOwnerName(s.ownerName ?? '');
        setOwnerBankAccount(s.ownerBankAccount ?? '');
        setMenuNoticeText(s.menuNoticeText ?? '');
        try {
          const arr = s.depositActiveMonthRangesJson
            ? (JSON.parse(s.depositActiveMonthRangesJson) as { start?: string; end?: string }[])
            : [];
          if (Array.isArray(arr) && arr.length > 0) {
            setDepositRangeStart(String(arr[0]?.start ?? ''));
            setDepositRangeEnd(String(arr[0]?.end ?? ''));
          } else {
            setDepositRangeStart('');
            setDepositRangeEnd('');
          }
        } catch {
          setDepositRangeStart('');
          setDepositRangeEnd('');
        }
        setMenuPeoplePerItem(
          s.menuRequiredPeoplePerItem != null && s.menuRequiredPeoplePerItem > 0
            ? String(s.menuRequiredPeoplePerItem)
            : '',
        );
        setAllowSameDay(!!s.allowSameDayBooking);
        setClosedWeekdaysSet(new Set(parseClosedWeekdaysJson(s.closedWeekdaysJson ?? null)));
      } else {
        setError(sData.message || '가게 정보를 불러올 수 없습니다.');
      }
      if (mData.success) {
        setMenus((mData.data || []) as MenuItem[]);
      }
    } catch {
      setError('정보를 불러오지 못했습니다.');
    } finally {
      setLoading(false);
    }
  }, [adminStore.token]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const showMessage = (msg: string) => {
    setMessage(msg);
    setTimeout(() => setMessage(null), 3000);
  };

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

  const saveStore = async () => {
    const minH = Math.max(1, parseInt(minGroupHeadcount, 10) || 2);
    const maxH = Math.max(0, parseInt(maxCapacity, 10) || 0);
    if (maxH > 0 && maxH < minH) {
      setError('최대 인원은 최소 인원 이상이어야 합니다.');
      return;
    }
    setSaving(true);
    setError(null);
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

      const body: Record<string, unknown> = {
        token: adminStore.token,
        storeId: adminStore.id,
        name,
        locationLabel: locationLabel.trim() || null,
        imageUrl: imageUrl.trim() || null,
        minGroupHeadcount: minH,
        maxCapacity: maxH,
        slotStartHour: Math.min(23, Math.max(0, parseInt(slotStartHour, 10) || 11)),
        slotEndHour: Math.min(23, Math.max(0, parseInt(slotEndHour, 10) || 20)),
        depositAmount: Math.max(0, parseInt(depositFlat, 10) || 0),
        depositMode,
        depositTiers: depositMode === 'tiered' ? tiersPayload : null,
        ownerName: showBankFields ? ownerName.trim() || null : null,
        ownerBankAccount: showBankFields ? ownerBankAccount.trim() || null : null,
        weeklyHoursJson: useWeeklyHours
          ? serializeWeeklyHoursForDb(
              Object.fromEntries(
                DAY_KEYS.map((k) => [
                  k,
                  {
                    closed: weeklyForm[k].closed,
                    start: parseInt(weeklyForm[k].start, 10),
                    end: parseInt(weeklyForm[k].end, 10),
                  },
                ]),
              ),
            )
          : null,
        menuNoticeText: menuNoticeText.trim() === '' ? null : menuNoticeText.trim(),
        depositActiveMonthRangesJson: (() => {
          const s = depositRangeStart.trim();
          const e = depositRangeEnd.trim();
          if (!s || !e) return null;
          return JSON.stringify([{ start: s, end: e }]);
        })(),
        menuRequiredPeoplePerItem: (() => {
          const t = menuPeoplePerItem.trim();
          if (!t) return null;
          const n = parseInt(t, 10);
          return Number.isFinite(n) && n > 0 ? n : null;
        })(),
        allowSameDayBooking: allowSameDay,
        closedWeekdaysJson: serializeClosedWeekdaysForDb(
          DAY_KEYS.filter((k) => closedWeekdaysSet.has(k)),
        ),
      };

      const res = await fetch('/api/admin/store', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (data.success) {
        showMessage('가게 정보를 저장했습니다');
        await reload();
        void invalidateAllDataCache();
      } else {
        setError(data.message || '저장에 실패했습니다.');
      }
    } catch {
      setError('저장 중 오류가 발생했습니다.');
    } finally {
      setSaving(false);
    }
  };

  const addMenu = async () => {
    const n = newMenuName.trim();
    const p = parseInt(newMenuPrice, 10);
    if (!n || Number.isNaN(p)) {
      alert('이름과 가격을 입력해 주세요.');
      return;
    }
    setMenuActionLoading('__new__');
    try {
      const res = await fetch('/api/admin/menus', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: adminStore.token,
          storeId: adminStore.id,
          name: n,
          price: p,
          category: newMenuCategory.trim() || undefined,
          imageUrl: newMenuImageUrl.trim() || null,
          isRequired: newMenuRequired,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setNewMenuName('');
        setNewMenuPrice('');
        setNewMenuCategory('');
        setNewMenuImageUrl('');
        setNewMenuRequired(false);
        void invalidateAllDataCache();
        await reload();
        showMessage('메뉴를 추가했습니다');
      } else {
        alert(data.message || '메뉴 추가 실패');
      }
    } catch {
      alert('서버 오류가 발생했습니다.');
    } finally {
      setMenuActionLoading(null);
    }
  };

  const startEditMenu = (m: MenuItem) => {
    setEditingMenuId(m.menuId);
    setEditMenu({
      name: m.name,
      price: String(m.price),
      category: m.category ?? '',
      imageUrl: m.imageUrl ?? '',
      isRequired: m.isRequired,
    });
  };

  const cancelEditMenu = () => {
    setEditingMenuId(null);
    setEditMenu(null);
  };

  const saveEditMenu = async () => {
    if (!editingMenuId || !editMenu) return;
    const p = parseInt(editMenu.price, 10);
    if (!editMenu.name.trim() || Number.isNaN(p)) {
      alert('이름과 가격을 입력해 주세요.');
      return;
    }
    setMenuActionLoading(editingMenuId);
    try {
      const res = await fetch(`/api/admin/menus/${encodeURIComponent(editingMenuId)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: adminStore.token,
          storeId: adminStore.id,
          name: editMenu.name.trim(),
          price: p,
          category: editMenu.category.trim(),
          imageUrl: editMenu.imageUrl.trim() || null,
          isRequired: editMenu.isRequired,
        }),
      });
      const data = await res.json();
      if (data.success) {
        await reload();
        cancelEditMenu();
        void invalidateAllDataCache();
        showMessage('메뉴를 수정했습니다');
      } else {
        alert(data.message || '메뉴 수정 실패');
      }
    } catch {
      alert('서버 오류가 발생했습니다.');
    } finally {
      setMenuActionLoading(null);
    }
  };

  const moveMenu = async (menuId: string, dir: -1 | 1) => {
    const ids = menus.map((m) => m.menuId);
    const i = ids.indexOf(menuId);
    const nextIds = swapMenuOrderIds(ids, i, dir);
    if (nextIds === ids) return;
    setMenuActionLoading(menuId);
    try {
      const res = await fetch('/api/admin/menus/reorder', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: adminStore.token,
          storeId: adminStore.id,
          menuIds: nextIds,
        }),
      });
      const data = await res.json();
      if (data.success) {
        await reload();
        void invalidateAllDataCache();
        showMessage('메뉴 순서를 저장했습니다');
      } else {
        alert(data.message || '순서 저장 실패');
      }
    } catch {
      alert('서버 오류가 발생했습니다.');
    } finally {
      setMenuActionLoading(null);
    }
  };

  const deleteMenu = async (m: MenuItem) => {
    if (!confirm(`「${m.name}」 메뉴를 삭제하시겠습니까?`)) return;
    setMenuActionLoading(m.menuId);
    try {
      const res = await fetch(
        `/api/admin/menus/${encodeURIComponent(m.menuId)}?token=${encodeURIComponent(adminStore.token)}&storeId=${encodeURIComponent(adminStore.id)}`,
        { method: 'DELETE' },
      );
      const data = await res.json();
      if (data.success) {
        await reload();
        showMessage('메뉴를 삭제했습니다');
      } else {
        alert(data.message || '메뉴 삭제 실패');
      }
    } catch {
      alert('서버 오류가 발생했습니다.');
    } finally {
      setMenuActionLoading(null);
    }
  };


  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <p className="text-gray-600">로딩 중...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="sticky top-0 z-20 bg-blue-600 text-white shadow-md">
        <div className="mx-auto max-w-md px-4 py-4">
          <div className="flex items-center justify-between">
            <Link href={base} className="text-white" aria-label="뒤로가기">
              <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </Link>
            <h1 className="text-lg font-bold">가게 설정 변경</h1>
            <span className="w-6" />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-md p-4 pb-24">
        {error && (
          <div className="mb-3 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {error}
          </div>
        )}
        {message && (
          <div className="mb-3 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
            ✅ {message}
          </div>
        )}

        {/* 1. 기본 정보 */}
        <section className="mb-5 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <h2 className="mb-4 flex items-center gap-2 text-base font-bold text-gray-900">
            <span className="block h-5 w-1 rounded-full bg-blue-600" /> 기본 정보
          </h2>

          <div className="space-y-4">
            <label className="block">
              <span className="text-sm font-semibold text-gray-700">가게 이름</span>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="mt-1.5 w-full rounded-lg border border-gray-300 px-3 py-2.5 text-base focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </label>

            <label className="block">
              <span className="text-sm font-semibold text-gray-700">위치 (검색 카드에 표시)</span>
              <input
                type="text"
                value={locationLabel}
                onChange={(e) => setLocationLabel(e.target.value)}
                placeholder="예: 한양대 상권 · 동대문"
                className="mt-1.5 w-full rounded-lg border border-gray-300 px-3 py-2.5 text-base focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </label>

            <label className="block">
              <span className="text-sm font-semibold text-gray-700">사진 URL</span>
              <input
                type="text"
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                placeholder="https://..."
                className="mt-1.5 w-full rounded-lg border border-gray-300 px-3 py-2.5 text-base focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
              {imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={imageUrl}
                  alt="미리보기"
                  className="mt-2 h-32 w-full rounded-lg border border-gray-200 object-cover"
                />
              ) : null}
            </label>
          </div>
        </section>

        {/* 2. 영업 시간 */}
        <section className="mb-5 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <h2 className="mb-4 flex items-center gap-2 text-base font-bold text-gray-900">
            <span className="block h-5 w-1 rounded-full bg-blue-600" /> 영업 시간
          </h2>
          <StoreBusinessHoursFields
            useWeeklyHours={useWeeklyHours}
            onUseWeeklyHoursChange={setUseWeeklyHours}
            slotStartHour={slotStartHour}
            slotEndHour={slotEndHour}
            onSlotStartHourChange={setSlotStartHour}
            onSlotEndHourChange={setSlotEndHour}
            weeklyForm={weeklyForm}
            onWeeklyFormChange={setWeeklyForm}
            variant="owner"
          />

          <div className="mt-5 border-t border-gray-100 pt-5">
            <p className="text-sm font-semibold text-gray-800">매주 항상 휴무 요일</p>
            <p className="mt-0.5 text-xs text-gray-500">
              체크한 요일은 매주 휴무로 처리돼 예약을 받지 않습니다.
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              {DAY_KEYS.map((k) => {
                const checked = closedWeekdaysSet.has(k);
                return (
                  <label
                    key={k}
                    className={`flex cursor-pointer items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm transition ${
                      checked
                        ? 'border-red-300 bg-red-50 text-red-700'
                        : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <input
                      type="checkbox"
                      className="accent-red-500"
                      checked={checked}
                      onChange={(e) => {
                        setClosedWeekdaysSet((prev) => {
                          const next = new Set(prev);
                          if (e.target.checked) next.add(k);
                          else next.delete(k);
                          return next;
                        });
                      }}
                    />
                    {DAY_LABELS[k]}
                  </label>
                );
              })}
            </div>
          </div>

          <div className="mt-5 border-t border-gray-100 pt-5">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={allowSameDay}
                onChange={(e) => setAllowSameDay(e.target.checked)}
                className="accent-blue-600"
              />
              <span className="text-sm font-semibold text-gray-800">
                당일 예약 받기
                <span className="ml-1 text-xs font-normal text-gray-500">
                  (체크 해제 시 손님은 내일 이후 날짜만 선택 가능)
                </span>
              </span>
            </label>
          </div>
        </section>

        {/* 3. 단체 예약 인원 */}
        <section className="mb-5 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <h2 className="mb-4 flex items-center gap-2 text-base font-bold text-gray-900">
            <span className="block h-5 w-1 rounded-full bg-blue-600" /> 단체 예약 인원
          </h2>
          <p className="mb-3 text-xs text-gray-500">
            고객 검색 카드에 「예약 가능 N~M명」으로 표시되며, 타임슬롯별 최대 수용 인원에도 반영됩니다.
          </p>
          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="text-sm font-semibold text-gray-700">최소 인원</span>
              <div className="mt-1.5 flex items-center gap-2">
                <input
                  type="number"
                  min={1}
                  max={999}
                  value={minGroupHeadcount}
                  onChange={(e) => setMinGroupHeadcount(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-base"
                />
                <span className="shrink-0 text-sm text-gray-600">명</span>
              </div>
            </label>
            <label className="block">
              <span className="text-sm font-semibold text-gray-700">최대 인원</span>
              <div className="mt-1.5 flex items-center gap-2">
                <input
                  type="number"
                  min={1}
                  max={999}
                  value={maxCapacity}
                  onChange={(e) => setMaxCapacity(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-base"
                />
                <span className="shrink-0 text-sm text-gray-600">명</span>
              </div>
            </label>
          </div>
          <p className="mt-2 text-xs text-gray-400">최소 인원 미만 예약은 받지 않습니다.</p>
        </section>

        {/* 4. 예약금 */}
        <section className="mb-5 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <h2 className="mb-4 flex items-center gap-2 text-base font-bold text-gray-900">
            <span className="block h-5 w-1 rounded-full bg-blue-600" /> 예약금
          </h2>

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
            variant="owner"
          />

          <div className="mt-5 border-t border-gray-100 pt-5">
            <label className="block">
              <span className="text-sm font-semibold text-gray-800">예약금 적용 기간</span>
              <p className="mt-0.5 text-xs text-gray-500">
                비워두면 연중 적용. 특정 기간(예: 3월~9월)에만 예약금을 받으려면 입력하세요.
                <br />
                형식: <code className="bg-gray-100 px-1">MM-DD</code> (예: 03-01 ~ 09-30)
              </p>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <input
                  type="text"
                  placeholder="03-01"
                  maxLength={5}
                  className="w-24 rounded-lg border border-gray-300 px-3 py-2 text-sm"
                  value={depositRangeStart}
                  onChange={(e) => setDepositRangeStart(e.target.value)}
                />
                <span className="text-sm text-gray-500">~</span>
                <input
                  type="text"
                  placeholder="09-30"
                  maxLength={5}
                  className="w-24 rounded-lg border border-gray-300 px-3 py-2 text-sm"
                  value={depositRangeEnd}
                  onChange={(e) => setDepositRangeEnd(e.target.value)}
                />
                {(depositRangeStart || depositRangeEnd) && (
                  <button
                    type="button"
                    onClick={() => {
                      setDepositRangeStart('');
                      setDepositRangeEnd('');
                    }}
                    className="rounded-lg border border-gray-300 px-2 py-1 text-xs text-gray-600 hover:bg-gray-50"
                  >
                    연중 적용
                  </button>
                )}
              </div>
            </label>
          </div>
        </section>

        {/* 메뉴 규칙 (안내 문구 + 개수 강제) */}
        <section className="mb-5 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <h2 className="mb-4 flex items-center gap-2 text-base font-bold text-gray-900">
            <span className="block h-5 w-1 rounded-full bg-blue-600" /> 메뉴 규칙
          </h2>

          <label className="block">
            <span className="text-sm font-semibold text-gray-800">메뉴 안내 문구</span>
            <p className="mt-0.5 text-xs text-gray-500">
              이용자가 메뉴를 선택하는 화면 상단에 표시됩니다. (예: 전 인원 동일 메뉴로 주문 부탁드립니다)
            </p>
            <textarea
              className="mt-2 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              rows={2}
              value={menuNoticeText}
              onChange={(e) => setMenuNoticeText(e.target.value)}
              placeholder="비워두면 표시되지 않습니다"
            />
          </label>

          <div className="mt-5 border-t border-gray-100 pt-5">
            <label className="block">
              <span className="text-sm font-semibold text-gray-800">메뉴 개수 요구 (N명당 메뉴 1개)</span>
              <p className="mt-0.5 text-xs text-gray-500">
                비워두면 제한 없음. 예: <b>2</b> 입력 시 40명 예약하려면 메뉴 20개 이상 필요.
              </p>
              <input
                type="number"
                inputMode="numeric"
                min={1}
                placeholder="비워두면 제한 없음"
                className="mt-2 w-32 rounded-lg border border-gray-300 px-3 py-2 text-sm"
                value={menuPeoplePerItem}
                onChange={(e) => setMenuPeoplePerItem(e.target.value)}
              />
            </label>
          </div>
        </section>

        {/* 저장 버튼 */}
        <button
          type="button"
          onClick={() => void saveStore()}
          disabled={saving}
          className="mb-8 w-full rounded-2xl bg-blue-600 py-4 text-base font-bold text-white shadow-md hover:bg-blue-700 disabled:opacity-50"
        >
          {saving ? '저장 중...' : '가게 정보 저장'}
        </button>

        {/* 6. 메뉴 관리 */}
        <section className="mb-5 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <h2 className="mb-4 flex items-center gap-2 text-base font-bold text-gray-900">
            <span className="block h-5 w-1 rounded-full bg-blue-600" /> 등록된 메뉴
            <span className="ml-auto rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-semibold text-blue-700">
              {menus.length}개
            </span>
          </h2>

          {menus.length === 0 ? (
            <p className="rounded-lg border border-dashed border-gray-200 p-6 text-center text-sm text-gray-500">
              등록된 메뉴가 없습니다
            </p>
          ) : (
            <ul className="space-y-2">
              {menus.map((m, idx) => {
                const isEditing = editingMenuId === m.menuId;
                const isLoading = menuActionLoading === m.menuId;
                if (isEditing && editMenu) {
                  return (
                    <li
                      key={m.menuId}
                      className="rounded-xl border-2 border-blue-300 bg-blue-50/30 p-3"
                    >
                      <div className="space-y-2">
                        <input
                          type="text"
                          value={editMenu.category}
                          onChange={(e) => setEditMenu({ ...editMenu, category: e.target.value })}
                          placeholder="카테고리 (예: 국물류)"
                          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                        />
                        <input
                          type="text"
                          value={editMenu.name}
                          onChange={(e) => setEditMenu({ ...editMenu, name: e.target.value })}
                          placeholder="메뉴명"
                          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                        />
                        <input
                          type="number"
                          value={editMenu.price}
                          onChange={(e) => setEditMenu({ ...editMenu, price: e.target.value })}
                          placeholder="가격"
                          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                        />
                        <input
                          type="text"
                          value={editMenu.imageUrl}
                          onChange={(e) =>
                            setEditMenu({ ...editMenu, imageUrl: e.target.value })
                          }
                          placeholder="이미지 URL (선택)"
                          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                        />
                        <label className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={editMenu.isRequired}
                            onChange={(e) =>
                              setEditMenu({ ...editMenu, isRequired: e.target.checked })
                            }
                          />
                          <span className="text-sm">필수 메뉴</span>
                        </label>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={cancelEditMenu}
                            disabled={isLoading}
                            className="flex-1 rounded-lg border border-gray-300 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                          >
                            취소
                          </button>
                          <button
                            type="button"
                            onClick={() => void saveEditMenu()}
                            disabled={isLoading}
                            className="flex-1 rounded-lg bg-blue-600 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
                          >
                            {isLoading ? '저장 중...' : '저장'}
                          </button>
                        </div>
                      </div>
                    </li>
                  );
                }
                return (
                  <li
                    key={m.menuId}
                    className="flex items-center gap-3 rounded-xl border border-gray-200 p-3"
                  >
                    <div className="flex shrink-0 flex-col gap-0.5">
                      <button
                        type="button"
                        disabled={isLoading || idx === 0}
                        onClick={() => void moveMenu(m.menuId, -1)}
                        className="rounded border border-gray-200 px-2 py-0.5 text-xs hover:bg-gray-50 disabled:opacity-30"
                        aria-label="위로"
                      >
                        ▲
                      </button>
                      <button
                        type="button"
                        disabled={isLoading || idx >= menus.length - 1}
                        onClick={() => void moveMenu(m.menuId, 1)}
                        className="rounded border border-gray-200 px-2 py-0.5 text-xs hover:bg-gray-50 disabled:opacity-30"
                        aria-label="아래로"
                      >
                        ▼
                      </button>
                    </div>
                    {m.imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={m.imageUrl}
                        alt=""
                        className="h-12 w-12 shrink-0 rounded-lg border border-gray-200 object-cover"
                      />
                    ) : null}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1">
                        <span className="truncate font-semibold text-gray-900">{m.name}</span>
                        {m.isRequired ? (
                          <span className="shrink-0 rounded-full bg-red-100 px-1.5 py-0.5 text-[10px] font-bold text-red-700">
                            필수
                          </span>
                        ) : null}
                      </div>
                      <p className="text-xs text-gray-500">
                        {m.category ? `${m.category} · ` : ''}
                        {m.price.toLocaleString()}원
                      </p>
                    </div>
                    <div className="flex shrink-0 gap-1.5">
                      <button
                        type="button"
                        onClick={() => startEditMenu(m)}
                        disabled={isLoading}
                        className="rounded-lg bg-blue-100 px-3 py-1.5 text-xs font-bold text-blue-700 hover:bg-blue-200 disabled:opacity-50"
                      >
                        수정
                      </button>
                      <button
                        type="button"
                        onClick={() => void deleteMenu(m)}
                        disabled={isLoading}
                        className="rounded-lg bg-red-100 px-3 py-1.5 text-xs font-bold text-red-700 hover:bg-red-200 disabled:opacity-50"
                      >
                        {isLoading ? '...' : '삭제'}
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        {/* 메뉴 추가 */}
        <section className="mb-5 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <h2 className="mb-4 flex items-center gap-2 text-base font-bold text-gray-900">
            <span className="block h-5 w-1 rounded-full bg-blue-600" /> 메뉴 추가
          </h2>

          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <input
                type="text"
                value={newMenuCategory}
                onChange={(e) => setNewMenuCategory(e.target.value)}
                placeholder="카테고리 (예: 국물류)"
                className="col-span-2 rounded-lg border border-gray-300 px-3 py-2.5 text-base"
              />
              <input
                type="text"
                value={newMenuName}
                onChange={(e) => setNewMenuName(e.target.value)}
                placeholder="이름 *"
                className="rounded-lg border border-gray-300 px-3 py-2.5 text-base"
              />
              <input
                type="number"
                value={newMenuPrice}
                onChange={(e) => setNewMenuPrice(e.target.value)}
                placeholder="가격 *"
                className="rounded-lg border border-gray-300 px-3 py-2.5 text-base"
              />
            </div>
            <input
              type="text"
              value={newMenuImageUrl}
              onChange={(e) => setNewMenuImageUrl(e.target.value)}
              placeholder="이미지 URL (선택)"
              className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-base"
            />
            <label className="flex cursor-pointer items-center gap-2 rounded-lg bg-gray-50 p-3">
              <input
                type="checkbox"
                checked={newMenuRequired}
                onChange={(e) => setNewMenuRequired(e.target.checked)}
              />
              <span className="text-sm font-semibold text-gray-800">필수 메뉴</span>
              <span className="text-xs text-gray-500">(예약 시 반드시 포함되어야 함)</span>
            </label>
            <button
              type="button"
              onClick={() => void addMenu()}
              disabled={menuActionLoading === '__new__'}
              className="w-full rounded-2xl bg-blue-600 py-3.5 text-base font-bold text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {menuActionLoading === '__new__' ? '추가 중...' : '+ 메뉴 추가'}
            </button>
          </div>
        </section>

        <p className="mt-2 text-center text-xs text-gray-400">
          가게 ID: {storeData?.storeId}
        </p>
      </main>
    </div>
  );
}
