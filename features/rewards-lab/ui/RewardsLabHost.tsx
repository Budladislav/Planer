import React, { Suspense, lazy, useLayoutEffect } from 'react';
import { subscribeToTaskLifecycle } from '../../../task-lifecycle';
import { rewardsLabGate } from '../gate';
import {
  drainRewardsLabLifecycleOutbox,
  enqueueRewardsLabLifecycleEvent,
} from '../outbox';
import type { RewardsLabOutboxStorage } from '../outbox';
import { RewardsErrorBoundary } from './RewardsErrorBoundary';
import { useRewardsLabGate } from './useRewardsLabGate';

const RewardsLabActiveHost = lazy(() => import('./RewardsLabActiveHost'));
let lifecycleQueue: Promise<void> = Promise.resolve();

const GateAwareHost: React.FC = () => {
  const gate = useRewardsLabGate();

  useLayoutEffect(() => subscribeToTaskLifecycle(event => {
    if (!rewardsLabGate.getSnapshot().enabled) return;

    let storage: RewardsLabOutboxStorage | null = null;
    let queued = false;
    try {
      storage = window.localStorage;
      // This synchronous sidecar write is intentionally the only work done
      // before returning control to the planner completion command.
      queued = enqueueRewardsLabLifecycleEvent(storage, event);
    } catch {
      storage = null;
    }

    lifecycleQueue = lifecycleQueue
      .then(async () => {
        const { getRewardsLabRuntime } = await import('../runtime');
        const runtime = getRewardsLabRuntime();
        if (queued && storage) {
          drainRewardsLabLifecycleOutbox(storage, pending => runtime.handleTaskLifecycle(pending));
        } else {
          // Storage can be unavailable in privacy modes. Keep the planner
          // fail-open and still attempt the best-effort in-memory reward.
          runtime.handleTaskLifecycle(event);
        }
      })
      .catch(() => {
        // Rewards are optional; a failed lazy sidecar must not reach the planner.
      });
  }), []);

  if (!gate.enabled) return null;
  return (
    <Suspense fallback={null}>
      <RewardsLabActiveHost />
    </Suspense>
  );
};

export const RewardsLabHost: React.FC = () => (
  <RewardsErrorBoundary fallback={(
    <div className="fixed bottom-20 left-1/2 z-40 -translate-x-1/2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900 shadow-sm lg:bottom-4">
      Rewards Lab paused; planner continues.
    </div>
  )}>
    <GateAwareHost />
  </RewardsErrorBoundary>
);
