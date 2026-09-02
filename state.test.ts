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

  it('preserves Inbox creation dates and backfills them for legacy captures', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-08-30T09:15:00.000Z'));

    const migrated = migrateAppState({
      tasks: [],
      events: [],
      captures: [
        { id: 'dated', text: 'Already dated', createdAt: '2026-08-20T07:00:00.000Z', status: 'new' },
        { id: 'legacy', text: 'Needs a date', status: 'new' },
      ],
    });

    expect(migrated.captures).toEqual([
      expect.objectContaining({ id: 'dated', createdAt: '2026-08-20T07:00:00.000Z' }),
      expect.objectContaining({ id: 'legacy', createdAt: '2026-08-30T09:15:00.000Z' }),
    ]);
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

  it('upgrades a 3.0 backup with safe defaults for 3.1 data', () => {
    const migrated = migrateAppState({
      schemaVersion: 3,
      tasks: [makeTask()],
      captures: [{
        id: 'capture-1',
        text: 'Keep me',
        createdAt: '2026-08-16T07:00:00.000Z',
        status: 'new',
      }],
      events: [{
        id: 'event-1',
        title: 'Keep event',
        date: '2026-08-20',
        time: '18:00',
        note: null,
      }],
      taskOrderByMonthBucket: { '2026-08': ['task-1'] },
      workShiftSettings: { baseWeek: '2026-W33', baseShift: 1, overrides: {} },
    });

    expect(migrated.schemaVersion).toBe(5);
    expect(migrated.tasks).toHaveLength(1);
    expect(migrated.captures).toHaveLength(1);
    expect(migrated.events).toHaveLength(1);
    expect(migrated.taskOrderByMonthBucket).toEqual({ '2026-08': ['task-1'] });
    expect(migrated.workShiftSettings.baseWeek).toBe('2026-W33');
    expect(migrated.weekNotes).toEqual({});
    expect(migrated.uiPreferences).toEqual({
      todayCompletedExpanded: false,
      eventsDistantExpanded: false,
      eventsPastExpanded: false,
    });
  });

  it('sanitizes week notes and persisted UI preferences', () => {
    const migrated = migrateAppState({
      tasks: [], captures: [], events: [],
      weekNotes: {
        '2026-W33': [{
          id: 'note-1',
          text: '  Vacation  ',
          createdAt: '2026-08-01T08:00:00.000Z',
          updatedAt: '2026-08-02T08:00:00.000Z',
        }, { id: 'empty', text: '   ' }, 'invalid'],
        invalid: [{ id: 'note-2', text: 'Discard me' }],
      },
      uiPreferences: {
        todayCompletedExpanded: true,
        eventsDistantExpanded: 'yes',
        eventsPastExpanded: true,
      },
    });

    expect(migrated.weekNotes).toEqual({
      '2026-W33': [{
        id: 'note-1',
        text: 'Vacation',
        createdAt: '2026-08-01T08:00:00.000Z',
        updatedAt: '2026-08-02T08:00:00.000Z',
      }],
    });
    expect(migrated.uiPreferences).toEqual({
      todayCompletedExpanded: true,
      eventsDistantExpanded: false,
      eventsPastExpanded: true,
    });
  });
});

describe('appReducer Inbox captures', () => {
  it('records the creation time when a capture is added', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-08-30T10:20:30.000Z'));

    const added = appReducer(INITIAL_STATE, {
      type: 'ADD_CAPTURE',
      payload: 'Remember this',
    });

    expect(added.captures).toHaveLength(1);
    expect(added.captures[0]).toEqual(expect.objectContaining({
      text: 'Remember this',
      createdAt: '2026-08-30T10:20:30.000Z',
      status: 'new',
      completedAt: null,
    }));
  });

  it('marks an Inbox idea as completed and can return it for processing', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-09-02T12:30:00.000Z'));
    const state: AppState = {
      ...INITIAL_STATE,
      captures: [{
        id: 'capture-1',
        text: 'Build a reading nook',
        createdAt: '2026-08-20T07:00:00.000Z',
        status: 'new',
        completedAt: null,
      }],
    };

    const completed = appReducer(state, { type: 'COMPLETE_CAPTURE', payload: 'capture-1' });
    expect(completed.captures[0]).toMatchObject({
      status: 'completed',
      completedAt: '2026-09-02T12:30:00.000Z',
    });

    const redated = appReducer(completed, {
      type: 'UPDATE_CAPTURE_COMPLETED_AT',
      payload: { id: 'capture-1', completedAt: '2026-08-28T12:00:00.000Z' },
    });
    expect(redated.captures[0].completedAt).toBe('2026-08-28T12:00:00.000Z');

    const reopened = appReducer(redated, { type: 'REOPEN_CAPTURE', payload: 'capture-1' });
    expect(reopened.captures[0]).toMatchObject({ status: 'new', completedAt: null });
  });

  it('migrates completed Inbox ideas and backfills their realization date', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-09-02T12:30:00.000Z'));

    const migrated = migrateAppState({
      captures: [{
        id: 'capture-1',
        text: 'Completed idea',
        createdAt: '2026-08-20T07:00:00.000Z',
        status: 'completed',
      }],
    });

    expect(migrated.captures[0]).toMatchObject({
      status: 'completed',
      completedAt: '2026-09-02T12:30:00.000Z',
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

  it('preserves an explicit historical completion timestamp', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-08-17T12:34:56.000Z'));

    const completed = appReducer(withTask(makeTask()), {
      type: 'UPDATE_TASK',
      payload: {
        id: 'task-1',
        status: 'done',
        completedAt: '2026-08-16T20:00:00.000Z',
      },
    });

    expect(completed.tasks[0].completedAt).toBe('2026-08-16T20:00:00.000Z');
    expect(completed.tasks[0].updatedAt).toBe('2026-08-17T12:34:56.000Z');
  });
});

describe('appReducer week notes and UI preferences', () => {
  it('adds, updates and deletes a week note', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-08-16T08:00:00.000Z'));

    const added = appReducer(INITIAL_STATE, {
      type: 'ADD_WEEK_NOTE',
      payload: { week: '2026-W33', text: '  Vacation  ' },
    });
    const note = added.weekNotes['2026-W33'][0];

    expect(note).toEqual(expect.objectContaining({
      text: 'Vacation',
      createdAt: '2026-08-16T08:00:00.000Z',
      updatedAt: '2026-08-16T08:00:00.000Z',
    }));

    vi.setSystemTime(new Date('2026-08-16T09:00:00.000Z'));
    const updated = appReducer(added, {
      type: 'UPDATE_WEEK_NOTE',
      payload: { week: '2026-W33', id: note.id, text: 'Annual leave' },
    });

    expect(updated.weekNotes['2026-W33'][0]).toEqual({
      ...note,
      text: 'Annual leave',
      updatedAt: '2026-08-16T09:00:00.000Z',
    });

    const deleted = appReducer(updated, {
      type: 'DELETE_WEEK_NOTE',
      payload: { week: '2026-W33', id: note.id },
    });

    expect(deleted.weekNotes).toEqual({});
  });

  it('merges persisted UI preference updates', () => {
    const updated = appReducer(INITIAL_STATE, {
      type: 'UPDATE_UI_PREFERENCES',
      payload: { eventsPastExpanded: true },
    });

    expect(updated.uiPreferences).toEqual({
      todayCompletedExpanded: false,
      eventsDistantExpanded: false,
      eventsPastExpanded: true,
    });
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
