import { describe, expect, it } from 'vitest';
import type { Task } from './types';
import {
  getCompletedTasksForLocalDay,
  getLocalDateFromTimestamp,
  getPreviousLocalDayTimestamp,
} from './today-tasks';

const makeTask = (overrides: Partial<Task>): Task => ({
  id: 'task',
  title: 'Task',
  status: 'done',
  plan: { day: '2026-08-27', week: '2026-W35', month: '2026-08' },
  projectId: null,
  eventId: null,
  createdAt: '2026-08-27T08:00:00.000Z',
  updatedAt: '2026-08-27T09:00:00.000Z',
  completedAt: '2026-08-27T09:00:00.000Z',
  ...overrides,
});

describe('today completion helpers', () => {
  it('selects completion by local completedAt, falls back to updatedAt, and sorts newest first', () => {
    const firstTimestamp = new Date(2026, 7, 27, 9, 0).toISOString();
    const newestTimestamp = new Date(2026, 7, 27, 18, 30).toISOString();
    const anotherDayTimestamp = new Date(2026, 7, 26, 23, 30).toISOString();
    const localDay = getLocalDateFromTimestamp(firstTimestamp)!;

    const result = getCompletedTasksForLocalDay([
      makeTask({ id: 'todo', status: 'todo', completedAt: newestTimestamp }),
      makeTask({ id: 'old', completedAt: anotherDayTimestamp }),
      makeTask({ id: 'first', completedAt: firstTimestamp }),
      makeTask({ id: 'fallback', completedAt: null, updatedAt: newestTimestamp }),
    ], localDay);

    expect(result.map(task => task.id)).toEqual(['fallback', 'first']);
  });

  it('creates a completion timestamp on the previous local calendar day', () => {
    const now = new Date(2026, 0, 1, 8, 45, 12, 345);
    const previousDay = new Date(getPreviousLocalDayTimestamp(now));

    expect(previousDay.getFullYear()).toBe(2025);
    expect(previousDay.getMonth()).toBe(11);
    expect(previousDay.getDate()).toBe(31);
    expect(previousDay.getHours()).toBe(now.getHours());
    expect(previousDay.getMinutes()).toBe(now.getMinutes());
  });
});
