import { Coins, KeyRound } from 'lucide-react';
import { REWARD_GRADES, RewardsLabState, getAvailableKeyCounts, getWalletBalance, rewardGrades } from '../domain';
import { useI18n } from '../../../i18n';
import { gradeStyles } from './RewardsLabPanel.shared';

export const RewardsCatalogBalance = ({ state }: { state: RewardsLabState }) => {
  const { locale, t } = useI18n();
  const keys = getAvailableKeyCounts(state);
  const currency = state.currencyName === 'points' ? t('points') : state.currencyName;

  return (
    <section className="flex min-w-0 items-center justify-between gap-3 rounded-2xl border border-brand-100 bg-brand-50/70 px-3 py-2.5">
      <div
        className="flex min-w-0 items-center gap-2 text-xl font-bold tabular-nums text-slate-900"
        aria-label={t('Balance: {balance} {currency}', { balance: getWalletBalance(state), currency })}
      >
        <Coins className="h-5 w-5 shrink-0 text-brand-600" aria-hidden="true" />
        <span className="truncate">{getWalletBalance(state).toLocaleString(locale)}</span>
      </div>
      <div className="flex shrink-0 items-center gap-1.5" aria-label={t('Reward keys')}>
        {rewardGrades.map(grade => (
          <span
            key={grade}
            className={`flex items-center gap-0.5 rounded-lg border bg-white px-1.5 py-1 text-xs font-bold tabular-nums ${gradeStyles[grade].border} ${gradeStyles[grade].keyText}`}
            aria-label={t('{grade} keys: {count}', { grade: t(REWARD_GRADES[grade].label), count: keys[grade] })}
            title={t('{grade} keys: {count}', { grade: t(REWARD_GRADES[grade].label), count: keys[grade] })}
          >
            <KeyRound className="h-3.5 w-3.5" aria-hidden="true" />
            {keys[grade]}
          </span>
        ))}
      </div>
    </section>
  );
};
