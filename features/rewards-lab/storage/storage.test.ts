import { describe, expect, it } from 'vitest';
import { claimTaskCompletion, createDefaultRewardsLabState, setTaskGrade } from '../domain';
import {
  EXPERIMENT_FLAGS_STORAGE_KEY,
  REWARDS_LAB_STORAGE_KEY,
  StorageLike,
  clearRewardsLabData,
  eraseRewardsLab,
  loadExperimentFlags,
  loadRewardsLabState,
  saveRewardsLabState,
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
    expect(loadRewardsLabState(broken)).toEqual(createDefaultRewardsLabState());
    expect(saveRewardsLabState(broken, createDefaultRewardsLabState())).toBe(false);
    expect(clearRewardsLabData(broken)).toBe(false);
    expect(eraseRewardsLab(broken)).toBe(false);
  });
});

describe('Rewards Lab sidecar storage', () => {
  it('round-trips valid state in its own key', () => {
    const storage = new MemoryStorage();
    const graded = setTaskGrade(createDefaultRewardsLabState(), 'task-1', 'legendary');
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
    expect(loadRewardsLabState(storage)).toEqual(createDefaultRewardsLabState());

    storage.setItem(REWARDS_LAB_STORAGE_KEY, JSON.stringify({ schemaVersion: 999, ledger: [{ amount: 1000 }] }));
    expect(loadRewardsLabState(storage)).toEqual(createDefaultRewardsLabState());
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

    expect(loadRewardsLabState(storage)).toEqual({
      ...createDefaultRewardsLabState(),
      taskGrades: { a: 'rare' },
    });
  });

  it('can reset data without disabling, or erase data and disable', () => {
    const storage = new MemoryStorage();
    setRewardsLabEnabled(storage, true);
    saveRewardsLabState(storage, createDefaultRewardsLabState());

    expect(clearRewardsLabData(storage)).toBe(true);
    expect(loadExperimentFlags(storage).rewardsLab).toBe(true);
    expect(storage.values.has(REWARDS_LAB_STORAGE_KEY)).toBe(false);

    saveRewardsLabState(storage, createDefaultRewardsLabState());
    expect(eraseRewardsLab(storage)).toBe(true);
    expect(loadExperimentFlags(storage).rewardsLab).toBe(false);
    expect(storage.values.has(REWARDS_LAB_STORAGE_KEY)).toBe(false);
  });
});
