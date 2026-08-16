import React, { createContext, useContext, useEffect, useReducer, useState } from 'react';
import { AppState, INITIAL_STATE } from './types';
import { Action, appReducer, migrateAppState } from './state';

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
