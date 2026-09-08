import { Gift, LibraryBig, Plus } from 'lucide-react';
import { useMemo, useState } from 'react';
import { RewardDefinition, RewardDefinitionInput, RewardsLabState } from '../domain';
import { getRewardsLabRuntime } from '../runtime';
import { useI18n } from '../../../i18n';
import { ArchivedRewards, RewardCard, RewardForm } from './RewardsCatalog';
import { Confirmation, primaryButton, secondaryButton } from './RewardsLabPanel.shared';
import { RewardsLabSummary } from './RewardsLabSummary';

interface RewardsTabProps {
  state: RewardsLabState;
  onNotice: (message: string) => void;
  onConfirm: (confirmation: Confirmation) => void;
}

export const RewardsTab = ({ state, onNotice, onConfirm }: RewardsTabProps) => {
  const { t } = useI18n();
  const runtime = useMemo(() => getRewardsLabRuntime(), []);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<RewardDefinition | null>(null);
  const activeRewards = state.rewards.filter(reward => reward.active);
  const archivedRewards = state.rewards.filter(reward => !reward.active);

  const saveReward = (input: RewardDefinitionInput): boolean => {
    const saved = editing ? runtime.updateReward(editing.id, input) : runtime.addReward(input);
    if (!saved) return false;
    setFormOpen(false);
    setEditing(null);
    onNotice(editing ? t('Reward updated.') : t('Reward added to your catalog.'));
    return true;
  };

  return (
    <div className="space-y-4">
      <RewardsLabSummary
        state={state}
        onRefund={transaction => onConfirm({ kind: 'refund', transaction })}
        onUpgrade={fromGrade => onConfirm({ kind: 'upgrade-key', fromGrade })}
        onUndoUpgrade={() => onConfirm({ kind: 'undo-key-upgrade' })}
      />

      {formOpen ? (
        <RewardForm key={editing?.id ?? 'new-reward'} reward={editing} onCancel={() => { setFormOpen(false); setEditing(null); }} onSubmit={saveReward} />
      ) : (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div><h2 className="font-semibold text-slate-900">{t('Your rewards')}</h2><p className="text-xs text-slate-500">{t('Every reward needs credits and one matching key.')}</p></div>
          <div className="flex flex-wrap gap-2">
            {!state.starterCatalogInstalled && <button type="button" onClick={() => { const count = runtime.installStarterCatalog(); onNotice(t('{count} starter rewards added.', { count })); }} className={secondaryButton}><LibraryBig className="h-4 w-4" />{t('Add starter catalog')}</button>}
            <button type="button" onClick={() => { setEditing(null); setFormOpen(true); }} className={secondaryButton}><Plus className="h-4 w-4" />{t('Add reward')}</button>
          </div>
        </div>
      )}

      {activeRewards.length === 0 && !formOpen ? (
        <div className="empty-state py-8">
          <Gift className="mx-auto h-8 w-8 text-slate-300" />
          <p className="mt-3 font-medium text-slate-700">{t('No rewards yet')}</p>
          <button type="button" onClick={() => { setEditing(null); setFormOpen(true); }} className={`${primaryButton} mt-4`}><Plus className="h-4 w-4" />{t('Create first reward')}</button>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {activeRewards.map(reward => <RewardCard key={reward.id} reward={reward} state={state} onEdit={item => { setEditing(item); setFormOpen(true); }} onArchive={item => onConfirm({ kind: 'archive', reward: item })} onRedeem={item => onConfirm({ kind: 'redeem', reward: item })} />)}
        </div>
      )}

      <ArchivedRewards rewards={archivedRewards} state={state} onRestore={reward => {
        const restored = runtime.updateReward(reward.id, { ...reward, active: true });
        if (restored) onNotice(t('{title} restored.', { title: reward.title }));
      }} />
    </div>
  );
};
