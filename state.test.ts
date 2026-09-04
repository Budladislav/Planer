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
      transitionHighlight: 'extended',
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

    expect(migrated.schemaVersion).toBe(6);
    expect(migrated.tasks).toHaveLength(1);
    expect(migrated.captures).toHaveLength(1);
    expect(migrated.events).toHaveLength(1);
    expect(migrated.taskOrderByMonthBucket).toEqual({ '2026-08': ['task-1'] });
    expect(migrated.workShiftSettings.baseWeek).toBe('2026-W33');
    expect(migrated.weekNotes).toEqual({});
    expect(migrated.dayNotes).toEqual({});
    expect(migrated.goals).toEqual([]);
    expect(migrated.uiPreferences).toEqual({
      todayCompletedExpanded: false,
      eventsDistantExpanded: false,
      eventsPastExpanded: false,
      language: 'ru',
      calendarNoteHighlight: true,
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
      language: 'ru',
      calendarNoteHighlight: true,
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

    const recreated = appReducer(completed, {
      type: 'UPDATE_CAPTURE_CREATED_AT',
      payload: { id: 'capture-1', createdAt: '2026-08-18T07:00:00.000Z' },
    });
    expect(recreated.captures[0].createdAt).toBe('2026-08-18T07:00:00.000Z');

    const redated = appReducer(recreated, {
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

  it('preserves disabled shift-transition highlighting', () => {
    const migrated = migrateAppState({
      ...INITIAL_STATE,
      workShiftSettings: {
        ...INITIAL_STATE.workShiftSettings,
        transitionHighlight: 'off',
      },
    });

    expect(migrated.workShiftSettings.transitionHighlight).toBe('off');
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

describe('appReducer task ordering', () => {
  it('ignores an unchanged empty day order', () => {
    const state: AppState = {
      ...INITIAL_STATE,
      taskOrderByDay: { '2026-08-15': [] },
    };

    expect(appReducer(state, {
      type: 'UPDATE_TASK_ORDER',
      payload: { day: '2026-08-15', order: [] },
    })).toBe(state);
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
      language: INITIAL_STATE.uiPreferences.language,
      calendarNoteHighlight: true,
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

describe('appReducer day notes and long-term goals', () => {
  it('adds, edits, and removes multiple notes for one day', () => {
    const first = appReducer(INITIAL_STATE, {
      type: 'ADD_DAY_NOTE',
      payload: { date: '2026-09-04', text: '  Book tickets  ' },
    });
    const second = appReducer(first, {
      type: 'ADD_DAY_NOTE',
      payload: { date: '2026-09-04', text: 'Pack a bag' },
    });
    expect(second.dayNotes['2026-09-04']).toHaveLength(2);
    const note = second.dayNotes['2026-09-04'][0];
    expect(note.text).toBe('Book tickets');

    const updated = appReducer(second, {
      type: 'UPDATE_DAY_NOTE',
      payload: { date: '2026-09-04', id: note.id, text: 'Buy train tickets' },
    });
    expect(updated.dayNotes['2026-09-04'][0].text).toBe('Buy train tickets');

    const deleted = appReducer(updated, {
      type: 'DELETE_DAY_NOTE',
      payload: { date: '2026-09-04', id: note.id },
    });
    expect(deleted.dayNotes['2026-09-04'].map(item => item.text)).toEqual(['Pack a bag']);
  });

  it('keeps the complete long-term goal lifecycle and its progress notes', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-09-04T10:00:00.000Z'));
    const added = appReducer(INITIAL_STATE, { type: 'ADD_GOAL', payload: { title: '  Renew permit  ' } });
    const goal = added.goals[0];
    expect(goal).toEqual(expect.objectContaining({ title: 'Renew permit', status: 'active', notes: [] }));

    const detailed = appReducer(added, {
      type: 'UPDATE_GOAL',
      payload: { id: goal.id, currentState: 'Documents collected', nextStep: 'Book appointment' },
    });
    const noted = appReducer(detailed, {
      type: 'ADD_GOAL_NOTE',
      payload: { goalId: goal.id, text: '  Photos are ready  ' },
    });
    expect(noted.goals[0].notes[0].text).toBe('Photos are ready');

    const completed = appReducer(noted, { type: 'COMPLETE_GOAL', payload: goal.id });
    expect(completed.goals[0]).toEqual(expect.objectContaining({ status: 'completed', completedAt: '2026-09-04T10:00:00.000Z' }));
    const reopened = appReducer(completed, { type: 'REOPEN_GOAL', payload: goal.id });
    expect(reopened.goals[0]).toEqual(expect.objectContaining({ status: 'active', completedAt: null }));
    const archived = appReducer(reopened, { type: 'ARCHIVE_GOAL', payload: goal.id });
    expect(archived.goals[0].status).toBe('archived');
    vi.useRealTimers();
  });

  it('migrates valid day notes and goals while discarding malformed entries', () => {
    const migrated = migrateAppState({
      tasks: [], captures: [], events: [],
      dayNotes: {
        '2026-09-04': [{ id: 'day-note', text: '  Remember this  ', createdAt: '2026-09-01T10:00:00.000Z' }],
        '2026-02-31': [{ id: 'invalid-date', text: 'Discard' }],
      },
      goals: [{
        id: 'goal-1',
        title: '  Emergency fund  ',
        status: 'completed',
        createdAt: '2026-01-01T10:00:00.000Z',
        completedAt: '2026-09-01T10:00:00.000Z',
        currentState: 'Done',
        nextStep: '',
        notes: [{ id: 'note-1', text: '  Final transfer  ' }],
      }, { id: 'bad-goal', title: '   ' }],
    });

    expect(migrated.dayNotes['2026-09-04'][0].text).toBe('Remember this');
    expect(migrated.dayNotes['2026-02-31']).toBeUndefined();
    expect(migrated.goals).toHaveLength(1);
    expect(migrated.goals[0]).toEqual(expect.objectContaining({ title: 'Emergency fund', status: 'completed' }));
    expect(migrated.goals[0].notes[0].text).toBe('Final transfer');
  });
});
