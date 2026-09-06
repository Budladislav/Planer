import { describe, expect, it } from 'vitest';
import { getCurrentRewardResults } from './analytics';
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
      grade: 'rare', luckSlot: 0, amount: 5, economyVersion: 2,
    },
    month: {
      id: 'claim-month', taskId: 'month', taskTitle: 'Earlier this month',
      completedAt: localIso(2026, 8, 1), createdAt: localIso(2026, 8, 1),
      grade: 'uncommon', luckSlot: 0, amount: 3, economyVersion: 2,
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
});

describe('reward results', () => {
  it('summarizes active claims for the current Monday-based week and month', () => {
    const results = getCurrentRewardResults(stateWithClaims(), new Date(2026, 8, 9, 18));
    expect(results.week).toMatchObject({ amount: 5, taskCount: 1 });
    expect(results.week.gradeCounts.rare).toBe(1);
    expect(results.week.gradeCounts.mythic).toBe(0);
    expect(results.month).toMatchObject({ amount: 8, taskCount: 2 });
    expect(results.month.gradeCounts).toMatchObject({ uncommon: 1, rare: 1, mythic: 0 });
  });
});
