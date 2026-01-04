import React, { createContext, useContext, useEffect, useReducer, useState } from 'react';
import { AppState, Capture, Task, CalendarEvent, INITIAL_STATE, ViewState } from './types';
import { generateId, getTodayString } from './utils';

// Migration function to normalize imported data
const migrateAppState = (parsed: any): AppState => {
  const allowedViews: ViewState[] = ['today', 'week', 'inbox', 'events', 'settings', 'done'];
  const migratedView =
    parsed.lastActiveView === 'focus' ? 'today' :
    allowedViews.includes(parsed.lastActiveView) ? parsed.lastActiveView : 'today';

  // Migrate tasks: remove deprecated 'difficulty' field, ensure all required fields exist
  const migratedTasks = Array.isArray(parsed.tasks)
    ? parsed.tasks
        .map((t: any) => {
          if (!t || typeof t !== 'object') return null;
          const { difficulty, ...rest } = t;
          // Ensure required fields exist with defaults
          return {
            id: rest.id || generateId(),
            title: rest.title || '',
            status: rest.status === 'done' ? 'done' : 'todo',
            plan: {
              day: rest.plan?.day ?? null,
              week: rest.plan?.week ?? null,
            },
            frog: rest.frog === true,
            projectId: rest.projectId ?? null,
            createdAt: rest.createdAt || new Date().toISOString(),
            updatedAt: rest.updatedAt || new Date().toISOString(),
            timeSpent: rest.timeSpent,
          };
        })
        .filter((t: Task | null): t is Task => t !== null)
    : [];

  // Migrate captures: ensure all required fields exist
  const migratedCaptures = Array.isArray(parsed.captures)
    ? parsed.captures
        .map((c: any) => {
          if (!c || typeof c !== 'object') return null;
          return {
            id: c.id || generateId(),
            text: c.text || '',
            createdAt: c.createdAt || new Date().toISOString(),
            status: c.status === 'processed' || c.status === 'archived' ? c.status : 'new',
          };
        })
        .filter((c: Capture | null): c is Capture => c !== null)
    : [];

  // Migrate events: ensure all required fields exist
  const migratedEvents = Array.isArray(parsed.events)
    ? parsed.events
        .map((e: any) => {
          if (!e || typeof e !== 'object') return null;
          return {
            id: e.id || generateId(),
            title: e.title || '',
            date: e.date || getTodayString(),
            time: e.time || '00:00',
            note: e.note ?? null,
          };
        })
        .filter((e: CalendarEvent | null): e is CalendarEvent => e !== null)
    : [];

  return {
    captures: migratedCaptures,
    tasks: migratedTasks,
    events: migratedEvents,
    activeTaskId: parsed.activeTaskId ?? null,
    activeTaskStartedAt: parsed.activeTaskStartedAt ?? null,
    lastActiveView: migratedView,
  };
};

// Actions
type Action =
  | { type: 'INIT_STATE'; payload: AppState }
  | { type: 'SET_VIEW'; payload: ViewState }
  | { type: 'ADD_CAPTURE'; payload: string }
  | { type: 'PROCESS_CAPTURE'; payload: { id: string; status: 'processed' | 'archived' } }
  | { type: 'ADD_TASK'; payload: Task }
  | { type: 'UPDATE_TASK'; payload: Partial<Task> & { id: string } }
  | { type: 'DELETE_TASK'; payload: string }
  | { type: 'ADD_EVENT'; payload: CalendarEvent }
  | { type: 'UPDATE_EVENT'; payload: Partial<CalendarEvent> & { id: string } }
  | { type: 'DELETE_EVENT'; payload: string }
  | { type: 'SET_ACTIVE_TASK'; payload: { id: string | null; startedAt?: number | null } }
  | { type: 'IMPORT_DATA'; payload: any }
  | { type: 'RESET_DATA' };

// Reducer
const appReducer = (state: AppState, action: Action): AppState => {
  switch (action.type) {
    case 'INIT_STATE':
      return action.payload;
    case 'SET_VIEW':
      return { ...state, lastActiveView: action.payload };
    case 'ADD_CAPTURE':
      return {
        ...state,
        captures: [
          { id: generateId(), text: action.payload, createdAt: new Date().toISOString(), status: 'new' },
          ...state.captures,
        ],
      };
    case 'PROCESS_CAPTURE':
      return {
        ...state,
        captures: state.captures.map((c) =>
          c.id === action.payload.id ? { ...c, status: action.payload.status } : c
        ),
      };
    case 'ADD_TASK':
      return {
        ...state,
        tasks: [...state.tasks, action.payload],
      };
    case 'UPDATE_TASK':
      return {
        ...state,
        tasks: state.tasks.map((t) => (t.id === action.payload.id ? { ...t, ...action.payload, updatedAt: new Date().toISOString() } : t)),
      };
    case 'DELETE_TASK':
      return {
        ...state,
        tasks: state.tasks.filter((t) => t.id !== action.payload),
        activeTaskId: state.activeTaskId === action.payload ? null : state.activeTaskId,
      };
    case 'ADD_EVENT':
      return {
        ...state,
        events: [...state.events, action.payload],
      };
    case 'UPDATE_EVENT':
      return {
        ...state,
        events: state.events.map((e) => (e.id === action.payload.id ? { ...e, ...action.payload } : e)),
      };
    case 'DELETE_EVENT':
      return {
        ...state,
        events: state.events.filter((e) => e.id !== action.payload),
      };
    case 'SET_ACTIVE_TASK':
      return {
        ...state,
        activeTaskId: action.payload.id,
        activeTaskStartedAt: action.payload.id ? (action.payload.startedAt ?? Date.now()) : null,
      };
    case 'IMPORT_DATA':
        // Apply migration to imported data
        return migrateAppState(action.payload);
    case 'RESET_DATA':
        return INITIAL_STATE;
    default:
      return state;
  }
};

// Context
const AppContext = createContext<{ state: AppState; dispatch: React.Dispatch<Action> } | null>(null);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(appReducer, INITIAL_STATE);
  const [hydrated, setHydrated] = useState(false);

  // Load from local storage on mount
  useEffect(() => {
    const saved = localStorage.getItem('monofocus_v1');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        // Validate that parsed data is an object before migration
        if (parsed && typeof parsed === 'object') {
          const migrated = migrateAppState(parsed);
          dispatch({ type: 'INIT_STATE', payload: migrated });
        } else {
          console.warn("Invalid data format in localStorage, starting with empty state");
        }
      } catch (e) {
        console.error("Failed to load state from localStorage:", e);
        // Don't wipe localStorage on error - user might want to recover manually
        // Just start with empty state
      }
    }
    setHydrated(true);
  }, []);

  // Save to local storage on change
  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem('monofocus_v1', JSON.stringify(state));
    } catch (e) {
      console.error('Failed to save state', e);
    }
  }, [state, hydrated]);

  return <AppContext.Provider value={{ state, dispatch }}>{children}</AppContext.Provider>;
};

export const useAppStore = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error('useAppStore must be used within AppProvider');
  return context;
};