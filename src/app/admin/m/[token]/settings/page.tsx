'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useAdminStore } from '../AdminStoreContext';
import type { DepositTier } from '@/types';

interface ManageStore {
  storeId: string;
  name: string;
  category: string;
  locationLabel: string | null;
  maxCapacity: number;
  minGroupHeadcount: number;
  imageUrl: string | null;
  slotStartHour: number | null;
  slotEndHour: number | null;
  depositAmount: number;
  depositUseTiers: boolean;
  depositTiers: DepositTier[];
  ownerName: string | null;
  ownerBankAccount: string | null;
  description: string | null;
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

type TierRow = { min: string; max: string; amount: string };

function defaultTierRows(): TierRow[] {
  return [{ min: '1', max: '10', amount: '0' }];
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
  const [description, setDescription] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [minGroupHeadcount, setMinGroupHeadcount] = useState('2');
  const [slotStartHour, setSlotStartHour] = useState('11');
  const [slotEndHour, setSlotEndHour] = useState('20');
  const [depositFlat, setDepositFlat] = useState('0');
  const [depositUseTiers, setDepositUseTiers] = useState(false);
  const [tierRows, setTierRows] = useState<TierRow[]>(defaultTierRows);
  const [ownerName, setOwnerName] = useState('');
  const [ownerBankAccount, setOwnerBankAccount] = useState('');

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
        setDescription(s.description ?? '');
        setImageUrl(s.imageUrl ?? '');
        setMinGroupHeadcount(String(s.minGroupHeadcount ?? 2));
        setSlotStartHour(String(s.slotStartHour ?? 11));
        setSlotEndHour(String(s.slotEndHour ?? 20));
        setDepositFlat(String(s.depositAmount ?? 0));
        setDepositUseTiers(!!s.depositUseTiers);
        setTierRows(
          s.depositTiers && s.depositTiers.length
            ? s.depositTiers.map((t) => ({
                min: String(t.minHeadcount),
                max: String(t.maxHeadcount),
                amount: String(t.amount),
              }))
            : defaultTierRows(),
        );
        setOwnerName(s.ownerName ?? '');
        setOwnerBankAccount(s.ownerBankAccount ?? '');
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

  const saveStore = async () => {
    setSaving(true);
    setError(null);
    try {
      const tiersPayload: DepositTier[] = depositUseTiers
        ? tierRows
            .map((row) => ({
              minHeadcount: Math.max(0, parseInt(row.min, 10) || 0),
              maxHeadcount: Math.max(0, parseInt(row.max, 10) || 0),
              amount: Math.max(0, parseInt(row.amount, 10) || 0),
            }))
            .filter((t) => t.maxHeadcount >= t.minHeadcount)
        : [];

      const body: Record<string, unknown> = {
        token: adminStore.token,
        storeId: adminStore.id,
        name,
        locationLabel: locationLabel.trim() || null,
        description: description.trim() || null,
        imageUrl: imageUrl.trim() || null,
        minGroupHeadcount: Math.max(1, parseInt(minGroupHeadcount, 10) || 2),
        slotStartHour: Math.min(23, Math.max(0, parseInt(slotStartHour, 10) || 11)),
        slotEndHour: Math.min(23, Math.max(0, parseInt(slotEndHour, 10) || 20)),
        depositAmount: Math.max(0, parseInt(depositFlat, 10) || 0),
        depositUseTiers,
        depositTiers: depositUseTiers ? tiersPayload : null,
        ownerName: ownerName.trim() || null,
        ownerBankAccount: ownerBankAccount.trim() || null,
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

  const updateTierRow = (idx: number, key: keyof TierRow, value: string) => {
    setTierRows((prev) => prev.map((r, i) => (i === idx ? { ...r, [key]: value } : r)));
  };

  const addTierRow = () => {
    setTierRows((prev) => [...prev, { min: '1', max: '10', amount: '0' }]);
  };

  const removeTierRow = (idx: number) => {
    setTierRows((prev) => prev.filter((_, i) => i !== idx));
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
              <span className="text-sm font-semibold text-gray-700">설명</span>
              <textarea
                rows={4}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="고객에게 보일 가게 소개"
                className="mt-1.5 w-full resize-none rounded-lg border border-gray-300 px-3 py-2.5 text-base focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
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
          <p className="mb-3 text-xs text-gray-500">
            예약을 받는 기본 시간대입니다. 종료 시간이 시작 시간보다 작으면 다음 날까지로 처리돼요.
            (예: 시작 17, 종료 2 → 17:00 ~ 02:00)
          </p>

          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="text-sm font-semibold text-gray-700">시작 시</span>
              <select
                value={slotStartHour}
                onChange={(e) => setSlotStartHour(e.target.value)}
                className="mt-1.5 w-full rounded-lg border border-gray-300 px-3 py-2.5 text-base"
              >
                {Array.from({ length: 24 }).map((_, h) => (
                  <option key={h} value={h}>
                    {String(h).padStart(2, '0')}시
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="text-sm font-semibold text-gray-700">종료 시</span>
              <select
                value={slotEndHour}
                onChange={(e) => setSlotEndHour(e.target.value)}
                className="mt-1.5 w-full rounded-lg border border-gray-300 px-3 py-2.5 text-base"
              >
                {Array.from({ length: 24 }).map((_, h) => (
                  <option key={h} value={h}>
                    {String(h).padStart(2, '0')}시
                  </option>
                ))}
              </select>
            </label>
          </div>
        </section>

        {/* 3. 단체 예약 최소 인원 */}
        <section className="mb-5 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <h2 className="mb-4 flex items-center gap-2 text-base font-bold text-gray-900">
            <span className="block h-5 w-1 rounded-full bg-blue-600" /> 단체 예약 최소 인원
          </h2>
          <p className="mb-3 text-xs text-gray-500">
            이 인원 미만이면 우르르에서 예약을 받지 않습니다.
          </p>
          <input
            type="number"
            min={1}
            max={999}
            value={minGroupHeadcount}
            onChange={(e) => setMinGroupHeadcount(e.target.value)}
            className="w-32 rounded-lg border border-gray-300 px-3 py-2.5 text-base"
          />
          <span className="ml-2 text-sm text-gray-600">명</span>
        </section>

        {/* 4. 예약금 */}
        <section className="mb-5 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <h2 className="mb-4 flex items-center gap-2 text-base font-bold text-gray-900">
            <span className="block h-5 w-1 rounded-full bg-blue-600" /> 예약금
          </h2>

          <label className="flex cursor-pointer items-start gap-2 rounded-lg border border-gray-200 bg-gray-50 p-3">
            <input
              type="checkbox"
              checked={depositUseTiers}
              onChange={(e) => setDepositUseTiers(e.target.checked)}
              className="mt-0.5"
            />
            <div>
              <span className="text-sm font-semibold text-gray-800">인원 구간별 다르게 받기</span>
              <p className="mt-0.5 text-xs text-gray-500">
                체크하지 않으면 모든 예약에 같은 금액이 적용됩니다
              </p>
            </div>
          </label>

          {!depositUseTiers ? (
            <label className="mt-3 block">
              <span className="text-sm font-semibold text-gray-700">예약금 (원)</span>
              <input
                type="number"
                min={0}
                value={depositFlat}
                onChange={(e) => setDepositFlat(e.target.value)}
                className="mt-1.5 w-full rounded-lg border border-gray-300 px-3 py-2.5 text-base"
              />
            </label>
          ) : (
            <div className="mt-3 space-y-2">
              {tierRows.map((row, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <input
                    type="number"
                    min={1}
                    value={row.min}
                    onChange={(e) => updateTierRow(idx, 'min', e.target.value)}
                    placeholder="최소"
                    className="w-16 rounded-lg border border-gray-300 px-2 py-2 text-sm"
                  />
                  <span className="text-xs text-gray-500">~</span>
                  <input
                    type="number"
                    min={1}
                    value={row.max}
                    onChange={(e) => updateTierRow(idx, 'max', e.target.value)}
                    placeholder="최대"
                    className="w-16 rounded-lg border border-gray-300 px-2 py-2 text-sm"
                  />
                  <span className="text-xs text-gray-500">명</span>
                  <input
                    type="number"
                    min={0}
                    value={row.amount}
                    onChange={(e) => updateTierRow(idx, 'amount', e.target.value)}
                    placeholder="예약금"
                    className="flex-1 rounded-lg border border-gray-300 px-2 py-2 text-sm"
                  />
                  <span className="text-xs text-gray-500">원</span>
                  {tierRows.length > 1 ? (
                    <button
                      type="button"
                      onClick={() => removeTierRow(idx)}
                      className="rounded-md p-1.5 text-red-500 hover:bg-red-50"
                      aria-label="구간 삭제"
                    >
                      ✕
                    </button>
                  ) : null}
                </div>
              ))}
              <button
                type="button"
                onClick={addTierRow}
                className="w-full rounded-lg border border-dashed border-gray-300 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
              >
                + 구간 추가
              </button>
            </div>
          )}
        </section>

        {/* 5. 입금 계좌 */}
        <section className="mb-5 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <h2 className="mb-4 flex items-center gap-2 text-base font-bold text-gray-900">
            <span className="block h-5 w-1 rounded-full bg-blue-600" /> 예약금 입금 계좌
          </h2>

          <div className="space-y-3">
            <label className="block">
              <span className="text-sm font-semibold text-gray-700">예금주</span>
              <input
                type="text"
                value={ownerName}
                onChange={(e) => setOwnerName(e.target.value)}
                placeholder="홍길동"
                className="mt-1.5 w-full rounded-lg border border-gray-300 px-3 py-2.5 text-base"
              />
            </label>
            <label className="block">
              <span className="text-sm font-semibold text-gray-700">계좌 번호</span>
              <input
                type="text"
                value={ownerBankAccount}
                onChange={(e) => setOwnerBankAccount(e.target.value)}
                placeholder="농협 123-4567-8901"
                className="mt-1.5 w-full rounded-lg border border-gray-300 px-3 py-2.5 text-base"
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
                          value={editMenu.name}
                          onChange={(e) => setEditMenu({ ...editMenu, name: e.target.value })}
                          placeholder="메뉴명"
                          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                        />
                        <div className="grid grid-cols-2 gap-2">
                          <input
                            type="number"
                            value={editMenu.price}
                            onChange={(e) => setEditMenu({ ...editMenu, price: e.target.value })}
                            placeholder="가격"
                            className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
                          />
                          <input
                            type="text"
                            value={editMenu.category}
                            onChange={(e) =>
                              setEditMenu({ ...editMenu, category: e.target.value })
                            }
                            placeholder="카테고리"
                            className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
                          />
                        </div>
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
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-blue-50 text-xs font-bold text-blue-700">
                      {idx + 1}
                    </span>
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
                        {m.price.toLocaleString()}원
                        {m.category ? ` · ${m.category}` : ''}
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
              value={newMenuCategory}
              onChange={(e) => setNewMenuCategory(e.target.value)}
              placeholder="카테고리 (예: 부침류, 음료)"
              className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-base"
            />
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
