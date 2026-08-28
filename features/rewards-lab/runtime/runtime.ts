import type { TaskLifecycleEvent } from '../../../task-lifecycle';
import {
  REWARD_GRADES,
  RewardDefinition,
  RewardDefinitionInput,
  RewardGrade,
  RewardsLabState,
  WalletTransaction,
  addRewardDefinition,
  adjustWalletBalance,
  archiveRewardDefinition,
  claimTaskCompletion,
  createDefaultRewardsLabState,
  recordLabOpened,
  redeemReward,
  refundRedemption,
  reverseTaskCompletion,
  setTaskGrade as setDomainTaskGrade,
  updateRewardDefinition,
} from '../domain';
import type {
  EconomyRuntime,
  RedeemRewardOutcome,
  RefundOutcome,
} from '../domain';
import {
  StorageLike,
  eraseRewardsLab,
  loadExperimentFlags,
  loadRewardsLabState,
  saveRewardsLabState,
  setRewardsLabEnabled,
} from '../storage';

export interface RewardsLabToast {
  id: number;
  kind: 'earned' | 'restored';
  taskId: string;
  taskTitle: string;
  grade: RewardGrade;
  roll: number;
  multiplier: number;
  amount: number;
  currencyName: string;
}

export interface RewardsLabRuntimeSnapshot {
  /** Persisted experiment preference, even when safe mode suppresses it. */
  flagEnabled: boolean;
  /** Whether the sidecar is active for this page load. */
  enabled: boolean;
  safeMode: boolean;
  /** Heavy state is deliberately not loaded while disabled or in safe mode. */
  state: RewardsLabState | null;
  isOpen: boolean;
  toast: RewardsLabToast | null;
  lastError: string | null;
}

export type RewardsLabRuntimeListener = () => void;

export interface RewardsLabRuntime {
  getSnapshot(): RewardsLabRuntimeSnapshot;
  subscribe(listener: RewardsLabRuntimeListener): () => void;
  enable(): boolean;
  disableKeepData(): boolean;
  resetDataKeepingEnabled(): boolean;
  disableAndErase(): boolean;
  openLab(): boolean;
  closeLab(): void;
  dismissToast(): void;
  setTaskGrade(taskId: string, grade: RewardGrade): boolean;
  handleTaskLifecycle(event: TaskLifecycleEvent): void;
  addReward(input: RewardDefinitionInput): RewardDefinition | null;
  updateReward(rewardId: string, input: RewardDefinitionInput): RewardDefinition | null;
  archiveReward(rewardId: string): boolean;
  redeem(rewardId: string): RedeemRewardOutcome;
  refund(spendTransactionId: string): RefundOutcome;
  adjustBalance(amount: number, label: string): boolean;
  updateCurrency(currencyName: string): boolean;
  updateAnimations(enabled: boolean): boolean;
}

const errorMessage = (error: unknown): string => (
  error instanceof Error && error.message ? error.message : 'Rewards Lab operation failed.'
);

/** `?safe=1` is an emergency, read-only kill switch for experimental features. */
export const isRewardsLabSafeMode = (search: string): boolean => {
  try {
    const normalized = search.startsWith('?') ? search : `?${search}`;
    return new URLSearchParams(normalized).get('safe') === '1';
  } catch {
    return false;
  }
};

const canUseGrade = (value: RewardGrade): boolean => Object.hasOwn(REWARD_GRADES, value);

export const createRewardsLabRuntime = (
  storage: StorageLike,
  search = '',
  economyRuntime: EconomyRuntime = {},
): RewardsLabRuntime => {
  const safeMode = isRewardsLabSafeMode(search);
  const flagEnabled = loadExperimentFlags(storage).rewardsLab;
  const initiallyEnabled = flagEnabled && !safeMode;
  const listeners = new Set<RewardsLabRuntimeListener>();
  let toastId = 0;
  let snapshot: RewardsLabRuntimeSnapshot = {
    flagEnabled,
    enabled: initiallyEnabled,
    safeMode,
    state: initiallyEnabled ? loadRewardsLabState(storage) : null,
    isOpen: false,
    toast: null,
    lastError: null,
  };

  const publish = (): void => {
    listeners.forEach(listener => {
      try {
        listener();
      } catch {
        // A rendering subscriber is just as optional as this entire sidecar.
      }
    });
  };

  const patchSnapshot = (patch: Partial<RewardsLabRuntimeSnapshot>): void => {
    snapshot = { ...snapshot, ...patch };
    publish();
  };

  const fail = (message: string): false => {
    patchSnapshot({ lastError: message });
    return false;
  };

  const unavailable = (): boolean => !snapshot.enabled || snapshot.state === null;

  const persist = (state: RewardsLabState, patch: Partial<RewardsLabRuntimeSnapshot> = {}): boolean => {
    if (!saveRewardsLabState(storage, state)) {
      return fail('Rewards Lab data could not be saved on this device.');
    }
    patchSnapshot({ ...patch, state, lastError: null });
    return true;
  };

  const runtime: RewardsLabRuntime = {
    getSnapshot: () => snapshot,

    subscribe: listener => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },

    enable: () => {
      try {
        if (safeMode) return false;
        if (snapshot.enabled && snapshot.state) return true;

        const state = loadRewardsLabState(storage);
        // Write a validated state before making the feature visible. This avoids
        // an enabled flag pointing at storage that cannot persist the pilot.
        if (!saveRewardsLabState(storage, state)) {
          return fail('Rewards Lab data could not be initialized on this device.');
        }
        if (!setRewardsLabEnabled(storage, true)) {
          return fail('Rewards Lab could not be enabled on this device.');
        }
        patchSnapshot({
          flagEnabled: true,
          enabled: true,
          state,
          isOpen: false,
          toast: null,
          lastError: null,
        });
        return true;
      } catch (error) {
        return fail(errorMessage(error));
      }
    },

    disableKeepData: () => {
      try {
        if (!setRewardsLabEnabled(storage, false)) {
          return fail('Rewards Lab could not be disabled on this device.');
        }
        patchSnapshot({
          flagEnabled: false,
          enabled: false,
          state: null,
          isOpen: false,
          toast: null,
          lastError: null,
        });
        return true;
      } catch (error) {
        return fail(errorMessage(error));
      }
    },

    resetDataKeepingEnabled: () => {
      try {
        if (safeMode || !snapshot.flagEnabled) return false;
        const state = createDefaultRewardsLabState();
        if (!saveRewardsLabState(storage, state)) {
          return fail('Rewards Lab data could not be reset on this device.');
        }
        if (!setRewardsLabEnabled(storage, true)) {
          return fail('Rewards Lab could not remain enabled after reset.');
        }
        patchSnapshot({
          flagEnabled: true,
          enabled: true,
          state,
          isOpen: false,
          toast: null,
          lastError: null,
        });
        return true;
      } catch (error) {
        return fail(errorMessage(error));
      }
    },

    disableAndErase: () => {
      try {
        if (!eraseRewardsLab(storage)) {
          return fail('Rewards Lab data could not be erased completely.');
        }
        patchSnapshot({
          flagEnabled: false,
          enabled: false,
          state: null,
          isOpen: false,
          toast: null,
          lastError: null,
        });
        return true;
      } catch (error) {
        return fail(errorMessage(error));
      }
    },

    openLab: () => {
      try {
        if (unavailable()) return false;
        if (snapshot.isOpen) return true;
        const state = recordLabOpened(snapshot.state!, economyRuntime);
        if (!saveRewardsLabState(storage, state)) {
          patchSnapshot({
            isOpen: true,
            lastError: 'Rewards Lab opened, but its usage metric could not be saved.',
          });
          return true;
        }
        patchSnapshot({ state, isOpen: true, lastError: null });
        return true;
      } catch (error) {
        patchSnapshot({ isOpen: true, lastError: errorMessage(error) });
        return true;
      }
    },

    closeLab: () => {
      if (!snapshot.isOpen) return;
      patchSnapshot({ isOpen: false });
    },

    dismissToast: () => {
      if (!snapshot.toast) return;
      patchSnapshot({ toast: null });
    },

    setTaskGrade: (taskId, grade) => {
      try {
        if (unavailable() || !taskId || !canUseGrade(grade)) return false;
        // A claim is an immutable audit record. Reopening never unlocks its
        // grade because a later completion restores that exact same claim.
        if (snapshot.state!.claims[taskId]) return false;
        return persist(setDomainTaskGrade(snapshot.state!, taskId, grade));
      } catch (error) {
        return fail(errorMessage(error));
      }
    },

    handleTaskLifecycle: event => {
      try {
        if (unavailable()) return;

        if (event.type === 'task.completed') {
          const result = claimTaskCompletion(snapshot.state!, {
            taskId: event.taskId,
            taskTitle: event.title,
            completedAt: event.completedAt,
          }, economyRuntime);
          if (result.outcome === 'already-posted') return;

          const toast: RewardsLabToast = {
            id: ++toastId,
            kind: result.outcome,
            taskId: result.claim.taskId,
            taskTitle: result.claim.taskTitle,
            grade: result.claim.grade,
            roll: result.claim.roll,
            multiplier: result.claim.multiplier,
            amount: result.claim.amount,
            currencyName: result.state.currencyName,
          };
          persist(result.state, { toast });
          return;
        }

        if (event.type === 'task.reopened') {
          const result = reverseTaskCompletion(snapshot.state!, event.taskId, economyRuntime);
          if (result.outcome === 'reversed') persist(result.state);
        }
      } catch (error) {
        fail(errorMessage(error));
      }
    },

    addReward: input => {
      try {
        if (unavailable()) return null;
        const result = addRewardDefinition(snapshot.state!, input, economyRuntime);
        return persist(result.state) ? result.reward : null;
      } catch (error) {
        fail(errorMessage(error));
        return null;
      }
    },

    updateReward: (rewardId, input) => {
      try {
        if (unavailable()) return null;
        const result = updateRewardDefinition(snapshot.state!, rewardId, input, economyRuntime);
        if (!result.reward) return null;
        return persist(result.state) ? result.reward : null;
      } catch (error) {
        fail(errorMessage(error));
        return null;
      }
    },

    archiveReward: rewardId => {
      try {
        if (unavailable()) return false;
        const result = archiveRewardDefinition(snapshot.state!, rewardId, economyRuntime);
        return result.reward ? persist(result.state) : false;
      } catch (error) {
        return fail(errorMessage(error));
      }
    },

    redeem: rewardId => {
      try {
        if (unavailable()) return 'inactive';
        const result = redeemReward(snapshot.state!, rewardId, economyRuntime);
        if (result.outcome === 'redeemed' && !persist(result.state)) return 'inactive';
        return result.outcome;
      } catch (error) {
        fail(errorMessage(error));
        return 'inactive';
      }
    },

    refund: spendTransactionId => {
      try {
        if (unavailable()) return 'not-found';
        const result = refundRedemption(snapshot.state!, spendTransactionId, economyRuntime);
        if (result.outcome === 'refunded' && !persist(result.state)) return 'not-found';
        return result.outcome;
      } catch (error) {
        fail(errorMessage(error));
        return 'not-found';
      }
    },

    adjustBalance: (amount, label) => {
      try {
        if (unavailable()) return false;
        return persist(adjustWalletBalance(snapshot.state!, amount, label, economyRuntime).state);
      } catch (error) {
        return fail(errorMessage(error));
      }
    },

    updateCurrency: currencyName => {
      try {
        if (unavailable()) return false;
        const normalized = currencyName.trim();
        if (!normalized || normalized.length > 40) return false;
        return persist({ ...snapshot.state!, currencyName: normalized });
      } catch (error) {
        return fail(errorMessage(error));
      }
    },

    updateAnimations: enabled => {
      try {
        if (unavailable()) return false;
        return persist({ ...snapshot.state!, animationsEnabled: enabled });
      } catch (error) {
        return fail(errorMessage(error));
      }
    },
  };

  return runtime;
};

/** Uniform random value in [0, 1), backed by Web Crypto in capable browsers. */
export const secureBrowserRandom = (): number => {
  if (typeof globalThis.crypto !== 'undefined'
    && typeof globalThis.crypto.getRandomValues === 'function') {
    const sample = new Uint32Array(1);
    globalThis.crypto.getRandomValues(sample);
    return sample[0] / 0x1_0000_0000;
  }
  // Kept only for unusual non-browser runtimes; supported browsers use Web Crypto.
  return Math.random();
};

const inaccessibleBrowserStorage: StorageLike = {
  getItem: () => null,
  setItem: () => { throw new Error('Browser storage is unavailable.'); },
  removeItem: () => { throw new Error('Browser storage is unavailable.'); },
};

let browserRuntime: RewardsLabRuntime | null = null;

/** Lazily creates the browser singleton, keeping module import SSR-safe. */
export const getRewardsLabRuntime = (): RewardsLabRuntime => {
  if (browserRuntime) return browserRuntime;

  let storage = inaccessibleBrowserStorage;
  let search = '';
  if (typeof window !== 'undefined') {
    search = window.location.search;
    try {
      storage = window.localStorage;
    } catch {
      storage = inaccessibleBrowserStorage;
    }
  }

  browserRuntime = createRewardsLabRuntime(storage, search, { random: secureBrowserRandom });
  return browserRuntime;
};

export type { RewardDefinitionInput, RedeemRewardOutcome, RefundOutcome, WalletTransaction };
