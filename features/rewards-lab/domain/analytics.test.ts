import { describe, expect, it } from 'vitest';
import { getCurrentRewardResults, getPastRewardPeriodCount, getRewardPeriodResult } from './analytics';
import { RewardsLabState, createDefaultRewardsLabState } from './types';

const localIso = (year: number, month: number, day: number): string => (
  new Date(year, month, day, 12).toISOString()
);

const stateWithClaims = (): RewardsLabState => ({
  ...createDefaultRewardsLabState(),
  claims: {
    week: {
      id: 'claim-week', taskId: 'week', taskTitle: 'This week',
      completedAt: localIso(2026, 8, 9), createdAt: localIso(2026, 8, 9),
      grade: 'rare', luckSlot: 0, amount: 5, economyVersion: 3, keyId: 'key-rare',
    },
    month: {
      id: 'claim-month', taskId: 'month', taskTitle: 'Earlier this month',
      completedAt: localIso(2026, 8, 1), createdAt: localIso(2026, 8, 1),
      grade: 'uncommon', luckSlot: 0, amount: 3, economyVersion: 3, keyId: 'key-common',
    },
    reversed: {
      id: 'claim-reversed', taskId: 'reversed', taskTitle: 'Undone',
      completedAt: localIso(2026, 8, 3), createdAt: localIso(2026, 8, 3),
      grade: 'mythic', luckSlot: 0, amount: 16, economyVersion: 2,
    },
  },
  ledger: [
    { id: 'earn-week', kind: 'earn', amount: 5, occurredAt: localIso(2026, 8, 9), label: 'week', claimId: 'claim-week' },
    { id: 'earn-month', kind: 'earn', amount: 3, occurredAt: localIso(2026, 8, 1), label: 'month', claimId: 'claim-month' },
    { id: 'earn-reversed', kind: 'earn', amount: 16, occurredAt: localIso(2026, 8, 3), label: 'reversed', claimId: 'claim-reversed' },
    { id: 'reverse', kind: 'reverse', amount: -16, occurredAt: localIso(2026, 8, 3), label: 'reversed', claimId: 'claim-reversed' },
  ],
  keys: [
    { id: 'key-rare', grade: 'rare', status: 'spent', createdAt: localIso(2026, 8, 9) },
    { id: 'key-common', grade: 'common', status: 'upgraded', createdAt: localIso(2026, 8, 1) },
  ],
});

describe('reward results', () => {
  it('summarizes active claims for the current Monday-based week and month', () => {
    const results = getCurrentRewardResults(stateWithClaims(), new Date(2026, 8, 9, 18));
    expect(results.day).toMatchObject({ amount: 5, taskCount: 1, keyCount: 1 });
    expect(results.day.keyGradeCounts.rare).toBe(1);
    expect(results.week).toMatchObject({ amount: 5, taskCount: 1 });
    expect(results.week.gradeCounts.rare).toBe(1);
    expect(results.week.gradeCounts.mythic).toBe(0);
    expect(results.week.keyGradeCounts.rare).toBe(1);
    expect(results.month).toMatchObject({ amount: 8, taskCount: 2, keyCount: 2 });
    expect(results.month.gradeCounts).toMatchObject({ uncommon: 1, rare: 1, mythic: 0 });
    expect(results.month.keyGradeCounts).toMatchObject({ common: 1, rare: 1 });
  });

  it('navigates earlier calendar days, weeks and months without losing spent or upgraded key drops', () => {
    const state = stateWithClaims();
    const currentDate = new Date(2026, 8, 9, 18);

    expect(getRewardPeriodResult(state, 'day', -8, currentDate).summary)
      .toMatchObject({ amount: 3, taskCount: 1, keyCount: 1 });
    expect(getRewardPeriodResult(state, 'week', -1, currentDate).summary)
      .toMatchObject({ amount: 3, taskCount: 1, keyCount: 1 });
    expect(getRewardPeriodResult(state, 'month', -1, currentDate).summary)
      .toMatchObject({ amount: 0, taskCount: 0, keyCount: 0 });
    expect(getPastRewardPeriodCount(state, 'day', currentDate)).toBe(8);
    expect(getPastRewardPeriodCount(state, 'week', currentDate)).toBe(1);
    expect(getPastRewardPeriodCount(state, 'month', currentDate)).toBe(0);
  });
});
