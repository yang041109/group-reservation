import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as fc from 'fast-check';

// Mock global fetch
const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

beforeEach(() => {
  mockFetch.mockReset();
  vi.resetModules();
});

// 유효한 URL 문자열 생성기
const arbUrl = fc
  .tuple(
    fc.constantFrom('http', 'https'),
    fc.array(fc.constantFrom(...'abcdefghijklmnopqrstuvwxyz0123456789'.split('')), {
      minLength: 3,
      maxLength: 15,
    }),
    fc.option(fc.integer({ min: 1000, max: 65535 }), { nil: undefined }),
  )
  .map(([protocol, hostChars, port]) => {
    const host = hostChars.join('');
    return port ? `${protocol}://${host}:${port}` : `${protocol}://${host}`;
  });

// API 경로 생성기
const arbPath = fc
  .array(fc.constantFrom(...'abcdefghijklmnopqrstuvwxyz-/'.split('')), {
    minLength: 1,
    maxLength: 30,
  })
  .map((chars) => {
    const p = chars.join('');
    return p.startsWith('/') ? p : `/${p}`;
  });

describe('Feature: group-reservation-platform, Property 15: 백엔드 API Base URL 환경 변수 설정', () => {
  it('BACKEND_API_URL 환경 변수 값이 base URL로 사용되어야 한다', async () => {
    await fc.assert(
      fc.asyncProperty(arbUrl, async (url) => {
        vi.resetModules();
        vi.stubEnv('BACKEND_API_URL', url);

        const { getBackendApiUrl, backendFetch } = await import('../backend-api');

        // getBackendApiUrl이 환경 변수 값을 반환하는지 확인
        expect(getBackendApiUrl()).toBe(url);

        // backendFetch가 해당 URL을 base로 사용하는지 확인
        mockFetch.mockResolvedValueOnce({
          ok: true,
          headers: new Headers({ 'content-type': 'application/json' }),
          json: () => Promise.resolve({ test: true }),
        });

        await backendFetch('/api/test');

        const calledUrl = mockFetch.mock.calls[0][0] as string;
        expect(calledUrl).toBe(`${url}/api/test`);

        vi.unstubAllEnvs();
        mockFetch.mockReset();
      }),
      { numRuns: 50 },
    );
  });

  it('BACKEND_API_URL 미설정 시 기본값 http://localhost:8080을 사용해야 한다', async () => {
    vi.resetModules();
    delete process.env.BACKEND_API_URL;

    const { getBackendApiUrl, backendFetch } = await import('../backend-api');

    expect(getBackendApiUrl()).toBe('http://localhost:8080');

    mockFetch.mockResolvedValueOnce({
      ok: true,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: () => Promise.resolve({ test: true }),
    });

    await backendFetch('/api/test');

    const calledUrl = mockFetch.mock.calls[0][0] as string;
    expect(calledUrl).toBe('http://localhost:8080/api/test');
  });

  it('임의의 API 경로에 대해 base URL + 경로가 정확히 결합되어야 한다', async () => {
    await fc.assert(
      fc.asyncProperty(arbUrl, arbPath, async (url, path) => {
        vi.resetModules();
        vi.stubEnv('BACKEND_API_URL', url);

        const { backendFetch } = await import('../backend-api');

        mockFetch.mockResolvedValueOnce({
          ok: true,
          headers: new Headers({ 'content-type': 'application/json' }),
          json: () => Promise.resolve({}),
        });

        await backendFetch(path);

        const calledUrl = mockFetch.mock.calls[0][0] as string;
        expect(calledUrl).toBe(`${url}${path}`);

        vi.unstubAllEnvs();
        mockFetch.mockReset();
      }),
      { numRuns: 50 },
    );
  });
});

// --- Property 16: DTO 변환 정확성 (새 필드) ---

import { toBackendReservationRequest } from '../backend-api';
import type { CreateReservationRequest } from '@/types';

// 프론트엔드 예약 요청 생성기
const arbCreateReservationRequest: fc.Arbitrary<CreateReservationRequest> = fc.record({
  storeId: fc.string({ minLength: 1, maxLength: 20 }),
  headcount: fc.integer({ min: 1, max: 100 }),
  date: fc.tuple(
    fc.integer({ min: 2025, max: 2030 }),
    fc.integer({ min: 1, max: 12 }),
    fc.integer({ min: 1, max: 28 }),
  ).map(([y, m, d]) => `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`),
  time: fc.stringMatching(/^[0-2]\d:[0-5]\d$/),
  groupName: fc.string({ minLength: 1, maxLength: 50 }),
  representativeName: fc.string({ minLength: 1, maxLength: 30 }),
  phone: fc.stringMatching(/^010-\d{4}-\d{4}$/),
  menuItems: fc.array(
    fc.record({
      menuId: fc.string({ minLength: 1, maxLength: 20 }),
      quantity: fc.integer({ min: 1, max: 50 }),
    }),
    { minLength: 0, maxLength: 10 },
  ),
  totalAmount: fc.integer({ min: 0, max: 10000000 }),
  minOrderAmount: fc.integer({ min: 0, max: 10000000 }),
});

describe('Feature: group-reservation-platform, Property 16: 프론트엔드 → 백엔드 예약 DTO 변환 정확성 (새 필드)', () => {
  it('userName, groupName, userPhone, userNote, slotId, selectedMenus가 정확히 매핑되어야 한다', () => {
    fc.assert(
      fc.property(arbCreateReservationRequest, (req) => {
        const result = toBackendReservationRequest(req);

        // 필드 매핑 검증
        expect(result.userName).toBe(req.representativeName);
        expect(result.groupName).toBe(req.groupName);
        expect(result.userPhone).toBe(req.phone);
        expect(result.userNote).toBe('');
        expect(result.storeId).toBe(req.storeId);
        expect(result.slotId).toBe(req.time);
        expect(result.headcount).toBe(req.headcount);

        // selectedMenus: menuId, quantity만 포함
        expect(result.selectedMenus).toHaveLength(req.menuItems.length);
        for (let i = 0; i < req.menuItems.length; i++) {
          expect(result.selectedMenus[i].menuId).toBe(req.menuItems[i].menuId);
          expect(result.selectedMenus[i].quantity).toBe(req.menuItems[i].quantity);
          // name, price가 포함되지 않아야 함
          expect(Object.keys(result.selectedMenus[i])).toEqual(['menuId', 'quantity']);
        }
      }),
      { numRuns: 100 },
    );
  });

  it('totalAmount, minOrderAmount가 변환 결과에 포함되지 않아야 한다', () => {
    fc.assert(
      fc.property(arbCreateReservationRequest, (req) => {
        const result = toBackendReservationRequest(req);

        expect('totalAmount' in result).toBe(false);
        expect('minOrderAmount' in result).toBe(false);
      }),
      { numRuns: 100 },
    );
  });
});

// --- Property 17: 공통 응답 래퍼 파싱 ---

import { parseBackendResponse, BackendApiError } from '../backend-api';

describe('Feature: group-reservation-platform, Property 17: 백엔드 공통 응답 래퍼 파싱', () => {
  it('성공 응답 { success: true, data: X }에서 data 값 X를 정확히 반환해야 한다', () => {
    fc.assert(
      fc.property(fc.anything(), (data) => {
        const response = { success: true as const, data };
        const result = parseBackendResponse(response);
        expect(result).toEqual(data);
      }),
      { numRuns: 100 },
    );
  });

  it('실패 응답 { success: false, message: M }에서 message 값 M을 포함하는 에러를 발생시켜야 한다', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 200 }),
        (message) => {
          const response = { success: false as const, message };
          try {
            parseBackendResponse(response);
            // 여기 도달하면 안 됨
            expect(true).toBe(false);
          } catch (e) {
            expect(e).toBeInstanceOf(BackendApiError);
            expect((e as BackendApiError).responseBody).toBe(message);
          }
        },
      ),
      { numRuns: 100 },
    );
  });

  it('실패 응답에 message가 없으면 기본 에러 메시지를 사용해야 한다', () => {
    const response = { success: false as const };
    try {
      parseBackendResponse(response);
      expect(true).toBe(false);
    } catch (e) {
      expect(e).toBeInstanceOf(BackendApiError);
      expect((e as BackendApiError).responseBody).toBe('요청 처리에 실패했습니다.');
    }
  });
});
