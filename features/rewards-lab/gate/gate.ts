import { REWARDS_LAB_EXPERIMENT_FLAGS_KEY } from '../contracts';

export { REWARDS_LAB_EXPERIMENT_FLAGS_KEY } from '../contracts';

export interface RewardsLabGateStorage {
  getItem(key: string): string | null;
}

export interface RewardsLabGateSnapshot {
  /** The persisted user preference, even when safe mode suppresses the experiment. */
  flagEnabled: boolean;
  /** Emergency page-level kill switch activated by `?safe=1`. */
  safeMode: boolean;
  /** Whether Rewards Lab may be loaded for this page. */
  enabled: boolean;
}

export type RewardsLabGateListener = () => void;
export type RewardsLabSearchSource = string | (() => string);

export interface RewardsLabGate {
  getSnapshot(): RewardsLabGateSnapshot;
  subscribe(listener: RewardsLabGateListener): () => void;
  /** Re-read the lightweight flag and current search string. */
  refresh(): RewardsLabGateSnapshot;
}

const DISABLED_SNAPSHOT: RewardsLabGateSnapshot = Object.freeze({
  flagEnabled: false,
  safeMode: false,
  enabled: false,
});

const readFlag = (storage: RewardsLabGateStorage): boolean => {
  try {
    const raw = storage.getItem(REWARDS_LAB_EXPERIMENT_FLAGS_KEY);
    if (raw === null) return false;
    const parsed = JSON.parse(raw) as unknown;
    return typeof parsed === 'object'
      && parsed !== null
      && !Array.isArray(parsed)
      && (parsed as Record<string, unknown>).rewardsLab === true;
  } catch {
    return false;
  }
};

const readSearch = (source: RewardsLabSearchSource): string => {
  try {
    return typeof source === 'function' ? source() : source;
  } catch {
    return '';
  }
};

const hasSafeMode = (search: string): boolean => {
  try {
    const normalized = search.startsWith('?') ? search : `?${search}`;
    return new URLSearchParams(normalized).get('safe') === '1';
  } catch {
    return false;
  }
};

const equalSnapshots = (
  left: RewardsLabGateSnapshot,
  right: RewardsLabGateSnapshot,
): boolean => left.flagEnabled === right.flagEnabled
  && left.safeMode === right.safeMode
  && left.enabled === right.enabled;

export const createRewardsLabGate = (
  storage: RewardsLabGateStorage,
  search: RewardsLabSearchSource = '',
): RewardsLabGate => {
  const listeners = new Set<RewardsLabGateListener>();

  const readSnapshot = (): RewardsLabGateSnapshot => {
    const flagEnabled = readFlag(storage);
    const safeMode = hasSafeMode(readSearch(search));
    return { flagEnabled, safeMode, enabled: flagEnabled && !safeMode };
  };

  let snapshot = readSnapshot();

  const refresh = (): RewardsLabGateSnapshot => {
    const nextSnapshot = readSnapshot();
    if (equalSnapshots(snapshot, nextSnapshot)) return snapshot;
    snapshot = nextSnapshot;
    listeners.forEach(listener => {
      try {
        listener();
      } catch {
        // A broken optional subscriber must not affect planner actions.
      }
    });
    return snapshot;
  };

  return {
    getSnapshot: () => snapshot,
    subscribe: listener => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    refresh,
  };
};

const browserStorage: RewardsLabGateStorage = {
  getItem: key => {
    if (typeof window === 'undefined') return null;
    return window.localStorage.getItem(key);
  },
};

/** The only Rewards Lab object imported during normal application startup. */
export const rewardsLabGate = typeof window === 'undefined'
  ? createRewardsLabGate({ getItem: () => null })
  : createRewardsLabGate(browserStorage, () => window.location.search);

if (typeof window !== 'undefined') {
  window.addEventListener('storage', event => {
    if (event.key === null || event.key === REWARDS_LAB_EXPERIMENT_FLAGS_KEY) {
      rewardsLabGate.refresh();
    }
  });
}

export const rewardsLabDisabledSnapshot = DISABLED_SNAPSHOT;
