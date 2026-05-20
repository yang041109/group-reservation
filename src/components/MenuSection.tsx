'use client';

import { useEffect, useMemo, useState } from 'react';
import type { MenuItemData } from '@/types';
import { menuCategoryLabel } from '@/lib/menu-by-category';
import { menuCategoriesInDisplayOrder, sortMenusForDisplay } from '@/lib/menu-order';

interface MenuSectionProps {
  menus: MenuItemData[];
  quantities: Record<string, number>;
  onChange: (quantities: Record<string, number>) => void;
}

function MenuQuantityRow({
  menu,
  qty,
  onDelta,
}: {
  menu: MenuItemData;
  qty: number;
  onDelta: (delta: number) => void;
}) {
  const isRequired = !!menu.isRequired;
  return (
    <li
      className={`flex items-center gap-3 rounded-lg border px-4 py-3 ${
        isRequired
          ? qty > 0
            ? 'border-green-300 bg-green-50'
            : 'border-red-200 bg-red-50'
          : 'border-gray-100'
      }`}
    >
      {menu.imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={menu.imageUrl} alt={menu.name} className="h-16 w-16 rounded-lg object-cover" />
      ) : null}
      <div className="flex-1">
        <div>
          <span className={`text-sm ${isRequired ? 'font-bold' : 'font-medium'} text-gray-900`}>
            {menu.name}
          </span>
          {isRequired ? (
            <span className="ml-1 text-xs font-bold text-red-500">필수</span>
          ) : null}
        </div>
        <span className="text-sm text-gray-500">{menu.price.toLocaleString()}원</span>
      </div>
      <div className="flex items-center gap-2">
        <button
          type="button"
          disabled={qty <= 0}
          onClick={() => onDelta(-1)}
          className="flex h-8 w-8 items-center justify-center rounded-full border border-gray-300 text-gray-600 transition hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-40"
        >
          −
        </button>
        <span className="min-w-[1.5rem] text-center text-sm font-bold text-gray-900">{qty}</span>
        <button
          type="button"
          onClick={() => onDelta(1)}
          className="flex h-8 w-8 items-center justify-center rounded-full border border-gray-300 text-gray-600 transition hover:bg-gray-100"
        >
          +
        </button>
      </div>
    </li>
  );
}

export default function MenuSection({
  menus,
  quantities,
  onChange,
}: MenuSectionProps) {
  const sortedMenus = useMemo(() => sortMenusForDisplay(menus), [menus]);
  const categories = useMemo(() => menuCategoriesInDisplayOrder(sortedMenus), [sortedMenus]);

  const [selectedCategory, setSelectedCategory] = useState<string>('');

  useEffect(() => {
    if (categories.length === 0) {
      setSelectedCategory('');
      return;
    }
    setSelectedCategory((prev) => (prev && categories.includes(prev) ? prev : categories[0]));
  }, [categories]);

  const visibleMenus = useMemo(() => {
    if (!selectedCategory) return sortedMenus;
    return sortedMenus.filter((m) => menuCategoryLabel(m.category) === selectedCategory);
  }, [sortedMenus, selectedCategory]);

  const handleQuantityChange = (menuId: string, delta: number) => {
    const current = quantities[menuId] ?? 0;
    const next = Math.max(0, current + delta);
    const updated = { ...quantities, [menuId]: next };
    if (updated[menuId] === 0) delete updated[menuId];
    onChange(updated);
  };

  return (
    <div className="mt-6 space-y-4 rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <h2 className="text-lg font-bold text-gray-900">🍽️ 메뉴 선택</h2>

      {menus.length === 0 ? (
        <p className="text-sm text-gray-400">등록된 메뉴가 없습니다</p>
      ) : (
        <>
          {categories.length > 1 ? (
            <div className="flex flex-wrap gap-2">
              {categories.map((cat) => {
                const active = cat === selectedCategory;
                return (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setSelectedCategory(cat)}
                    className={`rounded-full border px-4 py-2 text-sm font-semibold transition ${
                      active
                        ? 'border-gray-900 bg-white text-gray-900 shadow-sm'
                        : 'border-gray-300 bg-white text-gray-700 hover:border-gray-400'
                    }`}
                  >
                    {cat}
                  </button>
                );
              })}
            </div>
          ) : categories.length === 1 ? (
            <p className="text-sm font-medium text-gray-600">{categories[0]}</p>
          ) : null}

          <ul className="space-y-2">
            {visibleMenus.map((menu) => {
              const qty = quantities[menu.id] ?? 0;
              return (
                <MenuQuantityRow
                  key={menu.id}
                  menu={menu}
                  qty={qty}
                  onDelta={(delta) => handleQuantityChange(menu.id, delta)}
                />
              );
            })}
          </ul>
        </>
      )}
    </div>
  );
}
