import { describe, expect, it, vi } from 'vitest';
import {
  REWARDS_LAB_EXPERIMENT_FLAGS_KEY,
  RewardsLabGateStorage,
  createRewardsLabGate,
} from './gate';

class MemoryStorage implements RewardsLabGateStorage {
  values = new Map<string, string>();

  getItem(key: string): string | null {
    return this.values.get(key) ?? null;
  }
}

describe('Rewards Lab feature gate', () => {
  it('is disabled by default', () => {
    const gate = createRewardsLabGate(new MemoryStorage());

    expect(gate.getSnapshot()).toEqual({
      flagEnabled: false,
      safeMode: false,
      enabled: false,
    });
  });

  it('enables only for an explicit boolean flag', () => {
    const storage = new MemoryStorage();
    storage.values.set(REWARDS_LAB_EXPERIMENT_FLAGS_KEY, JSON.stringify({ rewardsLab: true }));

    expect(createRewardsLabGate(storage).getSnapshot()).toEqual({
      flagEnabled: true,
      safeMode: false,
      enabled: true,
    });
  });

  it('fails closed for malformed or wrongly typed data', () => {
    const storage = new MemoryStorage();
    storage.values.set(REWARDS_LAB_EXPERIMENT_FLAGS_KEY, '{broken');
    expect(createRewardsLabGate(storage).getSnapshot().enabled).toBe(false);

    storage.values.set(REWARDS_LAB_EXPERIMENT_FLAGS_KEY, JSON.stringify({ rewardsLab: 'yes' }));
    expect(createRewardsLabGate(storage).getSnapshot().enabled).toBe(false);
  });

  it('does not throw when storage access fails', () => {
    const storage: RewardsLabGateStorage = {
      getItem: () => { throw new Error('Storage is blocked'); },
    };

    expect(createRewardsLabGate(storage).getSnapshot()).toEqual({
      flagEnabled: false,
      safeMode: false,
      enabled: false,
    });
  });

  it('preserves the flag but suppresses the experiment in safe mode', () => {
    const storage = new MemoryStorage();
    storage.values.set(REWARDS_LAB_EXPERIMENT_FLAGS_KEY, JSON.stringify({ rewardsLab: true }));

    expect(createRewardsLabGate(storage, '?safe=1&view=today').getSnapshot()).toEqual({
      flagEnabled: true,
      safeMode: true,
      enabled: false,
    });
  });

  it('refreshes a stable snapshot and notifies subscribers only after a change', () => {
    const storage = new MemoryStorage();
    let search = '';
    const gate = createRewardsLabGate(storage, () => search);
    const initialSnapshot = gate.getSnapshot();
    const listener = vi.fn();
    const unsubscribe = gate.subscribe(listener);

    expect(gate.refresh()).toBe(initialSnapshot);
    expect(listener).not.toHaveBeenCalled();

    storage.values.set(REWARDS_LAB_EXPERIMENT_FLAGS_KEY, JSON.stringify({ rewardsLab: true }));
    const enabledSnapshot = gate.refresh();
    expect(enabledSnapshot).not.toBe(initialSnapshot);
    expect(enabledSnapshot.enabled).toBe(true);
    expect(listener).toHaveBeenCalledTimes(1);

    expect(gate.refresh()).toBe(enabledSnapshot);
    expect(listener).toHaveBeenCalledTimes(1);

    search = '?safe=1';
    expect(gate.refresh()).toEqual({ flagEnabled: true, safeMode: true, enabled: false });
    expect(listener).toHaveBeenCalledTimes(2);

    unsubscribe();
    storage.values.set(REWARDS_LAB_EXPERIMENT_FLAGS_KEY, JSON.stringify({ rewardsLab: false }));
    gate.refresh();
    expect(listener).toHaveBeenCalledTimes(2);
  });
});
