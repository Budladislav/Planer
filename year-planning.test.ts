import { describe, expect, it } from 'vitest';
import { Task } from './types';
import {
  getTaskPlanningYear,
  getYearMonths,
  partitionYearMonths,
  planTaskForYear,
  yearMonthOrderKey,
} from './year-planning';

const task: Task = {
  id: 'task',
  title: 'Task',
  status: 'todo',
  plan: { year: '2026', month: '2026-08', week: '2026-W33', day: '2026-08-12' },
  projectId: null,
  eventId: null,
  goalId: null,
  createdAt: '2026-08-01T08:00:00.000Z',
  updatedAt: '2026-08-01T08:00:00.000Z',
  completedAt: null,
};

describe('year planning', () => {
  it('creates all calendar months and a stable order key', () => {
    expect(getYearMonths('2026')).toHaveLength(12);
    expect(getYearMonths('2026')[0]).toBe('2026-01');
    expect(getYearMonths('2026')[11]).toBe('2026-12');
    expect(yearMonthOrderKey('2026', '2026-08')).toBe('2026|2026-08');
    expect(getYearMonths('2019')).toEqual([]);
  });

  it('keeps one task when moving within a year and clears lower horizons across years', () => {
    expect(planTaskForYear(task, '2026')).toEqual(task.plan);
    expect(planTaskForYear(task, '2027')).toEqual({ year: '2027', month: null, week: null, day: null });
  });

  it('derives the planning year from the planning month for migrated tasks', () => {
    expect(getTaskPlanningYear({ plan: { ...task.plan, year: null } })).toBe('2026');
    expect(getTaskPlanningYear({ plan: { ...task.plan, year: '2027' } })).toBe('2026');
    expect(getTaskPlanningYear({ plan: { year: null, month: null, week: '2027-W01', day: null } })).toBe('2027');
  });

  it('folds past months and keeps the current month visible', () => {
    expect(partitionYearMonths(['2026-07', '2026-08', '2026-09'], '2026-08')).toEqual({
      pastMonths: ['2026-07'],
      currentAndFutureMonths: ['2026-08', '2026-09'],
    });
  });
});
