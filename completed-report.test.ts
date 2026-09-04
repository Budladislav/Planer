import { describe, expect, it } from 'vitest';
import {
  buildProgressReport,
  getCompletedTasksForRange,
  getRealizedCapturesForRange,
  getReportDateRange,
} from './completed-report';
import { Capture, LongTermGoal, Task } from './types';

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

const capture = (id: string, completedAt: string | null): Capture => ({
  id,
  text: `Idea ${id}`,
  createdAt: '2026-08-10T08:00:00.000Z',
  status: completedAt ? 'completed' : 'new',
  completedAt,
});

const goal = (id: string, completedAt: string | null): LongTermGoal => ({
  id,
  title: `Goal ${id}`,
  status: completedAt ? 'completed' : 'active',
  createdAt: '2026-08-01T08:00:00.000Z',
  updatedAt: completedAt ?? '2026-08-01T08:00:00.000Z',
  completedAt,
  currentState: 'Halfway there',
  nextStep: 'Keep going',
  notes: [],
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
    expect(getRealizedCapturesForRange([
      capture('inside', '2026-08-15T12:00:00.000Z'),
      capture('outside', '2026-08-20T12:00:00.000Z'),
      capture('active', null),
    ], range).map(item => item.id)).toEqual(['inside']);
  });

  it('creates a compact report with clearly separated task and Inbox sections', () => {
    const report = buildProgressReport(
      [task('one', '2026-08-16T12:00:00.000Z', 90)],
      [capture('one', '2026-08-15T12:00:00.000Z')],
      [goal('active', null), goal('done', '2026-08-14T12:00:00.000Z')],
      { start: '2026-08-10', end: '2026-08-16' },
      'en',
      new Date('2026-08-16T14:00:00.000Z'),
    );

    expect(report).toContain('completed_tasks_count: 1');
    expect(report).toContain('realized_wishes_count: 1');
    expect(report).toContain('completed_long_term_goals_count: 1');
    expect(report).toContain('total_focus_seconds: 90');
    expect(report).toContain('=== COMPLETED TASKS ===');
    expect(report).toContain('title: Task one');
    expect(report).toContain('focus_seconds: 90');
    expect(report).toContain('=== REALIZED WISHES ===');
    expect(report).toContain('created_at: 2026-08-10');
    expect(report).toContain('realized_at: 2026-08-15');
    expect(report).toContain('elapsed_days: 5');
    expect(report).toContain('title: Idea one');
    expect(report).toContain('=== LONG-TERM GOALS ===');
    expect(report).toContain('current_situation: Halfway there');
    expect(report).toContain('title: Goal done');
  });

  it('localizes report labels into Russian', () => {
    const report = buildProgressReport(
      [],
      [],
      [goal('active', null)],
      { start: '2026-08-10', end: '2026-08-16' },
      'ru',
      new Date('2026-08-16T14:00:00.000Z'),
    );
    expect(report).toContain('ОТЧЁТ О ПРОГРЕССЕ MONOFOCUS');
    expect(report).toContain('=== БОЛЬШИЕ ЦЕЛИ ===');
    expect(report).toContain('текущая_ситуация: Halfway there');
  });
});
