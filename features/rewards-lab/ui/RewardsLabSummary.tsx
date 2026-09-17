import { Coins, KeyRound, Undo2 } from 'lucide-react';
import { useState } from 'react';
import {
  REWARD_GRADES,
  RewardGrade,
  RewardPeriodScale,
  RewardPeriodSummary,
  RewardsLabState,
  WalletTransaction,
  getActiveSpendTransactions,
  getCurrentRewardResults,
  getEarnedTaskRewards,
  getPastRewardPeriodCount,
  getRewardPeriodResult,
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
      <p className="mt-0.5 text-xs text-slate-500">
        {t('{count} completed tasks', { count: summary.taskCount })} · {t('{count} keys found', { count: summary.keyCount })}
      </p>
      {(summary.taskCount > 0 || summary.keyCount > 0) && (
        <div className="mt-2 space-y-1.5">
          {summary.taskCount > 0 && (
            <div className="flex flex-wrap items-center gap-1">
              <span className="mr-0.5 text-[10px] font-medium text-slate-400">{t('Tasks')}</span>
              {rewardGrades.filter(grade => summary.gradeCounts[grade] > 0).map(grade => (
                <span key={grade} className={`rounded-full border px-1.5 py-0.5 text-[10px] font-medium ${gradeStyles[grade].badge}`}>
                  {t(REWARD_GRADES[grade].label)}: {summary.gradeCounts[grade]}
                </span>
              ))}
            </div>
          )}
          {summary.keyCount > 0 && (
            <div className="flex flex-wrap items-center gap-1">
              <span className="mr-0.5 text-[10px] font-medium text-slate-400">{t('Keys')}</span>
              {rewardGrades.filter(grade => summary.keyGradeCounts[grade] > 0).map(grade => (
                <span key={grade} className={`inline-flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-[10px] font-medium ${gradeStyles[grade].badge}`}>
                  <KeyRound className="h-3 w-3" />{t(REWARD_GRADES[grade].label)}: {summary.keyGradeCounts[grade]}
                </span>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

const periodScales: RewardPeriodScale[] = ['day', 'week', 'month'];

const periodScaleLabel = (scale: RewardPeriodScale): string => (
  scale === 'day' ? 'Day' : scale === 'week' ? 'Week' : 'Month'
);

const formatPeriodLabel = (scale: RewardPeriodScale, from: Date, to: Date, locale: string): string => {
  if (scale === 'day') {
    return from.toLocaleDateString(locale, { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric' });
  }
  if (scale === 'month') {
    return from.toLocaleDateString(locale, { month: 'long', year: 'numeric' });
  }
  const inclusiveEnd = new Date(to.getTime() - 1);
  const start = from.toLocaleDateString(locale, { day: 'numeric', month: 'short' });
  const end = inclusiveEnd.toLocaleDateString(locale, { day: 'numeric', month: 'short', year: 'numeric' });
  return `${start} — ${end}`;
};

const PastRewardPeriods = ({ state, currencyName }: { state: RewardsLabState; currencyName: string }) => {
  const { locale, t } = useI18n();
  const [scale, setScale] = useState<RewardPeriodScale>('day');
  const [visibleCount, setVisibleCount] = useState(14);
  const batchSize = scale === 'day' ? 14 : 12;
  const totalCount = getPastRewardPeriodCount(state, scale);
  const periods = Array.from({ length: Math.min(visibleCount, totalCount) }, (_, index) => (
    getRewardPeriodResult(state, scale, -(index + 1))
  ));
  const selectScale = (nextScale: RewardPeriodScale) => {
    setScale(nextScale);
    setVisibleCount(nextScale === 'day' ? 14 : 12);
  };

  return (
    <section className="section-card bg-slate-50 p-3 shadow-none">
      <div className="flex flex-wrap items-center justify-between gap-2 px-1">
        <h2 className="text-sm font-semibold text-slate-800">{t('Past periods')}</h2>
        <div className="flex rounded-lg bg-white p-0.5 shadow-sm">
          {periodScales.map(item => (
            <button
              key={item}
              type="button"
              onClick={() => selectScale(item)}
              className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${scale === item ? 'bg-brand-100 text-brand-800' : 'text-slate-500 hover:text-slate-800'}`}
            >
              {t(periodScaleLabel(item))}
            </button>
          ))}
        </div>
      </div>
      {periods.length === 0 ? (
        <p className="mt-3 rounded-xl bg-white px-3 py-5 text-center text-xs text-slate-400">{t('No previous reward periods yet.')}</p>
      ) : (
        <div className="mt-2 space-y-1.5">
          {periods.map(period => (
            <div key={period.from.toISOString()} className="grid grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-x-3 gap-y-1 rounded-xl bg-white px-3 py-2.5">
              <p className="min-w-0 text-xs font-semibold text-slate-700">{formatPeriodLabel(scale, period.from, period.to, locale)}</p>
              <span className="inline-flex items-center gap-1 text-sm font-bold tabular-nums text-brand-700" title={currencyName}>
                <Coins className="h-3.5 w-3.5" />+{period.summary.amount}
              </span>
              <span className="inline-flex items-center gap-1 text-sm font-semibold tabular-nums text-slate-700" title={t('{count} keys found', { count: period.summary.keyCount })}>
                <KeyRound className="h-3.5 w-3.5" />{period.summary.keyCount}
              </span>
              <div className="col-span-3 flex min-w-0 flex-wrap items-center gap-1 text-[10px] text-slate-400">
                <span>{t('{count} completed tasks', { count: period.summary.taskCount })}</span>
                {rewardGrades.filter(grade => period.summary.keyGradeCounts[grade] > 0).map(grade => (
                  <span key={grade} className={`inline-flex items-center gap-0.5 rounded-full border px-1.5 py-0.5 font-medium ${gradeStyles[grade].badge}`}>
                    <KeyRound className="h-2.5 w-2.5" />{t(REWARD_GRADES[grade].label)}: {period.summary.keyGradeCounts[grade]}
                  </span>
                ))}
              </div>
            </div>
          ))}
          {visibleCount < totalCount && (
            <button type="button" onClick={() => setVisibleCount(value => value + batchSize)} className="button-secondary mx-auto mt-2">
              {t('Show more')}
            </button>
          )}
        </div>
      )}
    </section>
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
        <div className="mt-2 grid gap-2 sm:grid-cols-3">
          <ResultPeriod label={t('Today')} summary={results.day} currencyName={currencyName} />
          <ResultPeriod label={t('This week')} summary={results.week} currencyName={currencyName} />
          <ResultPeriod label={t('This month')} summary={results.month} currencyName={currencyName} />
        </div>
      </section>
      <PastRewardPeriods state={state} currencyName={currencyName} />
    </>
  );
};
