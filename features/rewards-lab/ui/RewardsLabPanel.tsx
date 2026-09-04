import {
  Archive,
  ChevronDown,
  ChevronUp,
  Coins,
  Dice5,
  Gift,
  History,
  Pencil,
  Plus,
  RotateCcw,
  Save,
  Settings2,
  ShieldCheck,
  Trash2,
  Undo2,
  X,
} from 'lucide-react';
import {
  FormEvent,
  KeyboardEvent as ReactKeyboardEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from 'react';
import {
  FAIR_BAG_VALUES,
  REWARD_GRADES,
  RewardDefinition,
  RewardDefinitionInput,
  RewardGrade,
  RewardsLabState,
  WalletTransaction,
  getWalletBalance,
} from '../domain';
import { getRewardsLabRuntime } from '../runtime';
import { useI18n } from '../../../i18n';

type LabTab = 'rewards' | 'history' | 'rules';

type Confirmation =
  | { kind: 'redeem'; reward: RewardDefinition }
  | { kind: 'refund'; transaction: WalletTransaction }
  | { kind: 'archive'; reward: RewardDefinition }
  | { kind: 'disable' }
  | { kind: 'reset' }
  | { kind: 'erase' };

const averageCommonReward = FAIR_BAG_VALUES.reduce((total, value) => total + value, 0)
  / FAIR_BAG_VALUES.length;

const buttonBase = 'inline-flex min-h-9 items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50';
const primaryButton = `${buttonBase} bg-indigo-600 text-white hover:bg-indigo-700`;
const secondaryButton = `${buttonBase} border border-slate-200 bg-white text-slate-700 hover:bg-slate-50`;
const dangerButton = `${buttonBase} border border-red-200 bg-white text-red-700 hover:bg-red-50`;
const fieldClass = 'w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100';

const gradeStyles: Record<RewardGrade, { dot: string; badge: string }> = {
  common: { dot: 'bg-slate-400', badge: 'border-slate-200 bg-slate-50 text-slate-700' },
  uncommon: { dot: 'bg-emerald-500', badge: 'border-emerald-200 bg-emerald-50 text-emerald-800' },
  rare: { dot: 'bg-blue-500', badge: 'border-blue-200 bg-blue-50 text-blue-800' },
  legendary: { dot: 'bg-amber-400', badge: 'border-amber-200 bg-amber-50 text-amber-900' },
  mythic: { dot: 'bg-red-500', badge: 'border-red-200 bg-red-50 text-red-800' },
};

const formatDateTime = (value: string, locale: string): string => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString(locale, {
    month: 'short',
    day: 'numeric',
    year: date.getFullYear() === new Date().getFullYear() ? undefined : 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
};

const getCommonTaskEstimate = (cost: number): string => {
  const estimate = cost / averageCommonReward;
  return Number.isInteger(estimate) ? estimate.toString() : estimate.toFixed(1);
};

const unrefundedSpendIds = (state: RewardsLabState): Set<string> => {
  const refunded = new Set(
    state.ledger
      .filter((item) => item.kind === 'refund' && item.relatedTransactionId)
      .map((item) => item.relatedTransactionId as string),
  );
  return new Set(
    state.ledger
      .filter((item) => item.kind === 'spend' && !refunded.has(item.id))
      .map((item) => item.id),
  );
};

const latestUnrefundedSpend = (state: RewardsLabState): WalletTransaction | null => {
  const spendIds = unrefundedSpendIds(state);
  for (let index = state.ledger.length - 1; index >= 0; index -= 1) {
    const item = state.ledger[index];
    if (item.kind === 'spend' && spendIds.has(item.id)) return item;
  }
  return null;
};

const isOneTimeRewardUsed = (
  reward: RewardDefinition,
  state: RewardsLabState,
): boolean => {
  if (reward.repeatable) return false;
  const spendIds = unrefundedSpendIds(state);
  return state.ledger.some(
    (item) => item.kind === 'spend' && item.rewardId === reward.id && spendIds.has(item.id),
  );
};

interface NoticeProps {
  message: string | null;
  onDismiss: () => void;
}

const Notice = ({ message, onDismiss }: NoticeProps) => {
  const { t } = useI18n();
  if (!message) return null;
  return (
    <div
      className="mb-4 flex items-start justify-between gap-3 rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-2 text-sm text-indigo-900"
      role="status"
      aria-live="polite"
    >
      <span>{message}</span>
      <button
        type="button"
        onClick={onDismiss}
        className="rounded p-0.5 text-indigo-600 hover:bg-indigo-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
        aria-label={t('Dismiss message')}
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
};

interface BalanceCardProps {
  state: RewardsLabState;
  onRefund: (transaction: WalletTransaction) => void;
}

const BalanceCard = ({ state, onRefund }: BalanceCardProps) => {
  const { locale, t } = useI18n();
  const balance = getWalletBalance(state);
  const latestSpend = latestUnrefundedSpend(state);
  const currencyName = state.currencyName === 'points' ? t('points') : state.currencyName;

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

const RewardsTab = ({ state, onNotice, onConfirm }: RewardsTabProps) => {
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

const transactionKindLabel: Record<WalletTransaction['kind'], string> = {
  earn: 'Task reward',
  reverse: 'Completion undone',
  restore: 'Reward restored',
  spend: 'Reward redeemed',
  refund: 'Redemption undone',
  adjustment: 'Manual adjustment',
};

interface HistoryTabProps {
  state: RewardsLabState;
  onConfirm: (confirmation: Confirmation) => void;
}

const HistoryTab = ({ state, onConfirm }: HistoryTabProps) => {
  const { locale, t } = useI18n();
  const spendIds = unrefundedSpendIds(state);
  const newestFirst = state.ledger
    .map((transaction, index) => ({ transaction, index }))
    .sort((left, right) => {
      const dateDifference = new Date(right.transaction.occurredAt).getTime()
        - new Date(left.transaction.occurredAt).getTime();
      return dateDifference || right.index - left.index;
    });

  if (newestFirst.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-slate-300 bg-white px-5 py-10 text-center">
        <History className="mx-auto h-8 w-8 text-slate-300" aria-hidden="true" />
        <p className="mt-3 font-medium text-slate-700">{t('No wallet activity yet')}</p>
        <p className="mt-1 text-sm text-slate-500">{t('Complete a task to make the first fair-bag draw.')}</p>
      </div>
    );
  }

  return (
    <section aria-label={t('Wallet history')}>
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        {newestFirst.map(({ transaction }) => {
          const positive = transaction.amount > 0;
          const refundable = transaction.kind === 'spend' && spendIds.has(transaction.id);
          return (
            <article key={transaction.id} className="flex items-center gap-3 border-b border-slate-100 px-3 py-3 last:border-b-0 sm:px-4">
              <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${positive ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>
                {transaction.kind === 'spend' ? <Gift className="h-4 w-4" /> : <Coins className="h-4 w-4" />}
              </div>
              <div className="min-w-0 flex-1">
                <p className="break-words text-sm font-medium text-slate-800">{transaction.label}</p>
                <p className="text-xs text-slate-500">
                  {t(transactionKindLabel[transaction.kind])} · {formatDateTime(transaction.occurredAt, locale)}
                </p>
              </div>
              <div className="shrink-0 text-right">
                <p className={`font-semibold tabular-nums ${positive ? 'text-emerald-700' : 'text-slate-700'}`}>
                  {positive ? '+' : '−'}{Math.abs(transaction.amount)}
                </p>
                <p className="max-w-20 truncate text-[11px] text-slate-400">{state.currencyName}</p>
              </div>
              {refundable && (
                <button
                  type="button"
                  onClick={() => onConfirm({ kind: 'refund', transaction })}
                  className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                  aria-label={t('Undo redemption of {title}', { title: transaction.label })}
                >
                  <Undo2 className="h-4 w-4" />
                </button>
              )}
            </article>
          );
        })}
      </div>
    </section>
  );
};

interface GradeRuleProps {
  grade: RewardGrade;
}

const GradeRule = ({ grade }: GradeRuleProps) => {
  const { t } = useI18n();
  const definition = REWARD_GRADES[grade];
  return (
    <li className="flex items-center justify-between gap-3 rounded-lg bg-white px-3 py-2 text-sm">
      <span className="flex items-center gap-2 font-medium text-slate-700">
        <span className={`h-2.5 w-2.5 rotate-45 rounded-[2px] ${gradeStyles[grade].dot}`} aria-hidden="true" />
        {t(definition.label)}
      </span>
      <span className={`rounded-full border px-2 py-0.5 text-xs font-semibold ${gradeStyles[grade].badge}`}>
        ×{definition.multiplier}
      </span>
    </li>
  );
};

interface RulesTabProps {
  state: RewardsLabState;
  onNotice: (message: string) => void;
  onConfirm: (confirmation: Confirmation) => void;
}

const RulesTab = ({ state, onNotice, onConfirm }: RulesTabProps) => {
  const { locale, t } = useI18n();
  const runtime = useMemo(() => getRewardsLabRuntime(), []);
  const [currency, setCurrency] = useState(state.currencyName);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [adjustment, setAdjustment] = useState('');
  const [adjustmentReason, setAdjustmentReason] = useState('');
  const [adjustmentError, setAdjustmentError] = useState<string | null>(null);

  useEffect(() => setCurrency(state.currencyName), [state.currencyName]);

  const gradeCounts = Object.keys(REWARD_GRADES).reduce<Record<RewardGrade, number>>(
    (counts, grade) => ({ ...counts, [grade]: 0 }),
    { common: 0, uncommon: 0, rare: 0, legendary: 0, mythic: 0 },
  );
  Object.values(state.claims).forEach((claim) => {
    gradeCounts[claim.grade] += 1;
  });
  const earned = state.ledger
    .filter((item) => item.kind === 'earn')
    .reduce((total, item) => total + item.amount, 0);
  const spentNet = Math.abs(state.ledger
    .filter((item) => item.kind === 'spend' || item.kind === 'refund')
    .reduce((total, item) => total + item.amount, 0));

  const saveCurrency = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!currency.trim()) return;
    if (runtime.updateCurrency(currency)) onNotice(t('Currency name updated.'));
  };

  const submitAdjustment = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const amount = Number(adjustment);
    if (!Number.isInteger(amount) || amount === 0) {
      setAdjustmentError(t('Enter a non-zero whole number. Use a minus sign to subtract.'));
      return;
    }
    if (!adjustmentReason.trim()) {
      setAdjustmentError(t('Add a short reason so the history stays understandable.'));
      return;
    }
    if (!runtime.adjustBalance(amount, adjustmentReason)) {
      setAdjustmentError(t('The adjustment could not be saved.'));
      return;
    }
    setAdjustment('');
    setAdjustmentReason('');
    setAdjustmentError(null);
    onNotice(t('Balance adjustment recorded in history.'));
  };

  return (
    <div className="space-y-4">
      <section className="rounded-xl border border-amber-200 bg-amber-50 p-4">
        <div className="flex gap-3">
          <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" aria-hidden="true" />
          <div>
            <h2 className="font-semibold text-amber-950">{t('An isolated, device-local experiment')}</h2>
            <p className="mt-1 text-sm leading-relaxed text-amber-900/80">
              {t('Rewards Lab is stored separately from planner tasks. It is not included in planner backups or sync, and disabling it never changes your task data.')}
            </p>
          </div>
        </div>
      </section>

      <section className="rounded-xl border border-slate-200 bg-slate-50 p-4">
        <div className="flex items-start gap-3">
          <Dice5 className="mt-0.5 h-5 w-5 shrink-0 text-indigo-600" aria-hidden="true" />
          <div className="min-w-0 flex-1">
            <h2 className="font-semibold text-slate-900">{t('Fair-bag rewards')}</h2>
            <p className="mt-1 text-sm leading-relaxed text-slate-600">
              {t('Every cycle contains three 2s, three 3s, and three 4s in a shuffled bag. Each completed task draws one value, so short-term surprise stays fair over every nine draws. There are no zeroes, penalties, or weekly caps.')}
            </p>
            <ul className="mt-3 grid gap-2 sm:grid-cols-2">
              {(Object.keys(REWARD_GRADES) as RewardGrade[]).map((grade) => (
                <GradeRule key={grade} grade={grade} />
              ))}
            </ul>
            <p className="mt-3 text-xs text-slate-500">
              {t('Undoing a task reverses its reward. Completing it again restores the original result instead of rerolling.')}
            </p>
          </div>
        </div>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-4">
        <h2 className="font-semibold text-slate-900">{t('Pilot snapshot')}</h2>
        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
          <div className="rounded-lg bg-slate-50 p-3">
            <p className="text-xs text-slate-500">{t('Claims')}</p>
            <p className="mt-1 text-xl font-semibold text-slate-800">{Object.keys(state.claims).length}</p>
          </div>
          <div className="rounded-lg bg-slate-50 p-3">
            <p className="text-xs text-slate-500">{t('Earned')}</p>
            <p className="mt-1 text-xl font-semibold text-slate-800">{earned}</p>
          </div>
          <div className="rounded-lg bg-slate-50 p-3">
            <p className="text-xs text-slate-500">{t('Spent now')}</p>
            <p className="mt-1 text-xl font-semibold text-slate-800">{spentNet}</p>
          </div>
          <div className="rounded-lg bg-slate-50 p-3">
            <p className="text-xs text-slate-500">{t('Redemptions')}</p>
            <p className="mt-1 text-xl font-semibold text-slate-800">{state.metrics.redemptionCount}</p>
          </div>
        </div>
        {Object.keys(state.claims).length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2" aria-label={t('Completed task grade distribution')}>
            {(Object.keys(REWARD_GRADES) as RewardGrade[]).map((grade) => (
              <span key={grade} className={`rounded-full border px-2 py-1 text-xs ${gradeStyles[grade].badge}`}>
                {t(REWARD_GRADES[grade].label)}: {gradeCounts[grade]}
              </span>
            ))}
          </div>
        )}
        <p className="mt-3 text-xs text-slate-500">
          {t('Lab opened {count} times', { count: state.metrics.labOpenCount })}
          {state.metrics.lastOpenedAt ? ` · ${t('last {date}', { date: formatDateTime(state.metrics.lastOpenedAt, locale) })}` : ''}
        </p>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-4">
        <div className="flex items-center gap-2">
          <Settings2 className="h-5 w-5 text-slate-500" aria-hidden="true" />
          <h2 className="font-semibold text-slate-900">{t('Preferences')}</h2>
        </div>
        <form onSubmit={saveCurrency} className="mt-4 flex items-end gap-2">
          <label className="min-w-0 flex-1 text-sm font-medium text-slate-700">
            {t('Currency name')}
            <input
              value={currency}
              onChange={(event) => setCurrency(event.target.value)}
              className={`${fieldClass} mt-1`}
              maxLength={40}
              required
            />
          </label>
          <button type="submit" className={secondaryButton} disabled={!currency.trim() || currency.trim() === state.currencyName}>
            {t('Save')}
          </button>
        </form>
        <label className="mt-4 flex cursor-pointer items-center justify-between gap-4 rounded-lg bg-slate-50 px-3 py-3">
          <span>
            <span className="block text-sm font-medium text-slate-800">{t('Reward animation')}</span>
            <span className="block text-xs text-slate-500">{t('A brief result reveal after task completion.')}</span>
          </span>
          <input
            type="checkbox"
            checked={state.animationsEnabled}
            onChange={(event) => runtime.updateAnimations(event.target.checked)}
            className="h-5 w-5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
          />
        </label>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white">
        <button
          type="button"
          onClick={() => setAdvancedOpen((value) => !value)}
          className="flex w-full items-center justify-between rounded-xl px-4 py-3 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-indigo-500"
          aria-expanded={advancedOpen}
        >
          <span>
            <span className="block font-semibold text-slate-900">{t('Advanced')}</span>
            <span className="block text-xs text-slate-500">{t('Balance correction and experiment controls')}</span>
          </span>
          {advancedOpen ? <ChevronUp className="h-4 w-4 text-slate-500" /> : <ChevronDown className="h-4 w-4 text-slate-500" />}
        </button>
        {advancedOpen && (
          <div className="space-y-5 border-t border-slate-200 p-4">
            <form onSubmit={submitAdjustment}>
              <h3 className="text-sm font-semibold text-slate-800">{t('Manual balance adjustment')}</h3>
              <p className="mt-1 text-xs text-slate-500">{t('Every correction is recorded in wallet history.')}</p>
              <div className="mt-3 grid gap-3 sm:grid-cols-[8rem_minmax(0,1fr)_auto] sm:items-end">
                <label className="text-sm font-medium text-slate-700">
                  {t('Amount')}
                  <input
                    value={adjustment}
                    onChange={(event) => setAdjustment(event.target.value)}
                    className={`${fieldClass} mt-1`}
                    type="number"
                    step="1"
                    inputMode="numeric"
                    placeholder="+5 or -5"
                  />
                </label>
                <label className="text-sm font-medium text-slate-700">
                  {t('Reason')}
                  <input
                    value={adjustmentReason}
                    onChange={(event) => setAdjustmentReason(event.target.value)}
                    className={`${fieldClass} mt-1`}
                    maxLength={100}
                    placeholder={t('Why is this needed?')}
                  />
                </label>
                <button type="submit" className={secondaryButton}>{t('Record')}</button>
              </div>
              {adjustmentError && <p className="mt-2 text-sm text-red-700" role="alert">{adjustmentError}</p>}
            </form>

            <div className="border-t border-slate-200 pt-4">
              <h3 className="text-sm font-semibold text-slate-800">{t('Experiment controls')}</h3>
              <div className="mt-3 flex flex-wrap gap-2">
                <button type="button" onClick={() => onConfirm({ kind: 'disable' })} className={secondaryButton}>
                  {t('Disable, keep data')}
                </button>
                <button type="button" onClick={() => onConfirm({ kind: 'reset' })} className={dangerButton}>
                  <RotateCcw className="h-4 w-4" />
                  {t('Reset experiment')}
                </button>
                <button type="button" onClick={() => onConfirm({ kind: 'erase' })} className={dangerButton}>
                  <Trash2 className="h-4 w-4" />
                  {t('Disable & erase')}
                </button>
              </div>
            </div>
          </div>
        )}
      </section>
    </div>
  );
};

interface ConfirmationDialogProps {
  confirmation: Confirmation;
  currencyName: string;
  onCancel: () => void;
  onConfirm: () => void;
}

const ConfirmationDialog = ({ confirmation, currencyName, onCancel, onConfirm }: ConfirmationDialogProps) => {
  const { t } = useI18n();
  const dialogRef = useRef<HTMLDivElement>(null);
  const destructive = confirmation.kind === 'reset' || confirmation.kind === 'erase';
  const displayCurrency = currencyName === 'points' ? t('points') : currencyName;
  let title = '';
  let message = '';
  let confirmLabel = t('Confirm');

  if (confirmation.kind === 'redeem') {
    title = t('Redeem {title}?', { title: confirmation.reward.title });
    message = t('{amount} {currency} will be deducted from your balance.', { amount: confirmation.reward.cost, currency: displayCurrency });
    confirmLabel = t('Redeem');
  } else if (confirmation.kind === 'refund') {
    title = t('Undo this redemption?');
    message = t('{amount} {currency} will be returned to your balance.', { amount: Math.abs(confirmation.transaction.amount), currency: displayCurrency });
    confirmLabel = t('Undo redemption');
  } else if (confirmation.kind === 'archive') {
    title = t('Archive {title}?', { title: confirmation.reward.title });
    message = t('It will leave the active catalog, but its wallet history will remain. You can restore it later.');
    confirmLabel = t('Archive');
  } else if (confirmation.kind === 'disable') {
    title = t('Disable Rewards Lab?');
    message = t('The experiment will disappear from the planner, but all grades, rewards, and wallet history will stay on this device.');
    confirmLabel = t('Disable, keep data');
  } else if (confirmation.kind === 'reset') {
    title = t('Reset the experiment?');
    message = t('This permanently clears task grades, wallet history, claims, rewards, and settings. Rewards Lab will stay enabled. Planner tasks are not affected.');
    confirmLabel = t('Reset Rewards Lab');
  } else {
    title = t('Disable and erase Rewards Lab?');
    message = t('This permanently removes all experimental data from this device and turns the feature off. Planner tasks are not affected.');
    confirmLabel = t('Disable & erase');
  }

  const trapDialogFocus = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (event.key !== 'Tab') return;
    const focusable = Array.from(dialogRef.current?.querySelectorAll<HTMLButtonElement>('button:not([disabled])') ?? []);
    if (focusable.length === 0) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  };

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4"
      onMouseDown={(event) => {
        event.stopPropagation();
        onCancel();
      }}
    >
      <div
        ref={dialogRef}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="rewards-confirm-title"
        aria-describedby="rewards-confirm-description"
        className="w-full max-w-md overflow-hidden rounded-xl bg-white shadow-2xl"
        onMouseDown={(event) => event.stopPropagation()}
        onKeyDown={trapDialogFocus}
      >
        <div className={`${destructive ? 'bg-red-50' : 'bg-slate-50'} px-4 py-3`}>
          <h2 id="rewards-confirm-title" className={`font-semibold ${destructive ? 'text-red-900' : 'text-slate-900'}`}>{title}</h2>
        </div>
        <p id="rewards-confirm-description" className="px-4 py-4 text-sm leading-relaxed text-slate-700">{message}</p>
        <div className="flex justify-end gap-2 bg-slate-50 px-4 py-3">
          <button type="button" onClick={onCancel} className={secondaryButton} autoFocus>{t('Cancel')}</button>
          <button type="button" onClick={onConfirm} className={destructive ? `${buttonBase} bg-red-600 text-white hover:bg-red-700` : primaryButton}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};

const tabs: Array<{ id: LabTab; label: string; icon: typeof Gift }> = [
  { id: 'rewards', label: 'Rewards', icon: Gift },
  { id: 'history', label: 'History', icon: History },
  { id: 'rules', label: 'Rules', icon: Dice5 },
];

const RewardsLabPanel = () => {
  const { t } = useI18n();
  const runtime = useMemo(() => getRewardsLabRuntime(), []);
  const subscribe = useMemo(() => (listener: () => void) => runtime.subscribe(listener), [runtime]);
  const getSnapshot = useMemo(() => () => runtime.getSnapshot(), [runtime]);
  const snapshot = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  const [activeTab, setActiveTab] = useState<LabTab>('rewards');
  const [confirmation, setConfirmation] = useState<Confirmation | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const confirmationRef = useRef<Confirmation | null>(null);
  const confirmationTriggerRef = useRef<HTMLElement | null>(null);
  confirmationRef.current = confirmation;

  const openConfirmation = (nextConfirmation: Confirmation) => {
    confirmationTriggerRef.current = document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null;
    setConfirmation(nextConfirmation);
  };

  useEffect(() => {
    if (confirmation || !confirmationTriggerRef.current) return;
    const trigger = confirmationTriggerRef.current;
    confirmationTriggerRef.current = null;
    if (trigger.isConnected) trigger.focus();
    if (document.activeElement !== trigger) closeButtonRef.current?.focus();
  }, [confirmation]);

  useEffect(() => {
    if (!snapshot.isOpen) return undefined;
    const previouslyFocused = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    closeButtonRef.current?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        if (confirmationRef.current) setConfirmation(null);
        else runtime.closeLab();
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = originalOverflow;
      document.removeEventListener('keydown', onKeyDown);
      previouslyFocused?.focus();
    };
  }, [runtime, snapshot.isOpen]);

  if (!snapshot.isOpen || !snapshot.state) return null;
  const state = snapshot.state;
  const balance = getWalletBalance(state);

  const trapFocus = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (event.key !== 'Tab' || confirmation) return;
    const focusable = Array.from(panelRef.current?.querySelectorAll<HTMLElement>(
      'button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [href], [tabindex]:not([tabindex="-1"])',
    ) ?? []).filter((element) => element.offsetParent !== null);
    if (focusable.length === 0) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  };

  const runConfirmation = () => {
    if (!confirmation) return;
    if (confirmation.kind === 'redeem') {
      const outcome = runtime.redeem(confirmation.reward.id);
      if (outcome === 'redeemed') setNotice(t('{title} redeemed.', { title: confirmation.reward.title }));
      else if (outcome === 'insufficient-balance') setNotice(t('The balance is no longer sufficient for that reward.'));
      else if (outcome === 'already-redeemed') setNotice(t('That one-time reward was already redeemed.'));
      else setNotice(t('The reward could not be redeemed.'));
    } else if (confirmation.kind === 'refund') {
      const outcome = runtime.refund(confirmation.transaction.id);
      setNotice(outcome === 'refunded' ? t('Redemption undone and balance restored.') : t('That redemption was already handled.'));
    } else if (confirmation.kind === 'archive') {
      if (runtime.archiveReward(confirmation.reward.id)) setNotice(t('{title} archived.', { title: confirmation.reward.title }));
    } else if (confirmation.kind === 'disable') {
      runtime.disableKeepData();
    } else if (confirmation.kind === 'reset') {
      if (runtime.resetDataKeepingEnabled()) {
        setActiveTab('rewards');
        setNotice(t('Rewards Lab reset. Planner tasks were not changed.'));
      }
    } else {
      runtime.disableAndErase();
    }
    setConfirmation(null);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/35 backdrop-blur-sm md:items-center md:p-4"
      onMouseDown={() => runtime.closeLab()}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="rewards-lab-title"
        className="flex h-[94dvh] w-full flex-col overflow-hidden rounded-t-2xl bg-slate-50 shadow-2xl md:h-auto md:max-h-[88vh] md:max-w-3xl md:rounded-2xl"
        onMouseDown={(event) => event.stopPropagation()}
        onKeyDown={trapFocus}
      >
        <header className="shrink-0 border-b border-slate-200 bg-white px-4 pt-4 sm:px-5">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-indigo-100 text-indigo-700">
                  <Dice5 className="h-5 w-5" aria-hidden="true" />
                </div>
                <div className="min-w-0">
                  <h1 id="rewards-lab-title" className="truncate text-lg font-bold text-slate-900">{t('Rewards Lab')}</h1>
                  <p className="text-xs text-slate-500">{t('Optional gamification experiment')}</p>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="hidden max-w-48 truncate rounded-full bg-indigo-50 px-3 py-1.5 text-sm font-semibold text-indigo-800 sm:block" aria-label={t('Balance: {balance} {currency}', { balance, currency: state.currencyName === 'points' ? t('points') : state.currencyName })}>
                {balance} {state.currencyName}
              </div>
              <button
                ref={closeButtonRef}
                type="button"
                onClick={() => runtime.closeLab()}
                className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                aria-label={t('Close Rewards Lab')}
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-3 gap-1" role="tablist" aria-label={t('Rewards Lab sections')}>
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const selected = tab.id === activeTab;
              return (
                <button
                  key={tab.id}
                  type="button"
                  role="tab"
                  id={`rewards-tab-${tab.id}`}
                  aria-selected={selected}
                  aria-controls={`rewards-panel-${tab.id}`}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex min-h-11 items-center justify-center gap-2 rounded-t-lg border-b-2 px-2 text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-indigo-500 ${selected ? 'border-indigo-600 bg-indigo-50/60 text-indigo-700' : 'border-transparent text-slate-500 hover:bg-slate-50 hover:text-slate-800'}`}
                >
                  <Icon className="h-4 w-4" aria-hidden="true" />
                  {t(tab.label)}
                </button>
              );
            })}
          </div>
        </header>

        <main className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-5">
          {snapshot.lastError && (
            <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900" role="status">
              {t('Rewards Lab recovered from a local storage problem. Your planner continued normally.')}
            </div>
          )}
          <Notice message={notice} onDismiss={() => setNotice(null)} />
          <div
            role="tabpanel"
            id={`rewards-panel-${activeTab}`}
            aria-labelledby={`rewards-tab-${activeTab}`}
          >
            {activeTab === 'rewards' && <RewardsTab state={state} onNotice={setNotice} onConfirm={openConfirmation} />}
            {activeTab === 'history' && <HistoryTab state={state} onConfirm={openConfirmation} />}
            {activeTab === 'rules' && <RulesTab state={state} onNotice={setNotice} onConfirm={openConfirmation} />}
          </div>
        </main>
      </div>

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

export default RewardsLabPanel;
