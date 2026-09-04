import React from 'react';
import { useAppStore } from '../store';
import { ViewState } from '../types';
import {
  Target, Calendar, CalendarDays, List, Settings, type LucideIcon,
} from 'lucide-react';
import { useI18n } from '../i18n';

interface LayoutProps {
  children: React.ReactNode;
  currentView: ViewState;
  onNavigate: (view: ViewState) => void;
}

export const Layout: React.FC<LayoutProps> = ({ children, currentView, onNavigate }) => {
  const { state } = useAppStore();
  const { language, t } = useI18n();
  const isFocusMode = currentView === 'today' && state.activeTaskId !== null;

  React.useEffect(() => {
    document.documentElement.lang = language;
    document.title = language === 'ru' ? 'Планировщик MonoFocus' : 'MonoFocus Planner';
  }, [language]);

  const navItems: Array<{ view: ViewState; icon: LucideIcon; label: string }> = [
    { view: 'events', icon: Calendar, label: t('Calendar') },
    { view: 'month', icon: CalendarDays, label: t('Month') },
    { view: 'week', icon: List, label: t('Week') },
    { view: 'today', icon: Target, label: t('Today') },
  ];

  const getIconColor = (view: ViewState, isActive: boolean) => {
    if (isActive) {
      switch (view) {
        case 'today': return 'text-indigo-600';
        case 'week': return 'text-indigo-500';
        case 'month': return 'text-violet-600';
        case 'events': return 'text-amber-600';
        case 'settings': return 'text-slate-600';
        default: return 'text-slate-600';
      }
    } else {
      switch (view) {
        case 'today': return 'text-indigo-400';
        case 'week': return 'text-indigo-400';
        case 'month': return 'text-violet-500';
        case 'events': return 'text-amber-500';
        case 'settings': return 'text-slate-400';
        default: return 'text-slate-400';
      }
    }
  };

  const NavItem = ({ view, icon: Icon, label }: { view: ViewState; icon: LucideIcon; label: string }) => {
    const isActive = currentView === view;
    return (
      <button
        onClick={() => onNavigate(view)}
        className={`flex items-center w-full px-4 py-3 text-sm font-medium rounded-lg transition-colors ${
          isActive
            ? 'bg-slate-200 text-slate-900'
            : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900'
        }`}
      >
        <Icon className={`w-5 h-5 mr-3 ${getIconColor(view, isActive)}`} />
        <span className="flex-1 text-left">{label}</span>
      </button>
    );
  };

  const IconNavItem = ({ view, icon: Icon, label }: { view: ViewState; icon: LucideIcon; label: string }) => {
    const isActive = currentView === view;
    return (
      <button
        onClick={() => onNavigate(view)}
        className={`flex h-16 flex-1 flex-col items-center justify-center gap-0.5 transition-colors ${
          isActive
            ? 'text-slate-900 bg-slate-100'
            : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'
        }`}
        title={label}
      >
        <Icon className={`h-6 w-6 ${getIconColor(view, isActive)}`} />
        <span className="text-[10px] font-medium">{label}</span>
      </button>
    );
  };

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-slate-50 lg:flex-row">
      {/* Desktop Sidebar (Left) */}
      {!isFocusMode && (
        <aside className="hidden lg:flex lg:flex-col lg:w-64 lg:bg-white lg:border-r lg:border-slate-200">
          <div className="flex items-center justify-between h-16 px-6 border-b border-slate-100">
            <span className="text-xl font-bold tracking-tight text-slate-800 flex items-center gap-2">
              <div className="w-6 h-6 bg-slate-900 rounded-md flex items-center justify-center">
                <div className="w-2 h-2 bg-white rounded-full" />
              </div>
              MonoFocus
            </span>
          </div>

          <nav className="p-4 space-y-1 flex-1 overflow-y-auto">
            {navItems.map(item => (
              <NavItem key={item.view} view={item.view} icon={item.icon} label={item.label} />
            ))}
          </nav>
          <div className="border-t border-slate-100 p-4">
            <NavItem view="settings" icon={Settings} label={t('Settings')} />
          </div>
        </aside>
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col h-full overflow-hidden w-full">
        <main className="flex-1 overflow-y-auto px-3 pt-3 pb-20 lg:px-6 lg:pt-4 lg:pb-6 max-w-4xl mx-auto w-full">
          {children}
        </main>

        {/* Mobile Bottom Navigation Bar */}
        {!isFocusMode && (
          <>
          <button
            type="button"
            onClick={() => onNavigate('settings')}
            className={`fixed right-3 top-3 z-20 flex h-10 w-10 items-center justify-center rounded-full border bg-white shadow-sm lg:hidden ${
              currentView === 'settings'
                ? 'border-slate-400 text-slate-800'
                : 'border-slate-200 text-slate-500'
            }`}
            title={t('Settings')}
            aria-label={t('Settings')}
          >
            <Settings className="h-5 w-5" />
          </button>
          <nav className="fixed bottom-0 left-0 right-0 z-10 border-t border-slate-200 bg-white lg:hidden">
            <div className="flex items-center w-full">
              {navItems.map(item => (
                <IconNavItem key={item.view} view={item.view} icon={item.icon} label={item.label} />
              ))}
            </div>
          </nav>
          </>
        )}
      </div>
    </div>
  );
};
