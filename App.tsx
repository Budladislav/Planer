import React, { Suspense, lazy } from 'react';
import { AppProvider, useAppStore } from './store';
import { Layout } from './components/Layout';
import { TodayView } from './components/views/Today';
import { InboxView } from './components/views/Inbox';
import { WeekView } from './components/views/Week';
import { MonthView } from './components/views/Month';
import { EventsView } from './components/views/Events';
import { ViewState } from './types';
import { RewardsLabHost } from './features/rewards-lab/ui/RewardsLabHost';
import { RewardsLabGateProvider } from './features/rewards-lab/ui/RewardsLabGateProvider';
import { useI18n } from './i18n';

const DoneView = lazy(() => import('./components/views/Done').then(module => ({ default: module.DoneView })));
const SettingsView = lazy(() => import('./components/views/Settings').then(module => ({ default: module.SettingsView })));
const ReportsView = lazy(() => import('./components/views/Reports').then(module => ({ default: module.ReportsView })));
const GoalsView = lazy(() => import('./components/views/Goals').then(module => ({ default: module.GoalsView })));

const ViewLoading: React.FC = () => {
  const { t } = useI18n();
  return (
    <div className="flex min-h-48 items-center justify-center" role="status" aria-live="polite">
      <span className="text-sm font-medium text-slate-400">{t('Loading…')}</span>
    </div>
  );
};

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
      case 'month': return <MonthView />;
      case 'events': return <EventsView />;
      case 'done': return <DoneView />;
      case 'reports': return <ReportsView />;
      case 'goals': return <GoalsView />;
      case 'settings': return <SettingsView />;
      default: return <TodayView />;
    }
  };

  return (
    <Layout currentView={currentView} onNavigate={handleNavigate}>
      <Suspense fallback={<ViewLoading />}>
        {renderView()}
      </Suspense>
    </Layout>
  );
};

const App: React.FC = () => {
  return (
    <AppProvider>
      <RewardsLabGateProvider>
        <Main />
        <RewardsLabHost />
      </RewardsLabGateProvider>
    </AppProvider>
  );
};

export default App;
