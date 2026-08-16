import { describe, expect, it } from 'vitest';
import { getMonthForWeek, getMonthWeeks, planTaskForMonth } from './month-planning';
import { Task } from './types';

const task: Task = {
  id: 'task', title: 'Task', status: 'todo',
  plan: { month: '2026-08', week: '2026-W33', day: '2026-08-12' },
  projectId: null, eventId: null,
  createdAt: '2026-08-01T08:00:00.000Z', updatedAt: '2026-08-01T08:00:00.000Z', completedAt: null,
};

describe('month planning', () => {
  it('assigns an ISO week to the month containing its Thursday', () => {
    expect(getMonthForWeek('2026-W36')).toBe('2026-09');
  });

  it('returns every ISO week touching a calendar month', () => {
    expect(getMonthWeeks('2026-08')).toEqual([
      '2026-W31', '2026-W32', '2026-W33', '2026-W34', '2026-W35', '2026-W36',
    ]);
  });

  it('moves a task to another month pool without copying it', () => {
    expect(planTaskForMonth(task, '2026-09')).toEqual({ month: '2026-09', week: null, day: null });
  });
});
