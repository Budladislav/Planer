import React, { Suspense, lazy, useEffect } from 'react';
import { Dice5 } from 'lucide-react';
import { REWARD_GRADES } from '../domain';
import { rewardsLabGate } from '../gate';
import { useRewardsLab } from './useRewardsLab';

const RewardsLabPanel = lazy(() => import('./RewardsLabPanel'));

const RewardsLabActiveHost: React.FC = () => {
  const { runtime, snapshot } = useRewardsLab();

  useEffect(() => {
    rewardsLabGate.refresh();
  }, [snapshot.flagEnabled]);

  useEffect(() => {
    if (!snapshot.toast) return undefined;
    const timeout = window.setTimeout(() => runtime.dismissToast(), 4200);
    return () => window.clearTimeout(timeout);
  }, [runtime, snapshot.toast]);

  const toast = snapshot.toast;
  const grade = toast ? REWARD_GRADES[toast.grade] : null;
  const toastTitle = toast?.kind === 'restored' ? 'Reward restored' : 'Task reward';
  const toastDescription = toast && grade
    ? toast.kind === 'restored'
      ? `${grade.label} · original result restored`
      : `${toast.roll} × ${grade.label} ${toast.multiplier} = +${toast.amount} ${toast.currencyName}`
    : '';

  return (
    <>
      {toast && grade && (
        <button
          type="button"
          onClick={() => runtime.openLab()}
          className={`rewards-toast-enter fixed bottom-20 left-1/2 z-[70] w-[calc(100%-2rem)] max-w-sm -translate-x-1/2 rounded-xl border border-violet-200 bg-white px-4 py-3 text-left shadow-xl lg:bottom-6 ${snapshot.state?.animationsEnabled === false ? 'rewards-toast-static' : ''}`}
          aria-label={`${toastTitle}. ${toastDescription}. Open Rewards Lab.`}
        >
          <span className="flex items-start gap-3">
            <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-violet-100 text-violet-700">
              <Dice5 className="h-5 w-5" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-semibold text-slate-800">
                {toastTitle}
              </span>
              <span className="mt-0.5 block text-xs text-slate-500">
                {toastDescription}
              </span>
            </span>
            <span className="flex-shrink-0 text-sm font-bold text-violet-700">+{toast.amount}</span>
          </span>
        </button>
      )}

      {toast && grade && (
        <span className="sr-only" role="status" aria-live="polite" aria-atomic="true">
          {toastTitle}. {toastDescription}. Balance increased by {toast.amount} {toast.currencyName}.
        </span>
      )}

      {snapshot.isOpen && snapshot.enabled && (
        <Suspense fallback={(
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4" role="status">
            <div className="rounded-xl bg-white px-4 py-3 text-sm font-medium text-slate-600 shadow-xl">Opening Rewards Lab…</div>
          </div>
        )}>
          <RewardsLabPanel />
        </Suspense>
      )}
    </>
  );
};

export default RewardsLabActiveHost;
