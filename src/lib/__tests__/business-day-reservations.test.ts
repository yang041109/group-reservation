import { describe, expect, it } from 'vitest';
import {
  filterReservationsForBusinessDay,
  reservationBelongsToBusinessDay,
  resolveOwnerBusinessDayYmd,
} from '@/lib/business-day-reservations';

const crossRange = {
  slotStartHour: 17,
  slotEndHour: 4,
  crossesMidnight: true,
  closed: false,
};

const dayRange = {
  slotStartHour: 11,
  slotEndHour: 21,
  crossesMidnight: false,
  closed: false,
};

describe('business-day-reservations', () => {
  it('includes evening and after-midnight on the same business date', () => {
    expect(
      reservationBelongsToBusinessDay(
        { date: '2026-05-26', startTime: '20:00' },
        '2026-05-26',
        crossRange,
      ),
    ).toBe(true);
    expect(
      reservationBelongsToBusinessDay(
        { date: '2026-05-26', startTime: '01:30' },
        '2026-05-26',
        crossRange,
      ),
    ).toBe(true);
    expect(
      reservationBelongsToBusinessDay(
        { date: '2026-05-27', startTime: '01:30' },
        '2026-05-26',
        crossRange,
      ),
    ).toBe(true);
  });

  it('excludes afternoon gaps and other calendar days', () => {
    expect(
      reservationBelongsToBusinessDay(
        { date: '2026-05-26', startTime: '14:00' },
        '2026-05-26',
        crossRange,
      ),
    ).toBe(false);
    expect(
      reservationBelongsToBusinessDay(
        { date: '2026-05-25', startTime: '20:00' },
        '2026-05-26',
        crossRange,
      ),
    ).toBe(false);
    expect(
      reservationBelongsToBusinessDay(
        { date: '2026-05-27', startTime: '20:00' },
        '2026-05-26',
        crossRange,
      ),
    ).toBe(false);
  });

  it('sorts evening before after-midnight', () => {
    const sorted = filterReservationsForBusinessDay(
      [
        { date: '2026-05-26', startTime: '01:00', id: 'a' },
        { date: '2026-05-26', startTime: '19:00', id: 'b' },
      ],
      '2026-05-26',
      crossRange,
    );
    expect(sorted.map((r) => r.startTime)).toEqual(['19:00', '01:00']);
  });

  it('before close hour uses previous business day', () => {
    const lookup = (ymd: string) =>
      ymd === '2026-05-27'
        ? crossRange
        : { ...crossRange, slotStartHour: 17, slotEndHour: 4 };
    expect(resolveOwnerBusinessDayYmd('2026-05-27', 2, lookup)).toBe('2026-05-26');
    expect(resolveOwnerBusinessDayYmd('2026-05-27', 10, lookup)).toBe('2026-05-27');
  });

  it('same-calendar-day store only matches that date', () => {
    expect(
      reservationBelongsToBusinessDay(
        { date: '2026-05-26', startTime: '12:00' },
        '2026-05-26',
        dayRange,
      ),
    ).toBe(true);
    expect(
      reservationBelongsToBusinessDay(
        { date: '2026-05-27', startTime: '12:00' },
        '2026-05-26',
        dayRange,
      ),
    ).toBe(false);
  });
});
