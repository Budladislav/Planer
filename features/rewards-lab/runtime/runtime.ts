import {
  REWARD_GRADES,
  PurchaseItem,
  PurchaseItemInput,
  RewardDefinition,
  RewardDefinitionInput,
  RewardCatalogView,
  RewardGrade,
  RewardGroup,
  RewardsLabState,
  WalletTransaction,
  addRewardDefinition,
  addRewardGroup,
  addPurchaseItem,
  adjustWalletBalance,
  archiveRewardDefinition,
  deleteRewardDefinition,
  deleteRewardGroup,
  claimTaskCompletion,
  createDefaultRewardsLabState,
  ensureTaskMinimumGrade,
  getTaskGrade,
  regradeReversedTaskClaim,
  recordLabOpened,
  redeemPurchase,
  redeemReward,
  reorderRewardDefinitions,
  reorderRewardGroups,
  refundRedemption,
  reverseTaskCompletion,
  setTaskGrade as setDomainTaskGrade,
  setRewardCatalogView,
  updateRewardDefinition,
  updateRewardGroup,
  updatePurchaseItem,
  upgradeRewardKeys,
  undoLatestKeyUpgrade,
} from '../domain';
import { getEffectiveTaskGrade } from '../task-grade';
import type {
  EconomyRuntime,
  RedeemPurchaseOutcome,
  RedeemRewardOutcome,
  RefundOutcome,
} from '../domain';
import {
  clearRewardsLabLifecycleOutbox,
  drainRewardsLabLifecycleOutbox,
} from '../outbox';
import type { RewardsLabLifecycleEvent } from '../outbox';
import {
  StorageLike,
  clearRewardsLabData,
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
  amount: number;
  economyVersion: 1 | 2 | 3;
  keyGrade?: RewardGrade;
  keyDropWasProtected?: boolean;
  roll?: number;
  multiplier?: number;
  currencyName: string;
}

export interface RewardsLabRuntimeSnapshot {
  /** Persisted feature preference, even when safe mode suppresses it. */
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
  ensureTaskMinimumGrade(taskId: string, minimumGrade: RewardGrade): boolean;
  /** True means the event was handled idempotently and may be acknowledged. */
  handleTaskLifecycle(event: RewardsLabLifecycleEvent): boolean;
  addReward(input: RewardDefinitionInput): RewardDefinition | null;
  updateReward(rewardId: string, input: RewardDefinitionInput): RewardDefinition | null;
  addRewardGroup(title: string): RewardGroup | null;
  updateRewardGroup(groupId: string, title: string): RewardGroup | null;
  deleteRewardGroup(groupId: string): boolean;
  reorderRewardGroups(orderedGroupIds: string[]): boolean;
  archiveReward(rewardId: string): boolean;
  deleteReward(rewardId: string): boolean;
  reorderRewards(orderedRewardIds: string[]): boolean;
  updateRewardCatalogView(view: RewardCatalogView): boolean;
  redeem(rewardId: string, actualCost?: number): RedeemRewardOutcome;
  upgradeKeys(fromGrade: RewardGrade): boolean;
  undoLatestKeyUpgrade(): 'reversed' | 'not-found' | 'output-used';
  addPurchase(input: PurchaseItemInput): PurchaseItem | null;
  updatePurchase(purchaseId: string, input: PurchaseItemInput): PurchaseItem | null;
  redeemPurchase(purchaseId: string, actualCost: number): RedeemPurchaseOutcome;
  refund(spendTransactionId: string): RefundOutcome;
  adjustBalance(amount: number, label: string): boolean;
  updateCurrency(currencyName: string): boolean;
  updateAnimations(enabled: boolean): boolean;
  refreshFromStorage(): boolean;
}

const errorMessage = (error: unknown): string => (
  error instanceof Error && error.message ? error.message : 'Rewards operation failed.'
);

/** `?safe=1` is an emergency, read-only kill switch for the optional rewards module. */
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

  const drainPendingLifecycle = (): boolean => (
    drainRewardsLabLifecycleOutbox(storage, event => runtime.handleTaskLifecycle(event)).complete
  );

  const persist = (state: RewardsLabState, patch: Partial<RewardsLabRuntimeSnapshot> = {}): boolean => {
    if (!saveRewardsLabState(storage, state)) {
      return fail('Rewards data could not be saved on this device.');
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

    refreshFromStorage: () => {
      try {
        const refreshedFlag = loadExperimentFlags(storage).rewardsLab;
        const refreshedEnabled = refreshedFlag && !safeMode;
        patchSnapshot({
          flagEnabled: refreshedFlag,
          enabled: refreshedEnabled,
          state: refreshedEnabled ? loadRewardsLabState(storage) : null,
          isOpen: false,
          toast: null,
          lastError: null,
        });
        return true;
      } catch (error) {
        return fail(errorMessage(error));
      }
    },

    enable: () => {
      try {
        if (safeMode) return false;
        if (snapshot.enabled && snapshot.state) return true;

        const state = loadRewardsLabState(storage);
        // Write a validated state before making the feature visible. This avoids
        // an enabled flag pointing at storage that cannot persist the pilot.
        if (!saveRewardsLabState(storage, state)) {
          return fail('Rewards data could not be initialized on this device.');
        }
        if (!setRewardsLabEnabled(storage, true)) {
          return fail('Rewards could not be enabled on this device.');
        }
        patchSnapshot({
          flagEnabled: true,
          enabled: true,
          state,
          isOpen: false,
          toast: null,
          lastError: null,
        });
        // Pending work may have been captured immediately before an earlier
        // disable or page close. Re-enable always retries it in order.
        drainPendingLifecycle();
        return true;
      } catch (error) {
        return fail(errorMessage(error));
      }
    },

    disableKeepData: () => {
      try {
        if (!setRewardsLabEnabled(storage, false)) {
          return fail('Rewards could not be disabled on this device.');
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
        // Reset is explicitly destructive for this sidecar. Clear pending work
        // first so an old completion cannot repopulate the freshly reset lab.
        if (!clearRewardsLabLifecycleOutbox(storage)) {
          return fail('Rewards pending events could not be cleared on this device.');
        }
        if (!saveRewardsLabState(storage, state)) {
          return fail('Rewards data could not be reset on this device.');
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
        // Disable first. Nothing destructive happens unless the persisted kill
        // switch is guaranteed, and the in-memory runtime is deactivated before
        // state/outbox cleanup is attempted.
        if (!setRewardsLabEnabled(storage, false)) {
          return fail('Rewards could not be disabled, so no data was erased.');
        }
        patchSnapshot({
          flagEnabled: false,
          enabled: false,
          state: null,
          isOpen: false,
          toast: null,
          lastError: null,
        });

        const dataCleared = clearRewardsLabData(storage);
        const outboxCleared = clearRewardsLabLifecycleOutbox(storage);
        if (!dataCleared || !outboxCleared) {
          patchSnapshot({
            lastError: 'Rewards is disabled, but some data could not be erased.',
          });
          return false;
        }
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
            lastError: 'Rewards opened, but its usage metric could not be saved.',
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
        const claim = snapshot.state!.claims[taskId];
        if (!claim) return persist(setDomainTaskGrade(snapshot.state!, taskId, grade));

        // Posted claims stay locked. After Undo the claim may be corrected while
        // retaining its original v1 roll or v2 luck slot, so no reroll is possible.
        const result = regradeReversedTaskClaim(snapshot.state!, taskId, grade, economyRuntime);
        if (result.outcome === 'claim-active') return false;
        if (result.outcome === 'unchanged') return true;
        return result.outcome === 'regraded' ? persist(result.state) : false;
      } catch (error) {
        return fail(errorMessage(error));
      }
    },

    ensureTaskMinimumGrade: (taskId, minimumGrade) => {
      try {
        if (unavailable() || !taskId || !canUseGrade(minimumGrade)) return false;
        const result = ensureTaskMinimumGrade(snapshot.state!, taskId, minimumGrade, economyRuntime);
        return result.outcome === 'unchanged' || persist(result.state);
      } catch (error) {
        return fail(errorMessage(error));
      }
    },

    handleTaskLifecycle: event => {
      try {
        if (unavailable()) return false;

        if (event.type === 'task.completed') {
          const manualGrade = getTaskGrade(snapshot.state!, event.taskId);
          const minimumGrade = event.minimumGrade ?? (event.minimumUncommon || event.goalLinked ? 'uncommon' : 'common');
          const result = claimTaskCompletion(snapshot.state!, {
            taskId: event.taskId,
            taskTitle: event.title,
            completedAt: event.completedAt,
            grade: getEffectiveTaskGrade(manualGrade, minimumGrade),
            manualGrade,
            minimumGrade,
            importanceReasons: event.importanceReasons ?? [],
          }, economyRuntime);
          if (result.outcome === 'already-posted') return true;

          const toast: RewardsLabToast = {
            id: ++toastId,
            kind: result.outcome,
            taskId: result.claim.taskId,
            taskTitle: result.claim.taskTitle,
            grade: result.claim.grade,
            amount: result.claim.amount,
            economyVersion: result.claim.economyVersion,
            ...(result.key?.status === 'available' ? { keyGrade: result.key.grade } : {}),
            ...(result.outcome === 'earned' && result.keyDropWasProtected ? { keyDropWasProtected: true } : {}),
            ...(result.claim.economyVersion === 1
              ? { roll: result.claim.roll, multiplier: result.claim.multiplier }
              : {}),
            currencyName: result.state.currencyName,
          };
          return persist(result.state, { toast });
        }

        if (event.type === 'task.reopened' || event.type === 'task.deleted') {
          const result = reverseTaskCompletion(snapshot.state!, event.taskId, economyRuntime);
          if (result.outcome === 'reversed') return persist(result.state);
          return true;
        }
        return true;
      } catch (error) {
        fail(errorMessage(error));
        return false;
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

    addRewardGroup: title => {
      try {
        if (unavailable()) return null;
        const result = addRewardGroup(snapshot.state!, title, economyRuntime);
        return persist(result.state) ? result.group : null;
      } catch (error) {
        fail(errorMessage(error));
        return null;
      }
    },

    updateRewardGroup: (groupId, title) => {
      try {
        if (unavailable()) return null;
        const result = updateRewardGroup(snapshot.state!, groupId, title, economyRuntime);
        if (!result.group) return null;
        return persist(result.state) ? result.group : null;
      } catch (error) {
        fail(errorMessage(error));
        return null;
      }
    },

    deleteRewardGroup: groupId => {
      try {
        if (unavailable()) return false;
        const result = deleteRewardGroup(snapshot.state!, groupId);
        return result.group ? persist(result.state) : false;
      } catch (error) {
        return fail(errorMessage(error));
      }
    },

    reorderRewardGroups: orderedGroupIds => {
      try {
        if (unavailable()) return false;
        const nextState = reorderRewardGroups(snapshot.state!, orderedGroupIds);
        return nextState === snapshot.state ? false : persist(nextState);
      } catch (error) {
        return fail(errorMessage(error));
      }
    },

    deleteReward: rewardId => {
      try {
        if (unavailable()) return false;
        const result = deleteRewardDefinition(snapshot.state!, rewardId);
        return result.reward ? persist(result.state) : false;
      } catch (error) {
        return fail(errorMessage(error));
      }
    },

    reorderRewards: orderedRewardIds => {
      try {
        if (unavailable()) return false;
        const nextState = reorderRewardDefinitions(snapshot.state!, orderedRewardIds);
        return nextState === snapshot.state ? false : persist(nextState);
      } catch (error) {
        return fail(errorMessage(error));
      }
    },

    updateRewardCatalogView: view => {
      try {
        if (unavailable()) return false;
        return persist(setRewardCatalogView(snapshot.state!, view));
      } catch (error) {
        return fail(errorMessage(error));
      }
    },

    redeem: (rewardId, actualCost) => {
      try {
        if (unavailable()) return 'inactive';
        const result = redeemReward(snapshot.state!, rewardId, actualCost, economyRuntime);
        if (result.outcome === 'redeemed' && !persist(result.state)) return 'inactive';
        return result.outcome;
      } catch (error) {
        fail(errorMessage(error));
        return 'inactive';
      }
    },

    upgradeKeys: fromGrade => {
      try {
        if (unavailable() || !canUseGrade(fromGrade)) return false;
        const result = upgradeRewardKeys(snapshot.state!, fromGrade, economyRuntime);
        return result.outcome === 'upgraded' ? persist(result.state) : false;
      } catch (error) {
        return fail(errorMessage(error));
      }
    },

    undoLatestKeyUpgrade: () => {
      try {
        if (unavailable()) return 'not-found';
        const result = undoLatestKeyUpgrade(snapshot.state!, economyRuntime);
        if (result.outcome === 'reversed' && !persist(result.state)) return 'output-used';
        return result.outcome;
      } catch (error) {
        fail(errorMessage(error));
        return 'output-used';
      }
    },

    addPurchase: input => {
      try {
        if (unavailable()) return null;
        const result = addPurchaseItem(snapshot.state!, input, economyRuntime);
        return persist(result.state) ? result.purchase : null;
      } catch (error) {
        fail(errorMessage(error));
        return null;
      }
    },

    updatePurchase: (purchaseId, input) => {
      try {
        if (unavailable()) return null;
        const result = updatePurchaseItem(snapshot.state!, purchaseId, input, economyRuntime);
        if (!result.purchase) return null;
        return persist(result.state) ? result.purchase : null;
      } catch (error) {
        fail(errorMessage(error));
        return null;
      }
    },

    redeemPurchase: (purchaseId, actualCost) => {
      try {
        if (unavailable()) return 'inactive';
        const result = redeemPurchase(snapshot.state!, purchaseId, actualCost, economyRuntime);
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

  if (initiallyEnabled) drainPendingLifecycle();

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
