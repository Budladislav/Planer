export type ViewState = 'today' | 'month' | 'week' | 'inbox' | 'events' | 'settings' | 'done';

export type WorkShift = 1 | 2;

export interface WorkShiftSettings {
  baseWeek: string | null;
  baseShift: WorkShift | null;
  overrides: Record<string, WorkShift>;
}

export interface Capture {
  id: string;
  text: string;
  createdAt: string; // ISO string
  status: 'new' | 'processed' | 'archived';
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
}

export const INITIAL_STATE: AppState = {
  schemaVersion: 2,
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
  workShiftSettings: { baseWeek: null, baseShift: null, overrides: {} },
};
