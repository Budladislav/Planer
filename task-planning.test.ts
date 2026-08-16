import { describe, expect, it } from 'vitest';
import { Task } from './types';
import { planTaskForWeek } from './task-planning';

const datedTask: Task = {
  id: 'dated',
  title: 'Dated task',
  status: 'todo',
  plan: { month: '2026-08', day: '2026-08-12', week: '2026-W33' },
  projectId: null,
  eventId: null,
  createdAt: '2026-08-10T08:00:00.000Z',
  updatedAt: '2026-08-10T08:00:00.000Z',
  completedAt: null,
};

describe('planTaskForWeek', () => {
  it('clears the day when a dated task moves to another week', () => {
    expect(planTaskForWeek(datedTask, '2026-W34')).toEqual({
      day: null,
      week: '2026-W34',
      month: '2026-08',
    });
  });

  it('preserves the day when only task text is saved in the same week', () => {
    expect(planTaskForWeek(datedTask, '2026-W33')).toEqual({
      day: '2026-08-12',
      week: '2026-W33',
      month: '2026-08',
    });
  });
});
