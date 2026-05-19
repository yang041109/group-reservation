import { describe, expect, it } from 'vitest';
import {
  dayKeyFromYmd,
  firstOpenDayHoursFromWeekly,
  getDefaultSlotHourRangeForStore,
  getSlotHourRangeForStoreOnDate,
  parseWeeklyHoursJson,
} from '../store-weekly-hours';

describe('getSlotHourRangeForStoreOnDate', () => {
  const weekly = {
    mon: { start: 17, end: 22 },
    tue: { start: 11, end: 15 },
    wed: { closed: true },
  };

  it('uses the schedule for the selected weekday', () => {
    // 2026-05-18 is Monday
    const store = { weeklyHoursJson: JSON.stringify(weekly) };
    const r = getSlotHourRangeForStoreOnDate(store, '2026-05-18');
    expect(r.closed).toBe(false);
    expect(r.slotStartHour).toBe(17);
    expect(r.slotEndHour).toBe(22);
  });

  it('marks closed days from weekly schedule', () => {
    const store = { weeklyHoursJson: JSON.stringify(weekly) };
    const r = getSlotHourRangeForStoreOnDate(store, '2026-05-20');
    expect(r.closed).toBe(true);
  });

  it('falls back to first open day when the weekday has no hours', () => {
    const store = {
      weeklyHoursJson: JSON.stringify({
        fri: { start: 18, end: 23 },
      }),
    };
    const r = getSlotHourRangeForStoreOnDate(store, '2026-05-18');
    expect(r.closed).toBe(false);
    expect(r.slotStartHour).toBe(18);
    expect(r.slotEndHour).toBe(23);
  });

  it('uses basic slot hours when weeklyHoursJson is absent', () => {
    const store = { slotStartHour: 9, slotEndHour: 21 };
    const r = getSlotHourRangeForStoreOnDate(store, '2026-05-18');
    expect(r.slotStartHour).toBe(9);
    expect(r.slotEndHour).toBe(21);
  });

  it('does not treat weekday as closed when weekly mode is off', () => {
    const off = { slotStartHour: 11, slotEndHour: 20, weeklyHoursJson: null };
    const r = getSlotHourRangeForStoreOnDate(off, '2026-05-20');
    expect(r.closed).toBe(false);
    expect(r.slotStartHour).toBe(11);
  });
});

describe('getDefaultSlotHourRangeForStore', () => {
  it('uses basic hours when weekly mode is off', () => {
    const store = { slotStartHour: 9, slotEndHour: 21, weeklyHoursJson: null };
    const r = getDefaultSlotHourRangeForStore(store);
    expect(r.slotStartHour).toBe(9);
    expect(r.slotEndHour).toBe(21);
  });

  it('prefers weekly hours when weekly mode is on', () => {
    const store = {
      slotStartHour: 9,
      slotEndHour: 21,
      weeklyHoursJson: JSON.stringify({ mon: { start: 17, end: 22 } }),
    };
    const r = getDefaultSlotHourRangeForStore(store);
    expect(r.slotStartHour).toBe(17);
    expect(r.slotEndHour).toBe(22);
  });
});

describe('dayKeyFromYmd', () => {
  it('maps Sunday correctly', () => {
    expect(dayKeyFromYmd('2026-05-17')).toBe('sun');
  });
});

describe('firstOpenDayHoursFromWeekly', () => {
  it('returns the first non-closed day in DAY_KEYS order', () => {
    const hours = parseWeeklyHoursJson({
      fri: { start: 20, end: 2 },
      mon: { start: 11, end: 20 },
    });
    expect(hours).not.toBeNull();
    const open = firstOpenDayHoursFromWeekly(hours!);
    expect(open).toEqual({ start: 11, end: 20 });
  });
});
