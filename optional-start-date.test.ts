import { describe, expect, it } from 'vitest';
import { replaceOptionalStartDate, toOptionalDateInputValue } from './optional-start-date';

describe('optional start dates', () => {
  it('keeps the local time while replacing a known calendar date', () => {
    const result = replaceOptionalStartDate(
      '2026-09-09T10:15:30.000Z',
      '2026-08-01',
      new Date('2026-09-09T10:15:30.000Z'),
    );

    expect(toOptionalDateInputValue(result)).toBe('2026-08-01');
  });

  it('uses null as the explicit representation of an unknown start', () => {
    expect(replaceOptionalStartDate('2026-09-09T10:15:30.000Z', '')).toBeNull();
    expect(toOptionalDateInputValue(null)).toBe('');
  });
});
