import { afterEach, describe, expect, it, vi } from 'vitest';
import { appReducer, CURRENT_SCHEMA_VERSION, migrateAppState, prepareAppStateForSession } from './state';
import { AppState, INITIAL_STATE, Task } from './types';

const makeTask = (overrides: Partial<Task> = {}): Task => ({
  id: 'task-1',
  title: 'Test task',
  status: 'todo',
  plan: { year: '2026', month: '2026-08', day: '2026-08-16', week: '2026-W33' },
  projectId: null,
  eventId: null,
  goalId: null,
  planningImportance: null,
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
        timeSpent: 5400,
        createdAt: '2026-01-05T08:00:00.000Z',
        updatedAt: '2026-01-05T09:00:00.000Z',
      }],
      captures: [],
      events: [],
      activeTaskId: 'legacy-task',
      activeTaskStartedAt: 123,
      lastActiveView: 'statistics',
    });

    expect(migrated.schemaVersion).toBe(CURRENT_SCHEMA_VERSION);
    expect(migrated.lastActiveView).toBe('today');
    expect(migrated.tasks[0]).toEqual(expect.objectContaining({
      id: 'legacy-task',
      completedAt: '2026-01-05T09:00:00.000Z',
      eventId: null,
      goalId: null,
      plan: { day: '2026-01-05', week: null, month: '2026-01', year: '2026' },
    }));
    expect(migrated.tasks[0]).not.toHaveProperty('frog');
    expect(migrated.tasks[0]).not.toHaveProperty('difficulty');
    expect(migrated.tasks[0]).not.toHaveProperty('timeSpent');
    expect(migrated).not.toHaveProperty('activeTaskId');
    expect(migrated).not.toHaveProperty('activeTaskStartedAt');
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
        { id: 'undated', text: 'No known start', createdAt: '2026-08-25T07:00:00.000Z', startedAt: null, status: 'new' },
        { id: 'legacy', text: 'Needs a date', status: 'new' },
      ],
    });

    expect(migrated.captures).toEqual([
      expect.objectContaining({ id: 'dated', createdAt: '2026-08-20T07:00:00.000Z', startedAt: '2026-08-20T07:00:00.000Z' }),
      expect.objectContaining({ id: 'undated', createdAt: '2026-08-25T07:00:00.000Z', startedAt: null }),
      expect.objectContaining({ id: 'legacy', createdAt: '2026-08-30T09:15:00.000Z', startedAt: '2026-08-30T09:15:00.000Z' }),
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

    expect(migrated.schemaVersion).toBe(CURRENT_SCHEMA_VERSION);
    expect(migrated.tasks).toHaveLength(1);
    expect(migrated.captures).toHaveLength(1);
    expect(migrated.events).toHaveLength(1);
    expect(migrated.taskOrderByMonthBucket).toEqual({ '2026-08': ['task-1'] });
    expect(migrated.tasks[0].plan.year).toBe('2026');
    expect(migrated.taskOrderByYearBucket).toEqual({});
    expect(migrated.taskOrderByYearMonth).toEqual({});
    expect(migrated.weeklyTemplate.activeTemplateId).toBe('weekly-template-default');
    expect(migrated.weeklyTemplate.templates).toHaveLength(1);
    expect(migrated.weeklyTemplate.templates[0]).toEqual(expect.objectContaining({
      id: 'weekly-template-default', name: 'Template 1', tasks: [], applications: {},
    }));
    expect(migrated.weeklyTemplate.templates[0].orderBySlot).toEqual({
      week: [], 'day-0': [], 'day-1': [], 'day-2': [], 'day-3': [], 'day-4': [], 'day-5': [], 'day-6': [],
    });
    expect(migrated.workShiftSettings.baseWeek).toBe('2026-W33');
    expect(migrated.monthNotes).toEqual({});
    expect(migrated.yearNotes).toEqual({});
    expect(migrated.weekNotes).toEqual({});
    expect(migrated.dayNotes).toEqual({});
    expect(migrated.goals).toEqual([]);
    expect(migrated.uiPreferences).toEqual({
      todayCompletedExpanded: false,
      eventsDistantExpanded: false,
      eventsPastExpanded: false,
      language: 'ru',
      calendarNoteHighlight: true,
      navigationItems: ['events', 'week', 'today'],
      startupView: 'today',
      mainMenuExpanded: true,
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
        navigationItems: ['year', 'today', 'year', 'unknown'],
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
      navigationItems: ['year', 'today'],
      startupView: 'today',
      mainMenuExpanded: true,
    });
  });

  it('preserves valid planning importance and rejects malformed provenance', () => {
    const migrated = migrateAppState({
      tasks: [
        makeTask({ id: 'valid', planningImportance: { source: 'month', dismissed: true } }),
        { ...makeTask({ id: 'invalid' }), planningImportance: { source: 'quarter', dismissed: false } },
      ],
    });

    expect(migrated.tasks.find(task => task.id === 'valid')?.planningImportance)
      .toEqual({ source: 'month', dismissed: true });
    expect(migrated.tasks.find(task => task.id === 'invalid')?.planningImportance).toBeNull();
  });

  it('preserves a valid start page and safely rejects unsupported views', () => {
    expect(migrateAppState({
      uiPreferences: { startupView: 'goals' },
    }).uiPreferences.startupView).toBe('goals');

    expect(migrateAppState({
      lastActiveView: 'rewards',
      uiPreferences: { startupView: 'rewards' },
    })).toMatchObject({
      lastActiveView: 'rewards',
      uiPreferences: { startupView: 'rewards' },
    });

    expect(migrateAppState({
      uiPreferences: { startupView: 'settings' },
    }).uiPreferences.startupView).toBe('today');
  });

  it('opens a fresh session on the configured start page', () => {
    const started = prepareAppStateForSession({
      ...INITIAL_STATE,
      lastActiveView: 'month',
      goalNavigationTargetId: 'goal-1',
      dayNavigationTarget: '2026-09-11',
      uiPreferences: { ...INITIAL_STATE.uiPreferences, startupView: 'events' },
    });

    expect(started.lastActiveView).toBe('events');
    expect(started.goalNavigationTargetId).toBeNull();
    expect(started.dayNavigationTarget).toBeNull();
  });
});

describe('appReducer Inbox captures', () => {
  it('records the creation time when a capture is added', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-08-30T10:20:30.000Z'));

    const added = appReducer(INITIAL_STATE, {
      type: 'ADD_CAPTURE',
      payload: { text: 'Remember this', startDateKnown: true },
    });

    expect(added.captures).toHaveLength(1);
    expect(added.captures[0]).toEqual(expect.objectContaining({
      text: 'Remember this',
      createdAt: '2026-08-30T10:20:30.000Z',
      startedAt: '2026-08-30T10:20:30.000Z',
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
        startedAt: '2026-08-20T07:00:00.000Z',
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
      type: 'UPDATE_CAPTURE_STARTED_AT',
      payload: { id: 'capture-1', startedAt: null },
    });
    expect(recreated.captures[0]).toMatchObject({
      createdAt: '2026-08-20T07:00:00.000Z',
      startedAt: null,
    });

    const redated = appReducer(recreated, {
      type: 'UPDATE_CAPTURE_COMPLETED_AT',
      payload: { id: 'capture-1', completedAt: '2026-08-28T12:00:00.000Z' },
    });
    expect(redated.captures[0].completedAt).toBe('2026-08-28T12:00:00.000Z');

    const reopened = appReducer(redated, { type: 'REOPEN_CAPTURE', payload: 'capture-1' });
    expect(reopened.captures[0]).toMatchObject({ status: 'new', completedAt: null });
  });

  it('preserves valid goal links and removes orphaned task links', () => {
    const linkedTask = makeTask({ id: 'linked', goalId: 'goal-1' });
    const orphanedTask = makeTask({ id: 'orphaned', goalId: 'missing-goal' });
    const migrated = migrateAppState({
      tasks: [linkedTask, orphanedTask],
      captures: [],
      events: [],
      goals: [{
        id: 'goal-1',
        title: 'Linked goal',
        status: 'active',
        createdAt: '2026-08-01T08:00:00.000Z',
        updatedAt: '2026-08-01T08:00:00.000Z',
        completedAt: null,
        currentState: '',
        nextStep: '',
        notes: [],
      }],
    });

    expect(migrated.tasks.find(task => task.id === 'linked')?.goalId).toBe('goal-1');
    expect(migrated.tasks.find(task => task.id === 'orphaned')?.goalId).toBeNull();
  });

  it('creates wishes without a start date while retaining their technical creation time', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-09-02T12:30:00.000Z'));

    const added = appReducer(INITIAL_STATE, {
      type: 'ADD_CAPTURE',
      payload: { text: 'A long-standing wish', startDateKnown: false },
    });

    expect(added.captures[0]).toMatchObject({
      createdAt: '2026-09-02T12:30:00.000Z',
      startedAt: null,
    });
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
  it('records a dedicated completion timestamp', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-08-16T12:34:56.000Z'));

    const completed = appReducer(withTask(makeTask()), {
      type: 'UPDATE_TASK',
      payload: { id: 'task-1', status: 'done' },
    });

    expect(completed.tasks[0].completedAt).toBe('2026-08-16T12:34:56.000Z');
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

describe('appReducer period notes and UI preferences', () => {
  it('adds, updates and deletes a year note', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-09-08T08:00:00.000Z'));

    const added = appReducer(INITIAL_STATE, {
      type: 'ADD_YEAR_NOTE',
      payload: { year: '2027', text: '  Main direction  ' },
    });
    const note = added.yearNotes['2027'][0];
    expect(note).toMatchObject({ text: 'Main direction', createdAt: '2026-09-08T08:00:00.000Z' });

    const updated = appReducer(added, {
      type: 'UPDATE_YEAR_NOTE',
      payload: { year: '2027', id: note.id, text: 'Launch year' },
    });
    expect(updated.yearNotes['2027'][0].text).toBe('Launch year');

    const deleted = appReducer(updated, {
      type: 'DELETE_YEAR_NOTE',
      payload: { year: '2027', id: note.id },
    });
    expect(deleted.yearNotes).toEqual({});
  });

  it('adds, updates and deletes a month note', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-09-08T08:00:00.000Z'));

    const added = appReducer(INITIAL_STATE, {
      type: 'ADD_MONTH_NOTE',
      payload: { month: '2026-09', text: '  Main focus  ' },
    });
    const note = added.monthNotes['2026-09'][0];
    expect(note).toMatchObject({ text: 'Main focus', createdAt: '2026-09-08T08:00:00.000Z' });

    const updated = appReducer(added, {
      type: 'UPDATE_MONTH_NOTE',
      payload: { month: '2026-09', id: note.id, text: 'Main direction' },
    });
    expect(updated.monthNotes['2026-09'][0].text).toBe('Main direction');

    const deleted = appReducer(updated, {
      type: 'DELETE_MONTH_NOTE',
      payload: { month: '2026-09', id: note.id },
    });
    expect(deleted.monthNotes).toEqual({});
    expect(appReducer(INITIAL_STATE, {
      type: 'ADD_MONTH_NOTE',
      payload: { month: 'invalid', text: 'Discard' },
    })).toBe(INITIAL_STATE);
  });

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
      navigationItems: ['events', 'week', 'today'],
      startupView: 'today',
      mainMenuExpanded: true,
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
      taskOrderByYearBucket: { '2026': [task.id] },
      taskOrderByYearMonth: { '2026|2026-08': [task.id] },
    };

    const moved = appReducer(state, {
      type: 'UPDATE_TASK',
      payload: { id: task.id, plan: { year: '2026', month: '2026-08', week: '2026-W34', day: null } },
    });

    expect(moved.taskOrderByDay['2026-08-16']).toEqual([]);
    expect(moved.taskOrderByWeekBucket['2026-W33']).toEqual([]);
    expect(moved.taskOrderByMonthBucket['2026-08']).toEqual([]);
    expect(moved.taskOrderByMonthWeek['2026-08|2026-W33']).toEqual([]);
    expect(moved.taskOrderByYearBucket['2026']).toEqual([]);
    expect(moved.taskOrderByYearMonth['2026|2026-08']).toEqual([]);
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
    const added = appReducer(INITIAL_STATE, {
      type: 'ADD_GOAL', payload: { title: '  Renew permit  ', startDateKnown: false },
    });
    const goal = added.goals[0];
    expect(goal).toEqual(expect.objectContaining({
      why: '',
      title: 'Renew permit', status: 'active', startedAt: null, notes: [],
    }));

    const detailed = appReducer(added, {
      type: 'UPDATE_GOAL',
      payload: { id: goal.id, why: 'A calmer life', currentState: 'Documents collected', nextStep: 'Book appointment' },
    });
    const noted = appReducer(detailed, {
      type: 'ADD_GOAL_NOTE',
      payload: { goalId: goal.id, text: '  Photos are ready  ' },
    });
    expect(noted.goals[0].notes[0].text).toBe('Photos are ready');
    expect(noted.goals[0].why).toBe('A calmer life');

    const completed = appReducer(noted, { type: 'COMPLETE_GOAL', payload: goal.id });
    expect(completed.goals[0]).toEqual(expect.objectContaining({ status: 'completed', completedAt: '2026-09-04T10:00:00.000Z' }));
    const reopened = appReducer(completed, { type: 'REOPEN_GOAL', payload: goal.id });
    expect(reopened.goals[0]).toEqual(expect.objectContaining({ status: 'active', completedAt: null }));
    const archived = appReducer(reopened, { type: 'ARCHIVE_GOAL', payload: goal.id });
    expect(archived.goals[0].status).toBe('archived');
    vi.useRealTimers();
  });

  it('migrates valid period notes and goals while discarding malformed entries', () => {
    const migrated = migrateAppState({
      tasks: [], captures: [], events: [],
      dayNotes: {
        '2026-09-04': [{ id: 'day-note', text: '  Remember this  ', createdAt: '2026-09-01T10:00:00.000Z' }],
        '2026-02-31': [{ id: 'invalid-date', text: 'Discard' }],
      },
      monthNotes: {
        '2026-09': [{ id: 'month-note', text: '  September focus  ', createdAt: '2026-09-01T10:00:00.000Z' }],
        invalid: [{ id: 'invalid-month', text: 'Discard' }],
      },
      yearNotes: {
        '2027': [{ id: 'year-note', text: '  Launch year  ', createdAt: '2026-09-01T10:00:00.000Z' }],
        '2019': [{ id: 'invalid-year', text: 'Discard' }],
      },
      taskOrderByYearBucket: { '2027': ['task-a', 42, 'task-b'] },
      taskOrderByYearMonth: { '2027|2027-03': ['task-b'] },
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
    expect(migrated.monthNotes['2026-09'][0].text).toBe('September focus');
    expect(migrated.monthNotes.invalid).toBeUndefined();
    expect(migrated.yearNotes['2027'][0].text).toBe('Launch year');
    expect(migrated.yearNotes['2019']).toBeUndefined();
    expect(migrated.taskOrderByYearBucket['2027']).toEqual(['task-a', 'task-b']);
    expect(migrated.taskOrderByYearMonth['2027|2027-03']).toEqual(['task-b']);
    expect(migrated.goals).toHaveLength(1);
    expect(migrated.goals[0]).toEqual(expect.objectContaining({
      title: 'Emergency fund', status: 'completed', startedAt: '2026-01-01T10:00:00.000Z',
    }));
    expect(migrated.goals[0].notes[0].text).toBe('Final transfer');
  });

  it('opens a linked goal and clears the navigation target when leaving goals', () => {
    const goalState = appReducer(INITIAL_STATE, {
      type: 'ADD_GOAL', payload: { title: 'Ship project', startDateKnown: true },
    });
    const goalId = goalState.goals[0].id;
    const opened = appReducer(goalState, { type: 'OPEN_GOAL', payload: goalId });

    expect(opened.lastActiveView).toBe('goals');
    expect(opened.goalNavigationTargetId).toBe(goalId);
    expect(appReducer(opened, { type: 'SET_VIEW', payload: 'today' }).goalNavigationTargetId).toBeNull();
  });

  it('opens a valid day overview and clears its target when navigating away', () => {
    const opened = appReducer(INITIAL_STATE, { type: 'OPEN_DAY', payload: '2026-09-10' });

    expect(opened.lastActiveView).toBe('day');
    expect(opened.dayNavigationTarget).toBe('2026-09-10');
    expect(appReducer(opened, { type: 'SET_VIEW', payload: 'week' }).dayNavigationTarget).toBeNull();
    expect(appReducer(INITIAL_STATE, { type: 'OPEN_DAY', payload: 'invalid' })).toBe(INITIAL_STATE);
  });

  it('deleting a goal keeps its tasks and only removes their link', () => {
    const goalState = appReducer(INITIAL_STATE, {
      type: 'ADD_GOAL', payload: { title: 'Ship project', startDateKnown: true },
    });
    const goalId = goalState.goals[0].id;
    const state = {
      ...goalState,
      goalNavigationTargetId: goalId,
      tasks: [makeTask({ goalId })],
    };
    const deleted = appReducer(state, { type: 'DELETE_GOAL', payload: goalId });

    expect(deleted.goals).toHaveLength(0);
    expect(deleted.tasks).toHaveLength(1);
    expect(deleted.tasks[0].goalId).toBeNull();
    expect(deleted.goalNavigationTargetId).toBeNull();
  });

  it('stores, edits, orders and deletes weekly template tasks without touching generated tasks', () => {
    const templateId = INITIAL_STATE.weeklyTemplate.activeTemplateId;
    const templateTask = {
      id: 'template-1',
      title: '  Weekly review  ',
      dayIndex: 0 as const,
      createdAt: '2026-09-09T10:00:00.000Z',
      updatedAt: '2026-09-09T10:00:00.000Z',
    };
    const added = appReducer(INITIAL_STATE, {
      type: 'ADD_WEEKLY_TEMPLATE_TASK', payload: { templateId, task: templateTask },
    });
    expect(added.weeklyTemplate.templates[0].tasks[0].title).toBe('Weekly review');
    expect(added.weeklyTemplate.templates[0].orderBySlot['day-0']).toEqual(['template-1']);

    const renamed = appReducer(added, {
      type: 'UPDATE_WEEKLY_TEMPLATE_TASK', payload: { templateId, id: 'template-1', title: 'Plan the week' },
    });
    expect(renamed.weeklyTemplate.templates[0].tasks[0].title).toBe('Plan the week');

    const generated = makeTask({
      id: 'generated-1',
      title: 'Plan the week',
      plan: { day: '2026-09-28', week: '2026-W40', month: '2026-09', year: '2026' },
    });
    const applied = appReducer(renamed, {
      type: 'APPLY_WEEKLY_TEMPLATE',
      payload: { templateId, week: '2026-W40', items: [{ templateTaskId: 'template-1', task: generated }] },
    });
    expect(applied.tasks).toContainEqual(generated);
    expect(applied.taskOrderByDay['2026-09-28']).toEqual(['generated-1']);
    expect(applied.weeklyTemplate.templates[0].applications['2026-W40']).toEqual({ 'template-1': 'generated-1' });

    const repeated = appReducer(applied, {
      type: 'APPLY_WEEKLY_TEMPLATE',
      payload: { templateId, week: '2026-W40', items: [{ templateTaskId: 'template-1', task: { ...generated, id: 'duplicate' } }] },
    });
    expect(repeated).toBe(applied);

    const deleted = appReducer(applied, {
      type: 'DELETE_WEEKLY_TEMPLATE_TASK', payload: { templateId, taskId: 'template-1' },
    });
    expect(deleted.weeklyTemplate.templates[0].tasks).toEqual([]);
    expect(deleted.tasks).toContainEqual(generated);
  });

  it('manages named templates and scopes repeat protection to each template', () => {
    const firstId = INITIAL_STATE.weeklyTemplate.activeTemplateId;
    const secondTemplate = {
      id: 'template-second',
      name: 'Second shift',
      tasks: [{
        id: 'second-task', title: 'Late routine', dayIndex: null, createdAt: 'now', updatedAt: 'now',
      }],
      orderBySlot: { week: ['second-task'] },
      applications: {},
      createdAt: 'now',
      updatedAt: 'now',
    };
    const added = appReducer(INITIAL_STATE, { type: 'ADD_WEEKLY_TEMPLATE', payload: secondTemplate });
    expect(added.weeklyTemplate.activeTemplateId).toBe('template-second');
    expect(added.weeklyTemplate.templates).toHaveLength(2);

    const renamed = appReducer(added, {
      type: 'RENAME_WEEKLY_TEMPLATE', payload: { id: 'template-second', name: 'Evening shift' },
    });
    expect(renamed.weeklyTemplate.templates[1].name).toBe('Evening shift');

    const live = makeTask({ id: 'from-second', title: 'Late routine', plan: { day: null, week: '2026-W40', month: '2026-09', year: '2026' } });
    const applied = appReducer(renamed, {
      type: 'APPLY_WEEKLY_TEMPLATE',
      payload: { templateId: 'template-second', week: '2026-W40', items: [{ templateTaskId: 'second-task', task: live }] },
    });
    expect(applied.tasks).toContainEqual(live);
    expect(applied.weeklyTemplate.templates[1].applications['2026-W40']).toEqual({ 'second-task': 'from-second' });
    expect(applied.weeklyTemplate.templates[0].applications['2026-W40']).toBeUndefined();

    const selected = appReducer(applied, { type: 'SET_ACTIVE_WEEKLY_TEMPLATE', payload: firstId });
    expect(selected.weeklyTemplate.activeTemplateId).toBe(firstId);
    const deleted = appReducer(selected, { type: 'DELETE_WEEKLY_TEMPLATE', payload: 'template-second' });
    expect(deleted.weeklyTemplate.templates).toHaveLength(1);
    expect(appReducer(deleted, { type: 'DELETE_WEEKLY_TEMPLATE', payload: firstId })).toBe(deleted);
    expect(deleted.tasks).toContainEqual(live);
  });
});
