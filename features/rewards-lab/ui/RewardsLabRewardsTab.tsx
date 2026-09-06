import {
  Archive,
  ChevronDown,
  ChevronUp,
  Coins,
  Gift,
  Pencil,
  Plus,
  RotateCcw,
  Save,
  Undo2,
  X,
} from 'lucide-react';
import { FormEvent, useMemo, useState } from 'react';
import {
  REWARD_GRADES,
  RewardDefinition,
  RewardDefinitionInput,
  RewardPeriodSummary,
  RewardsLabState,
  WalletTransaction,
  getCurrentRewardResults,
  getEarnedTaskRewards,
  getWalletBalance,
  rewardGrades,
} from '../domain';
import { getRewardsLabRuntime } from '../runtime';
import { useI18n } from '../../../i18n';
import {
  Confirmation,
  fieldClass,
  getCommonTaskEstimate,
  gradeStyles,
  isOneTimeRewardUsed,
  latestUnrefundedSpend,
  primaryButton,
  secondaryButton,
} from './RewardsLabPanel.shared';

interface BalanceCardProps {
  state: RewardsLabState;
  onRefund: (transaction: WalletTransaction) => void;
}

const BalanceCard = ({ state, onRefund }: BalanceCardProps) => {
  const { locale, t } = useI18n();
  const balance = getWalletBalance(state);
  const latestSpend = latestUnrefundedSpend(state);
  const currencyName = state.currencyName === 'points' ? t('points') : state.currencyName;
  const earned = getEarnedTaskRewards(state);
  const spent = Math.abs(state.ledger
    .filter(item => item.kind === 'spend' || item.kind === 'refund')
    .reduce((total, item) => total + item.amount, 0));

  return (
    <section className="rounded-xl border border-indigo-100 bg-gradient-to-br from-indigo-50 to-white p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-indigo-600">{t('Available balance')}</p>
          <p className="mt-1 flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-3xl font-bold text-slate-900">
            <Coins className="h-6 w-6 text-indigo-500" aria-hidden="true" />
            <span className="break-all">{balance.toLocaleString(locale)}</span>
            <span className="max-w-full break-all text-base font-medium text-slate-500">{currencyName}</span>
          </p>
        </div>
        {latestSpend && (
          <button
            type="button"
            onClick={() => onRefund(latestSpend)}
            className={secondaryButton}
            aria-label={t('Undo redemption of {title}', { title: latestSpend.label })}
          >
            <Undo2 className="h-4 w-4" />
            {t('Undo last redemption')}
          </button>
        )}
      </div>
      {latestSpend && (
        <p className="mt-3 text-xs text-slate-500">
          {t('Last redeemed: {title} · {amount} {currency}', {
            title: latestSpend.label,
            amount: Math.abs(latestSpend.amount),
            currency: currencyName,
          })}
        </p>
      )}
      <div className="mt-4 grid grid-cols-3 gap-2 border-t border-indigo-100 pt-3">
        <div>
          <p className="text-[11px] text-slate-500">{t('Earned total')}</p>
          <p className="mt-0.5 font-semibold tabular-nums text-slate-800">{earned.toLocaleString(locale)}</p>
        </div>
        <div>
          <p className="text-[11px] text-slate-500">{t('Spent')}</p>
          <p className="mt-0.5 font-semibold tabular-nums text-slate-800">{spent.toLocaleString(locale)}</p>
        </div>
        <div>
          <p className="text-[11px] text-slate-500">{t('Rewards received')}</p>
          <p className="mt-0.5 font-semibold tabular-nums text-slate-800">{state.metrics.redemptionCount.toLocaleString(locale)}</p>
        </div>
      </div>
    </section>
  );
};

const ResultPeriod = ({ label, summary, currencyName }: {
  label: string;
  summary: RewardPeriodSummary;
  currencyName: string;
}) => {
  const { t } = useI18n();
  return (
    <div className="rounded-lg bg-white p-3">
      <div className="flex items-baseline justify-between gap-3">
        <p className="text-xs font-semibold text-slate-600">{label}</p>
        <p className="text-lg font-bold tabular-nums text-slate-900">+{summary.amount} <span className="text-xs font-medium text-slate-400">{currencyName}</span></p>
      </div>
      <p className="mt-0.5 text-xs text-slate-500">{t('{count} completed tasks', { count: summary.taskCount })}</p>
      {summary.taskCount > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {rewardGrades.filter(grade => summary.gradeCounts[grade] > 0).map(grade => (
            <span key={grade} className={`rounded-full border px-1.5 py-0.5 text-[10px] font-medium ${gradeStyles[grade].badge}`}>
              {t(REWARD_GRADES[grade].label)}: {summary.gradeCounts[grade]}
            </span>
          ))}
        </div>
      )}
    </div>
  );
};

const CurrentResults = ({ state }: { state: RewardsLabState }) => {
  const { t } = useI18n();
  const results = getCurrentRewardResults(state);
  const currencyName = state.currencyName === 'points' ? t('points') : state.currencyName;
  return (
    <section className="rounded-xl border border-slate-200 bg-slate-50 p-3">
      <h2 className="px-1 text-sm font-semibold text-slate-800">{t('Current results')}</h2>
      <div className="mt-2 grid gap-2 sm:grid-cols-2">
        <ResultPeriod label={t('This week')} summary={results.week} currencyName={currencyName} />
        <ResultPeriod label={t('This month')} summary={results.month} currencyName={currencyName} />
      </div>
    </section>
  );
};

interface RewardFormProps {
  reward: RewardDefinition | null;
  onCancel: () => void;
  onSubmit: (input: RewardDefinitionInput) => boolean;
}

const RewardForm = ({ reward, onCancel, onSubmit }: RewardFormProps) => {
  const { t } = useI18n();
  const [title, setTitle] = useState(reward?.title ?? '');
  const [cost, setCost] = useState(reward?.cost.toString() ?? '');
  const [note, setNote] = useState(reward?.note ?? '');
  const [repeatable, setRepeatable] = useState(reward?.repeatable ?? true);
  const [error, setError] = useState<string | null>(null);
  const numericCost = Number(cost);
  const validCost = Number.isInteger(numericCost) && numericCost > 0;

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!title.trim()) {
      setError(t('Give the reward a title.'));
      return;
    }
    if (!validCost) {
      setError(t('Cost must be a whole number greater than zero.'));
      return;
    }
    const saved = onSubmit({
      title,
      cost: numericCost,
      note,
      repeatable,
      active: reward?.active ?? true,
    });
    if (!saved) setError(t('The reward could not be saved. Your planner data is unaffected.'));
  };

  return (
    <form onSubmit={handleSubmit} className="rounded-xl border border-indigo-200 bg-indigo-50/60 p-4">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h3 className="font-semibold text-slate-900">{reward ? t('Edit reward') : t('New reward')}</h3>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg p-1.5 text-slate-500 hover:bg-white hover:text-slate-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
          aria-label={t('Close reward form')}
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_9rem]">
        <label className="text-sm font-medium text-slate-700">
          {t('Title')}
          <input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            className={`${fieldClass} mt-1`}
            maxLength={100}
            autoFocus
            required
          />
        </label>
        <label className="text-sm font-medium text-slate-700">
          {t('Cost')}
          <input
            value={cost}
            onChange={(event) => setCost(event.target.value)}
            className={`${fieldClass} mt-1`}
            type="number"
            min="1"
            step="1"
            inputMode="numeric"
            required
          />
        </label>
      </div>
      {validCost && (
        <p className="mt-1 text-right text-xs text-slate-500">{t('≈ {count} Common tasks', { count: getCommonTaskEstimate(numericCost) })}</p>
      )}
      <label className="mt-4 block text-sm font-medium text-slate-700">
        {t('Note')} <span className="font-normal text-slate-400">{t('(optional)')}</span>
        <textarea
          value={note}
          onChange={(event) => setNote(event.target.value)}
          className={`${fieldClass} mt-1 min-h-20 resize-y`}
          maxLength={300}
        />
      </label>
      <label className="mt-4 flex cursor-pointer items-start gap-3 rounded-lg bg-white/70 px-3 py-2 text-sm text-slate-700">
        <input
          type="checkbox"
          checked={repeatable}
          onChange={(event) => setRepeatable(event.target.checked)}
          className="mt-0.5 h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
        />
        <span>
          <span className="block font-medium">{t('Repeatable reward')}</span>
          <span className="text-xs text-slate-500">
            {repeatable ? t('Can be redeemed whenever the balance allows.') : t('Can be redeemed once unless that redemption is undone.')}
          </span>
        </span>
      </label>
      {error && <p className="mt-3 text-sm text-red-700" role="alert">{error}</p>}
      <div className="mt-4 flex justify-end gap-2">
        <button type="button" onClick={onCancel} className={secondaryButton}>{t('Cancel')}</button>
        <button type="submit" className={primaryButton}>
          <Save className="h-4 w-4" />
          {reward ? t('Save changes') : t('Add reward')}
        </button>
      </div>
    </form>
  );
};

interface RewardCardProps {
  reward: RewardDefinition;
  state: RewardsLabState;
  onEdit: (reward: RewardDefinition) => void;
  onArchive: (reward: RewardDefinition) => void;
  onRedeem: (reward: RewardDefinition) => void;
}

const RewardCard = ({ reward, state, onEdit, onArchive, onRedeem }: RewardCardProps) => {
  const { t } = useI18n();
  const balance = getWalletBalance(state);
  const used = isOneTimeRewardUsed(reward, state);
  const insufficient = balance < reward.cost;
  const currencyName = state.currencyName === 'points' ? t('points') : state.currencyName;

  return (
    <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="break-words font-semibold text-slate-900">{reward.title}</h3>
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600">
              {reward.repeatable ? t('Repeatable') : t('One-time')}
            </span>
          </div>
          {reward.note && <p className="mt-1 break-words text-sm text-slate-600">{reward.note}</p>}
          <p className="mt-2 text-xs text-slate-500">{t('≈ {count} Common tasks', { count: getCommonTaskEstimate(reward.cost) })}</p>
        </div>
        <div className="shrink-0 text-right">
          <p className="text-xl font-bold text-indigo-700">{reward.cost}</p>
          <p className="max-w-24 truncate text-xs text-slate-500">{currencyName}</p>
        </div>
      </div>
      <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-3">
        <div className="flex gap-1">
          <button
            type="button"
            onClick={() => onEdit(reward)}
            className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
            aria-label={t('Edit {title}', { title: reward.title })}
          >
            <Pencil className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => onArchive(reward)}
            className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
            aria-label={t('Archive {title}', { title: reward.title })}
          >
            <Archive className="h-4 w-4" />
          </button>
        </div>
        <button
          type="button"
          onClick={() => onRedeem(reward)}
          className={primaryButton}
          disabled={insufficient || used}
          title={insufficient ? t('Need {count} more {currency}', { count: reward.cost - balance, currency: currencyName }) : undefined}
        >
          <Gift className="h-4 w-4" />
          {used ? t('Redeemed') : insufficient ? t('Need {count} more', { count: reward.cost - balance }) : t('Redeem')}
        </button>
      </div>
    </article>
  );
};

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
  const [showArchived, setShowArchived] = useState(false);
  const activeRewards = state.rewards.filter((reward) => reward.active);
  const archivedRewards = state.rewards.filter((reward) => !reward.active);

  const openNew = () => {
    setEditing(null);
    setFormOpen(true);
  };

  const openEdit = (reward: RewardDefinition) => {
    setEditing(reward);
    setFormOpen(true);
  };

  const saveReward = (input: RewardDefinitionInput): boolean => {
    const saved = editing
      ? runtime.updateReward(editing.id, input)
      : runtime.addReward(input);
    if (!saved) return false;
    setFormOpen(false);
    setEditing(null);
    onNotice(editing ? t('Reward updated.') : t('Reward added to your catalog.'));
    return true;
  };

  return (
    <div className="space-y-4">
      <BalanceCard state={state} onRefund={(transaction) => onConfirm({ kind: 'refund', transaction })} />
      <CurrentResults state={state} />

      {formOpen ? (
        <RewardForm
          key={editing?.id ?? 'new-reward'}
          reward={editing}
          onCancel={() => {
            setFormOpen(false);
            setEditing(null);
          }}
          onSubmit={saveReward}
        />
      ) : (
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="font-semibold text-slate-900">{t('Your rewards')}</h2>
            <p className="text-xs text-slate-500">{t('Choose real-life treats worth saving for.')}</p>
          </div>
          <button type="button" onClick={openNew} className={secondaryButton}>
            <Plus className="h-4 w-4" />
            {t('Add reward')}
          </button>
        </div>
      )}

      {activeRewards.length === 0 && !formOpen ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white px-5 py-8 text-center">
          <Gift className="mx-auto h-8 w-8 text-slate-300" aria-hidden="true" />
          <p className="mt-3 font-medium text-slate-700">{t('No rewards yet')}</p>
          <p className="mt-1 text-sm text-slate-500">{t('Add something small that feels genuinely rewarding.')}</p>
          <button type="button" onClick={openNew} className={`${primaryButton} mt-4`}>
            <Plus className="h-4 w-4" />
            {t('Create first reward')}
          </button>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {activeRewards.map((reward) => (
            <RewardCard
              key={reward.id}
              reward={reward}
              state={state}
              onEdit={openEdit}
              onArchive={(item) => onConfirm({ kind: 'archive', reward: item })}
              onRedeem={(item) => onConfirm({ kind: 'redeem', reward: item })}
            />
          ))}
        </div>
      )}

      {archivedRewards.length > 0 && (
        <section className="border-t border-slate-200 pt-4">
          <button
            type="button"
            onClick={() => setShowArchived((value) => !value)}
            className="flex w-full items-center justify-between rounded-lg px-2 py-2 text-left text-sm font-medium text-slate-600 hover:bg-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
            aria-expanded={showArchived}
          >
            {t('Archived rewards ({count})', { count: archivedRewards.length })}
            {showArchived ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
          {showArchived && (
            <div className="mt-2 space-y-2">
              {archivedRewards.map((reward) => (
                <div key={reward.id} className="flex items-start justify-between gap-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-3">
                  <div className="min-w-0">
                    <p className="break-words text-sm font-medium text-slate-700">{reward.title}</p>
                    <p className="text-xs text-slate-500">{reward.cost} {state.currencyName}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const restored = runtime.updateReward(reward.id, { ...reward, active: true });
                      if (restored) onNotice(t('{title} restored.', { title: reward.title }));
                    }}
                    className={secondaryButton}
                  >
                    <RotateCcw className="h-4 w-4" />
                    {t('Restore')}
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>
      )}
    </div>
  );
};
