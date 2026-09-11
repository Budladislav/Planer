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
import inboxSource from './components/views/Inbox.tsx?raw';
import goalsSource from './components/views/Goals.tsx?raw';
import optionalStartDateSource from './components/ui/OptionalStartDate.tsx?raw';
import taskGoalLinkSource from './components/tasks/TaskGoalLinkControl.tsx?raw';
import periodTaskCardSource from './components/planning/PeriodTaskCard.tsx?raw';
import weekTaskItemsSource from './components/week/WeekTaskItems.tsx?raw';
import doneSource from './components/views/Done.tsx?raw';
import interfaceSettingsSource from './components/settings/InterfaceSettings.tsx?raw';
import storeSource from './store.tsx?raw';

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

  it('uses a configurable priority menu with fixed Settings and horizontal overflow on mobile', () => {
    expect(layoutSource).toContain('state.uiPreferences.navigationItems.map');
    expect(layoutSource).toContain('<MobileNavItem view="settings"');
    expect(layoutSource).toContain('primaryNavItems.map');
    expect(layoutSource).toContain('overflow-x-auto');
    expect(layoutSource).toContain('getMobileNavigationCapacity(navWidth)');
    expect(layoutSource).not.toContain('fixed right-3 top-3');
    expect(layoutSource).toContain('fixed bottom-0 left-0 right-0');
    expect(layoutSource).toContain('shouldCenterMobileNavigation');
    expect(layoutSource).toContain("centerMobileNavigation ? 'justify-center'");
  });

  it('offers every configurable section as a persisted start page', () => {
    expect(interfaceSettingsSource).toContain('state.uiPreferences.startupView');
    expect(interfaceSettingsSource).toContain('PRIMARY_NAVIGATION_VIEWS.map');
    expect(interfaceSettingsSource.indexOf("t('Start page')")).toBeLessThan(interfaceSettingsSource.indexOf("t('Main menu')"));
    expect(interfaceSettingsSource).toContain('state.uiPreferences.mainMenuExpanded');
    expect(interfaceSettingsSource).toContain('aria-expanded={state.uiPreferences.mainMenuExpanded}');
    expect(storeSource).toContain('prepareAppStateForSession(migrated)');
    expect(storeSource).not.toContain("lastActiveView: 'today'");
  });

  it('keeps the completed-day disclosure header free of a task-completion checkmark', () => {
    const disclosureStart = todaySource.indexOf('onClick={toggleCompletedToday}');
    const disclosureEnd = todaySource.indexOf('</button>', disclosureStart);
    expect(todaySource.slice(disclosureStart, disclosureEnd)).not.toContain('<Check');
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
    expect(weeklyTemplateSource).toContain("type: 'ADD_WEEKLY_TEMPLATE'");
    expect(weeklyTemplateSource).toContain("type: 'SET_ACTIVE_WEEKLY_TEMPLATE'");
    expect(weeklyTemplateSource).toContain("t('Duplicate weekly template')");
  });

  it('does not offer past destinations in Month and Year move menus', () => {
    expect(monthSource).toContain('canMoveToMonthPool');
    expect(monthSource).toContain('canMoveToNextMonth');
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
    expect(gradeControlsSource).toContain('getTaskAutomaticGradeRule(task)');
    expect(gradeControlsSource).toContain('gradeRank(option) >= gradeRank(minimumGrade)');
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
    expect(dataSettingsSource).toContain('createTaktBackup');
    expect(dataSettingsSource).toContain('createRewardsBackupPayload');
    expect(dataSettingsSource).toContain('restoreRewardsBackupPayload');
    expect(settingsSource).not.toContain('JSON.stringify(state');
    expect(settingsSource).not.toContain('RewardsLabSettingsRow');
    expect(settingsSource).not.toContain('WorkShiftSettingsPanel');
  });

  it('shares an explicit optional start-date control between wishes and goals', () => {
    expect(inboxSource).toContain('<OptionalStartDateField');
    expect(inboxSource).toContain('<StartDateModeButton');
    expect(goalsSource).toContain('<OptionalStartDateField');
    expect(goalsSource).toContain('<StartDateModeButton');
    expect(optionalStartDateSource).toContain("t('Start date not specified')");
    expect(optionalStartDateSource).toContain("onClick={() => onChange(null)}");
  });

  it('makes long-term goals a core planning feature linked to every task horizon', () => {
    expect(planningSettingsSource).toContain("title={t('Long-term goals')}");
    expect(planningSettingsSource).not.toContain("t('Experimental')");
    expect(goalsSource).toContain('<GoalTaskSheet');
    expect(goalsSource).toContain('getGoalTaskCounts');
    expect(goalsSource).toContain('goalNavigationTargetId');
    [todaySource, weekTaskItemsSource, periodTaskCardSource, doneSource].forEach(source => {
      expect(source).toContain('<TaskGoalLinkControl');
    });
    expect(taskGoalLinkSource).toContain("type: 'OPEN_GOAL'");
    expect(taskGoalLinkSource).toContain("goalId: event.target.value || null");
  });
});
