import { describe, expect, it } from 'vitest';
import { WorkShiftSettings } from './types';
import { formatWorkShift, getWorkShiftForWeek, isFirstToSecondTransitionDay } from './week-shifts';

const settings: WorkShiftSettings = {
  baseWeek: '2026-W52',
  baseShift: 1,
  overrides: {},
  transitionHighlight: 'off',
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
    expect(getWorkShiftForWeek({ baseWeek: null, baseShift: null, overrides: {}, transitionHighlight: 'off' }, '2026-W33')).toBeNull();
  });

  it('does not expose a placeholder label before shifts are configured', () => {
    expect(formatWorkShift(null)).toBe('');
    expect(formatWorkShift(1)).toBe('1. shift');
    expect(formatWorkShift(2)).toBe('2. shift');
  });

  it('highlights only the configured 1-to-2 shift transition days', () => {
    const extended = { ...settings, transitionHighlight: 'extended' as const };
    expect(isFirstToSecondTransitionDay(extended, '2026-12-25')).toBe(true);
    expect(isFirstToSecondTransitionDay(extended, '2026-12-26')).toBe(true);
    expect(isFirstToSecondTransitionDay(extended, '2026-12-27')).toBe(true);
    expect(isFirstToSecondTransitionDay(extended, '2026-12-28')).toBe(true);
    expect(isFirstToSecondTransitionDay(extended, '2026-12-29')).toBe(false);

    const weekend = { ...settings, transitionHighlight: 'weekend' as const };
    expect(isFirstToSecondTransitionDay(weekend, '2026-12-25')).toBe(false);
    expect(isFirstToSecondTransitionDay(weekend, '2026-12-26')).toBe(true);
    expect(isFirstToSecondTransitionDay(weekend, '2026-12-27')).toBe(true);
    expect(isFirstToSecondTransitionDay(weekend, '2026-12-28')).toBe(false);
  });
});
