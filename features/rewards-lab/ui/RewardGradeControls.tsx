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

const GateAwareMarker: React.FC<{ taskId: string; goalLinked?: boolean }> = ({ taskId, goalLinked }) => {
  const gate = useRewardsLabGate();
  if (!gate.enabled) return null;
  return (
    <Suspense fallback={null}>
      <ActiveRewardGradeMarker taskId={taskId} goalLinked={goalLinked} />
    </Suspense>
  );
};

const GateAwareSelector: React.FC<{ taskId: string; compact?: boolean; goalLinked?: boolean }> = ({ taskId, compact, goalLinked }) => {
  const gate = useRewardsLabGate();
  if (!gate.enabled) return null;
  return (
    <Suspense fallback={null}>
      <ActiveRewardGradeSelector taskId={taskId} compact={compact} goalLinked={goalLinked} />
    </Suspense>
  );
};

const GateAwareSurface: React.FC<{ taskId: string; goalLinked?: boolean }> = ({ taskId, goalLinked }) => {
  const gate = useRewardsLabGate();
  if (!gate.enabled) return null;
  return (
    <Suspense fallback={null}>
      <ActiveRewardGradeSurface taskId={taskId} goalLinked={goalLinked} />
    </Suspense>
  );
};

const GateAwareIncrementButton: React.FC<{ taskId: string; goalLinked?: boolean }> = ({ taskId, goalLinked }) => {
  const gate = useRewardsLabGate();
  if (!gate.enabled) return null;
  return (
    <Suspense fallback={null}>
      <ActiveRewardGradeIncrementButton taskId={taskId} goalLinked={goalLinked} />
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

export const RewardGradeMarker: React.FC<{ taskId: string; goalLinked?: boolean }> = ({ taskId, goalLinked }) => (
  <RewardsErrorBoundary>
    <GateAwareMarker taskId={taskId} goalLinked={goalLinked} />
  </RewardsErrorBoundary>
);

export const RewardGradeSelector: React.FC<{ taskId: string; compact?: boolean; goalLinked?: boolean }> = ({ taskId, compact, goalLinked }) => (
  <RewardsErrorBoundary>
    <GateAwareSelector taskId={taskId} compact={compact} goalLinked={goalLinked} />
  </RewardsErrorBoundary>
);

export const RewardGradeSurface: React.FC<{ taskId: string; goalLinked?: boolean }> = ({ taskId, goalLinked }) => (
  <RewardsErrorBoundary>
    <GateAwareSurface taskId={taskId} goalLinked={goalLinked} />
  </RewardsErrorBoundary>
);

export const RewardGradeIncrementButton: React.FC<{ taskId: string; goalLinked?: boolean }> = ({ taskId, goalLinked }) => (
  <RewardsErrorBoundary>
    <GateAwareIncrementButton taskId={taskId} goalLinked={goalLinked} />
  </RewardsErrorBoundary>
);

export const RewardCompletionMeta: React.FC<{ taskId: string }> = ({ taskId }) => (
  <RewardsErrorBoundary>
    <GateAwareCompletionMeta taskId={taskId} />
  </RewardsErrorBoundary>
);
