import { describe, expect, it } from 'vitest';
import { WorkShiftSettings } from './types';
import { getWorkShiftForWeek } from './week-shifts';

const settings: WorkShiftSettings = {
  baseWeek: '2026-W52',
  baseShift: 1,
  overrides: {},
};

describe('getWorkShiftForWeek', () => {
  it('alternates in both directions and across the year boundary', () => {
    expect(getWorkShiftForWeek(settings, '2026-W51')).toBe(2);
    expect(getWorkShiftForWeek(settings, '2026-W52')).toBe(1);
    expect(getWorkShiftForWeek(settings, '2026-W53')).toBe(2);
    expect(getWorkShiftForWeek(settings, '2027-W01')).toBe(1);
  });

  it('uses an explicit exception before the alternating rule', () => {
    expect(getWorkShiftForWeek({ ...settings, overrides: { '2027-W01': 2 } }, '2027-W01')).toBe(2);
  });

  it('returns null until a base week and shift are configured', () => {
    expect(getWorkShiftForWeek({ baseWeek: null, baseShift: null, overrides: {} }, '2026-W33')).toBeNull();
  });
});
