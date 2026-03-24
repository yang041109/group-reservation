import { describe, it, expect } from 'vitest';
import { calculateTotalAmount } from '../validation';
import type { MenuItemData } from '@/types';

const sampleMenuData: MenuItemData[] = [
  { id: 'menu-1', name: '김치찌개', price: 9000 },
  { id: 'menu-2', name: '된장찌개', price: 8000, category: '찌개' },
  { id: 'menu-3', name: '공기밥', price: 1000, category: '사이드' },
];

describe('calculateTotalAmount', () => {
  it('메뉴 아이템별 (가격 × 수량)의 합을 반환한다', () => {
    const result = calculateTotalAmount(
      [
        { menuId: 'menu-1', quantity: 2 },
        { menuId: 'menu-3', quantity: 3 },
      ],
      sampleMenuData,
    );
    // 9000*2 + 1000*3 = 21000
    expect(result).toBe(21000);
  });

  it('빈 메뉴 아이템 배열이면 0을 반환한다', () => {
    expect(calculateTotalAmount([], sampleMenuData)).toBe(0);
  });

  it('존재하지 않는 menuId는 0원으로 처리한다', () => {
    const result = calculateTotalAmount(
      [
        { menuId: 'menu-1', quantity: 1 },
        { menuId: 'unknown', quantity: 5 },
      ],
      sampleMenuData,
    );
    expect(result).toBe(9000);
  });

  it('수량이 0인 항목은 금액에 영향을 주지 않는다', () => {
    const result = calculateTotalAmount(
      [
        { menuId: 'menu-1', quantity: 0 },
        { menuId: 'menu-2', quantity: 1 },
      ],
      sampleMenuData,
    );
    expect(result).toBe(8000);
  });

  it('단일 메뉴 아이템의 금액을 정확히 계산한다', () => {
    const result = calculateTotalAmount(
      [{ menuId: 'menu-2', quantity: 4 }],
      sampleMenuData,
    );
    expect(result).toBe(32000);
  });

  it('메뉴 데이터가 비어있으면 0을 반환한다', () => {
    const result = calculateTotalAmount(
      [{ menuId: 'menu-1', quantity: 2 }],
      [],
    );
    expect(result).toBe(0);
  });
});
