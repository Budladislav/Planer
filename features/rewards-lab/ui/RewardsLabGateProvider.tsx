import React, { useSyncExternalStore } from 'react';
import { rewardsLabGate } from '../gate';
import { RewardsLabGateContext } from './rewardsLabGateContext';

/** One lightweight subscription feeds every task marker without per-card storage listeners. */
export const RewardsLabGateProvider: React.FC<React.PropsWithChildren> = ({ children }) => {
  const snapshot = useSyncExternalStore(
    rewardsLabGate.subscribe,
    rewardsLabGate.getSnapshot,
    rewardsLabGate.getSnapshot,
  );

  return (
    <RewardsLabGateContext.Provider value={snapshot}>
      {children}
    </RewardsLabGateContext.Provider>
  );
};
