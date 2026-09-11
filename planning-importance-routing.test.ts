import { describe, expect, it } from 'vitest';
import todaySource from './components/views/Today.tsx?raw';
import weekSource from './components/views/Week.tsx?raw';
import monthSource from './components/views/Month.tsx?raw';
import yearSource from './components/views/Year.tsx?raw';
import weeklyTemplateSource from './weekly-template.ts?raw';
import goalTasksSource from './goal-tasks.ts?raw';

describe('planning importance routing', () => {
  it('marks deliberate weekly-pool entry but not direct day creation', () => {
    expect(todaySource).toContain("applyPlanningImportance(task.planningImportance, 'week')");
    expect(weekSource).toContain("planningImportance: { source: 'week', dismissed: false }");
    expect(weekSource).toContain('planningImportance: null');
  });

  it('distinguishes direct period assignment from its parent pool', () => {
    expect(monthSource).toContain("planningImportance: { source: targetWeek ? 'week' : 'month', dismissed: false }");
    expect(monthSource).toContain("applyPlanningImportance(task.planningImportance, 'month')");
    expect(monthSource).toContain('targetWeek && sourceIsMonthPool');
    expect(yearSource).toContain("planningImportance: { source: targetMonth ? 'month' : 'year', dismissed: false }");
    expect(yearSource).toContain("applyPlanningImportance(task.planningImportance, 'year')");
    expect(yearSource).toContain('targetMonth && sourceIsYearPool');
  });

  it('keeps templates neutral and gives goal tasks their selected planning horizon', () => {
    expect(weeklyTemplateSource).toContain('planningImportance: null');
    expect(goalTasksSource).toContain("planningImportance: horizon === 'today'");
    expect(goalTasksSource).toContain("{ source: horizon, dismissed: false }");
  });
});
