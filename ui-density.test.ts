import { describe, expect, it } from 'vitest';
import layoutSource from './components/Layout.tsx?raw';
import primitivesSource from './components/ui/Primitives.tsx?raw';
import todaySource from './components/views/Today.tsx?raw';
import weekSource from './components/views/Week.tsx?raw';
import monthSource from './components/views/Month.tsx?raw';
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
    expect(mobileNavigation.indexOf("view: 'settings'")).toBeLessThan(mobileNavigation.indexOf('...primaryNavItems'));
    expect(layoutSource).not.toContain('fixed right-3 top-3');
    expect(layoutSource).toContain('fixed bottom-0 left-0 right-0');
  });

  it('uses the full planning context width after Settings moves into navigation', () => {
    [todaySource, weekSource, monthSource].forEach(source => {
      expect(source).toContain('min-h-10');
      expect(source).not.toContain('pr-12');
      expect(source).toContain('<RewardsBalancePill />');
    });
  });

  it('keeps calendar navigation compact and exposes month notes', () => {
    expect(calendarSource).toContain('justify-center gap-1');
    expect(calendarSource).toContain('<MonthMetaBadges');
    expect(calendarSource).toContain('<MonthNotesEditor');
  });

  it('renders grade color beneath task content', () => {
    expect(gradeControlsSource).toContain('reward-grade-surface');
  });
});
