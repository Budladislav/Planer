import React, { Suspense, lazy } from 'react';
import { RewardsErrorBoundary } from './RewardsErrorBoundary';
import { useRewardsLabGate } from './useRewardsLabGate';

const ActiveRewardsBalancePill = lazy(() => import('./ActiveRewardsBalancePill').then(module => ({
  default: module.ActiveRewardsBalancePill,
})));

const GateAwareBalancePill: React.FC = () => {
  const gate = useRewardsLabGate();
  if (!gate.enabled) return null;
  return (
    <Suspense fallback={null}>
      <ActiveRewardsBalancePill />
    </Suspense>
  );
};

export const RewardsBalancePill: React.FC = () => (
  <RewardsErrorBoundary>
    <GateAwareBalancePill />
  </RewardsErrorBoundary>
);
