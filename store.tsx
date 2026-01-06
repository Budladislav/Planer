import React, { createContext, useContext, useEffect, useReducer, useState } from 'react';
import { AppState, Capture, Task, CalendarEvent, INITIAL_STATE, ViewState } from './types';
import { generateId, getTodayString, formatEventTitle, getWeekString } from './utils';

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
          const task: Task = {
            id: rest.id || generateId(),
            title: rest.title || '',
            status: rest.status === 'done' ? 'done' : 'todo',
            plan: {
              day: rest.plan?.day ?? null,
              week: rest.plan?.week ?? null,
            },
            frog: rest.frog === true,
            projectId: rest.projectId ?? null, // Can be 'event' string or null
            eventId: rest.eventId ?? null, // Link to event
            createdAt: rest.createdAt || new Date().toISOString(),
            updatedAt: rest.updatedAt || new Date().toISOString(),
            timeSpent: rest.timeSpent, // Optional field
          };

          // Normalize carry-over tasks: move unfinished tasks from past days to today
          const todayStr = getTodayString();
          if (task.status === 'todo' && task.plan.day && task.plan.day < todayStr) {
            task.plan.day = todayStr;
            // Keep week consistent with the new date (important for linked events)
            task.plan.week = getWeekString(todayStr);
          }

          return task;
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
    taskOrderByDay: parsed.taskOrderByDay ?? {},
  };
};

// Actions
type Action =
  | { type: 'INIT_STATE'; payload: AppState }
  | { type: 'SET_VIEW'; payload: ViewState }
  | { type: 'ADD_CAPTURE'; payload: string }
  | { type: 'PROCESS_CAPTURE'; payload: { id: string; status: 'processed' | 'archived' } }
  | { type: 'DELETE_CAPTURE'; payload: string }
  | { type: 'ADD_TASK'; payload: Task }
  | { type: 'UPDATE_TASK'; payload: Partial<Task> & { id: string } }
  | { type: 'DELETE_TASK'; payload: string }
  | { type: 'ADD_EVENT'; payload: CalendarEvent }
  | { type: 'UPDATE_EVENT'; payload: Partial<CalendarEvent> & { id: string } }
  | { type: 'DELETE_EVENT'; payload: string }
  | { type: 'SET_ACTIVE_TASK'; payload: { id: string | null; startedAt?: number | null } }
  | { type: 'UPDATE_TASK_ORDER'; payload: { day: string; order: string[] } }
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
    case 'DELETE_CAPTURE':
      return {
        ...state,
        captures: state.captures.filter((c) => c.id !== action.payload),
      };
    case 'ADD_TASK':
      return {
        ...state,
        tasks: [...state.tasks, action.payload],
      };
    case 'UPDATE_TASK':
      const updatedTask = state.tasks.find(t => t.id === action.payload.id);
      const newState = {
        ...state,
        tasks: state.tasks.map((t) => (t.id === action.payload.id ? { ...t, ...action.payload, updatedAt: new Date().toISOString() } : t)),
      };
      
      // If task has eventId and was updated (but not status change), update the event
      if (updatedTask?.eventId && action.payload.id) {
        const event = state.events.find(e => e.id === updatedTask.eventId);
        if (event) {
          // Don't update event if only status changed (done/undone)
          const payloadKeys = Object.keys(action.payload).filter(k => k !== 'id');
          const statusOnlyChange = payloadKeys.length === 1 && action.payload.status !== undefined;
          
          if (!statusOnlyChange) {
            // Extract plain title and time from task title (format: "HH:MM title")
            const finalTask = newState.tasks.find(t => t.id === action.payload.id);
            const taskTitle = finalTask?.title || updatedTask.title;
            const titleMatch = taskTitle.match(/^(\d{2}:\d{2})\s+(.+)$/);
            
            if (titleMatch) {
              const [, time, plainTitle] = titleMatch;
              // Update event with new title, date, and time from task
              newState.events = newState.events.map(e => {
                if (e.id === updatedTask.eventId) {
                  return {
                    ...e,
                    title: plainTitle,
                    date: finalTask?.plan.day ?? e.date,
                    time: time,
                  };
                }
                return e;
              });
            } else {
              // Task title doesn't match format, update only date
              const finalTask = newState.tasks.find(t => t.id === action.payload.id);
              newState.events = newState.events.map(e => {
                if (e.id === updatedTask.eventId) {
                  return {
                    ...e,
                    date: finalTask?.plan.day ?? e.date,
                  };
                }
                return e;
              });
            }
          }
        }
      }
      
      return newState;
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
      const updateEventState = {
        ...state,
        events: state.events.map((e) => (e.id === action.payload.id ? { ...e, ...action.payload } : e)),
      };
      
      // Find and update linked task
      const linkedTask = state.tasks.find(t => t.eventId === action.payload.id);
      if (linkedTask && action.payload.id) {
        const updatedEvent = updateEventState.events.find(e => e.id === action.payload.id);
        if (updatedEvent) {
          const newTaskTitle = formatEventTitle(updatedEvent.time, updatedEvent.title);
          updateEventState.tasks = updateEventState.tasks.map(t => {
            if (t.id === linkedTask.id) {
              return {
                ...t,
                title: newTaskTitle,
                plan: { 
                  day: updatedEvent.date, 
                  week: getWeekString(updatedEvent.date) 
                },
                updatedAt: new Date().toISOString(),
              };
            }
            return t;
          });
        }
      }
      
      return updateEventState;
    case 'DELETE_EVENT':
      // Delete associated task if exists
      const eventToDelete = state.events.find(e => e.id === action.payload);
      const deleteEventState = {
        ...state,
        events: state.events.filter((e) => e.id !== action.payload),
      };
      
      // Find and delete task linked to this event
      if (eventToDelete) {
        const linkedTask = state.tasks.find(t => t.eventId === action.payload);
        if (linkedTask) {
          deleteEventState.tasks = deleteEventState.tasks.filter(t => t.id !== linkedTask.id);
          if (deleteEventState.activeTaskId === linkedTask.id) {
            deleteEventState.activeTaskId = null;
          }
        }
      }
      
      return deleteEventState;
    case 'SET_ACTIVE_TASK':
      return {
        ...state,
        activeTaskId: action.payload.id,
        activeTaskStartedAt: action.payload.id ? (action.payload.startedAt ?? Date.now()) : null,
      };
    case 'UPDATE_TASK_ORDER':
      return {
        ...state,
        taskOrderByDay: {
          ...state.taskOrderByDay,
          [action.payload.day]: action.payload.order,
        },
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