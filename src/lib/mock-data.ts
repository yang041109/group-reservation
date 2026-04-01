import type {
  StoreCard,
  StoreDetail,
  MenuItemData,
  MinOrderRule,
  NotificationData,
} from '@/types';

// ============================================================
// Mock 데이터 - DB 없이 프론트엔드 확인용
// 나중에 Firebase로 교체 시 이 파일만 제거하면 됩니다.
// ============================================================

export interface MockStore {
  id: string;
  name: string;
  category?: string;
  images: string[];
  availableTimes: string[];
  reservedTimes: string[];
  maxCapacity: number;
  minOrderRules: MinOrderRule[];
  menus: MenuItemData[];
}

export interface MockReservation {
  id: string;
  storeId: string;
  headcount: number;
  date: string;
  time: string;
  totalAmount: number;
  status: 'pending' | 'accepted' | 'rejected';
  adminNote: string | null;
  menuItems: { menuId: string; name: string; quantity: number; priceAtTime: number }[];
  createdAt: Date;
}

export interface MockNotification {
  id: string;
  reservationId: string;
  storeName: string;
  type: 'accepted' | 'rejected';
  message: string;
  adminNote: string | null;
  isRead: boolean;
  createdAt: Date;
}

// --- 샘플 가게 데이터 ---

const STORES: MockStore[] = [
  {
    id: 'store-1',
    name: '맛있는 한식당',
    category: '한식',
    images: [
      'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=800&h=450&fit=crop',
    ],
    availableTimes: [
      '11:00', '11:30', '12:00', '12:30',
      '15:00', '15:30', '16:00', '16:30',
      '17:30', '18:00', '18:30', '19:00', '19:30', '20:00', '20:30',
    ],
    reservedTimes: ['13:00', '13:30', '14:00', '14:30', '17:00'],
    maxCapacity: 30,
    minOrderRules: [
      { minHeadcount: 1, maxHeadcount: 5, minOrderAmount: 50000 },
      { minHeadcount: 6, maxHeadcount: 15, minOrderAmount: 100000 },
      { minHeadcount: 16, maxHeadcount: 30, minOrderAmount: 200000 },
    ],
    menus: [
      { id: 'menu-1-1', name: '김치찌개', price: 9000, category: '찌개' },
      { id: 'menu-1-2', name: '된장찌개', price: 8000, category: '찌개' },
      { id: 'menu-1-3', name: '불고기', price: 15000, category: '메인' },
      { id: 'menu-1-4', name: '잡채', price: 12000, category: '메인' },
      { id: 'menu-1-5', name: '공기밥', price: 1000, category: '사이드' },
      { id: 'menu-1-6', name: '계란말이', price: 7000, category: '사이드' },
    ],
  },
  {
    id: 'store-2',
    name: '화덕 피자 하우스',
    category: '양식',
    images: [
      'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=800&h=450&fit=crop',
    ],
    availableTimes: [
      '11:00', '11:30', '12:00', '12:30', '13:30',
      '16:00', '16:30', '17:30', '18:00', '18:30', '19:00', '19:30', '20:00', '20:30',
    ],
    reservedTimes: ['13:00', '14:00', '14:30', '15:00', '15:30', '17:00'],
    maxCapacity: 20,
    minOrderRules: [
      { minHeadcount: 1, maxHeadcount: 4, minOrderAmount: 40000 },
      { minHeadcount: 5, maxHeadcount: 10, minOrderAmount: 80000 },
      { minHeadcount: 11, maxHeadcount: 20, minOrderAmount: 150000 },
    ],
    menus: [
      { id: 'menu-2-1', name: '마르게리타 피자', price: 18000, category: '피자' },
      { id: 'menu-2-2', name: '페퍼로니 피자', price: 20000, category: '피자' },
      { id: 'menu-2-3', name: '고르곤졸라 피자', price: 22000, category: '피자' },
      { id: 'menu-2-4', name: '시저 샐러드', price: 12000, category: '사이드' },
      { id: 'menu-2-5', name: '콜라', price: 3000, category: '음료' },
      { id: 'menu-2-6', name: '에이드', price: 5000, category: '음료' },
    ],
  },
  {
    id: 'store-3',
    name: '스시 오마카세',
    category: '일식',
    images: [
      'https://images.unsplash.com/photo-1579871494447-9811cf80d66c?w=800&h=450&fit=crop',
    ],
    availableTimes: [
      '11:30', '12:00', '12:30',
      '17:30', '18:00', '18:30', '19:00', '19:30', '20:00',
    ],
    reservedTimes: ['11:00', '13:00', '13:30', '17:00'],
    maxCapacity: 12,
    minOrderRules: [
      { minHeadcount: 1, maxHeadcount: 4, minOrderAmount: 100000 },
      { minHeadcount: 5, maxHeadcount: 12, minOrderAmount: 200000 },
    ],
    menus: [
      { id: 'menu-3-1', name: '런치 오마카세', price: 45000, category: '코스' },
      { id: 'menu-3-2', name: '디너 오마카세', price: 80000, category: '코스' },
      { id: 'menu-3-3', name: '사케 (1잔)', price: 12000, category: '음료' },
      { id: 'menu-3-4', name: '맥주', price: 7000, category: '음료' },
    ],
  },
];

// --- In-memory state ---

let reservations: MockReservation[] = [];
let notifications: MockNotification[] = [];
let nextReservationId = 1;
let nextNotificationId = 1;

// --- Store 조회 ---

export function getAllStores(): MockStore[] {
  return STORES;
}

export function getStoreById(id: string): MockStore | undefined {
  return STORES.find((s) => s.id === id);
}

// --- Reservation ---

export function createReservation(data: {
  storeId: string;
  headcount: number;
  date: string;
  time: string;
  totalAmount: number;
  menuItems: { menuId: string; quantity: number }[];
  storeName: string;
  menus: MenuItemData[];
}): MockReservation {
  const id = `res-${nextReservationId++}`;
  const reservation: MockReservation = {
    id,
    storeId: data.storeId,
    headcount: data.headcount,
    date: data.date,
    time: data.time,
    totalAmount: data.totalAmount,
    status: 'pending',
    adminNote: null,
    menuItems: data.menuItems.map((item) => {
      const menu = data.menus.find((m) => m.id === item.menuId);
      return {
        menuId: item.menuId,
        name: menu?.name ?? '',
        quantity: item.quantity,
        priceAtTime: menu?.price ?? 0,
      };
    }),
    createdAt: new Date(),
  };
  reservations.push(reservation);
  return reservation;
}

export function getReservationById(id: string): MockReservation | undefined {
  return reservations.find((r) => r.id === id);
}

export function getAllReservations(): MockReservation[] {
  return [...reservations].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
}

export function updateReservation(
  id: string,
  data: { status: string; adminNote?: string | null },
): MockReservation | undefined {
  const r = reservations.find((r) => r.id === id);
  if (!r) return undefined;
  r.status = data.status as MockReservation['status'];
  if (data.adminNote !== undefined) r.adminNote = data.adminNote;
  return r;
}

export function deleteReservation(id: string): boolean {
  const idx = reservations.findIndex((r) => r.id === id);
  if (idx === -1) return false;
  reservations.splice(idx, 1);
  return true;
}

// --- Notification ---

export function addNotification(data: {
  reservationId: string;
  storeName: string;
  type: 'accepted' | 'rejected';
  message: string;
  adminNote: string | null;
}): MockNotification {
  const id = `notif-${nextNotificationId++}`;
  const notification: MockNotification = {
    id,
    reservationId: data.reservationId,
    storeName: data.storeName,
    type: data.type,
    message: data.message,
    adminNote: data.adminNote,
    isRead: false,
    createdAt: new Date(),
  };
  notifications.push(notification);
  return notification;
}

export function getAllNotifications(): MockNotification[] {
  return [...notifications].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
}

export function getNotificationById(id: string): MockNotification | undefined {
  return notifications.find((n) => n.id === id);
}

export function markNotificationRead(id: string): MockNotification | undefined {
  const n = notifications.find((n) => n.id === id);
  if (n) n.isRead = true;
  return n;
}

export function getUnreadCount(): number {
  return notifications.filter((n) => !n.isRead).length;
}
