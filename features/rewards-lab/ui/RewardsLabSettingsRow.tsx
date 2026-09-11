import React, { useEffect, useState } from 'react';
import { Archive, ChevronDown, ExternalLink, Gift, ShieldCheck, Trash2 } from 'lucide-react';
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
    title: 'Enable Rewards?',
    message: 'Rewards is an optional part of Takt. It starts with an empty balance, no task grades, no keys, and no catalog entries. Its data stays separate from planner tasks but is included in the versioned Takt backup.',
    confirmText: 'Enable Rewards',
    danger: false,
  },
  reset: {
    title: 'Reset Rewards?',
    message: 'This permanently clears official grades, claims, wallet history, keys, rewards, purchases and settings. Rewards stays enabled. Planner tasks and the previous Rewards Lab archive are not affected.',
    confirmText: 'Reset Rewards',
    danger: true,
  },
  erase: {
    title: 'Disable and erase Rewards?',
    message: 'This permanently removes all official Rewards data from this device and turns the feature off. Planner tasks and the previous Rewards Lab archive are not affected.',
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
  const [legacyArchiveAvailable, setLegacyArchiveAvailable] = useState(false);

  useEffect(() => {
    let active = true;
    void import('../storage').then(({ ensureLegacyRewardsLabArchive }) => {
      if (active) setLegacyArchiveAvailable(Boolean(ensureLegacyRewardsLabArchive(window.localStorage)));
    }).catch(() => undefined);
    return () => { active = false; };
  }, []);

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
        setActionError(t(runtime.getSnapshot().lastError ?? 'Rewards could not complete that action.'));
      }
    } catch {
      setActionError(t('Rewards could not be loaded. Planner data was not affected.'));
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
        className="settings-row"
      >
        <Gift className="h-5 w-5 flex-shrink-0 text-brand-500" />
        <div className="min-w-0 flex-1">
          <h3 className="font-semibold text-slate-800">{t('Rewards')}</h3>
          <p className="text-sm text-slate-500">{t('Optional task grades, reward keys and a personal reward catalog.')}</p>
        </div>
        <span className={`flex-shrink-0 text-xs font-semibold ${snapshot.enabled ? 'text-emerald-600' : snapshot.safeMode && snapshot.flagEnabled ? 'text-amber-600' : 'text-slate-400'}`}>
          {status}
        </span>
        <ChevronDown className={`h-5 w-5 flex-shrink-0 text-slate-400 transition-transform ${expanded ? 'rotate-180' : ''}`} />
      </button>

      {expanded && (
        <div className="space-y-3 border-t border-slate-100 px-4 pb-4 pt-3 sm:px-6">
          <div className="flex items-start gap-2 rounded-lg border border-brand-100 bg-brand-50/60 p-3 text-xs leading-relaxed text-brand-900">
            <ShieldCheck className="mt-0.5 h-4 w-4 flex-shrink-0" />
            <p>
              {t('Rewards stays isolated from task storage and cannot block task completion. It is included in the versioned Takt backup.')}
            </p>
          </div>

          {legacyArchiveAvailable && (
            <div className="flex items-start gap-2 rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs leading-relaxed text-slate-700">
              <Archive className="mt-0.5 h-4 w-4 flex-shrink-0" />
              <p>{t('Your previous Rewards Lab data is preserved in a disabled local archive and included in new backups. Official Rewards does not use or change it.')}</p>
            </div>
          )}

          {snapshot.safeMode && (
            <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
              {t('Safe mode is active. Rewards is not loaded. Remove ?safe=1 from the address to run it again.')}
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
                  className="button-primary min-h-8 px-2.5 py-1.5 text-xs"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  {t('Open Rewards')}
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void withRuntime(runtime => runtime.disableKeepData())}
                  className="button-secondary min-h-8 px-2.5 py-1.5 text-xs"
                >
                  {t('Disable, keep data')}
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmation('reset')}
                  className="button-danger min-h-8 border border-red-200 bg-white px-2.5 py-1.5 text-xs"
                >
                  {t('Reset Rewards')}
                </button>
              </>
            ) : snapshot.flagEnabled && snapshot.safeMode ? (
              <button
                type="button"
                disabled={busy}
                onClick={() => void withRuntime(runtime => runtime.disableKeepData())}
                className="button-secondary min-h-8 px-2.5 py-1.5 text-xs"
              >
                {t('Disable, keep data')}
              </button>
            ) : (
              <button
                type="button"
                disabled={snapshot.safeMode || busy}
                onClick={() => setConfirmation('enable')}
                className="button-primary min-h-8 px-2.5 py-1.5 text-xs"
              >
                {t('Enable Rewards')}
              </button>
            )}

            <button
              type="button"
              disabled={busy}
              onClick={() => setConfirmation('erase')}
              className="button-danger min-h-8 border border-red-200 bg-white px-2.5 py-1.5 text-xs"
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
