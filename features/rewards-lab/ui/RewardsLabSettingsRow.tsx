import React, { useState } from 'react';
import { ChevronDown, Dice5, ExternalLink, ShieldCheck, Trash2 } from 'lucide-react';
import { ConfirmModal } from '../../../components/Modal';
import { rewardsLabGate } from '../gate';
import type { RewardsLabRuntime } from '../runtime';
import { useRewardsLabGate } from './useRewardsLabGate';
import { useI18n } from '../../../i18n';

type Confirmation = 'enable' | 'reset' | 'erase' | null;

const confirmationCopy: Record<Exclude<Confirmation, null>, {
  title: string;
  message: string;
  confirmText: string;
  danger: boolean;
}> = {
  enable: {
    title: 'Enable Rewards Lab?',
    message: 'Rewards Lab is an optional experiment stored only on this device. Its grades, wallet and rewards are not included in planner backups or future planner sync. You can disable it, reset it, or erase it at any time without changing planner tasks.',
    confirmText: 'Enable experiment',
    danger: false,
  },
  reset: {
    title: 'Reset Rewards Lab?',
    message: 'This permanently clears grades, claims, wallet history, rewards and experiment settings. Rewards Lab stays enabled. Planner tasks and backups are not affected.',
    confirmText: 'Reset experiment',
    danger: true,
  },
  erase: {
    title: 'Disable and erase Rewards Lab?',
    message: 'This permanently removes all Rewards Lab data from this device and turns the experiment off. Planner tasks and backups are not affected.',
    confirmText: 'Disable & erase',
    danger: true,
  },
};

export const RewardsLabSettingsRow: React.FC = () => {
  const { t } = useI18n();
  const snapshot = useRewardsLabGate();
  const [expanded, setExpanded] = useState(false);
  const [confirmation, setConfirmation] = useState<Confirmation>(null);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const status = snapshot.safeMode && snapshot.flagEnabled
    ? t('Paused by safe mode')
    : snapshot.enabled
      ? t('On')
      : t('Off');
  const copy = confirmation ? confirmationCopy[confirmation] : null;

  const withRuntime = async (action: (runtime: RewardsLabRuntime) => boolean): Promise<void> => {
    setBusy(true);
    setActionError(null);
    try {
      const { getRewardsLabRuntime } = await import('../runtime');
      const runtime = getRewardsLabRuntime();
      const succeeded = action(runtime);
      rewardsLabGate.refresh();
      if (!succeeded) {
        setActionError(t(runtime.getSnapshot().lastError ?? 'Rewards Lab could not complete that action.'));
      }
    } catch {
      setActionError(t('Rewards Lab could not be loaded. Planner data was not affected.'));
    } finally {
      setBusy(false);
    }
  };

  const runConfirmedAction = () => {
    if (confirmation === 'enable') void withRuntime(runtime => runtime.enable());
    if (confirmation === 'reset') void withRuntime(runtime => runtime.resetDataKeepingEnabled());
    if (confirmation === 'erase') void withRuntime(runtime => runtime.disableAndErase());
  };

  return (
    <div>
      <button
        type="button"
        aria-expanded={expanded}
        onClick={() => setExpanded(value => !value)}
        className="flex w-full items-center gap-3 p-4 text-left hover:bg-slate-50"
      >
        <Dice5 className="h-5 w-5 flex-shrink-0 text-violet-500" />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-semibold text-slate-800">{t('Rewards Lab')}</h3>
            <span className="rounded-full bg-violet-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-violet-600">
              {t('Experimental')}
            </span>
          </div>
          <p className="text-sm text-slate-500">{t('Optional task grades, fair rewards and a personal reward bank.')}</p>
        </div>
        <span className={`flex-shrink-0 text-xs font-semibold ${snapshot.enabled ? 'text-emerald-600' : snapshot.safeMode && snapshot.flagEnabled ? 'text-amber-600' : 'text-slate-400'}`}>
          {status}
        </span>
        <ChevronDown className={`h-5 w-5 flex-shrink-0 text-slate-400 transition-transform ${expanded ? 'rotate-180' : ''}`} />
      </button>

      {expanded && (
        <div className="space-y-3 border-t border-slate-100 px-4 pb-4 pt-3 sm:px-6">
          <div className="flex items-start gap-2 rounded-lg border border-violet-100 bg-violet-50/60 p-3 text-xs leading-relaxed text-violet-900">
            <ShieldCheck className="mt-0.5 h-4 w-4 flex-shrink-0" />
            <p>
              {t('Stored separately on this device. Rewards Lab never enters the planner JSON backup and cannot block task completion.')}
            </p>
          </div>

          {snapshot.safeMode && (
            <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
              {t('Safe mode is active. The experiment is not loaded. Remove ?safe=1 from the address to run it again.')}
            </p>
          )}

          {actionError && (
            <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-800" role="status">
              {actionError}
            </p>
          )}

          <div className="flex flex-wrap gap-2">
            {snapshot.enabled ? (
              <>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void withRuntime(runtime => runtime.openLab())}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-violet-600 px-3 py-2 text-xs font-semibold text-white hover:bg-violet-700"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  {t('Open Rewards Lab')}
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void withRuntime(runtime => runtime.disableKeepData())}
                  className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                >
                  {t('Disable, keep data')}
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmation('reset')}
                  className="rounded-lg border border-red-200 bg-white px-3 py-2 text-xs font-semibold text-red-700 hover:bg-red-50"
                >
                  {t('Reset experiment')}
                </button>
              </>
            ) : snapshot.flagEnabled && snapshot.safeMode ? (
              <button
                type="button"
                disabled={busy}
                onClick={() => void withRuntime(runtime => runtime.disableKeepData())}
                className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
              >
                {t('Disable, keep data')}
              </button>
            ) : (
              <button
                type="button"
                disabled={snapshot.safeMode || busy}
                onClick={() => setConfirmation('enable')}
                className="rounded-lg bg-violet-600 px-3 py-2 text-xs font-semibold text-white hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {t('Enable Rewards Lab')}
              </button>
            )}

            <button
              type="button"
              disabled={busy}
              onClick={() => setConfirmation('erase')}
              className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-white px-3 py-2 text-xs font-semibold text-red-700 hover:bg-red-50"
            >
              <Trash2 className="h-3.5 w-3.5" />
              {t('Disable & erase')}
            </button>
          </div>
        </div>
      )}

      {copy && confirmation && (
        <ConfirmModal
          isOpen
          onClose={() => setConfirmation(null)}
          onConfirm={runConfirmedAction}
          title={t(copy.title)}
          message={t(copy.message)}
          confirmText={t(copy.confirmText)}
          variant={copy.danger ? 'danger' : 'default'}
        />
      )}
    </div>
  );
};
