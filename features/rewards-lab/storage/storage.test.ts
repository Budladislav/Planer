import { describe, expect, it } from 'vitest';
import { addRewardDefinition, claimTaskCompletion, createDefaultRewardsLabState, getWalletBalance, redeemReward, setTaskGrade } from '../domain';
import {
  LEGACY_REWARDS_LAB_ARCHIVE_KEY,
  LEGACY_REWARDS_LAB_EXPERIMENT_FLAGS_KEY,
  LEGACY_REWARDS_LAB_OUTBOX_KEY,
  LEGACY_REWARDS_LAB_STORAGE_KEY,
} from '../contracts';
import { REWARDS_LAB_LIFECYCLE_OUTBOX_KEY } from '../outbox';
import {
  EXPERIMENT_FLAGS_STORAGE_KEY,
  REWARDS_LAB_STORAGE_KEY,
  StorageLike,
  clearRewardsLabData,
  createRewardsBackupPayload,
  ensureLegacyRewardsLabArchive,
  eraseRewardsLab,
  loadExperimentFlags,
  loadRewardsLabState,
  saveRewardsLabState,
  restoreRewardsBackupPayload,
  setRewardsLabEnabled,
} from './storage';

class MemoryStorage implements StorageLike {
  values = new Map<string, string>();

  getItem(key: string): string | null {
    return this.values.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    this.values.set(key, value);
  }

  removeItem(key: string): void {
    this.values.delete(key);
  }
}

const freshStoredState = () => createDefaultRewardsLabState();

describe('Rewards Lab experiment flag storage', () => {
  it('is disabled by default and fails closed for malformed data', () => {
    const storage = new MemoryStorage();
    expect(loadExperimentFlags(storage)).toEqual({ rewardsLab: false });

    storage.setItem(EXPERIMENT_FLAGS_STORAGE_KEY, '{oops');
    expect(loadExperimentFlags(storage)).toEqual({ rewardsLab: false });

    storage.setItem(EXPERIMENT_FLAGS_STORAGE_KEY, JSON.stringify({ rewardsLab: 'yes' }));
    expect(loadExperimentFlags(storage)).toEqual({ rewardsLab: false });
  });

  it('enables and disables independently of the planner store', () => {
    const storage = new MemoryStorage();
    expect(setRewardsLabEnabled(storage, true)).toBe(true);
    expect(loadExperimentFlags(storage).rewardsLab).toBe(true);
    expect(storage.values.has('monofocus_v1')).toBe(false);
    expect(setRewardsLabEnabled(storage, false)).toBe(true);
    expect(loadExperimentFlags(storage).rewardsLab).toBe(false);
  });

  it('does not throw when the storage adapter fails', () => {
    const broken: StorageLike = {
      getItem: () => { throw new Error('blocked'); },
      setItem: () => { throw new Error('full'); },
      removeItem: () => { throw new Error('blocked'); },
    };
    expect(loadExperimentFlags(broken)).toEqual({ rewardsLab: false });
    expect(setRewardsLabEnabled(broken, true)).toBe(false);
    expect(loadRewardsLabState(broken)).toEqual(freshStoredState());
    expect(saveRewardsLabState(broken, createDefaultRewardsLabState())).toBe(false);
    expect(clearRewardsLabData(broken)).toBe(false);
    expect(eraseRewardsLab(broken)).toBe(false);
  });
});

describe('Rewards Lab sidecar storage', () => {
  it('round-trips valid state in its own key', () => {
    const storage = new MemoryStorage();
    const graded = setTaskGrade(freshStoredState(), 'task-1', 'legendary');
    const rewarded = claimTaskCompletion(graded, {
      taskId: 'task-1', taskTitle: 'Test', completedAt: '2026-08-28T10:00:00.000Z',
    }, {
      now: () => '2026-08-28T10:00:00.000Z',
      createId: (() => { let id = 0; return () => `id-${++id}`; })(),
      random: () => 0,
    }).state;

    expect(saveRewardsLabState(storage, rewarded)).toBe(true);
    expect(storage.values.has(REWARDS_LAB_STORAGE_KEY)).toBe(true);
    expect(storage.values.has('monofocus_v1')).toBe(false);
    expect(loadRewardsLabState(storage)).toEqual(rewarded);
  });

  it('returns a fresh default for malformed or unknown schemas', () => {
    const storage = new MemoryStorage();
    storage.setItem(REWARDS_LAB_STORAGE_KEY, '{bad json');
    expect(loadRewardsLabState(storage)).toEqual(freshStoredState());

    storage.setItem(REWARDS_LAB_STORAGE_KEY, JSON.stringify({ schemaVersion: 999, ledger: [{ amount: 1000 }] }));
    expect(loadRewardsLabState(storage)).toEqual(freshStoredState());
  });

  it('migrates v1 without recalculating claims or wallet history and starts a fresh points bag', () => {
    const storage = new MemoryStorage();
    storage.setItem(REWARDS_LAB_STORAGE_KEY, JSON.stringify({
      schemaVersion: 1,
      currencyName: 'Tokens',
      animationsEnabled: false,
      taskGrades: { 'task-1': 'rare' },
      fairBag: { remaining: [2, 3, 4], cycle: 7 },
      claims: {
        'task-1': {
          id: 'claim-1', taskId: 'task-1', taskTitle: 'Existing work',
          completedAt: '2026-08-28T10:00:00.000Z', createdAt: '2026-08-28T10:00:00.000Z',
          grade: 'rare', roll: 4, multiplier: 2, amount: 8, economyVersion: 1,
        },
      },
      ledger: [
        {
          id: 'earn-1', kind: 'earn', amount: 8, occurredAt: '2026-08-28T10:00:00.000Z',
          label: 'Reward for Existing work', taskId: 'task-1', claimId: 'claim-1',
        },
        {
          id: 'adjust-1', kind: 'adjustment', amount: 224, occurredAt: '2026-08-30T10:00:00.000Z',
          label: 'Existing balance',
        },
      ],
      rewards: [{
        id: 'reward-1', title: 'Cinema', cost: 50, note: '', active: true, repeatable: true,
        createdAt: '2026-08-28T10:00:00.000Z', updatedAt: '2026-08-28T10:00:00.000Z',
      }],
      metrics: { labOpenCount: 3, redemptionCount: 0, lastOpenedAt: null, lastRedeemedAt: null },
    }));

    const migrated = loadRewardsLabState(storage);
    expect(migrated).toMatchObject({
      schemaVersion: 5,
      economyVersion: 3,
      currencyName: 'Креды',
      animationsEnabled: false,
      fairBag: { remaining: [], cycle: 0 },
      gradeCorrections: [],
    });
    expect(migrated.claims['task-1']).toMatchObject({
      economyVersion: 1, grade: 'rare', roll: 4, multiplier: 2, amount: 8,
    });
    expect(migrated.rewards[0]).toMatchObject({ title: 'Cinema', cost: 50 });
    expect(getWalletBalance(migrated)).toBe(232);
  });

  it('migrates the live v2 state without recalculating balance or existing claims', () => {
    const storage = new MemoryStorage();
    storage.setItem(REWARDS_LAB_STORAGE_KEY, JSON.stringify({
      schemaVersion: 2,
      economyVersion: 2,
      economyActivatedAt: '2026-09-06T00:00:00.000Z',
      currencyName: 'Tokens',
      animationsEnabled: true,
      taskGrades: { task: 'rare' },
      fairBag: { remaining: [1, 2, 3], cycle: 4 },
      claims: {
        task: {
          id: 'claim-v2', taskId: 'task', taskTitle: 'Existing v2 task',
          completedAt: '2026-09-06T12:00:00.000Z', createdAt: '2026-09-06T12:00:00.000Z',
          grade: 'rare', luckSlot: 4, amount: 7, economyVersion: 2,
        },
      },
      gradeCorrections: [],
      ledger: [{
        id: 'earn-v2', kind: 'earn', amount: 7, occurredAt: '2026-09-06T12:00:00.000Z',
        label: 'Reward', taskId: 'task', claimId: 'claim-v2', economyVersion: 2,
      }],
      rewards: [{
        id: 'existing-reward', title: 'Existing', cost: 5, note: '', active: true,
        repeatable: true, createdAt: '2026-09-06T00:00:00.000Z', updatedAt: '2026-09-06T00:00:00.000Z',
      }],
      metrics: { labOpenCount: 1, redemptionCount: 0, lastOpenedAt: null, lastRedeemedAt: null },
    }));

    const migrated = loadRewardsLabState(storage);
    expect(migrated).toMatchObject({
      schemaVersion: 5, economyVersion: 3, currencyName: 'Креды',
      fairBag: { remaining: [1, 2, 3], cycle: 4 }, keyDropState: { dryStreak: 0 },
      keys: [], purchases: [], starterCatalogInstalled: false,
    });
    expect(migrated.claims.task).toMatchObject({ economyVersion: 2, luckSlot: 4, amount: 7 });
    expect(migrated.rewards).toHaveLength(1);
    expect(migrated.rewards[0]).toMatchObject({
      grade: 'common', variableCost: false, cooldownDays: 0,
      paymentMode: 'credits-and-key', displayOrder: 0,
    });
    expect(migrated.rewardCatalogView).toBe('detailed');
    expect(getWalletBalance(migrated)).toBe(7);
  });

  it('migrates the 6.1 schema without changing existing reward requirements', () => {
    const storage = new MemoryStorage();
    storage.setItem(REWARDS_LAB_STORAGE_KEY, JSON.stringify({
      ...createDefaultRewardsLabState(),
      schemaVersion: 3,
      rewardCatalogView: undefined,
      rewards: [
        {
          id: 'old-a', title: 'Cinema', cost: 15, variableCost: true, grade: 'rare',
          note: '', active: true, repeatable: true, cooldownDays: 0,
          limitCount: null, limitWindowDays: null, limitGroup: '',
          createdAt: '2026-09-10T10:00:00.000Z', updatedAt: '2026-09-10T10:00:00.000Z',
        },
        {
          id: 'old-b', title: 'Music', cost: 1, variableCost: false, grade: 'common',
          note: '', active: true, repeatable: true, cooldownDays: 0,
          limitCount: null, limitWindowDays: null, limitGroup: '',
          createdAt: '2026-09-10T10:01:00.000Z', updatedAt: '2026-09-10T10:01:00.000Z',
        },
      ],
    }));

    const migrated = loadRewardsLabState(storage);
    expect(migrated.schemaVersion).toBe(5);
    expect(migrated.rewardCatalogView).toBe('detailed');
    expect(migrated.rewards).toMatchObject([
      { id: 'old-a', paymentMode: 'credits-and-key', displayOrder: 0, cost: 15, grade: 'rare' },
      { id: 'old-b', paymentMode: 'credits-and-key', displayOrder: 1, cost: 1, grade: 'common' },
    ]);
  });

  it('round-trips key-only redemptions and compact catalog preference', () => {
    const storage = new MemoryStorage();
    const state = {
      ...createDefaultRewardsLabState(),
      rewardCatalogView: 'compact' as const,
      keys: [{
        id: 'key-only', grade: 'common' as const, status: 'available' as const,
        createdAt: '2026-09-11T10:00:00.000Z',
      }],
    };
    const added = addRewardDefinition(state, {
      title: 'Key pass', cost: 0, paymentMode: 'key',
    }, { createId: () => 'reward-key-only', now: () => '2026-09-11T10:00:00.000Z' });
    const redeemed = redeemReward(added.state, added.reward.id, {
      createId: () => 'spend-key-only', now: () => '2026-09-11T10:01:00.000Z',
    });

    expect(saveRewardsLabState(storage, redeemed.state)).toBe(true);
    const restored = loadRewardsLabState(storage);
    expect(restored.rewardCatalogView).toBe('compact');
    expect(restored.rewards[0]).toMatchObject({ paymentMode: 'key', cost: 0 });
    expect(restored.ledger.at(-1)).toMatchObject({ kind: 'spend', amount: 0, keyId: 'key-only' });
    expect(restored.keys[0].status).toBe('spent');
  });

  it('migrates schema 4 by snapshotting limit groups into existing redemptions', () => {
    const storage = new MemoryStorage();
    storage.setItem(REWARDS_LAB_STORAGE_KEY, JSON.stringify({
      ...createDefaultRewardsLabState(),
      schemaVersion: 4,
      rewards: [{
        id: 'reward-old', title: 'Game', cost: 2, variableCost: false, grade: 'common',
        paymentMode: 'credits', displayOrder: 0, note: '', active: true, repeatable: true,
        cooldownDays: 0, limitCount: 1, limitWindowDays: 7, limitGroup: 'games',
        createdAt: '2026-09-10T10:00:00.000Z', updatedAt: '2026-09-10T10:00:00.000Z',
      }],
      ledger: [{
        id: 'spend-old', kind: 'spend', amount: -2, occurredAt: '2026-09-10T11:00:00.000Z',
        label: 'Game', rewardId: 'reward-old',
      }],
    }));

    const migrated = loadRewardsLabState(storage);
    expect(migrated.schemaVersion).toBe(5);
    expect(migrated.ledger[0]).toMatchObject({ id: 'spend-old', limitGroup: 'games' });
  });

  it('sanitizes invalid nested values without importing them into the wallet', () => {
    const storage = new MemoryStorage();
    storage.setItem(REWARDS_LAB_STORAGE_KEY, JSON.stringify({
      schemaVersion: 1,
      currencyName: '',
      animationsEnabled: 'yes',
      taskGrades: { a: 'rare', b: 'common', c: 'god-mode' },
      fairBag: { remaining: [4, 4, 4, 4], cycle: -1 },
      claims: { task: { id: 'bad' } },
      ledger: [
        { id: 'bad', kind: 'earn', amount: 999.5, occurredAt: 'now', label: 'bad' },
        { id: 'also-bad', kind: 'unknown', amount: 999, occurredAt: 'now', label: 'bad' },
      ],
      rewards: [{ id: 'r', title: 'Bad', cost: -1 }],
      metrics: { labOpenCount: -10, redemptionCount: 'many' },
    }));

    const sanitized = loadRewardsLabState(storage);
    expect(sanitized.taskGrades).toEqual({ a: 'rare' });
    expect(getWalletBalance(sanitized)).toBe(0);
    expect(sanitized.rewards).toEqual([]);
  });

  it('preserves the pilot in a disabled archive without deleting its legacy keys', () => {
    const storage = new MemoryStorage();
    storage.setItem(LEGACY_REWARDS_LAB_EXPERIMENT_FLAGS_KEY, JSON.stringify({ rewardsLab: true }));
    storage.setItem(LEGACY_REWARDS_LAB_STORAGE_KEY, JSON.stringify({ schemaVersion: 3, ledger: [{ amount: 99 }] }));
    storage.setItem(LEGACY_REWARDS_LAB_OUTBOX_KEY, JSON.stringify({ schemaVersion: 1, events: [] }));

    const archive = ensureLegacyRewardsLabArchive(storage, '2026-09-11T08:00:00.000Z');

    expect(archive).toMatchObject({ schemaVersion: 1, archivedAt: '2026-09-11T08:00:00.000Z' });
    expect(storage.values.has(LEGACY_REWARDS_LAB_ARCHIVE_KEY)).toBe(true);
    expect(storage.values.has(LEGACY_REWARDS_LAB_EXPERIMENT_FLAGS_KEY)).toBe(true);
    expect(storage.values.has(LEGACY_REWARDS_LAB_STORAGE_KEY)).toBe(true);
    expect(loadExperimentFlags(storage).rewardsLab).toBe(false);
    expect(loadRewardsLabState(storage)).toEqual(createDefaultRewardsLabState());
  });

  it('round-trips official Rewards and the legacy archive through backup data', () => {
    const source = new MemoryStorage();
    source.setItem(LEGACY_REWARDS_LAB_STORAGE_KEY, '{"pilot":true}');
    setRewardsLabEnabled(source, true);
    const official = setTaskGrade(createDefaultRewardsLabState(), 'task-1', 'rare');
    saveRewardsLabState(source, official);
    const backup = createRewardsBackupPayload(source);

    const restored = new MemoryStorage();
    expect(restoreRewardsBackupPayload(restored, backup)).toBe(true);
    expect(loadExperimentFlags(restored).rewardsLab).toBe(true);
    expect(loadRewardsLabState(restored).taskGrades).toEqual({ 'task-1': 'rare' });
    expect(restored.values.has(LEGACY_REWARDS_LAB_ARCHIVE_KEY)).toBe(true);
  });

  it('can reset data without disabling, or erase data and disable', () => {
    const storage = new MemoryStorage();
    setRewardsLabEnabled(storage, true);
    saveRewardsLabState(storage, createDefaultRewardsLabState());

    expect(clearRewardsLabData(storage)).toBe(true);
    expect(loadExperimentFlags(storage).rewardsLab).toBe(true);
    expect(storage.values.has(REWARDS_LAB_STORAGE_KEY)).toBe(false);

    saveRewardsLabState(storage, createDefaultRewardsLabState());
    storage.values.set(REWARDS_LAB_LIFECYCLE_OUTBOX_KEY, '{"schemaVersion":1,"events":[]}');
    expect(eraseRewardsLab(storage)).toBe(true);
    expect(loadExperimentFlags(storage).rewardsLab).toBe(false);
    expect(storage.values.has(REWARDS_LAB_STORAGE_KEY)).toBe(false);
    expect(storage.values.has(REWARDS_LAB_LIFECYCLE_OUTBOX_KEY)).toBe(false);
  });

  it('does not delete sidecar data when its disable write fails', () => {
    const backing = new MemoryStorage();
    setRewardsLabEnabled(backing, true);
    saveRewardsLabState(backing, createDefaultRewardsLabState());
    backing.values.set(REWARDS_LAB_LIFECYCLE_OUTBOX_KEY, '{"schemaVersion":1,"events":[]}');
    const blocked: StorageLike = {
      getItem: key => backing.getItem(key),
      setItem: (key, value) => {
        if (key === EXPERIMENT_FLAGS_STORAGE_KEY) throw new Error('flag write blocked');
        backing.setItem(key, value);
      },
      removeItem: key => backing.removeItem(key),
    };

    expect(eraseRewardsLab(blocked)).toBe(false);
    expect(backing.values.has(REWARDS_LAB_STORAGE_KEY)).toBe(true);
    expect(backing.values.has(REWARDS_LAB_LIFECYCLE_OUTBOX_KEY)).toBe(true);
  });
});
