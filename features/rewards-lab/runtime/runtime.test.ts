import { describe, expect, it } from 'vitest';
import type { TaskLifecycleEvent } from '../../../task-lifecycle';
import type { Task } from '../../../types';
import { createDefaultRewardsLabState, getWalletBalance } from '../domain';
import {
  EXPERIMENT_FLAGS_STORAGE_KEY,
  REWARDS_LAB_STORAGE_KEY,
  StorageLike,
  loadExperimentFlags,
  loadRewardsLabState,
} from '../storage';
import { createRewardsLabRuntime, isRewardsLabSafeMode } from './runtime';

class MemoryStorage implements StorageLike {
  values = new Map<string, string>();
  reads: string[] = [];
  writes: string[] = [];
  removals: string[] = [];

  getItem(key: string): string | null {
    this.reads.push(key);
    return this.values.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    this.writes.push(key);
    this.values.set(key, value);
  }

  removeItem(key: string): void {
    this.removals.push(key);
    this.values.delete(key);
  }
}

const deterministicEconomy = () => {
  let id = 0;
  return {
    now: () => '2026-08-28T12:00:00.000Z',
    createId: () => `runtime-id-${++id}`,
    random: () => 0,
  };
};

const task = (overrides: Partial<Task> = {}): Task => ({
  id: 'task-1',
  title: 'Write release notes',
  status: 'done',
  plan: { day: '2026-08-28', week: '2026-W35', month: '2026-08' },
  projectId: null,
  eventId: null,
  createdAt: '2026-08-28T08:00:00.000Z',
  updatedAt: '2026-08-28T10:00:00.000Z',
  completedAt: '2026-08-28T10:00:00.000Z',
  ...overrides,
});

const completedEvent = (overrides: Partial<Task> = {}): TaskLifecycleEvent => {
  const completedTask = task(overrides);
  return {
    type: 'task.completed',
    taskId: completedTask.id,
    title: completedTask.title,
    completedAt: completedTask.completedAt!,
    occurredAt: '2026-08-28T10:00:00.000Z',
    task: completedTask,
  };
};

const reopenedEvent = (): TaskLifecycleEvent => ({
  type: 'task.reopened',
  taskId: 'task-1',
  title: 'Write release notes',
  previousCompletedAt: '2026-08-28T10:00:00.000Z',
  occurredAt: '2026-08-28T11:00:00.000Z',
  task: task({ status: 'todo', completedAt: null }),
});

describe('Rewards Lab runtime activation', () => {
  it('recognizes only the explicit safe-mode query value', () => {
    expect(isRewardsLabSafeMode('?safe=1')).toBe(true);
    expect(isRewardsLabSafeMode('view=today&safe=1')).toBe(true);
    expect(isRewardsLabSafeMode('?safe=0')).toBe(false);
    expect(isRewardsLabSafeMode('?safe=true')).toBe(false);
  });

  it('is disabled by default and does not load the heavy state', () => {
    const storage = new MemoryStorage();
    const runtime = createRewardsLabRuntime(storage);
    const first = runtime.getSnapshot();

    expect(first).toMatchObject({
      flagEnabled: false,
      enabled: false,
      safeMode: false,
      state: null,
    });
    expect(storage.reads).toEqual([EXPERIMENT_FLAGS_STORAGE_KEY]);
    expect(runtime.getSnapshot()).toBe(first);
    expect(() => runtime.handleTaskLifecycle(completedEvent())).not.toThrow();
    expect(storage.writes).toEqual([]);
  });

  it('suppresses an enabled flag in safe mode without reading or changing data', () => {
    const storage = new MemoryStorage();
    storage.values.set(EXPERIMENT_FLAGS_STORAGE_KEY, JSON.stringify({ rewardsLab: true }));
    storage.values.set(REWARDS_LAB_STORAGE_KEY, JSON.stringify({ secret: 'must stay untouched' }));

    const runtime = createRewardsLabRuntime(storage, '?safe=1');
    expect(runtime.getSnapshot()).toMatchObject({
      flagEnabled: true,
      enabled: false,
      safeMode: true,
      state: null,
    });
    expect(storage.reads).toEqual([EXPERIMENT_FLAGS_STORAGE_KEY]);
    expect(runtime.enable()).toBe(false);
    expect(runtime.resetDataKeepingEnabled()).toBe(false);
    expect(storage.writes).toEqual([]);
    expect(storage.removals).toEqual([]);
    expect(storage.values.get(REWARDS_LAB_STORAGE_KEY)).toBe(JSON.stringify({ secret: 'must stay untouched' }));
  });

  it('allows safe-mode recovery to disable or erase without loading sidecar state', () => {
    const keepStorage = new MemoryStorage();
    keepStorage.values.set(EXPERIMENT_FLAGS_STORAGE_KEY, JSON.stringify({ rewardsLab: true }));
    keepStorage.values.set(REWARDS_LAB_STORAGE_KEY, JSON.stringify({ payload: 'kept' }));
    const keepRuntime = createRewardsLabRuntime(keepStorage, '?safe=1');

    expect(keepRuntime.disableKeepData()).toBe(true);
    expect(keepRuntime.getSnapshot()).toMatchObject({ flagEnabled: false, enabled: false, safeMode: true });
    expect(keepStorage.values.has(REWARDS_LAB_STORAGE_KEY)).toBe(true);
    expect(keepStorage.reads).not.toContain(REWARDS_LAB_STORAGE_KEY);

    const eraseStorage = new MemoryStorage();
    eraseStorage.values.set(EXPERIMENT_FLAGS_STORAGE_KEY, JSON.stringify({ rewardsLab: true }));
    eraseStorage.values.set(REWARDS_LAB_STORAGE_KEY, JSON.stringify({ payload: 'erased' }));
    const eraseRuntime = createRewardsLabRuntime(eraseStorage, '?safe=1');

    expect(eraseRuntime.disableAndErase()).toBe(true);
    expect(eraseRuntime.getSnapshot()).toMatchObject({ flagEnabled: false, enabled: false, safeMode: true });
    expect(eraseStorage.values.has(REWARDS_LAB_STORAGE_KEY)).toBe(false);
    expect(eraseStorage.reads).not.toContain(REWARDS_LAB_STORAGE_KEY);
  });

  it('notifies subscribers with stable snapshots and isolates a failing subscriber', () => {
    const storage = new MemoryStorage();
    const runtime = createRewardsLabRuntime(storage);
    let calls = 0;
    runtime.subscribe(() => { throw new Error('render failed'); });
    const unsubscribe = runtime.subscribe(() => { calls += 1; });

    expect(() => runtime.enable()).not.toThrow();
    expect(calls).toBe(1);
    const enabled = runtime.getSnapshot();
    expect(runtime.getSnapshot()).toBe(enabled);

    unsubscribe();
    runtime.disableKeepData();
    expect(calls).toBe(1);
  });

  it('fails closed without throwing when browser storage is unavailable', () => {
    const broken: StorageLike = {
      getItem: () => { throw new Error('blocked'); },
      setItem: () => { throw new Error('quota'); },
      removeItem: () => { throw new Error('blocked'); },
    };
    const runtime = createRewardsLabRuntime(broken);

    expect(() => runtime.enable()).not.toThrow();
    expect(runtime.enable()).toBe(false);
    expect(runtime.getSnapshot().enabled).toBe(false);
    expect(runtime.getSnapshot().lastError).toContain('initialized');
  });

  it('sanitizes malformed enabled state instead of importing arbitrary balance', () => {
    const storage = new MemoryStorage();
    storage.values.set(EXPERIMENT_FLAGS_STORAGE_KEY, JSON.stringify({ rewardsLab: true }));
    storage.values.set(REWARDS_LAB_STORAGE_KEY, JSON.stringify({ schemaVersion: 999, ledger: [{ amount: 999 }] }));

    const runtime = createRewardsLabRuntime(storage);
    expect(runtime.getSnapshot().state).toEqual(createDefaultRewardsLabState());
  });
});

describe('Rewards Lab task lifecycle', () => {
  it('earns once, reverses, then restores the immutable claim without rerolling', () => {
    const storage = new MemoryStorage();
    const runtime = createRewardsLabRuntime(storage, '', deterministicEconomy());
    expect(runtime.enable()).toBe(true);
    expect(runtime.setTaskGrade('task-1', 'rare')).toBe(true);

    runtime.handleTaskLifecycle(completedEvent());
    const earned = runtime.getSnapshot();
    const claim = earned.state!.claims['task-1'];
    const bagAfterClaim = earned.state!.fairBag;
    expect(claim).toMatchObject({ grade: 'rare', multiplier: 2, roll: 2, amount: 4 });
    expect(getWalletBalance(earned.state!)).toBe(4);
    expect(earned.toast).toMatchObject({
      kind: 'earned', taskId: 'task-1', grade: 'rare', amount: 4, currencyName: 'Tokens',
    });

    runtime.handleTaskLifecycle(completedEvent({ title: 'Renamed task' }));
    expect(runtime.getSnapshot()).toBe(earned);
    expect(runtime.getSnapshot().state!.ledger).toHaveLength(1);

    runtime.handleTaskLifecycle(reopenedEvent());
    expect(getWalletBalance(runtime.getSnapshot().state!)).toBe(0);
    expect(runtime.getSnapshot().state!.ledger).toHaveLength(2);

    runtime.handleTaskLifecycle(completedEvent({
      title: 'Renamed task',
      completedAt: '2026-08-29T10:00:00.000Z',
    }));
    const restored = runtime.getSnapshot();
    expect(restored.toast?.kind).toBe('restored');
    expect(restored.state!.claims['task-1']).toEqual(claim);
    expect(restored.state!.fairBag).toEqual(bagAfterClaim);
    expect(restored.state!.ledger).toHaveLength(3);
    expect(getWalletBalance(restored.state!)).toBe(4);
  });

  it('locks grade changes forever after the first claim', () => {
    const storage = new MemoryStorage();
    const runtime = createRewardsLabRuntime(storage, '', deterministicEconomy());
    runtime.enable();
    runtime.handleTaskLifecycle(completedEvent());

    expect(runtime.setTaskGrade('task-1', 'mythic')).toBe(false);
    runtime.handleTaskLifecycle(reopenedEvent());
    expect(runtime.setTaskGrade('task-1', 'mythic')).toBe(false);
    expect(runtime.getSnapshot().state!.claims['task-1'].grade).toBe('common');
  });

  it('keeps task completion safe when persistence breaks', () => {
    const storage = new MemoryStorage();
    const runtime = createRewardsLabRuntime(storage, '', deterministicEconomy());
    runtime.enable();
    storage.setItem = () => { throw new Error('disk full'); };

    expect(() => runtime.handleTaskLifecycle(completedEvent())).not.toThrow();
    expect(runtime.getSnapshot().state!.claims).toEqual({});
    expect(runtime.getSnapshot().toast).toBeNull();
    expect(runtime.getSnapshot().lastError).toContain('could not be saved');
  });
});

describe('Rewards Lab wallet, catalog and controls', () => {
  it('runs catalog, redemption, refund and settings actions through persisted state', () => {
    const storage = new MemoryStorage();
    const runtime = createRewardsLabRuntime(storage, '', deterministicEconomy());
    runtime.enable();

    const reward = runtime.addReward({ title: '  Music break  ', cost: 6, repeatable: true });
    expect(reward).toMatchObject({ title: 'Music break', cost: 6, active: true });
    const edited = runtime.updateReward(reward!.id, {
      title: 'Fruit', cost: 5, note: 'One serving', repeatable: false,
    });
    expect(edited).toMatchObject({ title: 'Fruit', cost: 5, note: 'One serving' });
    expect(runtime.adjustBalance(10, 'Pilot seed')).toBe(true);
    expect(runtime.redeem(reward!.id)).toBe('redeemed');
    const spend = runtime.getSnapshot().state!.ledger.find(item => item.kind === 'spend')!;
    expect(getWalletBalance(runtime.getSnapshot().state!)).toBe(5);
    expect(runtime.refund(spend.id)).toBe('refunded');
    expect(getWalletBalance(runtime.getSnapshot().state!)).toBe(10);
    expect(runtime.archiveReward(reward!.id)).toBe(true);
    expect(runtime.getSnapshot().state!.rewards[0].active).toBe(false);

    expect(runtime.updateCurrency('  Sparks  ')).toBe(true);
    expect(runtime.updateAnimations(false)).toBe(true);
    expect(runtime.getSnapshot().state).toMatchObject({ currencyName: 'Sparks', animationsEnabled: false });
    expect(runtime.updateCurrency(' ')).toBe(false);
    expect(runtime.adjustBalance(0, 'bad')).toBe(false);
    expect(runtime.getSnapshot().lastError).toContain('non-zero');

    expect(storage.writes.every(key => (
      key === EXPERIMENT_FLAGS_STORAGE_KEY || key === REWARDS_LAB_STORAGE_KEY
    ))).toBe(true);
    expect(storage.values.has('monofocus_v1')).toBe(false);
  });

  it('records one metric per explicit open and not per repeated open call', () => {
    const storage = new MemoryStorage();
    const runtime = createRewardsLabRuntime(storage, '', deterministicEconomy());
    runtime.enable();

    expect(runtime.openLab()).toBe(true);
    expect(runtime.openLab()).toBe(true);
    expect(runtime.getSnapshot().state!.metrics.labOpenCount).toBe(1);
    runtime.closeLab();
    runtime.openLab();
    expect(runtime.getSnapshot().state!.metrics.labOpenCount).toBe(2);
  });

  it('can disable without deleting, reset while enabled, or erase completely', () => {
    const storage = new MemoryStorage();
    const runtime = createRewardsLabRuntime(storage, '', deterministicEconomy());
    runtime.enable();
    runtime.adjustBalance(9, 'Seed');

    expect(runtime.disableKeepData()).toBe(true);
    expect(runtime.getSnapshot()).toMatchObject({ enabled: false, state: null });
    expect(storage.values.has(REWARDS_LAB_STORAGE_KEY)).toBe(true);
    expect(runtime.enable()).toBe(true);
    expect(getWalletBalance(runtime.getSnapshot().state!)).toBe(9);

    expect(runtime.resetDataKeepingEnabled()).toBe(true);
    expect(runtime.getSnapshot().enabled).toBe(true);
    expect(getWalletBalance(runtime.getSnapshot().state!)).toBe(0);
    expect(loadExperimentFlags(storage).rewardsLab).toBe(true);

    expect(runtime.disableAndErase()).toBe(true);
    expect(runtime.getSnapshot()).toMatchObject({ flagEnabled: false, enabled: false, state: null });
    expect(storage.values.has(REWARDS_LAB_STORAGE_KEY)).toBe(false);
    expect(loadRewardsLabState(storage)).toEqual(createDefaultRewardsLabState());
  });
});
