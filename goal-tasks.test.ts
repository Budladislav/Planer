import { describe, expect, it } from 'vitest';
import { buildGoalTask, getGoalTaskCounts } from './goal-tasks';

describe('goal tasks', () => {
  it.each([
    ['today', '2026-09-10', { day: '2026-09-10', week: null, month: '2026-09', year: '2026' }],
    ['week', '2026-W37', { day: null, week: '2026-W37', month: '2026-09', year: '2026' }],
    ['month', '2026-10', { day: null, week: null, month: '2026-10', year: '2026' }],
    ['year', '2027', { day: null, week: null, month: null, year: '2027' }],
  ] as const)('builds one linked task for the %s horizon', (horizon, target, plan) => {
    expect(buildGoalTask({
      id: 'task-1', goalId: 'goal-1', title: ' Next step ', horizon, target, now: '2026-09-10T10:00:00.000Z',
    })).toEqual(expect.objectContaining({ title: 'Next step', goalId: 'goal-1', plan }));
  });

  it('rejects malformed destinations and counts linked task states', () => {
    const active = buildGoalTask({
      id: 'active', goalId: 'goal-1', title: 'Active', horizon: 'year', target: '2027', now: '2026-09-10T10:00:00.000Z',
    })!;
    const done = { ...active, id: 'done', status: 'done' as const };
    expect(buildGoalTask({
      id: 'bad', goalId: 'goal-1', title: 'Bad', horizon: 'week', target: 'invalid', now: '2026-09-10T10:00:00.000Z',
    })).toBeNull();
    expect(getGoalTaskCounts([active, done, { ...active, id: 'other', goalId: 'goal-2' }], 'goal-1')).toEqual({ active: 1, completed: 1 });
  });
});
