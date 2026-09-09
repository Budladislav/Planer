import { describe, expect, it } from 'vitest';
import layoutSource from './components/Layout.tsx?raw';
import primitivesSource from './components/ui/Primitives.tsx?raw';
import todaySource from './components/views/Today.tsx?raw';
import weekSource from './components/views/Week.tsx?raw';
import monthSource from './components/views/Month.tsx?raw';
import yearSource from './components/views/Year.tsx?raw';
import weeklyTemplateSource from './components/views/WeeklyTemplate.tsx?raw';
import appSource from './App.tsx?raw';
import settingsSource from './components/views/Settings.tsx?raw';
import planningSettingsSource from './components/settings/PlanningSettings.tsx?raw';
import dataSettingsSource from './components/settings/DataSettings.tsx?raw';
import calendarSource from './components/events/EventsCalendar.tsx?raw';
import gradeControlsSource from './features/rewards-lab/ui/ActiveRewardGradeControls.tsx?raw';

const viewSources = import.meta.glob('./components/views/*.tsx', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>;

describe('compact planner hierarchy', () => {
  it('does not repeat navigation labels as page headers', () => {
    expect(primitivesSource).not.toContain('PageHeader');
    Object.values(viewSources).forEach(source => {
      expect(source).not.toContain('<PageHeader');
      expect(source).not.toContain('<h1');
    });
  });

  it('keeps only daily routes in primary navigation and places Settings first on mobile', () => {
    const primaryNavigation = layoutSource.slice(
      layoutSource.indexOf('const primaryNavItems'),
      layoutSource.indexOf('const mobileNavItems'),
    );
    const mobileNavigation = layoutSource.slice(
      layoutSource.indexOf('const mobileNavItems'),
      layoutSource.indexOf('const settingsViews'),
    );
    expect(primaryNavigation).toContain("view: 'events'");
    expect(primaryNavigation).toContain("view: 'week'");
    expect(primaryNavigation).toContain("view: 'today'");
    expect(primaryNavigation).not.toContain("view: 'inbox'");
    expect(primaryNavigation).not.toContain("view: 'month'");
    expect(primaryNavigation).not.toContain("view: 'year'");
    expect(mobileNavigation.indexOf("view: 'settings'")).toBeLessThan(mobileNavigation.indexOf('...primaryNavItems'));
    expect(layoutSource).not.toContain('fixed right-3 top-3');
    expect(layoutSource).toContain('fixed bottom-0 left-0 right-0');
  });

  it('uses the full planning context width after Settings moves into navigation', () => {
    [todaySource, weekSource, monthSource, yearSource].forEach(source => {
      expect(source).toContain('min-h-10');
      expect(source).not.toContain('pr-12');
      expect(source).toContain('<RewardsBalancePill />');
    });
  });

  it('keeps Year Plan behind Settings and loads it lazily', () => {
    expect(planningSettingsSource).toContain("navigate('year')");
    expect(appSource).toContain("const YearView = lazy(");
    expect(appSource).toContain("case 'year': return <YearView />");
  });

  it('keeps the weekly template behind Settings and visually separates template mode', () => {
    expect(planningSettingsSource).toContain("navigate('weekly-template')");
    expect(appSource).toContain('const WeeklyTemplateView = lazy(');
    expect(appSource).toContain("case 'weekly-template': return <WeeklyTemplateView />");
    expect(weeklyTemplateSource).toContain("t('Template mode')");
    expect(weeklyTemplateSource).not.toContain("t('Mark as done')");
    expect(weeklyTemplateSource).not.toContain('<WeekTaskMove');
  });

  it('does not offer past destinations in Month and Year move menus', () => {
    expect(monthSource).toContain('canMoveToMonthPool');
    expect(monthSource).toContain('{currentAndFutureWeeks.map(week => (');
    expect(monthSource).not.toContain('{weeks.map(week => (');
    expect(yearSource).toContain('canMoveToYearPool');
    expect(yearSource).toContain('{currentAndFutureMonths.map(month => {');
    expect(yearSource).not.toContain('{months.map(month => {');
  });

  it('keeps calendar navigation compact and exposes month notes', () => {
    expect(calendarSource).toContain('justify-center gap-1');
    expect(calendarSource).toContain('<MonthMetaBadges');
    expect(calendarSource).toContain('<MonthNotesEditor');
  });

  it('renders grade color beneath task content', () => {
    expect(gradeControlsSource).toContain('reward-grade-surface');
  });

  it('splits Settings into seven focused responsive sections', () => {
    ['planning', 'history', 'calendar', 'rewards', 'interface', 'data', 'about'].forEach(section => {
      expect(settingsSource).toContain(`id: '${section}'`);
    });
    expect(settingsSource).toContain('lg:grid-cols-[280px_minmax(0,1fr)]');
    expect(settingsSource).toContain("t('Back to settings sections')");
    expect(layoutSource).toContain('isSettingsChildView');
    expect(layoutSource).toContain("t('Back to Settings')");
  });

  it('keeps data operations in their own settings module', () => {
    expect(dataSettingsSource).toContain("dispatch({ type: 'IMPORT_DATA'");
    expect(dataSettingsSource).toContain("dispatch({ type: 'RESET_DATA' })");
    expect(settingsSource).not.toContain('JSON.stringify(state');
    expect(settingsSource).not.toContain('RewardsLabSettingsRow');
    expect(settingsSource).not.toContain('WorkShiftSettingsPanel');
  });
});
