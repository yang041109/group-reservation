import { describe, expect, it } from 'vitest';
import {
  applyOwnerClosedBlocksToSlots,
  formatOwnerClosedRangeLabel,
  groupOwnerClosedBlocks,
  isSlotPastForSelectedDate,
  isSlotPastForToday,
  timeBlocksInRange,
} from '@/lib/owner-closed-slots';
import type { TimeSlot } from '@/types';

function slot(time: string, available = true): TimeSlot {
  return {
    slotId: time,
    timeBlock: time,
    isAvailable: available,
    maxPeople: 10,
    currentHeadcount: available ? 0 : 10,
  };
}

describe('owner-closed-slots', () => {
  it('closes owner-selected blocks for today', () => {
    const now = new Date('2026-05-20T18:00:00+09:00');
    const json = JSON.stringify({ date: '2026-05-20', blocks: ['19:00', '19:30'] });
    const out = applyOwnerClosedBlocksToSlots(
      [slot('18:00'), slot('19:00'), slot('19:30')],
      '2026-05-20',
      json,
      now,
    );
    expect(out[0].isAvailable).toBe(true);
    expect(out[1].isAvailable).toBe(false);
    expect(out[2].isAvailable).toBe(false);
  });

  it('does not treat post-midnight slots as past during evening (17~4)', () => {
    const now = new Date('2026-05-20T21:30:00+09:00');
    const hours = { crossesMidnight: true, slotStartHour: 17, slotEndHour: 4 };
    expect(isSlotPastForToday('17:00', now, hours)).toBe(true);
    expect(isSlotPastForToday('22:00', now, hours)).toBe(false);
    expect(isSlotPastForToday('00:00', now, hours)).toBe(false);
    expect(isSlotPastForToday('01:00', now, hours)).toBe(false);
    expect(isSlotPastForToday('03:30', now, hours)).toBe(false);
  });

  it('at 29th 01:00: 28th dawn is past, 29th dawn is next calendar day (future)', () => {
    const now = new Date('2026-05-29T01:00:00+09:00');
    const hours = { crossesMidnight: true, slotStartHour: 17, slotEndHour: 4 };

    expect(isSlotPastForSelectedDate('00:30', '2026-05-28', now, hours)).toBe(true);
    expect(isSlotPastForSelectedDate('01:30', '2026-05-28', now, hours)).toBe(false);
    expect(isSlotPastForSelectedDate('00:30', '2026-05-29', now, hours)).toBe(false);
    expect(isSlotPastForSelectedDate('03:30', '2026-05-29', now, hours)).toBe(false);
    expect(isSlotPastForSelectedDate('20:00', '2026-05-29', now, hours)).toBe(false);
  });

  it('applyOwnerClosedBlocks on 29th 01:00 keeps 29th overnight slots bookable', () => {
    const now = new Date('2026-05-29T01:00:00+09:00');
    const hours = { crossesMidnight: true, slotStartHour: 17, slotEndHour: 4 };
    const out = applyOwnerClosedBlocksToSlots(
      [slot('00:00'), slot('01:00'), slot('03:30'), slot('20:00')],
      '2026-05-29',
      null,
      now,
      hours,
    );
    expect(out.every((s) => s.isAvailable)).toBe(true);
  });

  it('applyOwnerClosedBlocks keeps overnight future slots open at night', () => {
    const now = new Date('2026-05-20T21:30:00+09:00');
    const hours = { crossesMidnight: true, slotStartHour: 17, slotEndHour: 4 };
    const out = applyOwnerClosedBlocksToSlots(
      [slot('22:00'), slot('23:30'), slot('00:00'), slot('01:00')],
      '2026-05-20',
      null,
      now,
      hours,
    );
    expect(out.map((s) => [s.timeBlock, s.isAvailable])).toEqual([
      ['22:00', true],
      ['23:30', true],
      ['00:00', true],
      ['01:00', true],
    ]);
  });

  it('groups consecutive closed blocks into display ranges', () => {
    const all = ['17:00', '17:30', '18:00', '18:30', '19:00', '19:30', '20:00'];
    const closed = ['17:00', '17:30', '19:00', '19:30', '20:00'];
    const ranges = groupOwnerClosedBlocks(closed, all);
    expect(ranges).toHaveLength(2);
    expect(formatOwnerClosedRangeLabel(ranges[0].start, ranges[0].endBlock)).toBe('17:00~18:00');
    expect(formatOwnerClosedRangeLabel(ranges[1].start, ranges[1].endBlock)).toBe('19:00~20:30');
  });

  it('timeBlocksInRange includes endpoints', () => {
    const all = ['17:00', '17:30', '18:00', '18:30'];
    expect(timeBlocksInRange('17:30', '18:00', all)).toEqual(['17:30', '18:00']);
  });
});
