import { describe, expect, it } from 'vitest';
import { menuCategoriesInDisplayOrder, sortMenusForDisplay, swapMenuOrderIds } from '@/lib/menu-order';
import type { MenuItemData } from '@/types';

describe('menu-order', () => {
  it('sortMenusForDisplay orders by sortOrder', () => {
    const menus: MenuItemData[] = [
      { id: 'b', name: 'B', price: 1, sortOrder: 20 },
      { id: 'a', name: 'A', price: 1, sortOrder: 10 },
    ];
    expect(sortMenusForDisplay(menus).map((m) => m.id)).toEqual(['a', 'b']);
  });

  it('swapMenuOrderIds swaps adjacent', () => {
    expect(swapMenuOrderIds(['a', 'b', 'c'], 1, -1)).toEqual(['b', 'a', 'c']);
  });

  it('menuCategoriesInDisplayOrder follows menu sortOrder', () => {
    const menus: MenuItemData[] = [
      { id: '1', name: 'x', price: 1, category: '안주류', sortOrder: 20 },
      { id: '2', name: 'y', price: 1, category: '국물류', sortOrder: 10 },
    ];
    expect(menuCategoriesInDisplayOrder(menus)).toEqual(['국물류', '안주류']);
  });
});
