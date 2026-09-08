import React, { Suspense, lazy } from 'react';
import { RewardsErrorBoundary } from './RewardsErrorBoundary';
import { useRewardsLabGate } from './useRewardsLabGate';

const ActiveRewardGradeMarker = lazy(() => import('./ActiveRewardGradeControls').then(module => ({
  default: module.ActiveRewardGradeMarker,
})));
const ActiveRewardGradeSelector = lazy(() => import('./ActiveRewardGradeControls').then(module => ({
  default: module.ActiveRewardGradeSelector,
})));
const ActiveRewardGradeSurface = lazy(() => import('./ActiveRewardGradeControls').then(module => ({
  default: module.ActiveRewardGradeSurface,
})));
const ActiveRewardGradeIncrementButton = lazy(() => import('./ActiveRewardGradeControls').then(module => ({
  default: module.ActiveRewardGradeIncrementButton,
})));
const ActiveRewardCompletionMeta = lazy(() => import('./ActiveRewardGradeControls').then(module => ({
  default: module.ActiveRewardCompletionMeta,
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

const GateAwareSurface: React.FC<{ taskId: string }> = ({ taskId }) => {
  const gate = useRewardsLabGate();
  if (!gate.enabled) return null;
  return (
    <Suspense fallback={null}>
      <ActiveRewardGradeSurface taskId={taskId} />
    </Suspense>
  );
};

const GateAwareIncrementButton: React.FC<{ taskId: string }> = ({ taskId }) => {
  const gate = useRewardsLabGate();
  if (!gate.enabled) return null;
  return (
    <Suspense fallback={null}>
      <ActiveRewardGradeIncrementButton taskId={taskId} />
    </Suspense>
  );
};

const GateAwareCompletionMeta: React.FC<{ taskId: string }> = ({ taskId }) => {
  const gate = useRewardsLabGate();
  if (!gate.enabled) return null;
  return (
    <Suspense fallback={null}>
      <ActiveRewardCompletionMeta taskId={taskId} />
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

export const RewardGradeSurface: React.FC<{ taskId: string }> = ({ taskId }) => (
  <RewardsErrorBoundary>
    <GateAwareSurface taskId={taskId} />
  </RewardsErrorBoundary>
);

export const RewardGradeIncrementButton: React.FC<{ taskId: string }> = ({ taskId }) => (
  <RewardsErrorBoundary>
    <GateAwareIncrementButton taskId={taskId} />
  </RewardsErrorBoundary>
);

export const RewardCompletionMeta: React.FC<{ taskId: string }> = ({ taskId }) => (
  <RewardsErrorBoundary>
    <GateAwareCompletionMeta taskId={taskId} />
  </RewardsErrorBoundary>
);
