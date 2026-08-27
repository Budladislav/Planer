import { describe, expect, it } from 'vitest';
import { partitionWeekDays } from './week-days';

const yearBoundaryWeek = [
  '2025-12-29',
  '2025-12-30',
  '2025-12-31',
  '2026-01-01',
  '2026-01-02',
  '2026-01-03',
  '2026-01-04',
].map(date => ({ date }));

describe('partitionWeekDays', () => {
  it('keeps today visible and handles a week crossing a year boundary', () => {
    const result = partitionWeekDays(yearBoundaryWeek, '2026-01-01');

    expect(result.pastDays.map(day => day.date)).toEqual([
      '2025-12-29',
      '2025-12-30',
      '2025-12-31',
    ]);
    expect(result.currentAndFutureDays.map(day => day.date)).toEqual([
      '2026-01-01',
      '2026-01-02',
      '2026-01-03',
      '2026-01-04',
    ]);
  });

  it('classifies every day of an older week as past', () => {
    const result = partitionWeekDays(yearBoundaryWeek, '2026-02-01');

    expect(result.pastDays).toHaveLength(7);
    expect(result.currentAndFutureDays).toHaveLength(0);
  });

  it('keeps every day of a future week in the main list', () => {
    const result = partitionWeekDays(yearBoundaryWeek, '2025-12-01');

    expect(result.pastDays).toHaveLength(0);
    expect(result.currentAndFutureDays).toHaveLength(7);
  });
});
