import { afterEach, describe, expect, it, vi } from 'vitest';
import { appReducer, CURRENT_SCHEMA_VERSION, migrateAppState } from './state';
import { AppState, INITIAL_STATE, Task } from './types';

const makeTask = (overrides: Partial<Task> = {}): Task => ({
  id: 'task-1',
  title: 'Test task',
  status: 'todo',
  plan: { month: '2026-08', day: '2026-08-16', week: '2026-W33' },
  projectId: null,
  eventId: null,
  createdAt: '2026-08-16T08:00:00.000Z',
  updatedAt: '2026-08-16T08:00:00.000Z',
  completedAt: null,
  ...overrides,
});

const withTask = (task: Task): AppState => ({
  ...INITIAL_STATE,
  tasks: [task],
});

afterEach(() => {
  vi.useRealTimers();
});

describe('migrateAppState', () => {
  it('imports a legacy backup, removes deprecated metadata and backfills completion time', () => {
    const migrated = migrateAppState({
      tasks: [{
        id: 'legacy-task',
        title: 'Legacy',
        status: 'done',
        plan: { day: '2026-01-05', week: null },
        frog: true,
        difficulty: 'hard',
        createdAt: '2026-01-05T08:00:00.000Z',
        updatedAt: '2026-01-05T09:00:00.000Z',
      }],
      captures: [],
      events: [],
      lastActiveView: 'statistics',
    });

    expect(migrated.schemaVersion).toBe(CURRENT_SCHEMA_VERSION);
    expect(migrated.lastActiveView).toBe('today');
    expect(migrated.tasks[0]).toEqual(expect.objectContaining({
      id: 'legacy-task',
      completedAt: '2026-01-05T09:00:00.000Z',
      eventId: null,
      plan: { day: '2026-01-05', week: null, month: '2026-01' },
    }));
    expect(migrated.tasks[0]).not.toHaveProperty('frog');
    expect(migrated.tasks[0]).not.toHaveProperty('difficulty');
  });

  it('sanitizes order maps without discarding valid task ids', () => {
    const migrated = migrateAppState({
      tasks: [],
      captures: [],
      events: [],
      taskOrderByDay: { '2026-08-16': ['a', 42, 'b'] },
    });

    expect(migrated.taskOrderByDay['2026-08-16']).toEqual(['a', 'b']);
  });

  it('preserves valid work shift settings and rejects malformed overrides', () => {
    const migrated = migrateAppState({
      tasks: [], captures: [], events: [],
      workShiftSettings: {
        baseWeek: '2026-W33',
        baseShift: 2,
        overrides: { '2026-W34': 1, invalid: 2, '2026-W35': 3 },
      },
    });

    expect(migrated.workShiftSettings).toEqual({
      baseWeek: '2026-W33',
      baseShift: 2,
      overrides: { '2026-W34': 1 },
    });
  });
});

describe('appReducer task completion', () => {
  it('records a dedicated completion timestamp and clears an active timer', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-08-16T12:34:56.000Z'));
    const state = {
      ...withTask(makeTask()),
      activeTaskId: 'task-1',
      activeTaskStartedAt: 123,
    };

    const completed = appReducer(state, {
      type: 'UPDATE_TASK',
      payload: { id: 'task-1', status: 'done' },
    });

    expect(completed.tasks[0].completedAt).toBe('2026-08-16T12:34:56.000Z');
    expect(completed.activeTaskId).toBeNull();
    expect(completed.activeTaskStartedAt).toBeNull();
  });

  it('clears completion time when a task is returned to todo', () => {
    const task = makeTask({
      status: 'done',
      completedAt: '2026-08-16T12:00:00.000Z',
    });

    const reopened = appReducer(withTask(task), {
      type: 'UPDATE_TASK',
      payload: { id: task.id, status: 'todo' },
    });

    expect(reopened.tasks[0].completedAt).toBeNull();
  });
});

describe('appReducer task planning', () => {
  it('removes stale ordering references when a task changes containers', () => {
    const task = makeTask();
    const state: AppState = {
      ...withTask(task),
      taskOrderByDay: { '2026-08-16': [task.id] },
      taskOrderByWeekBucket: { '2026-W33': [task.id] },
      taskOrderByMonthBucket: { '2026-08': [task.id] },
      taskOrderByMonthWeek: { '2026-08|2026-W33': [task.id] },
    };

    const moved = appReducer(state, {
      type: 'UPDATE_TASK',
      payload: { id: task.id, plan: { month: '2026-08', week: '2026-W34', day: null } },
    });

    expect(moved.taskOrderByDay['2026-08-16']).toEqual([]);
    expect(moved.taskOrderByWeekBucket['2026-W33']).toEqual([]);
    expect(moved.taskOrderByMonthBucket['2026-08']).toEqual([]);
    expect(moved.taskOrderByMonthWeek['2026-08|2026-W33']).toEqual([]);
  });
});
