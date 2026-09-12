import { describe, expect, it } from 'vitest';
import {
  addPurchaseItem,
  addRewardDefinition,
  claimTaskCompletion,
  createDefaultRewardsLabState,
  redeemPurchase,
  redeemReward,
  refundRedemption,
} from './domain';
import { buildRewardsReportData } from './report';

const sequenceRuntime = () => {
  let id = 0;
  let timestamp = '2026-09-10T10:00:00.000Z';
  return {
    runtime: {
      createId: () => `id-${++id}`,
      now: () => timestamp,
      random: () => 0,
    },
    setTimestamp: (value: string) => { timestamp = value; },
  };
};

describe('Rewards report adapter', () => {
  it('includes active task rewards and unrefunded catalog activity inside the selected range', () => {
    const clock = sequenceRuntime();
    let state = createDefaultRewardsLabState();
    const claimed = claimTaskCompletion(state, {
      taskId: 'task-1', taskTitle: 'Hard thing', completedAt: '2026-09-10T10:00:00.000Z', grade: 'rare',
    }, clock.runtime);
    state = claimed.state;
    const reward = addRewardDefinition(state, { title: 'Cinema', cost: 1, paymentMode: 'credits' }, clock.runtime);
    state = reward.state;
    clock.setTimestamp('2026-09-11T18:00:00.000Z');
    const redeemed = redeemReward(state, reward.reward.id, clock.runtime);
    state = redeemed.state;

    const data = buildRewardsReportData(state, { start: '2026-09-10', end: '2026-09-12' });

    expect(data.taskRewards['task-1']).toMatchObject({ grade: 'rare', amount: claimed.claim?.amount });
    expect(data.creditsEarned).toBe(claimed.claim?.amount);
    expect(data.redemptions).toEqual([expect.objectContaining({ title: 'Cinema', kind: 'reward', creditsSpent: 1 })]);
    expect(data.creditsSpent).toBe(1);
  });

  it('omits refunded rewards and keeps wishlist purchases distinct', () => {
    const clock = sequenceRuntime();
    let state = createDefaultRewardsLabState();
    const claimed = claimTaskCompletion(state, {
      taskId: 'task-1', taskTitle: 'Task', completedAt: '2026-09-10T10:00:00.000Z', grade: 'common',
    }, clock.runtime);
    state = claimed.state;
    const reward = addRewardDefinition(state, { title: 'Music', cost: 1, paymentMode: 'credits' }, clock.runtime);
    state = redeemReward(reward.state, reward.reward.id, clock.runtime).state;
    const spend = state.ledger.find(item => item.kind === 'spend')!;
    state = refundRedemption(state, spend.id, clock.runtime).state;

    const purchase = addPurchaseItem(state, { title: 'Headphones', estimatedCost: 1, grade: 'common' }, clock.runtime);
    state = purchase.state;
    const availableKey = {
      id: 'manual-key', grade: 'common' as const, status: 'available' as const,
      createdAt: '2026-09-10T10:00:00.000Z',
    };
    state = { ...state, keys: [...state.keys, availableKey] };
    state = redeemPurchase(state, purchase.purchase.id, 1, clock.runtime).state;

    const data = buildRewardsReportData(state, { start: '2026-09-10', end: '2026-09-10' });
    expect(data.redemptions).toEqual([expect.objectContaining({ title: 'Headphones', kind: 'purchase' })]);
    expect(data.keysSpent).toBe(1);
  });
});
