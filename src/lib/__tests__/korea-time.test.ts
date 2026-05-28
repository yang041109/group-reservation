import { describe, expect, it } from 'vitest';
import { formatReservationCreatedAt, parseReservationCreatedAt } from '@/lib/korea-time';

describe('formatReservationCreatedAt', () => {
  it('parses ISO UTC and formats as KST', () => {
    expect(formatReservationCreatedAt('2026-05-26T02:15:32.000Z')).toBe('2026-05-26 11:15:32');
  });

  it('parses naive DB UTC datetime same as ISO', () => {
    expect(formatReservationCreatedAt('2026-05-26 02:15:32')).toBe('2026-05-26 11:15:32');
    expect(formatReservationCreatedAt('2026-05-26 02:15:32')).toBe(
      formatReservationCreatedAt('2026-05-26T02:15:32.000Z'),
    );
  });

  it('parses Date object same as ISO', () => {
    const d = new Date('2026-05-26T02:15:32.000Z');
    expect(formatReservationCreatedAt(d)).toBe('2026-05-26 11:15:32');
    expect(parseReservationCreatedAt(d)?.toISOString()).toBe(d.toISOString());
  });
});
