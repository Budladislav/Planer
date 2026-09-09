export type ViewState = 'today' | 'month' | 'year' | 'week' | 'weekly-template' | 'inbox' | 'events' | 'settings' | 'done' | 'reports' | 'goals';

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

export interface MonthNote {
  id: string;
  text: string;
  createdAt: string;
  updatedAt: string;
}

export interface YearNote {
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
  startedAt: string | null;
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
  startedAt: string | null; // User-defined start; null when the origin is unknown
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
    year: string | null; // YYYY planning year
  };
  projectId: string | null;
  eventId: string | null; // Link to CalendarEvent if task was created from event
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
}

export type WeeklyTemplateDayIndex = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export interface WeeklyTemplateTask {
  id: string;
  title: string;
  dayIndex: WeeklyTemplateDayIndex | null;
  createdAt: string;
  updatedAt: string;
}

export interface WeeklyTemplate {
  id: string;
  name: string;
  tasks: WeeklyTemplateTask[];
  orderBySlot: Record<string, string[]>;
  applications: Record<string, Record<string, string>>;
  createdAt: string;
  updatedAt: string;
}

export interface WeeklyTemplateState {
  templates: WeeklyTemplate[];
  activeTemplateId: string;
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
  lastActiveView: ViewState;
  taskOrderByDay: Record<string, string[]>; // Maps day (YYYY-MM-DD) to ordered task IDs
  taskOrderByWeekBucket: Record<string, string[]>; // Maps week (YYYY-WW) to ordered task IDs in bucket
  taskOrderByMonthBucket: Record<string, string[]>; // Maps month (YYYY-MM) to unordered-week task IDs
  taskOrderByMonthWeek: Record<string, string[]>; // Maps month|week to task order in Month Plan
  taskOrderByYearBucket: Record<string, string[]>; // Maps year (YYYY) to unordered-month task IDs
  taskOrderByYearMonth: Record<string, string[]>; // Maps year|month to task order in Year Plan
  weeklyTemplate: WeeklyTemplateState;
  workShiftSettings: WorkShiftSettings;
  monthNotes: Record<string, MonthNote[]>; // Maps month (YYYY-MM) to user-authored notes
  yearNotes: Record<string, YearNote[]>; // Maps year (YYYY) to user-authored notes
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
  schemaVersion: 12,
  captures: [],
  tasks: [],
  events: [],
  lastActiveView: 'today',
  taskOrderByDay: {},
  taskOrderByWeekBucket: {},
  taskOrderByMonthBucket: {},
  taskOrderByMonthWeek: {},
  taskOrderByYearBucket: {},
  taskOrderByYearMonth: {},
  weeklyTemplate: {
    templates: [{
      id: 'weekly-template-default',
      name: 'Template 1',
      tasks: [],
      orderBySlot: {},
      applications: {},
      createdAt: '1970-01-01T00:00:00.000Z',
      updatedAt: '1970-01-01T00:00:00.000Z',
    }],
    activeTemplateId: 'weekly-template-default',
  },
  workShiftSettings: { baseWeek: null, baseShift: null, overrides: {}, transitionHighlight: 'extended' },
  monthNotes: {},
  yearNotes: {},
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
