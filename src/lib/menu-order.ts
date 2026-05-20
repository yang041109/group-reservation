import type { MenuItemData } from '@/types';
import { menuCategoryLabel } from '@/lib/menu-by-category';

export type MenuWithSort = MenuItemData & { sortOrder?: number };

export function readMenuSortOrder(m: MenuWithSort, fallback = 0): number {
  const n = m.sortOrder;
  return typeof n === 'number' && Number.isFinite(n) ? n : fallback;
}

/** 표시·예약 화면용 정렬 (sortOrder → 이름) */
export function sortMenusForDisplay<T extends MenuWithSort>(menus: T[]): T[] {
  return [...menus].sort((a, b) => {
    const d = readMenuSortOrder(a) - readMenuSortOrder(b);
    if (d !== 0) return d;
    return a.name.localeCompare(b.name, 'ko');
  });
}

/** 카테고리 탭 순서: 해당 카테고리 최소 sortOrder 기준 */
export function menuCategoriesInDisplayOrder(menus: MenuItemData[]): string[] {
  const sorted = sortMenusForDisplay(menus);
  const seen = new Set<string>();
  const out: string[] = [];
  for (const m of sorted) {
    const cat = menuCategoryLabel(m.category);
    if (!seen.has(cat)) {
      seen.add(cat);
      out.push(cat);
    }
  }
  return out;
}

export function swapMenuOrderIds(ids: string[], index: number, dir: -1 | 1): string[] {
  const j = index + dir;
  if (j < 0 || j >= ids.length) return ids;
  const next = [...ids];
  [next[index], next[j]] = [next[j], next[index]];
  return next;
}
