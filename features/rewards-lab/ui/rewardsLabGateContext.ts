import { createContext } from 'react';
import { rewardsLabGate } from '../gate';
import type { RewardsLabGateSnapshot } from '../gate';

export const RewardsLabGateContext = createContext<RewardsLabGateSnapshot>(
  rewardsLabGate.getSnapshot(),
);
