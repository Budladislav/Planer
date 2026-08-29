import React, { Suspense, lazy } from 'react';
import { RewardsErrorBoundary } from './RewardsErrorBoundary';
import { useRewardsLabGate } from './useRewardsLabGate';

const ActiveRewardGradeMarker = lazy(() => import('./ActiveRewardGradeControls').then(module => ({
  default: module.ActiveRewardGradeMarker,
})));
const ActiveRewardGradeSelector = lazy(() => import('./ActiveRewardGradeControls').then(module => ({
  default: module.ActiveRewardGradeSelector,
})));

const GateAwareMarker: React.FC<{ taskId: string }> = ({ taskId }) => {
  const gate = useRewardsLabGate();
  if (!gate.enabled) return null;
  return (
    <Suspense fallback={null}>
      <ActiveRewardGradeMarker taskId={taskId} />
    </Suspense>
  );
};

const GateAwareSelector: React.FC<{ taskId: string; compact?: boolean }> = ({ taskId, compact }) => {
  const gate = useRewardsLabGate();
  if (!gate.enabled) return null;
  return (
    <Suspense fallback={null}>
      <ActiveRewardGradeSelector taskId={taskId} compact={compact} />
    </Suspense>
  );
};

export const RewardGradeMarker: React.FC<{ taskId: string }> = ({ taskId }) => (
  <RewardsErrorBoundary>
    <GateAwareMarker taskId={taskId} />
  </RewardsErrorBoundary>
);

export const RewardGradeSelector: React.FC<{ taskId: string; compact?: boolean }> = ({ taskId, compact }) => (
  <RewardsErrorBoundary>
    <GateAwareSelector taskId={taskId} compact={compact} />
  </RewardsErrorBoundary>
);
