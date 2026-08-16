import { describe, expect, it } from 'vitest';
import {
  formatDateShort,
  getDateString,
  getISOWeeksInYear,
  getWeekDateRange,
  getWeekDates,
  getWeekString,
  isValidWeekString,
} from './utils';

describe('date utilities', () => {
  it('formats a local calendar date without converting it through UTC', () => {
    expect(getDateString(new Date(2026, 0, 2, 0, 30))).toBe('2026-01-02');
    expect(formatDateShort('2026-01-02')).toBe('02.01.2026');
  });

  it('supports ISO years with week 53', () => {
    expect(getWeekString('2026-12-31')).toBe('2026-W53');
    expect(getISOWeeksInYear(2026)).toBe(53);
    expect(isValidWeekString('2026-W53')).toBe(true);
    expect(isValidWeekString('2025-W53')).toBe(false);
  });

  it('returns the complete Monday-to-Sunday range', () => {
    expect(getWeekDates('2026-W53')).toEqual([
      '2026-12-28',
      '2026-12-29',
      '2026-12-30',
      '2026-12-31',
      '2027-01-01',
      '2027-01-02',
      '2027-01-03',
    ]);
    expect(getWeekDateRange('2026-W53')).toEqual({ start: '28.12', end: '03.01' });
  });
});
