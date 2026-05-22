'use client';

import { useCallback, useEffect, useState } from 'react';
import { ADMIN_MANAGE_SECRET_HEADER } from '@/lib/admin-manage-constants';

type ManageZone = {
  zoneId: string;
  storeId: string;
  name: string;
  sortOrder: number;
  maxCapacity: number;
  minGroupHeadcount: number | null;
  slotStartHour: number | null;
  slotEndHour: number | null;
};

function manageFetch(optionalSecret: string | null, path: string, init?: RequestInit) {
  const headers = new Headers(init?.headers);
  const s = optionalSecret?.trim();
  if (s) headers.set(ADMIN_MANAGE_SECRET_HEADER, s);
  if (init?.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }
  return fetch(path, { ...init, headers });
}

interface ZoneManagerProps {
  storeId: string;
  storedSecret: string | null;
  storeMaxCapacity: number;
  onMessage?: (msg: string) => void;
  onError?: (err: string) => void;
  /** zone 추가/삭제 후 부모에 알려서 다시 가게 목록 등을 갱신할 수 있게 함. */
  onZonesChanged?: () => void;
}

export default function ZoneManager({
  storeId,
  storedSecret,
  storeMaxCapacity,
  onMessage,
  onError,
  onZonesChanged,
}: ZoneManagerProps) {
  const [zones, setZones] = useState<ManageZone[]>([]);
  const [loading, setLoading] = useState(false);
  const [newName, setNewName] = useState('');
  const [newMaxCap, setNewMaxCap] = useState('');

  const loadZones = useCallback(async () => {
    if (!storeId) return;
    setLoading(true);
    try {
      const res = await manageFetch(
        storedSecret,
        `/api/admin/manage/stores/${encodeURIComponent(storeId)}/zones`,
      );
      const data = await res.json();
      if (!res.ok) {
        onError?.(data.message || '동 목록을 불러오지 못했습니다.');
        setZones([]);
        return;
      }
      setZones(Array.isArray(data.data) ? data.data : []);
    } catch {
      onError?.('네트워크 오류');
    } finally {
      setLoading(false);
    }
  }, [storeId, storedSecret, onError]);

  useEffect(() => {
    void loadZones();
  }, [loadZones]);

  const addZone = async () => {
    const name = newName.trim();
    const cap = parseInt(newMaxCap, 10);
    if (!name) {
      onError?.('동 이름을 입력하세요.');
      return;
    }
    if (!Number.isFinite(cap) || cap < 1) {
      onError?.('수용 인원은 1명 이상이어야 합니다.');
      return;
    }
    setLoading(true);
    try {
      const res = await manageFetch(
        storedSecret,
        `/api/admin/manage/stores/${encodeURIComponent(storeId)}/zones`,
        {
          method: 'POST',
          body: JSON.stringify({ name, maxCapacity: cap }),
        },
      );
      const data = await res.json();
      if (!res.ok) {
        onError?.(data.message || '동 추가 실패');
        return;
      }
      onMessage?.(`「${name}」 동을 추가했습니다.`);
      setNewName('');
      setNewMaxCap('');
      await loadZones();
      onZonesChanged?.();
    } catch {
      onError?.('동 추가 중 오류');
    } finally {
      setLoading(false);
    }
  };

  const updateZone = async (
    zoneId: string,
    patch: Partial<Pick<ManageZone, 'name' | 'maxCapacity' | 'sortOrder'>>,
  ) => {
    setLoading(true);
    try {
      const res = await manageFetch(
        storedSecret,
        `/api/admin/manage/stores/${encodeURIComponent(storeId)}/zones/${encodeURIComponent(zoneId)}`,
        {
          method: 'PATCH',
          body: JSON.stringify(patch),
        },
      );
      const data = await res.json();
      if (!res.ok) {
        onError?.(data.message || '동 수정 실패');
        return;
      }
      onMessage?.('동 정보를 수정했습니다.');
      await loadZones();
      onZonesChanged?.();
    } catch {
      onError?.('동 수정 중 오류');
    } finally {
      setLoading(false);
    }
  };

  const deleteZone = async (zoneId: string, name: string) => {
    if (
      !confirm(
        `「${name}」 동을 삭제할까요?\n\n이 동의 예약은 동 정보만 사라지고 예약 자체는 남습니다. 삭제 후에는 이 동의 슬롯을 더 이상 관리할 수 없습니다.`,
      )
    )
      return;
    setLoading(true);
    try {
      const res = await manageFetch(
        storedSecret,
        `/api/admin/manage/stores/${encodeURIComponent(storeId)}/zones/${encodeURIComponent(zoneId)}`,
        { method: 'DELETE' },
      );
      const data = await res.json();
      if (!res.ok) {
        onError?.(data.message || '동 삭제 실패');
        return;
      }
      onMessage?.('동을 삭제했습니다.');
      await loadZones();
      onZonesChanged?.();
    } catch {
      onError?.('동 삭제 중 오류');
    } finally {
      setLoading(false);
    }
  };

  const totalZoneCapacity = zones.reduce((acc, z) => acc + z.maxCapacity, 0);

  return (
    <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="font-semibold text-gray-900">동(zone) 관리</h3>
          <p className="mt-0.5 text-xs text-gray-500">
            가게가 여러 동(예: A동/B동/C동)으로 나뉘는 경우에만 등록. 동이 없으면 가게 전체로 운영됩니다.
          </p>
        </div>
        <span className="text-xs text-gray-500">
          {zones.length}개
          {zones.length > 0 ? ` · 합계 ${totalZoneCapacity}명` : ''}
        </span>
      </div>

      {zones.length === 0 ? (
        <p className="mb-3 rounded-lg bg-amber-50 p-3 text-xs text-amber-800">
          등록된 동이 없습니다. 동을 추가하지 않으면 위의 가게 「최대 수용 인원 {storeMaxCapacity}명」으로
          단일 운영됩니다.
        </p>
      ) : (
        <div className="mb-4 overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead>
              <tr className="border-b border-gray-200 text-gray-500">
                <th className="py-2 pr-2">순서</th>
                <th className="py-2 pr-2">이름</th>
                <th className="py-2 pr-2">수용인원</th>
                <th className="py-2 pr-2" />
              </tr>
            </thead>
            <tbody>
              {zones.map((z) => (
                <ZoneEditRow
                  key={z.zoneId}
                  initial={z}
                  onSave={(patch) => updateZone(z.zoneId, patch)}
                  onDelete={() => deleteZone(z.zoneId, z.name)}
                  disabled={loading}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="mt-4 border-t border-gray-100 pt-4">
        <h4 className="text-sm font-medium text-gray-800">동 추가</h4>
        <div className="mt-2 grid gap-2 sm:grid-cols-2">
          <input
            placeholder="이름 (예: A동)"
            className="rounded border border-gray-300 px-2 py-1.5 text-sm"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
          />
          <input
            placeholder="수용 인원 *"
            inputMode="numeric"
            className="rounded border border-gray-300 px-2 py-1.5 text-sm"
            value={newMaxCap}
            onChange={(e) => setNewMaxCap(e.target.value)}
          />
        </div>
        <button
          type="button"
          onClick={() => void addZone()}
          disabled={loading}
          className="mt-3 rounded-lg bg-gray-900 px-4 py-2 text-sm text-white hover:bg-gray-800 disabled:opacity-50"
        >
          동 추가
        </button>
      </div>
    </section>
  );
}

function ZoneEditRow({
  initial,
  onSave,
  onDelete,
  disabled,
}: {
  initial: ManageZone;
  onSave: (patch: Partial<Pick<ManageZone, 'name' | 'maxCapacity' | 'sortOrder'>>) => Promise<void>;
  onDelete: () => Promise<void>;
  disabled: boolean;
}) {
  const [name, setName] = useState(initial.name);
  const [maxCap, setMaxCap] = useState(String(initial.maxCapacity));
  const [sortOrder, setSortOrder] = useState(String(initial.sortOrder));

  useEffect(() => {
    setName(initial.name);
    setMaxCap(String(initial.maxCapacity));
    setSortOrder(String(initial.sortOrder));
  }, [initial]);

  const dirty =
    name.trim() !== initial.name ||
    (parseInt(maxCap, 10) || 0) !== initial.maxCapacity ||
    (parseInt(sortOrder, 10) || 0) !== initial.sortOrder;

  return (
    <tr className="border-b border-gray-100">
      <td className="py-2 pr-2">
        <input
          inputMode="numeric"
          className="w-16 rounded border border-gray-300 px-2 py-1 text-sm"
          value={sortOrder}
          onChange={(e) => setSortOrder(e.target.value)}
        />
      </td>
      <td className="py-2 pr-2">
        <input
          className="w-full min-w-[8rem] rounded border border-gray-300 px-2 py-1 text-sm"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </td>
      <td className="py-2 pr-2">
        <input
          inputMode="numeric"
          className="w-20 rounded border border-gray-300 px-2 py-1 text-sm"
          value={maxCap}
          onChange={(e) => setMaxCap(e.target.value)}
        />
      </td>
      <td className="py-2 pr-2">
        <div className="flex gap-1">
          <button
            type="button"
            onClick={() =>
              void onSave({
                name: name.trim(),
                maxCapacity: parseInt(maxCap, 10) || 0,
                sortOrder: parseInt(sortOrder, 10) || 0,
              })
            }
            disabled={disabled || !dirty}
            className="rounded border border-blue-200 bg-blue-50 px-2 py-1 text-xs text-blue-700 hover:bg-blue-100 disabled:opacity-40"
          >
            저장
          </button>
          <button
            type="button"
            onClick={() => void onDelete()}
            disabled={disabled}
            className="rounded border border-red-200 bg-red-50 px-2 py-1 text-xs text-red-700 hover:bg-red-100 disabled:opacity-40"
          >
            삭제
          </button>
        </div>
      </td>
    </tr>
  );
}
