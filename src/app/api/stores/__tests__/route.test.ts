import { describe, it, expect, vi, beforeEach } from 'vitest';

// --- mock sheets-api ---
const mockGetStoresFromSheets = vi.fn();
const mockGetStoreDetailFromSheets = vi.fn();

vi.mock('@/lib/sheets-api', () => ({
  getStoresFromSheets: (...args: unknown[]) => mockGetStoresFromSheets(...args),
  getStoreDetailFromSheets: (...args: unknown[]) => mockGetStoreDetailFromSheets(...args),
  SheetsApiError: class SheetsApiError extends Error {
    statusCode: number;
    responseBody: string;
    constructor(statusCode: number, responseBody: string) {
      super(`Sheets API error: ${statusCode}`);
      this.name = 'SheetsApiError';
      this.statusCode = statusCode;
      this.responseBody = responseBody;
    }
  },
}));

beforeEach(() => {
  mockGetStoresFromSheets.mockReset();
  mockGetStoreDetailFromSheets.mockReset();
});

describe('GET /api/stores - Sheets 가게 목록', () => {
  it('Sheets에서 가게 목록을 가져와 stores 배열로 반환', async () => {
    mockGetStoresFromSheets.mockResolvedValueOnce([
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

  it('Sheets 에러 시 503 반환', async () => {
    mockGetStoresFromSheets.mockRejectedValueOnce(new Error('network'));

    const { GET } = await import('../../stores/route');
    const request = new Request('http://localhost:3000/api/stores?date=2026-04-05&headcount=1');
    const response = await GET(request);

    expect(response.status).toBe(503);
  });
});

describe('GET /api/stores/[id] - Sheets 가게 상세', () => {
  it('Sheets에서 가게 상세를 가져와 반환', async () => {
    mockGetStoreDetailFromSheets.mockResolvedValueOnce({
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

  it('Sheets 에러 시 503 반환', async () => {
    mockGetStoreDetailFromSheets.mockRejectedValueOnce(new Error('network'));

    const { GET } = await import('../../stores/[id]/route');
    const request = new Request('http://localhost:3000/api/stores/store-1?date=2026-04-05');
    const response = await GET(request, { params: Promise.resolve({ id: 'store-1' }) });

    expect(response.status).toBe(503);
  });
});
