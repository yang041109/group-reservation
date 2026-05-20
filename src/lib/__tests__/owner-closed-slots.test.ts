import { describe, expect, it } from 'vitest';
import {
  applyOwnerClosedBlocksToSlots,
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

  it('timeBlocksInRange includes endpoints', () => {
    const all = ['17:00', '17:30', '18:00', '18:30'];
    expect(timeBlocksInRange('17:30', '18:00', all)).toEqual(['17:30', '18:00']);
  });
});
