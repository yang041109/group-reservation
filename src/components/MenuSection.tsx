'use client';

import type { MenuItemData } from '@/types';

interface MenuSectionProps {
  menus: MenuItemData[];
  quantities: Record<string, number>;
  onChange: (quantities: Record<string, number>) => void;
}

export default function MenuSection({
  menus,
  quantities,
  onChange,
}: MenuSectionProps) {
  // 필수 메뉴를 맨 위로, 나머지는 카테고리별 그룹핑
  const requiredMenus = menus.filter((m) => m.isRequired);
  const optionalMenus = menus.filter((m) => !m.isRequired);

  const grouped = optionalMenus.reduce<Record<string, MenuItemData[]>>((acc, menu) => {
    const category = menu.category || '기타';
    if (!acc[category]) acc[category] = [];
    acc[category].push(menu);
    return acc;
  }, {});

  const handleQuantityChange = (menuId: string, delta: number) => {
    const current = quantities[menuId] ?? 0;
    const next = Math.max(0, current + delta);
    const updated = { ...quantities, [menuId]: next };
    // Remove zero-quantity entries to keep state clean
    if (updated[menuId] === 0) delete updated[menuId];
    onChange(updated);
  };

  return (
    <div className="mt-6 space-y-6 rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <h2 className="text-lg font-bold text-gray-900">🍽️ 메뉴 선택</h2>

      {menus.length === 0 ? (
        <p className="text-sm text-gray-400">등록된 메뉴가 없습니다</p>
      ) : (
        <>
          {/* 필수 메뉴 */}
          {requiredMenus.length > 0 && (
            <div>
              <h3 className="mb-2 text-sm font-semibold text-red-500">
                ⚠️ 필수 메뉴 (반드시 선택)
              </h3>
              <ul className="space-y-2">
                {requiredMenus.map((menu) => {
                  const qty = quantities[menu.id] ?? 0;
                  return (
                    <li
                      key={menu.id}
                      className={`flex items-center gap-3 rounded-lg border px-4 py-3 ${
                        qty > 0 ? 'border-green-300 bg-green-50' : 'border-red-200 bg-red-50'
                      }`}
                    >
                      {menu.imageUrl && (
                        <img
                          src={menu.imageUrl}
                          alt={menu.name}
                          className="h-16 w-16 rounded-lg object-cover"
                        />
                      )}
                      <div className="flex-1">
                        <div>
                          <span className="text-sm font-bold text-gray-900">
                            {menu.name}
                          </span>
                          <span className="ml-1 text-xs font-bold text-red-500">필수</span>
                        </div>
                        <span className="text-sm text-gray-500">
                          {menu.price.toLocaleString()}원
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          disabled={qty <= 0}
                          onClick={() => handleQuantityChange(menu.id, -1)}
                          className="flex h-8 w-8 items-center justify-center rounded-full border border-gray-300 text-gray-600 transition hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          −
                        </button>
                        <span className="min-w-[1.5rem] text-center text-sm font-bold text-gray-900">
                          {qty}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleQuantityChange(menu.id, 1)}
                          className="flex h-8 w-8 items-center justify-center rounded-full border border-gray-300 text-gray-600 transition hover:bg-gray-100"
                        >
                          +
                        </button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}

          {/* 선택 메뉴 (카테고리별) */}
          {Object.entries(grouped).map(([category, items]) => (
          <div key={category}>
            <h3 className="mb-2 text-sm font-semibold text-gray-600">
              {category}
            </h3>
            <ul className="space-y-2">
              {items.map((menu) => {
                const qty = quantities[menu.id] ?? 0;
                return (
                  <li
                    key={menu.id}
                    className="flex items-center gap-3 rounded-lg border border-gray-100 px-4 py-3"
                  >
                    {menu.imageUrl && (
                      <img
                        src={menu.imageUrl}
                        alt={menu.name}
                        className="h-16 w-16 rounded-lg object-cover"
                      />
                    )}
                    <div className="flex-1">
                      <div>
                        <span className="text-sm font-medium text-gray-900">
                          {menu.name}
                        </span>
                      </div>
                      <span className="text-sm text-gray-500">
                        {menu.price.toLocaleString()}원
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        disabled={qty <= 0}
                        onClick={() => handleQuantityChange(menu.id, -1)}
                        className="flex h-8 w-8 items-center justify-center rounded-full border border-gray-300 text-gray-600 transition hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        −
                      </button>
                      <span className="min-w-[1.5rem] text-center text-sm font-bold text-gray-900">
                        {qty}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleQuantityChange(menu.id, 1)}
                        className="flex h-8 w-8 items-center justify-center rounded-full border border-gray-300 text-gray-600 transition hover:bg-gray-100"
                      >
                        +
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
        </>
      )}
    </div>
  );
}
