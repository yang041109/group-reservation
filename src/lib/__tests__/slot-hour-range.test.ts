import { describe, expect, it } from 'vitest';
import {
  generateSlotTimeBlocks,
  resolveSlotHourRange,
  slotOverlapsReservation,
} from '../slot-hour-range';

describe('resolveSlotHourRange', () => {
  it('treats end < start as overnight', () => {
    const r = resolveSlotHourRange({ slotStartHour: 17, slotEndHour: 3 });
    expect(r.crossesMidnight).toBe(true);
    expect(r.startHour).toBe(17);
    expect(r.endHour).toBe(3);
  });

  it('accepts string hours from sheet JSON', () => {
    const r = resolveSlotHourRange({ slotStartHour: '17', slotEndHour: '3' });
    expect(r.crossesMidnight).toBe(true);
    expect(r.startHour).toBe(17);
    expect(r.endHour).toBe(3);
  });

  it('same-day when end >= start', () => {
    const r = resolveSlotHourRange({ slotStartHour: 11, slotEndHour: 21 });
    expect(r.crossesMidnight).toBe(false);
  });

  it('infers overnight from ordered timeline first/last block', () => {
    const r = resolveSlotHourRange({
      orderedSlotTimeBlocks: ['17:00', '17:30', '03:00', '03:30'],
    });
    expect(r.crossesMidnight).toBe(true);
    expect(r.startHour).toBe(17);
    expect(r.endHour).toBe(3);
  });

  it('prefers availableOnlyBlocks over wide ordered timeline (no gray 11~16)', () => {
    const r = resolveSlotHourRange({
      availableOnlyBlocks: ['17:00', '18:00', '19:00'],
      orderedSlotTimeBlocks: [
        '11:00',
        '11:30',
        '12:00',
        '20:00',
        '20:30',
      ],
    });
    expect(r.crossesMidnight).toBe(false);
    expect(r.startHour).toBe(17);
    expect(r.endHour).toBe(19);
  });

  it('infers overnight from availableOnlyBlocks (새벽 + 저녁)', () => {
    const r = resolveSlotHourRange({
      availableOnlyBlocks: ['17:00', '23:30', '00:00', '02:30'],
    });
    expect(r.crossesMidnight).toBe(true);
    expect(r.startHour).toBe(17);
    expect(r.endHour).toBe(2);
  });
});

describe('generateSlotTimeBlocks', () => {
  it('overnight includes evening then early hours', () => {
    const blocks = generateSlotTimeBlocks(17, 3, true);
    expect(blocks[0]).toBe('17:00');
    expect(blocks).toContain('23:30');
    expect(blocks).toContain('00:00');
    expect(blocks[blocks.length - 1]).toBe('03:30');
  });
});

describe('slotOverlapsReservation', () => {
  it('detects reservation crossing midnight', () => {
    expect(
      slotOverlapsReservation('23:30', '22:00', '02:00', true, 17, 3),
    ).toBe(true);
    expect(
      slotOverlapsReservation('02:00', '22:00', '02:00', true, 17, 3),
    ).toBe(true);
  });
});
