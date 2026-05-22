import type { RowDataPacket } from 'mysql2';
import type { Pool, PoolConnection } from 'mysql2/promise';

export type ZoneRow = RowDataPacket & Record<string, unknown>;

/** zone 컬럼이 NULL/빈값이면 store 행의 같은 컬럼으로 fallback. */
const ZONE_OVERRIDE_KEYS = [
  'maxCapacity',
  'minGroupHeadcount',
  'slotStartHour',
  'slotEndHour',
  'weeklyHoursJson',
  'closedDatesJson',
  'ownerClosedSlotsJson',
] as const;

function isNullishOrEmpty(v: unknown): boolean {
  return v === null || v === undefined || v === '';
}

/**
 * store 행 위에 zone 행의 NULL 아닌 값들을 덮어쓴 머지 객체를 반환.
 * 기존 슬롯/영업시간 계산 함수들이 `Record<string, unknown>` 을 받기 때문에
 * 이 머지 객체를 그대로 넘기면 zone 단위 계산이 된다.
 *
 * zone 이 null 이면 store 를 그대로 돌려준다 (zone 0개 운영 = 기존 동작).
 */
export function buildEffectiveStoreRow(
  store: Record<string, unknown>,
  zone: Record<string, unknown> | null | undefined,
): Record<string, unknown> {
  if (!zone) return store;
  const merged: Record<string, unknown> = { ...store };
  for (const key of ZONE_OVERRIDE_KEYS) {
    const zv = (zone as Record<string, unknown>)[key];
    if (!isNullishOrEmpty(zv)) {
      merged[key] = zv;
    }
  }
  return merged;
}

/** 특정 가게의 zone 목록 조회 (sortOrder 오름차순). zone 0개면 빈 배열. */
export async function fetchZonesByStoreId(
  conn: Pool | PoolConnection,
  storeId: string,
): Promise<ZoneRow[]> {
  const sid = storeId.trim();
  if (!sid) return [];
  const [rows] = await conn.query<ZoneRow[]>(
    'SELECT * FROM zone WHERE storeId = ? ORDER BY sortOrder, name',
    [sid],
  );
  return rows;
}

/** 여러 가게의 zone 들을 한 번에 가져와 storeId 별로 묶음. 목록 페이지 N+1 방지. */
export async function fetchZonesByStoreIds(
  conn: Pool | PoolConnection,
  storeIds: string[],
): Promise<Map<string, ZoneRow[]>> {
  const ids = [...new Set(storeIds.map((s) => s.trim()).filter(Boolean))];
  const map = new Map<string, ZoneRow[]>();
  if (ids.length === 0) return map;
  const placeholders = ids.map(() => '?').join(',');
  const [rows] = await conn.query<ZoneRow[]>(
    `SELECT * FROM zone WHERE storeId IN (${placeholders}) ORDER BY sortOrder, name`,
    ids,
  );
  for (const r of rows) {
    const sid = String(r.storeId ?? '').trim();
    if (!sid) continue;
    if (!map.has(sid)) map.set(sid, []);
    map.get(sid)!.push(r);
  }
  return map;
}

/** zoneId 가 해당 store 의 zone 인지 확인. zoneId 가 비어있으면 null 반환(=동 미사용). */
export async function findZoneInStore(
  conn: Pool | PoolConnection,
  storeId: string,
  zoneId: string | null | undefined,
): Promise<ZoneRow | null> {
  const zid = (zoneId ?? '').trim();
  if (!zid) return null;
  const sid = storeId.trim();
  const [rows] = await conn.query<ZoneRow[]>(
    'SELECT * FROM zone WHERE zoneId = ? AND storeId = ? LIMIT 1',
    [zid, sid],
  );
  return rows[0] ?? null;
}

/** 표시용 zone 요약. UI/API 응답으로 내려보낼 때 사용. */
export interface ZoneSummary {
  zoneId: string;
  storeId: string;
  name: string;
  sortOrder: number;
  maxCapacity: number;
}

export function zoneRowToSummary(z: ZoneRow): ZoneSummary {
  return {
    zoneId: String(z.zoneId ?? '').trim(),
    storeId: String(z.storeId ?? '').trim(),
    name: String(z.name ?? '').trim(),
    sortOrder: parseInt(String(z.sortOrder ?? '0'), 10) || 0,
    maxCapacity: parseInt(String(z.maxCapacity ?? '0'), 10) || 0,
  };
}
