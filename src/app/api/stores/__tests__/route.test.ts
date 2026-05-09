import { describe, it, expect, vi, beforeEach } from 'vitest';

// --- mock mysql-data ---
const mockGetStoresFromMysql = vi.fn();
const mockGetStoreDetailFromMysql = vi.fn();

vi.mock('@/lib/mysql-data', () => ({
  getStoresFromMysql: (...args: unknown[]) => mockGetStoresFromMysql(...args),
  getStoreDetailFromMysql: (...args: unknown[]) => mockGetStoreDetailFromMysql(...args),
  ReservationDbError: class ReservationDbError extends Error {
    statusCode: number;
    responseBody: string;
    constructor(statusCode: number, responseBody: string) {
      super(responseBody);
      this.name = 'ReservationDbError';
      this.statusCode = statusCode;
      this.responseBody = responseBody;
    }
  },
}));

beforeEach(() => {
  mockGetStoresFromMysql.mockReset();
  mockGetStoreDetailFromMysql.mockReset();
});

describe('GET /api/stores - MySQL 가게 목록', () => {
  it('DB에서 가게 목록을 가져와 stores 배열로 반환', async () => {
    mockGetStoresFromMysql.mockResolvedValueOnce([
      {
        storeId: 'store-1',
        name: '맛있는 한식당',
        maxCapacity: 30,
        imageUrl: 'https://example.com/img.jpg',
        timeline: [
          { slotId: 'slot-1100', timeBlock: '11:00', isAvailable: true, maxPeople: 30, currentHeadcount: 0 },
        ],
      },
    ]);

    const { GET } = await import('../../stores/route');
    const request = new Request('http://localhost:3000/api/stores?date=2026-04-05&headcount=5');
    const response = await GET(request);
    const json = await response.json();

    expect(json.stores).toHaveLength(1);
    expect(json.stores[0].id).toBe('store-1');
    expect(json.stores[0].name).toBe('맛있는 한식당');
  });

  it('DB 에러 시 503 반환', async () => {
    mockGetStoresFromMysql.mockRejectedValueOnce(new Error('network'));

    const { GET } = await import('../../stores/route');
    const request = new Request('http://localhost:3000/api/stores?date=2026-04-05&headcount=1');
    const response = await GET(request);

    expect(response.status).toBe(503);
  });
});

describe('GET /api/stores/[id] - MySQL 가게 상세', () => {
  it('DB에서 가게 상세를 가져와 반환', async () => {
    mockGetStoreDetailFromMysql.mockResolvedValueOnce({
      store: {
        id: 'store-1',
        name: '맛있는 한식당',
        images: ['https://example.com/img.jpg'],
        maxCapacity: 30,
        slots: [],
        minOrderRules: [],
      },
      menus: [{ id: 'MENU1', name: '김치찌개', price: 9000, category: '찌개', isRequired: false }],
      slots: [],
      availableTimes: [],
      reservedTimes: [],
    });

    const { GET } = await import('../../stores/[id]/route');
    const request = new Request('http://localhost:3000/api/stores/store-1?date=2026-04-05');
    const response = await GET(request, { params: Promise.resolve({ id: 'store-1' }) });
    const json = await response.json();

    expect(json.store.id).toBe('store-1');
    expect(json.menus).toHaveLength(1);
    expect(json.menus[0].name).toBe('김치찌개');
  });

  it('DB 에러 시 503 반환', async () => {
    mockGetStoreDetailFromMysql.mockRejectedValueOnce(new Error('network'));

    const { GET } = await import('../../stores/[id]/route');
    const request = new Request('http://localhost:3000/api/stores/store-1?date=2026-04-05');
    const response = await GET(request, { params: Promise.resolve({ id: 'store-1' }) });

    expect(response.status).toBe(503);
  });
});
