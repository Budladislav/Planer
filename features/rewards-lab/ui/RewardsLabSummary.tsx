import { Coins, Undo2 } from 'lucide-react';
import {
  REWARD_GRADES,
  RewardGrade,
  RewardPeriodSummary,
  RewardsLabState,
  WalletTransaction,
  getActiveSpendTransactions,
  getCurrentRewardResults,
  getEarnedTaskRewards,
  getWalletBalance,
  rewardGrades,
} from '../domain';
import { useI18n } from '../../../i18n';
import { gradeStyles, latestUnrefundedSpend, secondaryButton } from './RewardsLabPanel.shared';
import { RewardsKeyInventory } from './RewardsKeyInventory';

const ResultPeriod = ({ label, summary, currencyName }: {
  label: string;
  summary: RewardPeriodSummary;
  currencyName: string;
}) => {
  const { t } = useI18n();
  return (
    <div className="rounded-xl bg-white p-3">
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

export const RewardsLabSummary = ({
  state,
  onRefund,
  onUpgrade,
  onUndoUpgrade,
}: {
  state: RewardsLabState;
  onRefund: (transaction: WalletTransaction) => void;
  onUpgrade: (grade: RewardGrade) => void;
  onUndoUpgrade: () => void;
}) => {
  const { locale, t } = useI18n();
  const balance = getWalletBalance(state);
  const latestSpend = latestUnrefundedSpend(state);
  const currencyName = state.currencyName === 'points' ? t('points') : state.currencyName;
  const earned = getEarnedTaskRewards(state);
  const spent = Math.abs(state.ledger
    .filter(item => item.kind === 'spend' || item.kind === 'refund')
    .reduce((total, item) => total + item.amount, 0));
  const activeRedemptions = getActiveSpendTransactions(state).length;
  const results = getCurrentRewardResults(state);

  return (
    <>
      <section className="rounded-2xl border border-brand-100 bg-brand-50/70 p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-brand-600">{t('Available balance')}</p>
            <p className="mt-1 flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-3xl font-bold text-slate-900">
              <Coins className="h-6 w-6 text-brand-500" />
              <span className="break-all">{balance.toLocaleString(locale)}</span>
              <span className="max-w-full break-all text-base font-medium text-slate-500">{currencyName}</span>
            </p>
          </div>
          {latestSpend && (
            <button type="button" onClick={() => onRefund(latestSpend)} className={secondaryButton}>
              <Undo2 className="h-4 w-4" /> {t('Undo last redemption')}
            </button>
          )}
        </div>
        <div className="mt-4 grid grid-cols-3 gap-2 border-t border-brand-100 pt-3">
          <div><p className="text-[11px] text-slate-500">{t('Earned total')}</p><p className="mt-0.5 font-semibold tabular-nums text-slate-800">{earned.toLocaleString(locale)}</p></div>
          <div><p className="text-[11px] text-slate-500">{t('Spent')}</p><p className="mt-0.5 font-semibold tabular-nums text-slate-800">{spent.toLocaleString(locale)}</p></div>
          <div><p className="text-[11px] text-slate-500">{t('Rewards received')}</p><p className="mt-0.5 font-semibold tabular-nums text-slate-800">{activeRedemptions.toLocaleString(locale)}</p></div>
        </div>
      </section>
      <RewardsKeyInventory state={state} onUpgrade={onUpgrade} onUndoUpgrade={onUndoUpgrade} />
      <section className="section-card bg-slate-50 p-3 shadow-none">
        <h2 className="px-1 text-sm font-semibold text-slate-800">{t('Current results')}</h2>
        <div className="mt-2 grid gap-2 sm:grid-cols-2">
          <ResultPeriod label={t('This week')} summary={results.week} currencyName={currencyName} />
          <ResultPeriod label={t('This month')} summary={results.month} currencyName={currencyName} />
        </div>
      </section>
    </>
  );
};
