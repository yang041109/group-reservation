import { describe, expect, it } from 'vitest';
import {
  applyOwnerBookingToggleToSlots,
  isSlotOpenForOwnerToggle,
  readOwnerBookingToggle,
  timeBlockFromKoreaDate,
} from '@/lib/owner-booking-toggle';
import type { TimeSlot } from '@/types';

function slot(time: string, available = true): TimeSlot {
  return {
    slotId: `s-${time}`,
    timeBlock: time,
    isAvailable: available,
    maxPeople: 10,
    currentHeadcount: available ? 0 : 10,
  };
}

describe('owner-booking-toggle', () => {
  it('closes slots at and after cutoff when accepting is false', () => {
    const today = '2026-05-19';
    const now = new Date(`${today}T14:00:00+09:00`);
    const toggle = {
      accepting: false,
      changedAtYmd: today,
      changedAtTimeBlock: '15:00',
    };
    const out = applyOwnerBookingToggleToSlots(
      [slot('14:30'), slot('15:00'), slot('15:30')],
      today,
      toggle,
      now,
    );
    expect(out[0].isAvailable).toBe(true);
    expect(out[1].isAvailable).toBe(false);
    expect(out[2].isAvailable).toBe(false);
  });

  it('opens slots at and after cutoff when accepting is true', () => {
    const today = '2026-05-19';
    const now = new Date(`${today}T16:00:00+09:00`);
    const toggle = {
      accepting: true,
      changedAtYmd: today,
      changedAtTimeBlock: '17:00',
    };
    const out = applyOwnerBookingToggleToSlots(
      [slot('16:30'), slot('17:00')],
      today,
      toggle,
      now,
    );
    expect(out[0].isAvailable).toBe(false);
    expect(out[1].isAvailable).toBe(true);
  });

  it('ignores toggle on other dates', () => {
    const toggle = {
      accepting: false,
      changedAtYmd: '2026-05-19',
      changedAtTimeBlock: '15:00',
    };
    const now = new Date('2026-05-20T12:00:00+09:00');
    const out = applyOwnerBookingToggleToSlots([slot('18:00')], '2026-05-20', toggle, now);
    expect(out[0].isAvailable).toBe(true);
  });

  it('reads store row defaults', () => {
    expect(readOwnerBookingToggle({}).accepting).toBe(true);
    expect(
      readOwnerBookingToggle({
        acceptingReservations: 0,
        acceptingReservationsAt: '2026-05-19 15:37:00',
      }).accepting,
    ).toBe(false);
  });

  it('timeBlock floors to 30 minutes', () => {
    const d = new Date('2026-05-19T15:37:00+09:00');
    expect(timeBlockFromKoreaDate(d)).toBe('15:30');
  });

  it('isSlotOpenForOwnerToggle matches apply', () => {
    const today = '2026-05-19';
    const now = new Date(`${today}T12:00:00+09:00`);
    const toggle = {
      accepting: false,
      changedAtYmd: today,
      changedAtTimeBlock: '13:00',
    };
    expect(isSlotOpenForOwnerToggle('12:30', today, toggle, now)).toBe(true);
    expect(isSlotOpenForOwnerToggle('13:00', today, toggle, now)).toBe(false);
  });
});
