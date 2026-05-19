import { describe, expect, it } from 'vitest';
import {
  generateSlotTimeBlocks,
  getHourLabels,
  getHourLabelsFromSlotBlocks,
  normalizeSlotHour,
  resolveSlotHourRange,
  slotHourRangeFromSheet,
  slotOverlapsReservation,
} from '../slot-hour-range';

describe('normalizeSlotHour', () => {
  it('parses HH:mm strings', () => {
    expect(normalizeSlotHour('17:00')).toBe(17);
    expect(normalizeSlotHour('03:30')).toBe(3);
  });

  it('coerces numeric strings with trim via Number()', () => {
    expect(normalizeSlotHour(' 17 ')).toBe(17);
    expect(normalizeSlotHour('3')).toBe(3);
    expect(normalizeSlotHour('  09  ')).toBe(9);
    expect(normalizeSlotHour('22.9')).toBe(22);
  });
});

describe('slotHourRangeFromSheet', () => {
  it('returns null if either hour missing', () => {
    expect(slotHourRangeFromSheet(17, undefined)).toBeNull();
    expect(slotHourRangeFromSheet(undefined, 3)).toBeNull();
  });

  it('uses sheet hours only (12~22 same day)', () => {
    const r = slotHourRangeFromSheet(12, 22);
    expect(r).toEqual({
      startHour: 12,
      endHour: 22,
      crossesMidnight: false,
    });
  });

  it('detects overnight when end < start', () => {
    const r = slotHourRangeFromSheet(17, 3);
    expect(r).toEqual({
      startHour: 17,
      endHour: 3,
      crossesMidnight: true,
    });
  });
});

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

  it('when both sheet hours parse, ignores available/ordered entirely', () => {
    const r = resolveSlotHourRange({
      slotStartHour: ' 17 ',
      slotEndHour: '3',
      availableOnlyBlocks: ['20:00'],
      orderedSlotTimeBlocks: ['11:00', '11:30', '20:00'],
    });
    expect(r).toEqual({
      startHour: 17,
      endHour: 3,
      crossesMidnight: true,
    });
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

  it('overnight ordered beats narrow availableOnly (새벽 마감이어도 축은 17~3 유지)', () => {
    const fullOvernight = [
      '17:00',
      '17:30',
      '20:00',
      '20:30',
      '23:30',
      '00:00',
      '03:00',
      '03:30',
    ];
    const r = resolveSlotHourRange({
      availableOnlyBlocks: ['17:00', '17:30', '20:00', '20:30'],
      orderedSlotTimeBlocks: fullOvernight,
    });
    expect(r.crossesMidnight).toBe(true);
    expect(r.startHour).toBe(17);
    expect(r.endHour).toBe(3);
  });
});

describe('generateSlotTimeBlocks', () => {
  it('overnight: end hour is closing time (exclusive)', () => {
    const blocks = generateSlotTimeBlocks(17, 3, true);
    expect(blocks[0]).toBe('17:00');
    expect(blocks).toContain('23:30');
    expect(blocks).toContain('00:00');
    expect(blocks[blocks.length - 1]).toBe('02:30');
    expect(blocks).not.toContain('03:00');
  });

  it('close at 02:00 → last slot 01:30', () => {
    const blocks = generateSlotTimeBlocks(17, 2, true);
    expect(blocks[blocks.length - 1]).toBe('01:30');
    expect(blocks).not.toContain('02:00');
    expect(blocks).not.toContain('02:30');
  });

  it('same-day close at 20:00 → last slot 19:30', () => {
    const blocks = generateSlotTimeBlocks(11, 20, false);
    expect(blocks[blocks.length - 1]).toBe('19:30');
    expect(blocks).not.toContain('20:00');
  });
});

describe('getHourLabels', () => {
  it('matches slot blocks for overnight 17~2 (no extra hour at end)', () => {
    const blocks = generateSlotTimeBlocks(17, 2, true);
    const labels = getHourLabels(17, 2, true);
    const fromBlocks = getHourLabelsFromSlotBlocks(blocks);
    expect(labels).toEqual(fromBlocks);
    expect(labels).not.toContain(2);
    expect(labels[labels.length - 1]).toBe(1);
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
