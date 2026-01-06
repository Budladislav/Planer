import React from 'react';
import { AppProvider, useAppStore } from './store';
import { Layout } from './components/Layout';
import { TodayView } from './components/views/Today';
import { InboxView } from './components/views/Inbox';
import { WeekView } from './components/views/Week';
import { EventsView } from './components/views/Events';
import { DoneView } from './components/views/Done';
import { SettingsView } from './components/views/Settings';
import { ViewState } from './types';

const Main: React.FC = () => {
  const { state, dispatch } = useAppStore();
  const currentView = state.lastActiveView;

  const handleNavigate = (view: ViewState) => {
    dispatch({ type: 'SET_VIEW', payload: view });
  };

  const renderView = () => {
    switch (currentView) {
      case 'today': return <TodayView />;
      case 'inbox': return <InboxView />;
      case 'week': return <WeekView />;
      case 'events': return <EventsView />;
      case 'done': return <DoneView />;
      case 'settings': return <SettingsView />;
      default: return <TodayView />;
    }
  };

  return (
    <Layout currentView={currentView} onNavigate={handleNavigate}>
      {renderView()}
    </Layout>
  );
};

const App: React.FC = () => {
  return (
    <AppProvider>
      <Main />
    </AppProvider>
  );
};

export default App;