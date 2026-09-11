import { describe, expect, it } from 'vitest';
import { getEffectiveTaskGrade, getTaskAutomaticGradeRule } from './task-grade';

describe('automatic reward grade rules', () => {
  it('maps deliberate planning horizons to stable floors', () => {
    expect(getTaskAutomaticGradeRule({ goalId: null, eventId: null, planningImportance: { source: 'week', dismissed: false } }))
      .toEqual({ minimumGrade: 'uncommon', reasons: ['week'] });
    expect(getTaskAutomaticGradeRule({ goalId: null, eventId: null, planningImportance: { source: 'month', dismissed: false } }).minimumGrade)
      .toBe('rare');
    expect(getTaskAutomaticGradeRule({ goalId: null, eventId: null, planningImportance: { source: 'year', dismissed: false } }).minimumGrade)
      .toBe('rare');
  });

  it('combines structural reasons and ignores dismissed planning importance', () => {
    expect(getTaskAutomaticGradeRule({
      goalId: 'goal-1', eventId: 'event-1', planningImportance: { source: 'month', dismissed: true },
    })).toEqual({ minimumGrade: 'uncommon', reasons: ['goal', 'event'] });
  });

  it('keeps manual grades separate from the automatic floor', () => {
    expect(getEffectiveTaskGrade('common', 'rare')).toBe('rare');
    expect(getEffectiveTaskGrade('legendary', 'rare')).toBe('legendary');
  });
});
