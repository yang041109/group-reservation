import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { validateReservationRequest } from '../validation';

describe('Feature: group-reservation-platform, Property 3: 인원수 상한 제한', () => {
  it('최대 수용 인원을 초과하는 인원수는 반드시 검증 실패해야 한다', () => {
    fc.assert(
      fc.property(
        // 최대 수용 인원: 1~100
        fc.integer({ min: 1, max: 100 }),
        // 초과 인원수: maxCapacity + 1 이상
        fc.integer({ min: 1, max: 200 }),
        (maxCapacity, extra) => {
          const headcount = maxCapacity + extra; // 항상 초과

          const result = validateReservationRequest(
            { headcount, time: '18:00', totalAmount: 100000 },
            { maxCapacity },
            ['18:00'],
            [],
          );

          expect(result.valid).toBe(false);
          expect(result.errors.some((e) => e.includes('최대 수용 가능 인원'))).toBe(true);
          expect(result.errors.some((e) => e.includes(`${maxCapacity}명`))).toBe(true);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('최대 수용 인원 이하의 인원수는 인원수 초과 에러가 발생하지 않아야 한다', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 100 }),
        (maxCapacity) => {
          // 1 ~ maxCapacity 범위의 유효한 인원수
          return fc.assert(
            fc.property(
              fc.integer({ min: 1, max: maxCapacity }),
              (headcount) => {
                const result = validateReservationRequest(
                  { headcount, time: '18:00', totalAmount: 100000 },
                  { maxCapacity },
                  ['18:00'],
                  [],
                );

                // 인원수 초과 관련 에러가 없어야 함
                expect(result.errors.some((e) => e.includes('최대 수용 가능 인원'))).toBe(false);
              },
            ),
            { numRuns: 10 },
          );
        },
      ),
      { numRuns: 100 },
    );
  });
});

describe('Feature: group-reservation-platform, Property 4: 예약 가능 시간만 선택 가능', () => {
  // 유효한 HH:mm 시간 문자열 생성기
  const arbTimeString = fc
    .tuple(fc.integer({ min: 0, max: 23 }), fc.integer({ min: 0, max: 59 }))
    .map(([h, m]) => `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`);

  // 예약 가능 시간 목록 생성기 (1~10개의 고유 시간)
  const arbAvailableTimes = fc
    .uniqueArray(arbTimeString, { minLength: 1, maxLength: 10 })

  it('예약 가능 시간 목록에 없는 시간을 선택하면 반드시 검증 실패해야 한다', () => {
    fc.assert(
      fc.property(
        arbAvailableTimes,
        arbTimeString,
        fc.integer({ min: 1, max: 50 }),
        (availableTimes, selectedTime, maxCapacity) => {
          // 선택한 시간이 예약 가능 목록에 있으면 스킵
          fc.pre(!availableTimes.includes(selectedTime));

          const result = validateReservationRequest(
            { headcount: 1, time: selectedTime, totalAmount: 100000 },
            { maxCapacity },
            availableTimes,
            [],
          );

          expect(result.valid).toBe(false);
          expect(
            result.errors.some((e) => e.includes('선택한 시간은 예약이 불가능합니다')),
          ).toBe(true);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('예약 가능 시간 목록에 있는 시간을 선택하면 시간 관련 에러가 발생하지 않아야 한다', () => {
    fc.assert(
      fc.property(
        arbAvailableTimes,
        fc.integer({ min: 1, max: 50 }),
        (availableTimes, maxCapacity) => {
          // 예약 가능 시간 목록에서 하나를 무작위 선택
          const idx = Math.floor(Math.random() * availableTimes.length);
          const selectedTime = availableTimes[idx];

          const result = validateReservationRequest(
            { headcount: 1, time: selectedTime, totalAmount: 100000 },
            { maxCapacity },
            availableTimes,
            [],
          );

          // 시간 관련 에러가 없어야 함
          expect(
            result.errors.some((e) => e.includes('선택한 시간은 예약이 불가능합니다')),
          ).toBe(false);
          expect(
            result.errors.some((e) => e.includes('시간을 선택해주세요')),
          ).toBe(false);
        },
      ),
      { numRuns: 100 },
    );
  });
});
