export type ViewState = 'today' | 'week' | 'inbox' | 'events' | 'settings' | 'done' | 'statistics';

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
  };
  frog: boolean;
  projectId: string | null;
  eventId: string | null; // Link to CalendarEvent if task was created from event
  createdAt: string;
  updatedAt: string;
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
  captures: Capture[];
  tasks: Task[];
  events: CalendarEvent[];
  activeTaskId: string | null;
  activeTaskStartedAt: number | null; // timestamp ms when active task started
  lastActiveView: ViewState;
  taskOrderByDay: Record<string, string[]>; // Maps day (YYYY-MM-DD) to ordered task IDs
  taskOrderByWeekBucket: Record<string, string[]>; // Maps week (YYYY-WW) to ordered task IDs in bucket
}

export const INITIAL_STATE: AppState = {
  captures: [],
  tasks: [],
  events: [],
  activeTaskId: null,
  activeTaskStartedAt: null,
  lastActiveView: 'today',
  taskOrderByDay: {},
  taskOrderByWeekBucket: {},
};