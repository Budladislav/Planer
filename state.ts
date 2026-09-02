import { AppState, CalendarEvent, Capture, INITIAL_STATE, Task, ViewState, WeekNote, WorkShift } from './types';
import { formatEventTitle, generateId, getTodayString, getWeekString, isValidWeekString } from './utils';
import { getMonthForWeek, isValidMonthString } from './month-planning';

export const CURRENT_SCHEMA_VERSION = 5;

type UnknownRecord = Record<string, unknown>;

const isRecord = (value: unknown): value is UnknownRecord => {
  return typeof value === 'object' && value !== null;
};

const asString = (value: unknown, fallback: string): string => {
  return typeof value === 'string' ? value : fallback;
};

const asNullableString = (value: unknown): string | null => {
  return typeof value === 'string' ? value : null;
};

const migrateOrderMap = (value: unknown): Record<string, string[]> => {
  if (!isRecord(value)) return {};

  return Object.fromEntries(
    Object.entries(value).map(([key, order]) => [
      key,
      Array.isArray(order) ? order.filter((id): id is string => typeof id === 'string') : [],
    ]),
  );
};

const migrateWeekNotes = (value: unknown, now: string): Record<string, WeekNote[]> => {
  if (!isRecord(value)) return {};

  return Object.fromEntries(
    Object.entries(value).flatMap(([week, notes]): [string, WeekNote[]][] => {
      if (!isValidWeekString(week) || !Array.isArray(notes)) return [];

      const migratedNotes = notes.flatMap((note): WeekNote[] => {
        if (!isRecord(note) || typeof note.text !== 'string') return [];

        const text = note.text.trim();
        if (!text) return [];

        const createdAt = asString(note.createdAt, now);
        return [{
          id: asString(note.id, generateId()),
          text,
          createdAt,
          updatedAt: asString(note.updatedAt, createdAt),
        }];
      });

      return migratedNotes.length > 0 ? [[week, migratedNotes]] : [];
    }),
  );
};

const removeTaskFromOrderMap = (
  orderMap: Record<string, string[]>,
  taskId: string,
): Record<string, string[]> => Object.fromEntries(
  Object.entries(orderMap).map(([key, order]) => [key, order.filter(id => id !== taskId)]),
);

export const migrateAppState = (value: unknown): AppState => {
  const parsed = isRecord(value) ? value : {};
  const now = new Date().toISOString();
  const today = getTodayString();
  const allowedViews: ViewState[] = ['today', 'month', 'week', 'inbox', 'events', 'settings', 'done', 'reports'];
  const requestedView = parsed.lastActiveView === 'focus' ? 'today' : parsed.lastActiveView;
  const lastActiveView = allowedViews.includes(requestedView as ViewState)
    ? requestedView as ViewState
    : 'today';

  const tasks = Array.isArray(parsed.tasks)
    ? parsed.tasks.flatMap((value): Task[] => {
        if (!isRecord(value)) return [];

        const rawPlan = isRecord(value.plan) ? value.plan : {};
        const status: Task['status'] = value.status === 'done' ? 'done' : 'todo';
        const createdAt = asString(value.createdAt, now);
        const updatedAt = asString(value.updatedAt, createdAt);
        const day = asNullableString(rawPlan.day);
        const week = asNullableString(rawPlan.week);
        const rawMonth = asNullableString(rawPlan.month);
        const month = rawMonth && isValidMonthString(rawMonth)
          ? rawMonth
          : day?.slice(0, 7) ?? (week ? getMonthForWeek(week) : null);
        const task: Task = {
          id: asString(value.id, generateId()),
          title: asString(value.title, ''),
          status,
          plan: {
            day,
            week,
            month,
          },
          projectId: asNullableString(value.projectId),
          eventId: asNullableString(value.eventId),
          createdAt,
          updatedAt,
          completedAt: status === 'done'
            ? asString(value.completedAt, updatedAt)
            : null,
          timeSpent: typeof value.timeSpent === 'number' && value.timeSpent >= 0
            ? value.timeSpent
            : undefined,
        };

        if (task.status === 'todo' && task.plan.day && task.plan.day < today) {
          task.plan = { day: today, week: getWeekString(today), month: today.slice(0, 7) };
        }

        return [task];
      })
    : [];

  const captures = Array.isArray(parsed.captures)
    ? parsed.captures.flatMap((value): Capture[] => {
        if (!isRecord(value)) return [];
        const status: Capture['status'] = value.status === 'processed'
          || value.status === 'archived'
          || value.status === 'completed'
          ? value.status
          : 'new';
        return [{
          id: asString(value.id, generateId()),
          text: asString(value.text, ''),
          createdAt: asString(value.createdAt, now),
          status,
          completedAt: status === 'completed' ? asString(value.completedAt, now) : null,
        }];
      })
    : [];

  const events = Array.isArray(parsed.events)
    ? parsed.events.flatMap((value): CalendarEvent[] => {
        if (!isRecord(value)) return [];
        return [{
          id: asString(value.id, generateId()),
          title: asString(value.title, ''),
          date: asString(value.date, today),
          time: asString(value.time, '00:00'),
          note: asNullableString(value.note),
        }];
      })
    : [];

  const requestedActiveTaskId = asNullableString(parsed.activeTaskId);
  const activeTaskId = tasks.some(task => task.id === requestedActiveTaskId && task.status === 'todo')
    ? requestedActiveTaskId
    : null;

  const rawShiftSettings = isRecord(parsed.workShiftSettings) ? parsed.workShiftSettings : {};
  const baseWeekCandidate = asNullableString(rawShiftSettings.baseWeek);
  const baseShiftCandidate = rawShiftSettings.baseShift;
  const rawOverrides = isRecord(rawShiftSettings.overrides) ? rawShiftSettings.overrides : {};
  const overrides = Object.fromEntries(
    Object.entries(rawOverrides).filter(
      (entry): entry is [string, WorkShift] => isValidWeekString(entry[0]) && (entry[1] === 1 || entry[1] === 2),
    ),
  );
  const rawUiPreferences = isRecord(parsed.uiPreferences) ? parsed.uiPreferences : {};

  return {
    schemaVersion: CURRENT_SCHEMA_VERSION,
    captures,
    tasks,
    events,
    activeTaskId,
    activeTaskStartedAt: activeTaskId && typeof parsed.activeTaskStartedAt === 'number'
      ? parsed.activeTaskStartedAt
      : null,
    lastActiveView,
    taskOrderByDay: migrateOrderMap(parsed.taskOrderByDay),
    taskOrderByWeekBucket: migrateOrderMap(parsed.taskOrderByWeekBucket),
    taskOrderByMonthBucket: migrateOrderMap(parsed.taskOrderByMonthBucket),
    taskOrderByMonthWeek: migrateOrderMap(parsed.taskOrderByMonthWeek),
    workShiftSettings: {
      baseWeek: baseWeekCandidate && isValidWeekString(baseWeekCandidate) ? baseWeekCandidate : null,
      baseShift: baseShiftCandidate === 1 || baseShiftCandidate === 2 ? baseShiftCandidate : null,
      overrides,
    },
    weekNotes: migrateWeekNotes(parsed.weekNotes, now),
    uiPreferences: {
      todayCompletedExpanded: rawUiPreferences.todayCompletedExpanded === true,
      eventsDistantExpanded: rawUiPreferences.eventsDistantExpanded === true,
      eventsPastExpanded: rawUiPreferences.eventsPastExpanded === true,
    },
  };
};

export type Action =
  | { type: 'INIT_STATE'; payload: AppState }
  | { type: 'SET_VIEW'; payload: ViewState }
  | { type: 'ADD_CAPTURE'; payload: string }
  | { type: 'UPDATE_CAPTURE'; payload: { id: string; text: string } }
  | { type: 'PROCESS_CAPTURE'; payload: { id: string; status: 'processed' | 'archived' } }
  | { type: 'COMPLETE_CAPTURE'; payload: string }
  | { type: 'UPDATE_CAPTURE_COMPLETED_AT'; payload: { id: string; completedAt: string } }
  | { type: 'REOPEN_CAPTURE'; payload: string }
  | { type: 'DELETE_CAPTURE'; payload: string }
  | { type: 'ADD_TASK'; payload: Task }
  | { type: 'UPDATE_TASK'; payload: Partial<Task> & { id: string } }
  | { type: 'DELETE_TASK'; payload: string }
  | { type: 'ADD_EVENT'; payload: CalendarEvent }
  | { type: 'UPDATE_EVENT'; payload: Partial<CalendarEvent> & { id: string } }
  | { type: 'DELETE_EVENT'; payload: string }
  | { type: 'SET_ACTIVE_TASK'; payload: { id: string | null; startedAt?: number | null } }
  | { type: 'UPDATE_TASK_ORDER'; payload: { day: string; order: string[] } }
  | { type: 'UPDATE_TASK_ORDER_WEEK_BUCKET'; payload: { week: string; order: string[] } }
  | { type: 'UPDATE_TASK_ORDER_MONTH_BUCKET'; payload: { month: string; order: string[] } }
  | { type: 'UPDATE_TASK_ORDER_MONTH_WEEK'; payload: { key: string; order: string[] } }
  | { type: 'UPDATE_WORK_SHIFT_SETTINGS'; payload: AppState['workShiftSettings'] }
  | { type: 'ADD_WEEK_NOTE'; payload: { week: string; text: string } }
  | { type: 'UPDATE_WEEK_NOTE'; payload: { week: string; id: string; text: string } }
  | { type: 'DELETE_WEEK_NOTE'; payload: { week: string; id: string } }
  | { type: 'UPDATE_UI_PREFERENCES'; payload: Partial<AppState['uiPreferences']> }
  | { type: 'IMPORT_DATA'; payload: unknown }
  | { type: 'RESET_DATA' };

export const appReducer = (state: AppState, action: Action): AppState => {
  switch (action.type) {
    case 'INIT_STATE':
      return action.payload;
    case 'SET_VIEW':
      return { ...state, lastActiveView: action.payload };
    case 'ADD_CAPTURE':
      return {
        ...state,
        captures: [
          {
            id: generateId(),
            text: action.payload,
            createdAt: new Date().toISOString(),
            status: 'new',
            completedAt: null,
          },
          ...state.captures,
        ],
      };
    case 'UPDATE_CAPTURE':
      return {
        ...state,
        captures: state.captures.map(c => c.id === action.payload.id
          ? { ...c, text: action.payload.text }
          : c),
      };
    case 'PROCESS_CAPTURE':
      return {
        ...state,
        captures: state.captures.map(c => c.id === action.payload.id
          ? { ...c, status: action.payload.status }
          : c),
      };
    case 'COMPLETE_CAPTURE':
      return {
        ...state,
        captures: state.captures.map(c => c.id === action.payload
          ? { ...c, status: 'completed', completedAt: new Date().toISOString() }
          : c),
      };
    case 'UPDATE_CAPTURE_COMPLETED_AT':
      return {
        ...state,
        captures: state.captures.map(c => c.id === action.payload.id && c.status === 'completed'
          ? { ...c, completedAt: action.payload.completedAt }
          : c),
      };
    case 'REOPEN_CAPTURE':
      return {
        ...state,
        captures: state.captures.map(c => c.id === action.payload
          ? { ...c, status: 'new', completedAt: null }
          : c),
      };
    case 'DELETE_CAPTURE':
      return { ...state, captures: state.captures.filter(c => c.id !== action.payload) };
    case 'ADD_TASK':
      return { ...state, tasks: [...state.tasks, action.payload] };
    case 'UPDATE_TASK': {
      const previousTask = state.tasks.find(task => task.id === action.payload.id);
      if (!previousTask) return state;

      const now = new Date().toISOString();
      let completedAt = action.payload.completedAt !== undefined
        ? action.payload.completedAt
        : previousTask.completedAt;
      if (
        action.payload.status === 'done'
        && previousTask.status !== 'done'
        && action.payload.completedAt === undefined
      ) completedAt = now;
      if (action.payload.status === 'todo') completedAt = null;

      const tasks = state.tasks.map(task => task.id === action.payload.id
        ? { ...task, ...action.payload, completedAt, updatedAt: now }
        : task);
      const updatedTask = tasks.find(task => task.id === action.payload.id);
      const planChanged = updatedTask
        ? updatedTask.plan.day !== previousTask.plan.day
          || updatedTask.plan.week !== previousTask.plan.week
          || updatedTask.plan.month !== previousTask.plan.month
        : false;
      let events = state.events;

      if (previousTask.eventId && (action.payload.title !== undefined || action.payload.plan !== undefined)) {
        const finalTask = tasks.find(task => task.id === action.payload.id);
        if (finalTask) {
          const titleMatch = finalTask.title.match(/^(\d{2}:\d{2})\s+(.+)$/);
          events = state.events.map(event => {
            if (event.id !== previousTask.eventId) return event;
            return {
              ...event,
              title: titleMatch?.[2] ?? event.title,
              time: titleMatch?.[1] ?? event.time,
              date: finalTask.plan.day ?? event.date,
            };
          });
        }
      }

      return {
        ...state,
        tasks,
        events,
        taskOrderByDay: planChanged
          ? removeTaskFromOrderMap(state.taskOrderByDay, action.payload.id)
          : state.taskOrderByDay,
        taskOrderByWeekBucket: planChanged
          ? removeTaskFromOrderMap(state.taskOrderByWeekBucket, action.payload.id)
          : state.taskOrderByWeekBucket,
        taskOrderByMonthBucket: planChanged
          ? removeTaskFromOrderMap(state.taskOrderByMonthBucket, action.payload.id)
          : state.taskOrderByMonthBucket,
        taskOrderByMonthWeek: planChanged
          ? removeTaskFromOrderMap(state.taskOrderByMonthWeek, action.payload.id)
          : state.taskOrderByMonthWeek,
        activeTaskId: action.payload.status === 'done' && state.activeTaskId === action.payload.id
          ? null
          : state.activeTaskId,
        activeTaskStartedAt: action.payload.status === 'done' && state.activeTaskId === action.payload.id
          ? null
          : state.activeTaskStartedAt,
      };
    }
    case 'DELETE_TASK':
      return {
        ...state,
        tasks: state.tasks.filter(task => task.id !== action.payload),
        taskOrderByDay: removeTaskFromOrderMap(state.taskOrderByDay, action.payload),
        taskOrderByWeekBucket: removeTaskFromOrderMap(state.taskOrderByWeekBucket, action.payload),
        taskOrderByMonthBucket: removeTaskFromOrderMap(state.taskOrderByMonthBucket, action.payload),
        taskOrderByMonthWeek: removeTaskFromOrderMap(state.taskOrderByMonthWeek, action.payload),
        activeTaskId: state.activeTaskId === action.payload ? null : state.activeTaskId,
        activeTaskStartedAt: state.activeTaskId === action.payload ? null : state.activeTaskStartedAt,
      };
    case 'ADD_EVENT':
      return { ...state, events: [...state.events, action.payload] };
    case 'UPDATE_EVENT': {
      const events = state.events.map(event => event.id === action.payload.id
        ? { ...event, ...action.payload }
        : event);
      const updatedEvent = events.find(event => event.id === action.payload.id);
      const linkedTask = state.tasks.find(task => task.eventId === action.payload.id);
      if (!updatedEvent || !linkedTask) return { ...state, events };

      return {
        ...state,
        events,
        tasks: state.tasks.map(task => task.id === linkedTask.id
          ? {
              ...task,
              title: formatEventTitle(updatedEvent.time, updatedEvent.title),
              plan: {
                day: updatedEvent.date,
                week: getWeekString(updatedEvent.date),
                month: updatedEvent.date.slice(0, 7),
              },
              updatedAt: new Date().toISOString(),
            }
          : task),
      };
    }
    case 'DELETE_EVENT': {
      const linkedTask = state.tasks.find(task => task.eventId === action.payload);
      return {
        ...state,
        events: state.events.filter(event => event.id !== action.payload),
        tasks: linkedTask ? state.tasks.filter(task => task.id !== linkedTask.id) : state.tasks,
        activeTaskId: linkedTask?.id === state.activeTaskId ? null : state.activeTaskId,
        activeTaskStartedAt: linkedTask?.id === state.activeTaskId ? null : state.activeTaskStartedAt,
      };
    }
    case 'SET_ACTIVE_TASK':
      return {
        ...state,
        activeTaskId: action.payload.id,
        activeTaskStartedAt: action.payload.id ? action.payload.startedAt ?? Date.now() : null,
      };
    case 'UPDATE_TASK_ORDER':
      return {
        ...state,
        taskOrderByDay: { ...state.taskOrderByDay, [action.payload.day]: action.payload.order },
      };
    case 'UPDATE_TASK_ORDER_WEEK_BUCKET':
      return {
        ...state,
        taskOrderByWeekBucket: {
          ...state.taskOrderByWeekBucket,
          [action.payload.week]: action.payload.order,
        },
      };
    case 'UPDATE_TASK_ORDER_MONTH_BUCKET':
      return {
        ...state,
        taskOrderByMonthBucket: {
          ...state.taskOrderByMonthBucket,
          [action.payload.month]: action.payload.order,
        },
      };
    case 'UPDATE_TASK_ORDER_MONTH_WEEK':
      return {
        ...state,
        taskOrderByMonthWeek: {
          ...state.taskOrderByMonthWeek,
          [action.payload.key]: action.payload.order,
        },
      };
    case 'UPDATE_WORK_SHIFT_SETTINGS':
      return { ...state, workShiftSettings: action.payload };
    case 'ADD_WEEK_NOTE': {
      const text = action.payload.text.trim();
      if (!text || !isValidWeekString(action.payload.week)) return state;

      const now = new Date().toISOString();
      const note: WeekNote = {
        id: generateId(),
        text,
        createdAt: now,
        updatedAt: now,
      };

      return {
        ...state,
        weekNotes: {
          ...state.weekNotes,
          [action.payload.week]: [...(state.weekNotes[action.payload.week] ?? []), note],
        },
      };
    }
    case 'UPDATE_WEEK_NOTE': {
      const text = action.payload.text.trim();
      const notes = state.weekNotes[action.payload.week];
      if (!text || !notes || !isValidWeekString(action.payload.week)) return state;

      const now = new Date().toISOString();
      return {
        ...state,
        weekNotes: {
          ...state.weekNotes,
          [action.payload.week]: notes.map(note => note.id === action.payload.id
            ? { ...note, text, updatedAt: now }
            : note),
        },
      };
    }
    case 'DELETE_WEEK_NOTE': {
      const notes = state.weekNotes[action.payload.week];
      if (!notes) return state;

      const remainingNotes = notes.filter(note => note.id !== action.payload.id);
      const weekNotes = { ...state.weekNotes };
      if (remainingNotes.length > 0) {
        weekNotes[action.payload.week] = remainingNotes;
      } else {
        delete weekNotes[action.payload.week];
      }

      return { ...state, weekNotes };
    }
    case 'UPDATE_UI_PREFERENCES':
      return {
        ...state,
        uiPreferences: { ...state.uiPreferences, ...action.payload },
      };
    case 'IMPORT_DATA':
      return migrateAppState(action.payload);
    case 'RESET_DATA':
      return { ...INITIAL_STATE };
    default:
      return state;
  }
};
