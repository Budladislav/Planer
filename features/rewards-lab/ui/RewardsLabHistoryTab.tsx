import { ArrowUp, Coins, Gift, History, KeyRound, Pencil, Undo2 } from 'lucide-react';
import { REWARD_GRADES, RewardGradeCorrection, RewardsLabState, WalletTransaction } from '../domain';
import { useI18n } from '../../../i18n';
import {
  Confirmation,
  formatDateTime,
  gradeStyles,
  unrefundedSpendIds,
} from './RewardsLabPanel.shared';

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

export const HistoryTab = ({ state, onConfirm }: HistoryTabProps) => {
  const { locale, t } = useI18n();
  const spendIds = unrefundedSpendIds(state);
  const newestFirst = [
    ...state.ledger.map((transaction, index) => ({ kind: 'transaction' as const, item: transaction, index })),
    ...state.gradeCorrections.map((correction, index) => ({
      kind: 'correction' as const,
      item: correction,
      index: state.ledger.length + index,
    })),
    ...state.keyUpgrades.map((upgrade, index) => ({
      kind: 'upgrade' as const,
      item: upgrade,
      index: state.ledger.length + state.gradeCorrections.length + index,
    })),
  ]
    .sort((left, right) => {
      const dateDifference = new Date(right.item.occurredAt).getTime()
        - new Date(left.item.occurredAt).getTime();
      return dateDifference || right.index - left.index;
    });

  if (newestFirst.length === 0) {
    return (
      <div className="empty-state py-10">
        <History className="mx-auto h-8 w-8 text-slate-300" aria-hidden="true" />
        <p className="mt-3 font-medium text-slate-700">{t('No wallet activity yet')}</p>
        <p className="mt-1 text-sm text-slate-500">{t('Complete a task to earn the first credits and try for a key.')}</p>
      </div>
    );
  }

  return (
    <section aria-label={t('Wallet history')}>
      <div className="surface-card shadow-none">
        {newestFirst.map(historyItem => {
          if (historyItem.kind === 'upgrade') {
            const upgrade = historyItem.item;
            return (
              <article key={upgrade.id} className="flex items-center gap-3 border-b border-slate-100 px-3 py-3 last:border-b-0 sm:px-4">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-violet-50 text-violet-700"><ArrowUp className="h-4 w-4" /></div>
                <div className="min-w-0 flex-1"><p className="text-sm font-medium text-slate-800">{upgrade.reversedAt ? t('Key upgrade undone') : t('Keys upgraded')}</p><p className="text-xs text-slate-500">5 × {t(REWARD_GRADES[upgrade.fromGrade].label)} → 1 × {t(REWARD_GRADES[upgrade.toGrade].label)} · {formatDateTime(upgrade.occurredAt, locale)}</p></div>
              </article>
            );
          }
          if (historyItem.kind === 'correction') {
            const correction = historyItem.item as RewardGradeCorrection;
            return (
              <article key={correction.id} className="flex items-center gap-3 border-b border-slate-100 px-3 py-3 last:border-b-0 sm:px-4">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-700">
                  <Pencil className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="break-words text-sm font-medium text-slate-800">{t('Task grade corrected')}</p>
                  <p className="text-xs text-slate-500">
                    {t(REWARD_GRADES[correction.fromGrade].label)} → {t(REWARD_GRADES[correction.toGrade].label)} · {formatDateTime(correction.occurredAt, locale)} · v{correction.economyVersion}
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="font-semibold tabular-nums text-brand-700">{correction.previousAmount} → {correction.amount}</p>
                  <p className="max-w-20 truncate text-[11px] text-slate-400">{state.currencyName}</p>
                </div>
              </article>
            );
          }

          const transaction = historyItem.item as WalletTransaction;
          const positive = transaction.amount > 0;
          const refundable = transaction.kind === 'spend' && spendIds.has(transaction.id);
          const claimVersion = transaction.claimId
            ? Object.values(state.claims).find(claim => claim.id === transaction.claimId)?.economyVersion
            : undefined;
          const economyVersion = transaction.economyVersion ?? claimVersion;
          const claim = transaction.claimId
            ? Object.values(state.claims).find(item => item.id === transaction.claimId)
            : undefined;
          const claimKey = claim?.economyVersion === 3 && claim.keyId
            ? state.keys.find(key => key.id === claim.keyId)
            : undefined;
          const spentKey = transaction.keyId ? state.keys.find(key => key.id === transaction.keyId) : undefined;
          return (
            <article key={transaction.id} className="flex items-center gap-3 border-b border-slate-100 px-3 py-3 last:border-b-0 sm:px-4">
              <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${positive ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>
                {transaction.kind === 'spend' ? <Gift className="h-4 w-4" /> : <Coins className="h-4 w-4" />}
              </div>
              <div className="min-w-0 flex-1">
                <p className="break-words text-sm font-medium text-slate-800">{transaction.label}</p>
                <p className="text-xs text-slate-500">
                  {t(transactionKindLabel[transaction.kind])} · {formatDateTime(transaction.occurredAt, locale)}
                  {economyVersion ? ` · v${economyVersion}` : ''}
                </p>
                {claim && (
                  <span className={`mt-1 inline-flex rounded-full border px-1.5 py-0.5 text-[10px] font-medium ${gradeStyles[claim.grade].badge}`}>
                    {t(REWARD_GRADES[claim.grade].label)}
                  </span>
                )}
                {(claimKey || spentKey) && (() => {
                  const key = (transaction.kind === 'spend' ? spentKey ?? claimKey : claimKey ?? spentKey)!;
                  return <p className={`mt-0.5 flex items-center gap-1 text-xs ${gradeStyles[key.grade].keyText}`}><KeyRound className="h-3 w-3" />{transaction.kind === 'spend' ? t('{grade} key spent', { grade: t(REWARD_GRADES[key.grade].label) }) : t('{grade} key found', { grade: t(REWARD_GRADES[key.grade].label) })}</p>;
                })()}
              </div>
              {transaction.amount !== 0 && <div className="shrink-0 text-right">
                <p className={`font-semibold tabular-nums ${positive ? 'text-emerald-700' : 'text-slate-700'}`}>
                  {positive ? '+' : '−'}{Math.abs(transaction.amount)}
                </p>
                <p className="max-w-20 truncate text-[11px] text-slate-400">{state.currencyName}</p>
              </div>}
              {refundable && (
                <button
                  type="button"
                  onClick={() => onConfirm({ kind: 'refund', transaction })}
                  className="icon-button"
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
