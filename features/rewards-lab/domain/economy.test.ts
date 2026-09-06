import { describe, expect, it } from 'vitest';
import {
  FAIR_BAG_SLOTS,
  addRewardDefinition,
  adjustWalletBalance,
  archiveRewardDefinition,
  claimTaskCompletion,
  drawFromFairBag,
  getTaskGrade,
  getV2RewardAmount,
  getWalletBalance,
  redeemReward,
  refundRedemption,
  regradeReversedTaskClaim,
  reverseTaskCompletion,
  setTaskGrade,
  updateRewardDefinition,
} from './economy';
import { EconomyRuntime, FairBagState, LegacyRewardClaim, RewardGrade, createDefaultRewardsLabState } from './types';

const makeRuntime = (): EconomyRuntime => {
  let id = 0;
  return {
    now: () => '2026-08-28T12:00:00.000Z',
    createId: () => `id-${++id}`,
    random: () => 0,
  };
};

describe('fair reward bag', () => {
  it('draws every hidden luck slot exactly once in every cycle', () => {
    let bag: FairBagState = { remaining: [], cycle: 0 };
    const slots: number[] = [];
    for (let index = 0; index < FAIR_BAG_SLOTS.length * 2; index += 1) {
      const draw = drawFromFairBag(bag, () => 0.42);
      slots.push(draw.luckSlot);
      bag = draw.fairBag;
    }

    expect([...slots.slice(0, 9)].sort()).toEqual([...FAIR_BAG_SLOTS]);
    expect([...slots.slice(9)].sort()).toEqual([...FAIR_BAG_SLOTS]);
    expect(bag.cycle).toBe(2);
  });

  it('uses the persisted remainder without reshuffling', () => {
    const draw = drawFromFairBag({ remaining: [2, 4], cycle: 7 }, () => {
      throw new Error('random must not be called');
    });
    expect(draw).toEqual({ luckSlot: 4, fairBag: { remaining: [2], cycle: 7 } });
  });

  it('maps one shared bag into strict non-overlapping grade corridors', () => {
    const grades: RewardGrade[] = ['common', 'uncommon', 'rare', 'legendary', 'mythic'];
    const expectedRanges = [[1, 2], [3, 4], [5, 8], [9, 15], [16, 30]];
    const actualRanges = grades.map(grade => {
      const amounts = FAIR_BAG_SLOTS.map(slot => getV2RewardAmount(grade, slot));
      return [Math.min(...amounts), Math.max(...amounts)];
    });

    expect(actualRanges).toEqual(expectedRanges);
    for (let index = 0; index < actualRanges.length - 1; index += 1) {
      expect(actualRanges[index][1]).toBeLessThan(actualRanges[index + 1][0]);
    }
  });
});

describe('task rewards', () => {
  it('stores only non-common grade overrides', () => {
    const initial = createDefaultRewardsLabState();
    const rare = setTaskGrade(initial, 'task-1', 'rare');
    expect(getTaskGrade(rare, 'task-1')).toBe('rare');
    expect(initial.taskGrades).toEqual({});

    const common = setTaskGrade(rare, 'task-1', 'common');
    expect(common.taskGrades).toEqual({});
    expect(getTaskGrade(common, 'task-1')).toBe('common');
  });

  it('locks the grade, luck slot and amount while a claim is posted', () => {
    const runtime = makeRuntime();
    const graded = {
      ...setTaskGrade(createDefaultRewardsLabState(), 'task-1', 'rare'),
      fairBag: { remaining: [8 as const], cycle: 1 },
    };
    const first = claimTaskCompletion(graded, {
      taskId: 'task-1',
      taskTitle: 'Ship release',
      completedAt: '2026-08-28T10:00:00.000Z',
    }, runtime);

    expect(first.outcome).toBe('earned');
    expect(first.claim).toMatchObject({
      taskId: 'task-1', grade: 'rare', luckSlot: 8, amount: 8, economyVersion: 2,
    });
    expect(getWalletBalance(first.state)).toBe(8);
    expect(first.state.fairBag.remaining).toHaveLength(0);

    const regraded = setTaskGrade(first.state, 'task-1', 'mythic');
    const duplicate = claimTaskCompletion(regraded, {
      taskId: 'task-1',
      taskTitle: 'Renamed task',
      completedAt: '2026-08-29T10:00:00.000Z',
    }, runtime);
    expect(duplicate.outcome).toBe('already-posted');
    expect(duplicate.state).toBe(regraded);
    expect(duplicate.claim).toBe(first.claim);
    expect(duplicate.transaction).toBeNull();
  });

  it('uses the selected grade corridor for a new v2 claim', () => {
    const initial = {
      ...setTaskGrade(createDefaultRewardsLabState(), 'task-1', 'uncommon'),
      fairBag: { remaining: [4 as const], cycle: 1 },
    };
    const result = claimTaskCompletion(initial, {
      taskId: 'task-1', taskTitle: 'Medium task', completedAt: '2026-08-28T10:00:00.000Z',
    }, makeRuntime());
    expect(result.claim.amount).toBe(4);
  });

  it('reverses with a compensating entry and restores the same claim without rerolling', () => {
    const runtime = makeRuntime();
    const earned = claimTaskCompletion(createDefaultRewardsLabState(), {
      taskId: 'task-1', taskTitle: 'Task', completedAt: '2026-08-28T10:00:00.000Z',
    }, runtime);
    const bagAfterFirstClaim = earned.state.fairBag;
    const reversed = reverseTaskCompletion(earned.state, 'task-1', runtime);

    expect(reversed.outcome).toBe('reversed');
    expect(reversed.transaction?.amount).toBe(-earned.claim.amount);
    expect(getWalletBalance(reversed.state)).toBe(0);
    expect(reverseTaskCompletion(reversed.state, 'task-1', runtime).outcome).toBe('already-reversed');

    const restored = claimTaskCompletion(reversed.state, {
      taskId: 'task-1', taskTitle: 'Changed title', completedAt: '2026-08-29T10:00:00.000Z',
    }, runtime);
    expect(restored.outcome).toBe('restored');
    expect(restored.claim).toMatchObject({
      id: earned.claim.id,
      grade: earned.claim.grade,
      amount: earned.claim.amount,
      economyVersion: earned.claim.economyVersion,
      completedAt: '2026-08-29T10:00:00.000Z',
    });
    expect(restored.state.fairBag).toBe(bagAfterFirstClaim);
    expect(restored.transaction?.amount).toBe(earned.claim.amount);
    expect(getWalletBalance(restored.state)).toBe(earned.claim.amount);
  });

  it('regrades only a reversed v2 claim and preserves its luck slot', () => {
    const runtime = makeRuntime();
    const earned = claimTaskCompletion({
      ...createDefaultRewardsLabState(),
      fairBag: { remaining: [6], cycle: 1 },
    }, {
      taskId: 'task-1', taskTitle: 'Task', completedAt: '2026-08-28T10:00:00.000Z',
    }, runtime);

    expect(regradeReversedTaskClaim(earned.state, 'task-1', 'rare', runtime).outcome).toBe('claim-active');
    const reversed = reverseTaskCompletion(earned.state, 'task-1', runtime);
    const regraded = regradeReversedTaskClaim(reversed.state, 'task-1', 'rare', runtime);
    expect(regraded.outcome).toBe('regraded');
    expect(regraded.claim).toMatchObject({ grade: 'rare', luckSlot: 6, amount: 7, economyVersion: 2 });
    expect(regraded.correction).toMatchObject({
      fromGrade: 'common', toGrade: 'rare', previousAmount: 2, amount: 7, economyVersion: 2,
    });
    expect(getWalletBalance(regraded.state)).toBe(0);

    const restored = claimTaskCompletion(regraded.state, {
      taskId: 'task-1', taskTitle: 'Task', completedAt: '2026-08-29T10:00:00.000Z',
    }, runtime);
    expect(restored.claim).toMatchObject({ grade: 'rare', luckSlot: 6, amount: 7 });
    expect(restored.state.fairBag).toEqual(earned.state.fairBag);
    expect(getWalletBalance(restored.state)).toBe(7);
  });

  it('corrects a migrated v1 claim with its original roll and v1 multipliers', () => {
    const claim: LegacyRewardClaim = {
      id: 'legacy-claim', taskId: 'task-1', taskTitle: 'Legacy task',
      completedAt: '2026-08-28T10:00:00.000Z', createdAt: '2026-08-28T10:00:00.000Z',
      grade: 'common', roll: 4, multiplier: 1, amount: 4, economyVersion: 1,
    };
    const state = {
      ...createDefaultRewardsLabState(),
      claims: { 'task-1': claim },
      ledger: [
        { id: 'earn', kind: 'earn' as const, amount: 4, occurredAt: claim.completedAt, label: 'Earn', claimId: claim.id },
        { id: 'reverse', kind: 'reverse' as const, amount: -4, occurredAt: claim.completedAt, label: 'Reverse', claimId: claim.id },
      ],
    };

    const regraded = regradeReversedTaskClaim(state, 'task-1', 'legendary', makeRuntime());
    expect(regraded.claim).toMatchObject({
      economyVersion: 1, roll: 4, multiplier: 3, grade: 'legendary', amount: 12,
    });
    expect(regraded.correction?.economyVersion).toBe(1);
  });

  it('ignores reopening a task that never produced a claim', () => {
    const initial = createDefaultRewardsLabState();
    const result = reverseTaskCompletion(initial, 'missing', makeRuntime());
    expect(result).toEqual({ state: initial, transaction: null, outcome: 'not-claimed' });
  });
});

describe('reward catalog and wallet', () => {
  it('adds, edits and archives reward definitions', () => {
    const runtime = makeRuntime();
    const added = addRewardDefinition(createDefaultRewardsLabState(), {
      title: '  Listen to music  ', cost: 7, note: 'One album', repeatable: false,
    }, runtime);
    expect(added.reward).toMatchObject({
      title: 'Listen to music', cost: 7, note: 'One album', repeatable: false, active: true,
    });

    const updated = updateRewardDefinition(added.state, added.reward.id, {
      title: 'Music break', cost: 8, repeatable: true,
    }, runtime);
    expect(updated.reward).toMatchObject({ title: 'Music break', cost: 8, note: '', repeatable: true });

    const archived = archiveRewardDefinition(updated.state, added.reward.id, runtime);
    expect(archived.reward?.active).toBe(false);
  });

  it('validates catalog inputs and manual adjustments', () => {
    const initial = createDefaultRewardsLabState();
    expect(() => addRewardDefinition(initial, { title: ' ', cost: 1 })).toThrow('title');
    expect(() => addRewardDefinition(initial, { title: 'Fruit', cost: 0 })).toThrow('positive integer');
    expect(() => adjustWalletBalance(initial, 0, 'Correction')).toThrow('non-zero integer');
    expect(() => adjustWalletBalance(initial, 2, ' ')).toThrow('reason');
  });

  it('guards balance, records spend, and supports a single refund', () => {
    const runtime = makeRuntime();
    const added = addRewardDefinition(createDefaultRewardsLabState(), {
      title: 'Fruit', cost: 6,
    }, runtime);
    expect(redeemReward(added.state, added.reward.id, runtime).outcome).toBe('insufficient-balance');

    const funded = adjustWalletBalance(added.state, 10, 'Pilot seed', runtime).state;
    const redeemed = redeemReward(funded, added.reward.id, runtime);
    expect(redeemed.outcome).toBe('redeemed');
    expect(getWalletBalance(redeemed.state)).toBe(4);
    expect(redeemed.state.metrics.redemptionCount).toBe(1);

    const refunded = refundRedemption(redeemed.state, redeemed.transaction!.id, runtime);
    expect(refunded.outcome).toBe('refunded');
    expect(getWalletBalance(refunded.state)).toBe(10);
    expect(refundRedemption(refunded.state, redeemed.transaction!.id, runtime).outcome).toBe('already-refunded');
  });

  it('prevents spending an unrefunded one-time reward twice', () => {
    const runtime = makeRuntime();
    const added = addRewardDefinition(createDefaultRewardsLabState(), {
      title: 'Special treat', cost: 2, repeatable: false,
    }, runtime);
    const funded = adjustWalletBalance(added.state, 10, 'Pilot seed', runtime).state;
    const first = redeemReward(funded, added.reward.id, runtime);
    expect(redeemReward(first.state, added.reward.id, runtime).outcome).toBe('already-redeemed');

    const refunded = refundRedemption(first.state, first.transaction!.id, runtime);
    expect(redeemReward(refunded.state, added.reward.id, runtime).outcome).toBe('redeemed');
  });
});
