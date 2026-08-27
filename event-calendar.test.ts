import { describe, expect, it } from 'vitest';
import { buildEventCalendarMonth } from './event-calendar';

describe('buildEventCalendarMonth', () => {
  it('builds full Monday-first weeks around the displayed month', () => {
    const weeks = buildEventCalendarMonth('2026-08');

    expect(weeks.map(item => item.week)).toEqual([
      '2026-W31', '2026-W32', '2026-W33', '2026-W34', '2026-W35', '2026-W36',
    ]);
    expect(weeks[0].days.map(day => day.date)).toEqual([
      '2026-07-27', '2026-07-28', '2026-07-29', '2026-07-30',
      '2026-07-31', '2026-08-01', '2026-08-02',
    ]);
    expect(weeks.at(-1)?.days.at(-1)?.date).toBe('2026-09-06');
    expect(weeks[0].days.map(day => day.isInMonth)).toEqual([
      false, false, false, false, false, true, true,
    ]);
  });

  it('keeps the ISO week-year when January starts in the previous year', () => {
    const weeks = buildEventCalendarMonth('2027-01');

    expect(weeks.map(item => item.week)).toEqual([
      '2026-W53', '2027-W01', '2027-W02', '2027-W03', '2027-W04',
    ]);
    expect(weeks[0].days[0]).toEqual({
      date: '2026-12-28',
      dayOfMonth: 28,
      isInMonth: false,
    });
    expect(weeks.at(-1)?.days.at(-1)).toEqual({
      date: '2027-01-31',
      dayOfMonth: 31,
      isInMonth: true,
    });
  });

  it('returns no rows for an invalid month', () => {
    expect(buildEventCalendarMonth('2026-13')).toEqual([]);
    expect(buildEventCalendarMonth('not-a-month')).toEqual([]);
  });
});
