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

  it('places Calendar before Month in the primary navigation', () => {
    const calendar = layoutSource.indexOf("{ view: 'events'");
    const month = layoutSource.indexOf("{ view: 'month'");
    expect(calendar).toBeGreaterThan(-1);
    expect(calendar).toBeLessThan(month);
  });

  it('keeps the mobile settings corner clear in planning context rows', () => {
    [todaySource, weekSource, monthSource].forEach(source => {
      expect(source).toContain('min-h-10');
      expect(source).toContain('pr-12');
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
