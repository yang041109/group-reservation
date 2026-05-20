import type { Pool, RowDataPacket } from 'mysql2';
import {
  formatAutoMenuId,
  parseAutoMenuIdNumber,
  storeMenuIdsAreSequential,
} from '@/lib/auto-menu-id';

type MenuRow = RowDataPacket & { storeId: string; menuId: string };

function parseMenuItemsJson(raw: unknown): { menuId: string; quantity: number }[] {
  if (raw == null || raw === '') return [];
  if (Array.isArray(raw)) return raw as { menuId: string; quantity: number }[];
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw) as unknown;
      return Array.isArray(parsed) ? (parsed as { menuId: string; quantity: number }[]) : [];
    } catch {
      return [];
    }
  }
  return [];
}

function sortMenusForReindex(menus: MenuRow[], storeId: string): MenuRow[] {
  return [...menus].sort((a, b) => {
    const na = parseAutoMenuIdNumber(a.menuId, storeId);
    const nb = parseAutoMenuIdNumber(b.menuId, storeId);
    if (na != null && nb != null) return na - nb;
    if (na != null) return -1;
    if (nb != null) return 1;
    return a.menuId.localeCompare(b.menuId);
  });
}

async function updateReservationMenuIds(
  pool: Pool,
  storeId: string,
  idMap: Map<string, string>,
): Promise<number> {
  if (idMap.size === 0) return 0;
  const [rows] = await pool.query<RowDataPacket[]>(
    'SELECT reservationId, menuItems FROM reservation WHERE storeId = ?',
    [storeId],
  );
  let updated = 0;
  for (const r of rows) {
    const items = parseMenuItemsJson(r.menuItems);
    let changed = false;
    const next = items.map((item) => {
      const oldId = String(item.menuId ?? '').trim();
      const newId = idMap.get(oldId);
      if (newId && newId !== oldId) {
        changed = true;
        return { ...item, menuId: newId };
      }
      return item;
    });
    if (changed) {
      await pool.execute('UPDATE reservation SET menuItems = ? WHERE reservationId = ?', [
        JSON.stringify(next),
        String(r.reservationId),
      ]);
      updated += 1;
    }
  }
  return updated;
}

async function reindexStoreMenus(
  pool: Pool,
  storeId: string,
  menus: MenuRow[],
): Promise<{ menus: number; reservations: number }> {
  const ids = menus.map((m) => m.menuId);
  if (storeMenuIdsAreSequential(storeId, ids)) return { menus: 0, reservations: 0 };

  const ordered = sortMenusForReindex(menus, storeId);
  const idMap = new Map<string, string>();
  ordered.forEach((m, i) => {
    const nextId = formatAutoMenuId(storeId, i + 1);
    if (m.menuId !== nextId) idMap.set(m.menuId, nextId);
  });
  if (idMap.size === 0) return { menus: 0, reservations: 0 };

  const reservations = await updateReservationMenuIds(pool, storeId, idMap);

  let seq = 0;
  const temps: { temp: string; finalId: string }[] = [];
  for (const [oldId, finalId] of idMap) {
    const temp = `__reindex_${storeId}_${seq++}__`;
    await pool.execute('UPDATE menu SET menuId = ? WHERE storeId = ? AND menuId = ?', [temp, storeId, oldId]);
    temps.push({ temp, finalId });
  }
  for (const { temp, finalId } of temps) {
    await pool.execute('UPDATE menu SET menuId = ? WHERE storeId = ? AND menuId = ?', [finalId, storeId, temp]);
  }
  return { menus: idMap.size, reservations };
}

/** 모든 가게 메뉴 ID를 menu-{storeId}-1,2,3… 로 맞추고 예약 JSON의 menuId도 갱신 */
export async function reindexAllMenuIds(pool: Pool): Promise<{ stores: number; menus: number; reservations: number }> {
  const [menuRows] = await pool.query<MenuRow[]>('SELECT storeId, menuId FROM menu ORDER BY storeId, menuId');
  const byStore = new Map<string, MenuRow[]>();
  for (const row of menuRows) {
    const sid = String(row.storeId ?? '').trim();
    if (!sid) continue;
    const list = byStore.get(sid) ?? [];
    list.push({ storeId: sid, menuId: String(row.menuId ?? '').trim() } as MenuRow);
    byStore.set(sid, list);
  }

  let stores = 0;
  let menus = 0;
  let reservations = 0;
  for (const [storeId, menusForStore] of byStore) {
    const result = await reindexStoreMenus(pool, storeId, menusForStore);
    if (result.menus > 0) {
      stores += 1;
      menus += result.menus;
      reservations += result.reservations;
    }
  }
  return { stores, menus, reservations };
}

export async function anyMenuIdsNeedReindex(pool: Pool): Promise<boolean> {
  const [menuRows] = await pool.query<MenuRow[]>('SELECT storeId, menuId FROM menu');
  const byStore = new Map<string, string[]>();
  for (const row of menuRows) {
    const sid = String(row.storeId ?? '').trim();
    const mid = String(row.menuId ?? '').trim();
    if (!sid) continue;
    const list = byStore.get(sid) ?? [];
    list.push(mid);
    byStore.set(sid, list);
  }
  for (const [storeId, ids] of byStore) {
    if (!storeMenuIdsAreSequential(storeId, ids)) return true;
  }
  return false;
}
