import { describe, expect, it } from 'vitest';
import {
  applyPlanningImportance,
  dismissPlanningImportance,
  getActivePlanningImportance,
  restorePlanningImportance,
} from './planning-importance';

describe('planning importance', () => {
  it('keeps the strongest active planning horizon', () => {
    const week = applyPlanningImportance(null, 'week');
    const month = applyPlanningImportance(week, 'month');

    expect(applyPlanningImportance(month, 'week')).toEqual(month);
    expect(applyPlanningImportance(month, 'year')).toEqual({ source: 'year', dismissed: false });
  });

  it('can be dismissed, restored, and deliberately established again', () => {
    const dismissed = dismissPlanningImportance({ source: 'month', dismissed: false });
    expect(getActivePlanningImportance({ planningImportance: dismissed })).toBeNull();
    expect(restorePlanningImportance(dismissed)).toEqual({ source: 'month', dismissed: false });
    expect(applyPlanningImportance(dismissed, 'week')).toEqual({ source: 'week', dismissed: false });
  });
});
