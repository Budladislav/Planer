import { Gift } from 'lucide-react';
import { useState } from 'react';
import { useI18n } from '../../../i18n';
import { rewardsLabGate } from '../gate';
import { Confirmation } from './RewardsLabPanel.shared';
import { ConfirmationDialog } from './RewardsLabConfirmationDialog';
import { RewardsTab } from './RewardsLabRewardsTab';
import { useRewardsLab } from './useRewardsLab';

export const RewardsCatalogPage = () => {
  const { t } = useI18n();
  const { runtime, snapshot } = useRewardsLab();
  const [confirmation, setConfirmation] = useState<Confirmation | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const enableRewards = () => {
    if (runtime.enable()) {
      rewardsLabGate.refresh();
      setNotice(null);
    } else {
      setNotice(t(runtime.getSnapshot().lastError ?? 'Rewards could not complete that action.'));
    }
  };

  const runConfirmation = (actualCost?: number) => {
    if (!confirmation) return;
    if (confirmation.kind === 'redeem') {
      const outcome = runtime.redeem(confirmation.reward.id, actualCost);
      if (outcome === 'redeemed') setNotice(t('{title} redeemed.', { title: confirmation.reward.title }));
      else if (outcome === 'insufficient-balance') setNotice(t('The balance is no longer sufficient for that reward.'));
      else if (outcome === 'already-redeemed') setNotice(t('That one-time reward was already redeemed.'));
      else if (outcome === 'missing-key') setNotice(t('A matching reward key is required.'));
      else if (outcome === 'cooldown' || outcome === 'limit-reached') setNotice(t('This reward is still on cooldown or at its rolling limit.'));
      else setNotice(t('The reward could not be redeemed.'));
    } else if (confirmation.kind === 'archive') {
      if (runtime.archiveReward(confirmation.reward.id)) setNotice(t('{title} archived.', { title: confirmation.reward.title }));
    } else if (confirmation.kind === 'delete-reward') {
      if (runtime.deleteReward(confirmation.reward.id)) setNotice(t('{title} deleted.', { title: confirmation.reward.title }));
    }
    setConfirmation(null);
  };

  if (!snapshot.enabled || !snapshot.state) {
    return (
      <section className="section-card mx-auto max-w-xl p-5 text-center">
        <Gift className="mx-auto h-9 w-9 text-brand-500" aria-hidden="true" />
        <p className="mt-3 font-semibold text-slate-800">{t('Rewards is turned off')}</p>
        <p className="mt-1 text-sm leading-relaxed text-slate-500">
          {snapshot.safeMode
            ? t('Safe mode is active. Rewards is not loaded. Remove ?safe=1 from the address to run it again.')
            : t('Enable Rewards to use task grades, credits, keys and your personal catalog.')}
        </p>
        {!snapshot.safeMode && <button type="button" onClick={enableRewards} className="button-primary mt-4">{t('Enable Rewards')}</button>}
        {notice && <p className="mt-3 text-sm text-red-700" role="status">{notice}</p>}
      </section>
    );
  }

  const state = snapshot.state;
  return (
    <div className="page-container">
      {(notice || snapshot.lastError) && (
        <div className="mb-3 flex items-start justify-between gap-3 rounded-xl border border-brand-100 bg-brand-50 px-3 py-2 text-sm text-brand-700" role="status" aria-live="polite">
          <span>{notice ?? t('Rewards recovered from a local storage problem. Your planner continued normally.')}</span>
          {notice && <button type="button" onClick={() => setNotice(null)} className="rounded px-1 font-bold" aria-label={t('Dismiss message')}>×</button>}
        </div>
      )}
      <RewardsTab state={state} onNotice={setNotice} onConfirm={setConfirmation} />
      {confirmation && (
        <ConfirmationDialog
          confirmation={confirmation}
          currencyName={state.currencyName}
          onCancel={() => setConfirmation(null)}
          onConfirm={runConfirmation}
        />
      )}
    </div>
  );
};

export default RewardsCatalogPage;
