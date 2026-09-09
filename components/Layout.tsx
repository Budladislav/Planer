import React from 'react';
import { ViewState } from '../types';
import {
  Target, Calendar, ChevronLeft, List, Settings, type LucideIcon,
} from 'lucide-react';
import { useI18n } from '../i18n';
import { TaktMark } from './ui/TaktMark';

interface LayoutProps {
  children: React.ReactNode;
  currentView: ViewState;
  onNavigate: (view: ViewState) => void;
}

interface NavigationItem {
  view: ViewState;
  icon: LucideIcon;
  label: string;
}

export const Layout: React.FC<LayoutProps> = ({ children, currentView, onNavigate }) => {
  const { language, t } = useI18n();

  React.useEffect(() => {
    document.documentElement.lang = language;
    document.title = language === 'ru' ? 'Планировщик Takt' : 'Takt Planner';
  }, [language]);

  const primaryNavItems: NavigationItem[] = [
    { view: 'events', icon: Calendar, label: t('Calendar') },
    { view: 'week', icon: List, label: t('Week') },
    { view: 'today', icon: Target, label: t('Today') },
  ];
  const mobileNavItems: NavigationItem[] = [
    { view: 'settings', icon: Settings, label: t('Settings') },
    ...primaryNavItems,
  ];
  const settingsChildViews: ViewState[] = ['inbox', 'month', 'year', 'weekly-template', 'done', 'reports', 'goals'];
  const settingsViews: ViewState[] = ['settings', ...settingsChildViews];
  const isSettingsChildView = settingsChildViews.includes(currentView);
  const isNavigationActive = (view: ViewState) => view === 'settings'
    ? settingsViews.includes(currentView)
    : currentView === view;

  const DesktopNavItem = ({ view, icon: Icon, label }: NavigationItem) => {
    const isActive = isNavigationActive(view);
    return (
      <button
        type="button"
        onClick={() => onNavigate(view)}
        className={`group flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors ${
          isActive
            ? 'bg-brand-50 text-brand-700'
            : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'
        }`}
        aria-current={isActive ? 'page' : undefined}
      >
        <span className={`flex h-8 w-8 items-center justify-center rounded-lg transition-colors ${isActive ? 'bg-white text-brand-600 shadow-sm' : 'text-slate-400 group-hover:text-slate-600'}`}>
          <Icon className="h-[18px] w-[18px]" />
        </span>
        <span className="min-w-0 flex-1 truncate text-left">{label}</span>
        {isActive && <span className="h-1.5 w-1.5 rounded-full bg-brand-500" aria-hidden="true" />}
      </button>
    );
  };

  const MobileNavItem = ({ view, icon: Icon, label }: NavigationItem) => {
    const isActive = isNavigationActive(view);
    return (
      <button
        type="button"
        onClick={() => onNavigate(view)}
        className={`relative flex h-[58px] min-w-0 flex-1 flex-col items-center justify-center gap-0.5 rounded-xl text-[10px] font-semibold transition-colors ${
          isActive ? 'bg-brand-50 text-brand-700' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'
        }`}
        title={label}
        aria-current={isActive ? 'page' : undefined}
      >
        <Icon className={`h-5 w-5 ${isActive ? 'text-brand-600' : 'text-slate-400'}`} />
        <span className="max-w-full truncate px-1">{label}</span>
      </button>
    );
  };

  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-canvas lg:flex-row">
      <aside className="hidden w-60 flex-col border-r border-line bg-white/90 lg:flex">
        <div className="flex h-[72px] items-center border-b border-line px-5">
          <span className="flex items-center gap-2.5 text-xl font-bold tracking-[-0.035em] text-ink">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-950 text-white shadow-quiet">
              <TaktMark className="h-7 w-7" />
            </span>
            Takt
          </span>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto p-3" aria-label={t('Main navigation')}>
          {primaryNavItems.map(item => <DesktopNavItem key={item.view} {...item} />)}
        </nav>

        <div className="border-t border-line p-3">
          <DesktopNavItem view="settings" icon={Settings} label={t('Settings')} />
        </div>
      </aside>

      <div className="flex h-full min-w-0 flex-1 flex-col overflow-hidden">
        <main className={`app-main mx-auto w-full flex-1 overflow-y-auto px-3 pt-3 lg:px-6 lg:pt-5 ${currentView === 'settings' ? 'max-w-6xl' : 'max-w-4xl'}`}>
          {isSettingsChildView && (
            <button
              type="button"
              onClick={() => onNavigate('settings')}
              className="mb-2 inline-flex items-center gap-1 rounded-lg px-1.5 py-1 text-xs font-semibold text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-800 lg:mb-3"
            >
              <ChevronLeft className="h-4 w-4" />
              {t('Back to Settings')}
            </button>
          )}
          {children}
        </main>

        <nav className="mobile-nav-shell fixed bottom-0 left-0 right-0 z-30 rounded-t-2xl border border-b-0 border-line bg-white px-1 pt-1 shadow-float lg:hidden" aria-label={t('Main navigation')}>
          <div className="flex w-full items-center gap-0.5">
            {mobileNavItems.map(item => <MobileNavItem key={item.view} {...item} />)}
          </div>
        </nav>
      </div>
    </div>
  );
};
