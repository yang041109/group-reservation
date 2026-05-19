import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  BackendApiError,
  backendFetch,
  createReservation,
  getAdminReservationList,
  getBackendApiUrl,
  getStores,
  getStoreDetail,
  getReservationsByPhone,
  cancelReservation,
  toBackendReservationRequest,
  fromBackendReservation,
  parseBackendResponse,
  type BackendCreateReservationRequest,
  type BackendReservation,
  type BackendResponse,
} from '../backend-api';
import type { CreateReservationRequest } from '@/types';

// Mock global fetch
const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

beforeEach(() => {
  mockFetch.mockReset();
});

describe('BackendApiError', () => {
  it('should store statusCode and responseBody', () => {
    const error = new BackendApiError(404, 'Not Found');
    expect(error.statusCode).toBe(404);
    expect(error.responseBody).toBe('Not Found');
    expect(error.message).toBe('Backend API error: 404');
    expect(error.name).toBe('BackendApiError');
    expect(error).toBeInstanceOf(Error);
  });
});

describe('getBackendApiUrl', () => {
  it('should return the configured BACKEND_API_URL or default', () => {
    const url = getBackendApiUrl();
    expect(typeof url).toBe('string');
    expect(url.length).toBeGreaterThan(0);
  });
});

describe('parseBackendResponse', () => {
  it('should extract data from success response', () => {
    const response: BackendResponse<{ id: number }> = {
      success: true,
      data: { id: 42 },
    };
    expect(parseBackendResponse(response)).toEqual({ id: 42 });
  });

  it('should throw BackendApiError on failure response', () => {
    const response: BackendResponse<unknown> = {
      success: false,
      message: '잘못된 요청입니다.',
    };
    expect(() => parseBackendResponse(response)).toThrow(BackendApiError);
    try {
      parseBackendResponse(response);
    } catch (e) {
      expect((e as BackendApiError).responseBody).toBe('잘못된 요청입니다.');
    }
  });

  it('should use default message when message is missing', () => {
    const response: BackendResponse<unknown> = { success: false };
    expect(() => parseBackendResponse(response)).toThrow(BackendApiError);
  });
});

describe('backendFetch', () => {
  it('should make a request with Content-Type header', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: () => Promise.resolve({ data: 'test' }),
    });

    await backendFetch('/api/test');

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/test'),
      expect.objectContaining({
        headers: expect.objectContaining({
          'Content-Type': 'application/json',
        }),
      }),
    );
  });

  it('should auto-parse success wrapper response', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: () => Promise.resolve({ success: true, data: { id: 1, name: 'test' } }),
    });

    const result = await backendFetch('/api/test');
    expect(result).toEqual({ id: 1, name: 'test' });
  });

  it('should throw on failure wrapper response', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: () => Promise.resolve({ success: false, message: '에러 발생' }),
    });

    await expect(backendFetch('/api/test')).rejects.toThrow(BackendApiError);
  });

  it('should return raw JSON when rawResponse is true', async () => {
    const rawData = [{ id: 1 }, { id: 2 }];
    mockFetch.mockResolvedValueOnce({
      ok: true,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: () => Promise.resolve(rawData),
    });

    const result = await backendFetch('/api/test', { rawResponse: true });
    expect(result).toEqual(rawData);
  });

  it('should return raw JSON with wrapper when rawResponse is true', async () => {
    const rawData = { success: true, data: { id: 1 } };
    mockFetch.mockResolvedValueOnce({
      ok: true,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: () => Promise.resolve(rawData),
    });

    const result = await backendFetch('/api/test', { rawResponse: true });
    // rawResponse skips wrapper parsing, returns as-is
    expect(result).toEqual(rawData);
  });

  it('should return plain JSON when no success field present', async () => {
    const plainData = { id: 1, name: 'test' };
    mockFetch.mockResolvedValueOnce({
      ok: true,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: () => Promise.resolve(plainData),
    });

    const result = await backendFetch('/api/test');
    expect(result).toEqual(plainData);
  });

  it('should return text response when content-type is not JSON', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      headers: new Headers({ 'content-type': 'text/plain' }),
      text: () => Promise.resolve('Success message'),
    });

    const result = await backendFetch<string>('/api/test');
    expect(result).toBe('Success message');
  });

  it('should throw BackendApiError on non-ok response', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      text: () => Promise.resolve('Internal Server Error'),
    });

    await expect(backendFetch('/api/test')).rejects.toThrow(BackendApiError);
  });

  it('should parse wrapper error from non-ok response body', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 400,
      text: () => Promise.resolve(JSON.stringify({ success: false, message: '중복 예약입니다.' })),
    });

    try {
      await backendFetch('/api/test');
    } catch (e) {
      expect(e).toBeInstanceOf(BackendApiError);
      expect((e as BackendApiError).statusCode).toBe(400);
      expect((e as BackendApiError).responseBody).toBe('중복 예약입니다.');
    }
  });
});

describe('createReservation', () => {
  it('should POST to /api/reservations with new request format', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: () => Promise.resolve({ success: true, data: { id: 1 } }),
    });

    const request: BackendCreateReservationRequest = {
      userName: '홍길동',
      groupName: '테스트 그룹',
      userPhone: '010-1234-5678',
      userNote: '',
      storeId: 'store-1',
      slotId: '18:00',
      headcount: 5,
      selectedMenus: [{ menuId: 'menu-1', quantity: 3 }],
    };

    const result = await createReservation(request);
    expect(result).toEqual({ id: 1 });
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/reservations'),
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify(request),
      }),
    );
  });
});

describe('getStores', () => {
  it('should GET /api/stores with date and headcount params', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: () => Promise.resolve({ success: true, data: [{ id: 'store-1' }] }),
    });

    const result = await getStores('2025-03-01', 4);
    expect(result).toEqual([{ id: 'store-1' }]);
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/stores?date=2025-03-01&headcount=4'),
      expect.anything(),
    );
  });
});

describe('getStoreDetail', () => {
  it('should GET /api/stores/:id with date param', async () => {
    const storeData = { store: { id: 'store-1' }, menus: [] };
    mockFetch.mockResolvedValueOnce({
      ok: true,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: () => Promise.resolve({ success: true, data: storeData }),
    });

    const result = await getStoreDetail('store-1', '2025-03-01');
    expect(result).toEqual(storeData);
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/stores/store-1?date=2025-03-01'),
      expect.anything(),
    );
  });
});

describe('getReservationsByPhone', () => {
  it('should GET /api/reservations/check with encoded phone', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: () => Promise.resolve({ success: true, data: [] }),
    });

    const result = await getReservationsByPhone('010-1234-5678');
    expect(result).toEqual([]);
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/reservations/check?userPhone=010-1234-5678'),
      expect.anything(),
    );
  });
});

describe('cancelReservation', () => {
  it('should PATCH /api/reservations/:id/cancel', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: () => Promise.resolve({ success: true, data: { cancelled: true } }),
    });

    const result = await cancelReservation('res-123');
    expect(result).toEqual({ cancelled: true });
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/reservations/res-123/cancel'),
      expect.objectContaining({ method: 'PATCH' }),
    );
  });
});

describe('getAdminReservationList', () => {
  it('should GET /api/reservations/admin/list with rawResponse (no wrapper parsing)', async () => {
    const mockReservations = [
      {
        id: 1,
        storeId: 'store-1',
        headcount: 5,
        time: '18:00',
        totalAmount: 50000,
        minOrderAmount: 50000,
        status: 'PENDING',
        createdAt: '2025-01-01T12:00:00',
        menuItems: [{ menuId: 'menu-1', name: '김치찌개', quantity: 3, price: 9000 }],
      },
    ];

    mockFetch.mockResolvedValueOnce({
      ok: true,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: () => Promise.resolve(mockReservations),
    });

    const result = await getAdminReservationList();
    expect(result).toEqual(mockReservations);
    expect(result[0].id).toBe(1);
  });
});

describe('toBackendReservationRequest', () => {
  it('should map new fields correctly (no menuData param)', () => {
    const req: CreateReservationRequest = {
      storeId: 'store-1',
      headcount: 5,
      date: '2025-02-01',
      time: '18:00',
      groupName: '테스트 그룹',
      representativeName: '홍길동',
      phone: '010-1234-5678',
      menuItems: [
        { menuId: 'menu-1', quantity: 3 },
        { menuId: 'menu-2', quantity: 2 },
      ],
      totalAmount: 57000,
      minOrderAmount: 50000,
    };

    const result = toBackendReservationRequest(req);

    expect(result.userName).toBe('홍길동');
    expect(result.groupName).toBe('테스트 그룹');
    expect(result.userPhone).toBe('010-1234-5678');
    expect(result.userNote).toBe('');
    expect(result.storeId).toBe('store-1');
    expect(result.slotId).toBe('18:00');
    expect(result.headcount).toBe(5);
    expect(result.selectedMenus).toHaveLength(2);
    expect(result.selectedMenus[0]).toEqual({ menuId: 'menu-1', quantity: 3 });
    expect(result.selectedMenus[1]).toEqual({ menuId: 'menu-2', quantity: 2 });
    // totalAmount, minOrderAmount should NOT be in result
    expect('totalAmount' in result).toBe(false);
    expect('minOrderAmount' in result).toBe(false);
  });
});

describe('fromBackendReservation', () => {
  const backendRes: BackendReservation = {
    id: 42,
    storeId: 'store-1',
    headcount: 5,
    time: '18:00',
    totalAmount: 50000,
    minOrderAmount: 50000,
    status: 'PENDING',
    createdAt: '2025-01-15T14:30:00',
    menuItems: [
      { menuId: 'menu-1', name: '김치찌개', quantity: 3, price: 9000 },
    ],
  };

  it('should convert id from number to string', () => {
    const result = fromBackendReservation(backendRes);
    expect(result.id).toBe('42');
  });

  it('should convert createdAt from ISO string to Date', () => {
    const result = fromBackendReservation(backendRes);
    expect(result.createdAt).toBeInstanceOf(Date);
    expect(result.createdAt.toISOString()).toContain('2025-01-15');
  });

  it('should use provided storeName', () => {
    const result = fromBackendReservation(backendRes, '맛있는 한식당');
    expect(result.storeName).toBe('맛있는 한식당');
  });

  it('should use empty string when storeName is not provided', () => {
    const result = fromBackendReservation(backendRes);
    expect(result.storeName).toBe('');
  });

  it('should map all fields correctly', () => {
    const result = fromBackendReservation(backendRes, '테스트 가게');

    expect(result.storeId).toBe('store-1');
    expect(result.headcount).toBe(5);
    expect(result.time).toBe('18:00');
    expect(result.totalAmount).toBe(50000);
    expect(result.minOrderAmount).toBe(50000);
    expect(result.status).toBe('PENDING');
    expect(result.menuItems).toHaveLength(1);
    expect(result.menuItems[0]).toEqual({
      menuId: 'menu-1',
      name: '김치찌개',
      quantity: 3,
      priceAtTime: 9000,
      price: 9000,
    });
  });
});
