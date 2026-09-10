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

type LinkedGradeProps = { taskId: string; goalLinked?: boolean; eventLinked?: boolean };

const GateAwareMarker: React.FC<LinkedGradeProps> = ({ taskId, goalLinked, eventLinked }) => {
  const gate = useRewardsLabGate();
  if (!gate.enabled) return null;
  return (
    <Suspense fallback={null}>
      <ActiveRewardGradeMarker taskId={taskId} minimumUncommon={Boolean(goalLinked || eventLinked)} />
    </Suspense>
  );
};

const GateAwareSelector: React.FC<LinkedGradeProps & { compact?: boolean }> = ({ taskId, compact, goalLinked, eventLinked }) => {
  const gate = useRewardsLabGate();
  if (!gate.enabled) return null;
  return (
    <Suspense fallback={null}>
      <ActiveRewardGradeSelector taskId={taskId} compact={compact} minimumUncommon={Boolean(goalLinked || eventLinked)} />
    </Suspense>
  );
};

const GateAwareSurface: React.FC<LinkedGradeProps> = ({ taskId, goalLinked, eventLinked }) => {
  const gate = useRewardsLabGate();
  if (!gate.enabled) return null;
  return (
    <Suspense fallback={null}>
      <ActiveRewardGradeSurface taskId={taskId} minimumUncommon={Boolean(goalLinked || eventLinked)} />
    </Suspense>
  );
};

const GateAwareIncrementButton: React.FC<LinkedGradeProps> = ({ taskId, goalLinked, eventLinked }) => {
  const gate = useRewardsLabGate();
  if (!gate.enabled) return null;
  return (
    <Suspense fallback={null}>
      <ActiveRewardGradeIncrementButton taskId={taskId} minimumUncommon={Boolean(goalLinked || eventLinked)} />
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

export const RewardGradeMarker: React.FC<LinkedGradeProps> = ({ taskId, goalLinked, eventLinked }) => (
  <RewardsErrorBoundary>
    <GateAwareMarker taskId={taskId} goalLinked={goalLinked} eventLinked={eventLinked} />
  </RewardsErrorBoundary>
);

export const RewardGradeSelector: React.FC<LinkedGradeProps & { compact?: boolean }> = ({ taskId, compact, goalLinked, eventLinked }) => (
  <RewardsErrorBoundary>
    <GateAwareSelector taskId={taskId} compact={compact} goalLinked={goalLinked} eventLinked={eventLinked} />
  </RewardsErrorBoundary>
);

export const RewardGradeSurface: React.FC<LinkedGradeProps> = ({ taskId, goalLinked, eventLinked }) => (
  <RewardsErrorBoundary>
    <GateAwareSurface taskId={taskId} goalLinked={goalLinked} eventLinked={eventLinked} />
  </RewardsErrorBoundary>
);

export const RewardGradeIncrementButton: React.FC<LinkedGradeProps> = ({ taskId, goalLinked, eventLinked }) => (
  <RewardsErrorBoundary>
    <GateAwareIncrementButton taskId={taskId} goalLinked={goalLinked} eventLinked={eventLinked} />
  </RewardsErrorBoundary>
);

export const RewardCompletionMeta: React.FC<{ taskId: string }> = ({ taskId }) => (
  <RewardsErrorBoundary>
    <GateAwareCompletionMeta taskId={taskId} />
  </RewardsErrorBoundary>
);
