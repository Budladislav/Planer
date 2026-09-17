import React from 'react';
import { ViewState } from '../types';
import {
  Target, Calendar, CalendarDays, CalendarRange, ChevronLeft, ChevronRight, CopyPlus, Flag, Gift, Heart, List, Settings, type LucideIcon,
} from 'lucide-react';
import { useI18n } from '../i18n';
import { TaktMark } from './ui/TaktMark';
import { useAppStore } from '../store';
import {
  getMobileNavigationCapacity,
  resetHorizontalNavigationScroll,
  shouldCenterMobileNavigation,
} from '../navigation';
import type { PrimaryNavigationView } from '../types';

interface LayoutProps {
  children: React.ReactNode;
  currentView: ViewState;
  onNavigate: (view: ViewState) => void;
}

interface NavigationItem {
  view: PrimaryNavigationView | 'settings';
  icon: LucideIcon;
  label: string;
}

export const Layout: React.FC<LayoutProps> = ({ children, currentView, onNavigate }) => {
  const { state } = useAppStore();
  const { language, t } = useI18n();
  const navRef = React.useRef<HTMLElement>(null);
  const scrollRef = React.useRef<HTMLDivElement>(null);
  const [navWidth, setNavWidth] = React.useState(360);
  const [scrollEdges, setScrollEdges] = React.useState({ left: false, right: false });

  React.useEffect(() => {
    document.documentElement.lang = language;
    document.title = language === 'ru' ? 'Планировщик Takt' : 'Takt Planner';
  }, [language]);

  const navigationDefinitions: Record<PrimaryNavigationView, Omit<NavigationItem, 'view'>> = {
    today: { icon: Target, label: t('Today') },
    week: { icon: List, label: t('Week') },
    month: { icon: CalendarRange, label: t('Month') },
    year: { icon: CalendarDays, label: t('Year') },
    inbox: { icon: Heart, label: t('I wish') },
    'weekly-template': { icon: CopyPlus, label: t('Plans') },
    goals: { icon: Flag, label: t('Long-term goals') },
    events: { icon: Calendar, label: t('Calendar') },
    rewards: { icon: Gift, label: t('Rewards') },
  };
  const primaryNavItems: NavigationItem[] = state.uiPreferences.navigationItems.map(view => ({
    view,
    ...navigationDefinitions[view],
  }));
  const navigationConfigurationKey = state.uiPreferences.navigationItems.join('|');
  const selectedViews = new Set(state.uiPreferences.navigationItems);
  const settingsChildViews: ViewState[] = [
    'inbox', 'month', 'year', 'weekly-template', 'done', 'reports', 'goals', 'events', 'week', 'today', 'rewards',
  ];
  const settingsViews: ViewState[] = [
    'settings', 'done', 'reports',
    ...settingsChildViews.filter(view => !selectedViews.has(view as PrimaryNavigationView)),
  ];
  const isSettingsChildView = settingsChildViews.includes(currentView) || currentView === 'day';
  const hasPrimaryNavigationItem = currentView === 'day'
    ? selectedViews.has('today')
    : selectedViews.has(currentView as PrimaryNavigationView);
  const isNavigationActive = (view: ViewState) => view === 'settings'
    ? settingsViews.includes(currentView) || (currentView === 'day' && !selectedViews.has('today'))
    : view === 'today' ? currentView === 'today' || currentView === 'day' : currentView === view;

  const updateScrollEdges = React.useCallback(() => {
    const element = scrollRef.current;
    if (!element) return;
    setScrollEdges({
      left: element.scrollLeft > 2,
      right: element.scrollLeft + element.clientWidth < element.scrollWidth - 2,
    });
  }, []);

  React.useEffect(() => {
    const element = navRef.current;
    if (!element) return;
    const updateWidth = () => setNavWidth(element.clientWidth || window.innerWidth);
    updateWidth();
    const observer = new ResizeObserver(updateWidth);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  React.useEffect(() => {
    const frame = window.requestAnimationFrame(updateScrollEdges);
    return () => window.cancelAnimationFrame(frame);
  }, [navWidth, primaryNavItems.length, updateScrollEdges]);

  React.useLayoutEffect(() => {
    const element = scrollRef.current;
    if (!element) return;

    // Android Chrome may restore a nested scroller's old position when an installed
    // PWA starts. Reset only on startup or when the configured menu itself changes.
    resetHorizontalNavigationScroll(element);
    updateScrollEdges();
    const frame = window.requestAnimationFrame(() => {
      resetHorizontalNavigationScroll(element);
      updateScrollEdges();
    });
    return () => window.cancelAnimationFrame(frame);
  }, [navigationConfigurationKey, updateScrollEdges]);

  const capacity = getMobileNavigationCapacity(navWidth);
  const centerMobileNavigation = shouldCenterMobileNavigation(state.uiPreferences.navigationItems, navWidth);
  const itemWidth = Math.max(68, Math.floor((navWidth - 8 - (capacity - 1) * 2) / capacity));

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
        style={{ width: itemWidth }}
        className={`relative flex h-[58px] flex-none flex-col items-center justify-center gap-0.5 rounded-xl text-[10px] font-semibold transition-colors ${
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
          {isSettingsChildView && !hasPrimaryNavigationItem && (
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

        <nav ref={navRef} className={`mobile-nav-shell fixed bottom-0 left-0 right-0 z-30 isolate flex items-center gap-0.5 rounded-t-2xl border border-b-0 border-line bg-white px-1 pt-1 shadow-float lg:hidden ${centerMobileNavigation ? 'justify-center' : ''}`} aria-label={t('Main navigation')}>
          <div className="relative z-20 flex-none overflow-hidden bg-white">
            <MobileNavItem view="settings" icon={Settings} label={t('Settings')} />
          </div>
          <div className={`relative z-0 overflow-hidden ${centerMobileNavigation ? 'flex-none' : 'min-w-0 flex-1'}`}>
            <div
              ref={scrollRef}
              onScroll={updateScrollEdges}
              className={`mobile-nav-scroll flex snap-x snap-mandatory items-center gap-0.5 overflow-x-auto overscroll-x-contain ${centerMobileNavigation ? 'w-max' : 'w-full'}`}
            >
              {primaryNavItems.map(item => (
                <span key={item.view} className="flex-none snap-start"><MobileNavItem {...item} /></span>
              ))}
            </div>
            {scrollEdges.left && <span className="pointer-events-none absolute inset-y-0 left-0 w-5 bg-gradient-to-r from-white to-transparent" aria-hidden="true" />}
            {scrollEdges.right && (
              <span className="pointer-events-none absolute inset-y-0 right-0 flex w-7 items-center justify-end bg-gradient-to-l from-white via-white/90 to-transparent pr-0.5 text-slate-400" aria-hidden="true">
                <ChevronRight className="h-3.5 w-3.5" />
              </span>
            )}
          </div>
        </nav>
      </div>
    </div>
  );
};
