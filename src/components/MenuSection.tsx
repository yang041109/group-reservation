'use client';

import { useEffect, useMemo, useState } from 'react';
import type { MenuItemData } from '@/types';
import { menuCategoryLabel } from '@/lib/menu-by-category';
import { menuCategoriesInDisplayOrder, sortMenusForDisplay } from '@/lib/menu-order';

interface MenuSectionProps {
  menus: MenuItemData[];
  quantities: Record<string, number>;
  onChange: (quantities: Record<string, number>) => void;
  /** 가게 사장님이 정한 메뉴 안내 문구 (예: 전 인원 동일 메뉴) */
  ownerNoticeText?: string | null;
  /** N명당 메뉴 1개 강제. 0/undefined 면 무시 */
  requiredPeoplePerItem?: number | null;
  /** 현재 선택 인원 (메뉴 개수 요구 안내 계산용) */
  selectedHeadcount?: number;
}

/** 가게별 안내·입력 문구 앞의 `·` 제거 */
function formatMenuNoticeText(raw: string): string {
  return raw
    .split('\n')
    .map((line) => line.replace(/^\s*·\s*/, '').trim())
    .filter(Boolean)
    .join('\n');
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
  const description = menu.description?.trim();
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
      <div className="min-w-0 flex-1">
        <div>
          <span className={`text-sm ${isRequired ? 'font-bold' : 'font-medium'} text-gray-900`}>
            {menu.name}
          </span>
          {isRequired ? (
            <span className="ml-1 text-xs font-bold text-red-500">필수</span>
          ) : null}
        </div>
        {description ? (
          <p className="mt-0.5 line-clamp-2 text-xs text-gray-500">{description}</p>
        ) : null}
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <span className="min-w-[3.5rem] text-right text-sm font-semibold text-gray-900 tabular-nums">
          {menu.price.toLocaleString()}원
        </span>
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
  ownerNoticeText,
  requiredPeoplePerItem,
  selectedHeadcount = 0,
}: MenuSectionProps) {
  const sortedMenus = useMemo(() => sortMenusForDisplay(menus), [menus]);
  const categories = useMemo(() => menuCategoriesInDisplayOrder(sortedMenus), [sortedMenus]);

  /** null = 전체 보기 */
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  useEffect(() => {
    setSelectedCategory(null);
  }, [menus]);

  const visibleMenus = useMemo(() => {
    if (!selectedCategory) return sortedMenus;
    const filtered = sortedMenus.filter(
      (m) => menuCategoryLabel(m.category) === selectedCategory,
    );
    return filtered.length > 0 ? filtered : sortedMenus;
  }, [sortedMenus, selectedCategory]);

  const handleQuantityChange = (menuId: string, delta: number) => {
    const current = quantities[menuId] ?? 0;
    const next = Math.max(0, current + delta);
    const updated = { ...quantities, [menuId]: next };
    if (updated[menuId] === 0) delete updated[menuId];
    onChange(updated);
  };

  return (
    <section className="mt-6 space-y-4">
      <h2 className="text-3xl font-extrabold tracking-tight text-gray-800">🍽️ 메뉴 선택</h2>

      {menus.length === 0 ? (
        <p className="text-sm text-gray-400">등록된 메뉴가 없습니다</p>
      ) : (
        <>
          {/* 사장님이 정한 안내 문구 (있을 때만) */}
          {ownerNoticeText ? (
            <div className="rounded-lg border-2 border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
              <p className="font-semibold">📣 가게 안내</p>
              <p className="mt-1 whitespace-pre-line text-[13px] leading-relaxed">
                {formatMenuNoticeText(ownerNoticeText)}
              </p>
            </div>
          ) : null}

          <div className="rounded-3xl border border-gray-100 bg-white p-5 text-gray-700 shadow-sm">
            <p className="flex items-center gap-2 text-2xl font-bold text-gray-700">
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500 text-2xl font-bold text-white">
                i
              </span>
              안내
            </p>
            <div className="mt-4 space-y-1.5 text-[13px] leading-relaxed text-gray-500">
              <p>
                선택한 메뉴는 예약 시간에 맞춰 자리에 미리 준비되는 기본 세팅 메뉴예요.
              </p>
              <p>
                주류·추가 메뉴는 매장에서 자유롭게 주문 가능해요. 최소 한 개 이상 선택해 주세요.
              </p>
              {requiredPeoplePerItem && requiredPeoplePerItem > 0 && selectedHeadcount > 0 ? (
                <p>
                  이 가게는 <b>{requiredPeoplePerItem}명당 메뉴 1개 이상</b>이 필요합니다. 현재{' '}
                  {selectedHeadcount}명 기준으로{' '}
                  <b>메뉴 {Math.ceil(selectedHeadcount / requiredPeoplePerItem)}개 이상</b> 선택하셔야
                  합니다.
                </p>
              ) : null}
            </div>
          </div>
          {categories.length > 1 ? (
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setSelectedCategory(null)}
                className={`rounded-full border px-4 py-2 text-sm font-semibold transition ${
                  selectedCategory === null
                    ? 'border-gray-900 bg-gray-900 text-white shadow-sm'
                    : 'border-gray-300 bg-white text-gray-700 hover:border-gray-400'
                }`}
              >
                전체
              </button>
              {categories.map((cat) => {
                const active = cat === selectedCategory;
                return (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setSelectedCategory(cat)}
                    className={`rounded-full border px-4 py-2 text-sm font-semibold transition ${
                      active
                        ? 'border-gray-900 bg-gray-900 text-white shadow-sm'
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
    </section>
  );
}
