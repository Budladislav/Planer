import { describe, expect, it } from 'vitest';
import { buildCompletedTasksReport, getCompletedTasksForRange, getReportDateRange } from './completed-report';
import { Task } from './types';

const task = (id: string, completedAt: string | null, timeSpent = 0): Task => ({
  id,
  title: `Task ${id}`,
  status: completedAt ? 'done' : 'todo',
  plan: { month: '2026-08', day: '2026-08-16', week: null },
  projectId: null,
  eventId: null,
  createdAt: '2026-08-01T08:00:00.000Z',
  updatedAt: completedAt ?? '2026-08-01T08:00:00.000Z',
  completedAt,
  timeSpent,
});

describe('completed task report', () => {
  it('resolves week, month and reversed custom ranges', () => {
    expect(getReportDateRange({ type: 'week', value: '2026-W33' })).toEqual({
      start: '2026-08-10',
      end: '2026-08-16',
    });
    expect(getReportDateRange({ type: 'month', value: '2026-02' })).toEqual({
      start: '2026-02-01',
      end: '2026-02-28',
    });
    expect(getReportDateRange({ type: 'custom', start: '2026-08-20', end: '2026-08-10' })).toEqual({
      start: '2026-08-10',
      end: '2026-08-20',
    });
  });

  it('uses completedAt rather than the planning or editing date', () => {
    const tasks = [
      task('inside', '2026-08-12T12:00:00.000Z'),
      task('outside', '2026-08-09T12:00:00.000Z'),
      task('todo', null),
    ];
    const range = { start: '2026-08-10', end: '2026-08-16' };

    expect(getCompletedTasksForRange(tasks, range).map(item => item.id)).toEqual(['inside']);
  });

  it('creates a compact LLM-friendly text report', () => {
    const report = buildCompletedTasksReport(
      [task('one', '2026-08-16T12:00:00.000Z', 90)],
      { start: '2026-08-10', end: '2026-08-16' },
      new Date('2026-08-16T14:00:00.000Z'),
    );

    expect(report).toContain('tasks_count: 1');
    expect(report).toContain('total_focus_seconds: 90');
    expect(report).toContain('title: Task one');
    expect(report).toContain('focus_seconds: 90');
  });
});
