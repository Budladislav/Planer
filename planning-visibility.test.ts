import { describe, expect, it } from 'vitest';
import type { CalendarEvent, Task } from './types';
import {
  getCompletedTasksForLocalPeriod,
  getEventsForMonth,
  getEventsForWeek,
  getMonthPoolTasks,
  getWeekPoolTasks,
  getYearPoolTasks,
} from './planning-visibility';

const task = (id: string, plan: Task['plan'], status: Task['status'] = 'todo', completedAt: string | null = null): Task => ({
  id, title: id, status, plan, projectId: null, eventId: null, goalId: null,
  createdAt: '2026-09-10T08:00:00.000Z', updatedAt: completedAt ?? '2026-09-10T08:00:00.000Z', completedAt,
});

describe('planning horizon visibility', () => {
  const tasks = [
    task('year', { year: '2026', month: null, week: null, day: null }),
    task('month', { year: '2026', month: '2026-09', week: null, day: null }),
    task('week', { year: '2026', month: '2026-09', week: '2026-W37', day: null }),
    task('day', { year: '2026', month: '2026-09', week: '2026-W37', day: '2026-09-10' }),
  ];

  it('shows only tasks that still need allocation at the active horizon', () => {
    expect(getYearPoolTasks(tasks, '2026').map(item => item.id)).toEqual(['year']);
    expect(getMonthPoolTasks(tasks, '2026-09').map(item => item.id)).toEqual(['month']);
    expect(getWeekPoolTasks(tasks, '2026-W37').map(item => item.id)).toEqual(['week']);
  });

  it('groups completion by actual local completion date instead of planned date', () => {
    const completed = task(
      'future-plan',
      { year: '2027', month: '2027-01', week: '2027-W01', day: '2027-01-04' },
      'done',
      new Date(2026, 8, 10, 12).toISOString(),
    );
    expect(getCompletedTasksForLocalPeriod([completed], '2026-09')).toEqual([completed]);
    expect(getCompletedTasksForLocalPeriod([completed], '2027-01')).toEqual([]);
  });

  it('keeps calendar events visible independently from nested task cards', () => {
    const events: CalendarEvent[] = [
      { id: 'later', title: 'Later', date: '2026-09-12', time: '12:00', note: null },
      { id: 'first', title: 'First', date: '2026-09-10', time: '08:00', note: null },
    ];
    expect(getEventsForMonth(events, '2026-09').map(item => item.id)).toEqual(['first', 'later']);
    expect(getEventsForWeek(events, '2026-W37').map(item => item.id)).toEqual(['first', 'later']);
  });
});
