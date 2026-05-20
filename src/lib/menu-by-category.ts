import type { MenuItemData } from '@/types';
import { sortMenusForDisplay } from '@/lib/menu-order';

export const MENU_CATEGORY_FALLBACK = '기타';

export function menuCategoryLabel(category: string | undefined | null): string {
  const t = String(category ?? '').trim();
  return t || MENU_CATEGORY_FALLBACK;
}

/** 카테고리명 오름차순(기타는 맨 뒤), 카테고리 내 메뉴는 sortOrder 순 */
export function groupMenusByCategory(menus: MenuItemData[]): { category: string; items: MenuItemData[] }[] {
  const map = new Map<string, MenuItemData[]>();
  for (const m of sortMenusForDisplay(menus)) {
    const cat = menuCategoryLabel(m.category);
    const list = map.get(cat) ?? [];
    list.push(m);
    map.set(cat, list);
  }
  return Array.from(map.entries())
    .sort(([a], [b]) => {
      if (a === MENU_CATEGORY_FALLBACK) return 1;
      if (b === MENU_CATEGORY_FALLBACK) return -1;
      return a.localeCompare(b, 'ko');
    })
    .map(([category, items]) => ({ category, items }));
}
