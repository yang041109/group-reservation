// ============================================================
// 가게/메뉴/규칙 정적 데이터 (코드 내장)
// Sheets 호출 없이 즉시 로딩
// 가게 추가/수정 시 이 파일만 수정하면 됨
// ============================================================

import type { MinOrderRule, MenuItemData } from '@/types';

export interface StaticStore {
  id: string;
  name: string;
  category: string;
  maxCapacity: number;
  imageUrl: string;
  description: string;
  menus: MenuItemData[];
  minOrderRules: MinOrderRule[];
}

export const STORES: StaticStore[] = [
  {
    id: 'store-1',
    name: '맛있는 한식당',
    category: '한식',
    maxCapacity: 30,
    imageUrl: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=800&h=450&fit=crop',
    description: '넉넉한 단체석 · 주차 가능',
    menus: [
      { id: 'menu-1-1', name: '김치찌개', price: 9000, category: '찌개' },
      { id: 'menu-1-2', name: '된장찌개', price: 8000, category: '찌개' },
      { id: 'menu-1-3', name: '불고기', price: 15000, category: '메인' },
      { id: 'menu-1-4', name: '잡채', price: 12000, category: '메인' },
      { id: 'menu-1-5', name: '공기밥', price: 1000, category: '사이드', isRequired: true },
      { id: 'menu-1-6', name: '계란말이', price: 7000, category: '사이드' },
    ],
    minOrderRules: [
      { minHeadcount: 1, maxHeadcount: 5, minOrderAmount: 50000 },
      { minHeadcount: 6, maxHeadcount: 15, minOrderAmount: 100000 },
      { minHeadcount: 16, maxHeadcount: 30, minOrderAmount: 200000 },
    ],
  },
  {
    id: 'store-2',
    name: '화덕 피자 하우스',
    category: '양식',
    maxCapacity: 20,
    imageUrl: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=800&h=450&fit=crop',
    description: '프라이빗 룸 완비',
    menus: [
      { id: 'menu-2-1', name: '마르게리타 피자', price: 18000, category: '피자' },
      { id: 'menu-2-2', name: '페퍼로니 피자', price: 20000, category: '피자' },
      { id: 'menu-2-3', name: '고르곤졸라 피자', price: 22000, category: '피자' },
      { id: 'menu-2-4', name: '시저 샐러드', price: 12000, category: '사이드' },
      { id: 'menu-2-5', name: '콜라', price: 3000, category: '음료' },
    ],
    minOrderRules: [
      { minHeadcount: 1, maxHeadcount: 4, minOrderAmount: 40000 },
      { minHeadcount: 5, maxHeadcount: 10, minOrderAmount: 80000 },
      { minHeadcount: 11, maxHeadcount: 20, minOrderAmount: 150000 },
    ],
  },
  {
    id: 'store-3',
    name: '스시 오마카세',
    category: '일식',
    maxCapacity: 12,
    imageUrl: 'https://images.unsplash.com/photo-1579871494447-9811cf80d66c?w=800&h=450&fit=crop',
    description: '정통 일식 오마카세',
    menus: [
      { id: 'menu-3-1', name: '런치 오마카세', price: 45000, category: '코스' },
      { id: 'menu-3-2', name: '디너 오마카세', price: 80000, category: '코스' },
      { id: 'menu-3-3', name: '사케', price: 12000, category: '음료' },
    ],
    minOrderRules: [
      { minHeadcount: 1, maxHeadcount: 4, minOrderAmount: 100000 },
      { minHeadcount: 5, maxHeadcount: 12, minOrderAmount: 200000 },
    ],
  },
];

export function getStaticStore(id: string): StaticStore | undefined {
  return STORES.find((s) => s.id === id);
}

export function getAllStaticStores(): StaticStore[] {
  return STORES;
}
