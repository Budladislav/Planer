import React, { Suspense, lazy } from 'react';
import type { Task } from '../../../types';
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
const ActiveRewardImportanceMarkers = lazy(() => import('./ActiveRewardGradeControls').then(module => ({
  default: module.ActiveRewardImportanceMarkers,
})));
const ActiveRewardAutomaticMinimumControl = lazy(() => import('./ActiveRewardGradeControls').then(module => ({
  default: module.ActiveRewardAutomaticMinimumControl,
})));

type TaskGradeProps = { task: Task };

const GateAwareMarker: React.FC<TaskGradeProps> = ({ task }) => {
  const gate = useRewardsLabGate();
  if (!gate.enabled) return null;
  return (
    <Suspense fallback={null}>
      <ActiveRewardGradeMarker task={task} />
    </Suspense>
  );
};

const GateAwareSelector: React.FC<TaskGradeProps & { compact?: boolean }> = ({ task, compact }) => {
  const gate = useRewardsLabGate();
  if (!gate.enabled) return null;
  return (
    <Suspense fallback={null}>
      <ActiveRewardGradeSelector task={task} compact={compact} />
    </Suspense>
  );
};

const GateAwareSurface: React.FC<TaskGradeProps> = ({ task }) => {
  const gate = useRewardsLabGate();
  if (!gate.enabled) return null;
  return (
    <Suspense fallback={null}>
      <ActiveRewardGradeSurface task={task} />
    </Suspense>
  );
};

const GateAwareIncrementButton: React.FC<TaskGradeProps> = ({ task }) => {
  const gate = useRewardsLabGate();
  if (!gate.enabled) return null;
  return (
    <Suspense fallback={null}>
      <ActiveRewardGradeIncrementButton task={task} />
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

export const RewardGradeMarker: React.FC<TaskGradeProps> = ({ task }) => (
  <RewardsErrorBoundary>
    <GateAwareMarker task={task} />
  </RewardsErrorBoundary>
);

export const RewardGradeSelector: React.FC<TaskGradeProps & { compact?: boolean }> = ({ task, compact }) => (
  <RewardsErrorBoundary>
    <GateAwareSelector task={task} compact={compact} />
  </RewardsErrorBoundary>
);

export const RewardGradeSurface: React.FC<TaskGradeProps> = ({ task }) => (
  <RewardsErrorBoundary>
    <GateAwareSurface task={task} />
  </RewardsErrorBoundary>
);

export const RewardGradeIncrementButton: React.FC<TaskGradeProps> = ({ task }) => (
  <RewardsErrorBoundary>
    <GateAwareIncrementButton task={task} />
  </RewardsErrorBoundary>
);

export const RewardCompletionMeta: React.FC<{ taskId: string }> = ({ taskId }) => (
  <RewardsErrorBoundary>
    <GateAwareCompletionMeta taskId={taskId} />
  </RewardsErrorBoundary>
);

export const RewardImportanceMarkers: React.FC<TaskGradeProps> = ({ task }) => {
  const gate = useRewardsLabGate();
  if (!gate.enabled) return null;
  return (
    <RewardsErrorBoundary>
      <Suspense fallback={null}><ActiveRewardImportanceMarkers task={task} /></Suspense>
    </RewardsErrorBoundary>
  );
};

export const RewardAutomaticMinimumControl: React.FC<TaskGradeProps> = ({ task }) => {
  const gate = useRewardsLabGate();
  if (!gate.enabled) return null;
  return (
    <RewardsErrorBoundary>
      <Suspense fallback={null}><ActiveRewardAutomaticMinimumControl task={task} /></Suspense>
    </RewardsErrorBoundary>
  );
};
