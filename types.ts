export type ViewState = 'today' | 'month' | 'week' | 'inbox' | 'events' | 'settings' | 'done' | 'reports' | 'goals';

export type AppLanguage = 'ru' | 'en';
export type ShiftTransitionHighlight = 'off' | 'weekend' | 'extended';

export type WorkShift = 1 | 2;

export interface WorkShiftSettings {
  baseWeek: string | null;
  baseShift: WorkShift | null;
  overrides: Record<string, WorkShift>;
  transitionHighlight: ShiftTransitionHighlight;
}

export interface WeekNote {
  id: string;
  text: string;
  createdAt: string;
  updatedAt: string;
}

export interface DayNote {
  id: string;
  text: string;
  createdAt: string;
  updatedAt: string;
}

export interface GoalNote {
  id: string;
  text: string;
  createdAt: string;
  updatedAt: string;
}

export interface LongTermGoal {
  id: string;
  title: string;
  status: 'active' | 'completed' | 'archived';
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
  currentState: string;
  nextStep: string;
  notes: GoalNote[];
}

export interface UiPreferences {
  todayCompletedExpanded: boolean;
  eventsDistantExpanded: boolean;
  eventsPastExpanded: boolean;
  language: AppLanguage;
  calendarNoteHighlight: boolean;
}

export interface Capture {
  id: string;
  text: string;
  createdAt: string; // ISO string
  status: 'new' | 'processed' | 'archived' | 'completed';
  completedAt: string | null;
}

export interface Task {
  id: string;
  title: string;
  status: 'todo' | 'done';
  plan: {
    day: string | null; // YYYY-MM-DD
    week: string | null; // YYYY-WW
    month: string | null; // YYYY-MM planning month
  };
  projectId: string | null;
  eventId: string | null; // Link to CalendarEvent if task was created from event
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
  timeSpent?: number; // Time spent in seconds
}

export interface CalendarEvent {
  id: string;
  title: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:MM
  note: string | null;
}

export interface AppState {
  schemaVersion: number;
  captures: Capture[];
  tasks: Task[];
  events: CalendarEvent[];
  activeTaskId: string | null;
  activeTaskStartedAt: number | null; // timestamp ms when active task started
  lastActiveView: ViewState;
  taskOrderByDay: Record<string, string[]>; // Maps day (YYYY-MM-DD) to ordered task IDs
  taskOrderByWeekBucket: Record<string, string[]>; // Maps week (YYYY-WW) to ordered task IDs in bucket
  taskOrderByMonthBucket: Record<string, string[]>; // Maps month (YYYY-MM) to unordered-week task IDs
  taskOrderByMonthWeek: Record<string, string[]>; // Maps month|week to task order in Month Plan
  workShiftSettings: WorkShiftSettings;
  weekNotes: Record<string, WeekNote[]>; // Maps ISO week (YYYY-Www) to user-authored notes
  dayNotes: Record<string, DayNote[]>; // Maps date (YYYY-MM-DD) to user-authored notes
  goals: LongTermGoal[];
  uiPreferences: UiPreferences;
}

const getDeviceLanguage = (): AppLanguage => {
  if (typeof navigator !== 'undefined' && navigator.language.toLowerCase().startsWith('ru')) return 'ru';
  return 'en';
};

export const INITIAL_STATE: AppState = {
  schemaVersion: 6,
  captures: [],
  tasks: [],
  events: [],
  activeTaskId: null,
  activeTaskStartedAt: null,
  lastActiveView: 'today',
  taskOrderByDay: {},
  taskOrderByWeekBucket: {},
  taskOrderByMonthBucket: {},
  taskOrderByMonthWeek: {},
  workShiftSettings: { baseWeek: null, baseShift: null, overrides: {}, transitionHighlight: 'extended' },
  weekNotes: {},
  dayNotes: {},
  goals: [],
  uiPreferences: {
    todayCompletedExpanded: false,
    eventsDistantExpanded: false,
    eventsPastExpanded: false,
    language: getDeviceLanguage(),
    calendarNoteHighlight: true,
  },
};
