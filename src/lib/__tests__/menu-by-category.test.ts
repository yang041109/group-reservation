import { describe, expect, it } from 'vitest';
import { groupMenusByCategory, menuCategoryLabel } from '@/lib/menu-by-category';
import type { MenuItemData } from '@/types';

describe('menu-by-category', () => {
  it('uses 기타 for empty category', () => {
    expect(menuCategoryLabel('')).toBe('기타');
    expect(menuCategoryLabel('  찌개  ')).toBe('찌개');
  });

  it('groups menus by category', () => {
    const menus: MenuItemData[] = [
      { id: 'a', name: 'A', price: 1, category: '메인' },
      { id: 'b', name: 'B', price: 2 },
      { id: 'c', name: 'C', price: 3, category: '메인' },
    ];
    const groups = groupMenusByCategory(menus);
    expect(groups.map((g) => g.category)).toEqual(['메인', '기타']);
    expect(groups[0].items).toHaveLength(2);
  });
});
