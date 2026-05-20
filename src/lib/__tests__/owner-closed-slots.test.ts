import { describe, expect, it } from 'vitest';
import {
  applyOwnerClosedBlocksToSlots,
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

  it('timeBlocksInRange includes endpoints', () => {
    const all = ['17:00', '17:30', '18:00', '18:30'];
    expect(timeBlocksInRange('17:30', '18:00', all)).toEqual(['17:30', '18:00']);
  });
});
