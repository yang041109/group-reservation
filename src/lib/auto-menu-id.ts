import { firstAvailableSequenceNumber } from '@/lib/sequence-id';

/** 메뉴 ID: menu-{storeId}-{숫자} (예: menu-store-1-2) */
export function autoMenuIdPrefix(storeId: string): string {
  return `menu-${String(storeId ?? '').trim()}-`;
}

export function formatAutoMenuId(storeId: string, n: number): string {
  return `${autoMenuIdPrefix(storeId)}${n}`;
}

export function parseAutoMenuIdNumber(menuId: string, storeId: string): number | null {
  const prefix = autoMenuIdPrefix(storeId);
  const t = String(menuId ?? '').trim();
  if (!t.startsWith(prefix)) return null;
  const suffix = t.slice(prefix.length);
  if (!/^\d+$/.test(suffix)) return null;
  const n = parseInt(suffix, 10);
  return Number.isFinite(n) && n >= 1 ? n : null;
}

export function suggestNextAutoMenuId(storeId: string, existingMenuIds: Iterable<string>): string {
  const used: number[] = [];
  for (const id of existingMenuIds) {
    const n = parseAutoMenuIdNumber(id, storeId);
    if (n != null) used.push(n);
  }
  return formatAutoMenuId(storeId, firstAvailableSequenceNumber(used));
}

/** 가게별 메뉴가 menu-{storeId}-1,2,3… 연속인지 */
export function storeMenuIdsAreSequential(storeId: string, menuIds: string[]): boolean {
  if (menuIds.length === 0) return true;
  const nums = menuIds.map((id) => parseAutoMenuIdNumber(id, storeId));
  if (nums.some((n) => n == null)) return false;
  const sorted = [...nums].sort((a, b) => a! - b!);
  for (let i = 0; i < sorted.length; i++) {
    if (sorted[i] !== i + 1) return false;
  }
  return true;
}
