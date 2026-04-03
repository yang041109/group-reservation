import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET } from '../route';

// Mock backend-api module
vi.mock('@/lib/backend-api', () => {
  const BackendApiError = class extends Error {
    statusCode: number;
    responseBody: string;
    constructor(statusCode: number, responseBody: string) {
      super(`Backend API error: ${statusCode}`);
      this.name = 'BackendApiError';
      this.statusCode = statusCode;
      this.responseBody = responseBody;
    }
  };

  return {
    BackendApiError,
    getAdminReservationList: vi.fn(),
    fromBackendReservation: vi.fn(),
  };
});

// Mock mock-data module
vi.mock('@/lib/mock-data', () => ({
  getStoreById: vi.fn(),
}));

import { getAdminReservationList, fromBackendReservation, BackendApiError } from '@/lib/backend-api';
import { getStoreById } from '@/lib/mock-data';

const mockGetAdminReservationList = getAdminReservationList as ReturnType<typeof vi.fn>;
const mockFromBackendReservation = fromBackendReservation as ReturnType<typeof vi.fn>;
const mockGetStoreById = getStoreById as ReturnType<typeof vi.fn>;

beforeEach(() => {
  vi.clearAllMocks();
});

describe('GET /api/reservations/admin/list', () => {
  it('returns transformed reservations from backend', async () => {
    const backendData = [
      {
        id: 1,
        storeId: 'store-1',
        headcount: 5,
        time: '18:00',
        totalAmount: 100000,
        minOrderAmount: 50000,
        status: 'PENDING',
        createdAt: '2024-01-15T10:00:00',
        menuItems: [{ menuId: 'm1', name: '김치찌개', quantity: 5, price: 9000 }],
      },
    ];

    const transformedView = {
      id: '1',
      storeId: 'store-1',
      storeName: '맛있는 한식당',
      headcount: 5,
      time: '18:00',
      totalAmount: 100000,
      minOrderAmount: 50000,
      status: 'PENDING',
      createdAt: new Date('2024-01-15T10:00:00'),
      menuItems: [{ menuId: 'm1', name: '김치찌개', quantity: 5, price: 9000 }],
    };

    mockGetAdminReservationList.mockResolvedValue(backendData);
    mockGetStoreById.mockReturnValue({ name: '맛있는 한식당' });
    mockFromBackendReservation.mockReturnValue(transformedView);

    const response = await GET();
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.reservations).toHaveLength(1);
    expect(json.reservations[0].id).toBe('1');
    expect(json.reservations[0].storeName).toBe('맛있는 한식당');
    expect(json.reservations[0].headcount).toBe(5);
    expect(json.reservations[0].totalAmount).toBe(100000);
    expect(json.reservations[0].status).toBe('PENDING');
    expect(mockGetAdminReservationList).toHaveBeenCalledOnce();
    expect(mockGetStoreById).toHaveBeenCalledWith('store-1');
    expect(mockFromBackendReservation).toHaveBeenCalledWith(backendData[0], '맛있는 한식당');
  });

  it('passes undefined storeName when store not found in mock data', async () => {
    const backendData = [
      {
        id: 2,
        storeId: 'unknown-store',
        headcount: 3,
        time: '12:00',
        totalAmount: 50000,
        minOrderAmount: 40000,
        status: 'PENDING',
        createdAt: '2024-01-15T11:00:00',
        menuItems: [],
      },
    ];

    mockGetAdminReservationList.mockResolvedValue(backendData);
    mockGetStoreById.mockReturnValue(undefined);
    mockFromBackendReservation.mockReturnValue({ id: '2', storeName: '' });

    const response = await GET();

    expect(mockFromBackendReservation).toHaveBeenCalledWith(backendData[0], undefined);
    expect(response.status).toBe(200);
  });

  it('returns empty array when backend returns no reservations', async () => {
    mockGetAdminReservationList.mockResolvedValue([]);

    const response = await GET();
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.reservations).toEqual([]);
  });

  it('returns 503 with error message on BackendApiError', async () => {
    mockGetAdminReservationList.mockRejectedValue(
      new BackendApiError(500, 'Internal Server Error'),
    );

    const response = await GET();
    const json = await response.json();

    expect(response.status).toBe(503);
    expect(json.error).toBe('예약 목록을 불러올 수 없습니다');
  });

  it('returns 503 with error message on network/generic error', async () => {
    mockGetAdminReservationList.mockRejectedValue(new Error('ECONNREFUSED'));

    const response = await GET();
    const json = await response.json();

    expect(response.status).toBe(503);
    expect(json.error).toBe('예약 목록을 불러올 수 없습니다');
  });
});
