import React from 'react';

interface RewardsErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

interface RewardsErrorBoundaryState {
  failed: boolean;
}

/** Keeps any experimental UI failure outside the planner's render tree. */
export class RewardsErrorBoundary extends React.Component<
  RewardsErrorBoundaryProps,
  RewardsErrorBoundaryState
> {
  state: RewardsErrorBoundaryState = { failed: false };

  static getDerivedStateFromError(): RewardsErrorBoundaryState {
    return { failed: true };
  }

  componentDidCatch(error: unknown): void {
    console.error('Rewards Lab UI paused after an isolated error.', error);
  }

  render(): React.ReactNode {
    if (this.state.failed) return this.props.fallback ?? null;
    return this.props.children;
  }
}
