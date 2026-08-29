import { useSyncExternalStore } from 'react';
import { getRewardsLabRuntime } from '../runtime';

export const useRewardsLab = () => {
  const runtime = getRewardsLabRuntime();
  const snapshot = useSyncExternalStore(
    runtime.subscribe,
    runtime.getSnapshot,
    runtime.getSnapshot,
  );
  return { runtime, snapshot };
};
