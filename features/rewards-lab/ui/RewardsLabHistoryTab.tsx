import { Coins, Gift, History, Pencil, Undo2 } from 'lucide-react';
import { REWARD_GRADES, RewardGradeCorrection, RewardsLabState, WalletTransaction } from '../domain';
import { useI18n } from '../../../i18n';
import {
  Confirmation,
  formatDateTime,
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
  ]
    .sort((left, right) => {
      const dateDifference = new Date(right.item.occurredAt).getTime()
        - new Date(left.item.occurredAt).getTime();
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
        {newestFirst.map(historyItem => {
          if (historyItem.kind === 'correction') {
            const correction = historyItem.item as RewardGradeCorrection;
            return (
              <article key={correction.id} className="flex items-center gap-3 border-b border-slate-100 px-3 py-3 last:border-b-0 sm:px-4">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-indigo-50 text-indigo-700">
                  <Pencil className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="break-words text-sm font-medium text-slate-800">{t('Task grade corrected')}</p>
                  <p className="text-xs text-slate-500">
                    {t(REWARD_GRADES[correction.fromGrade].label)} → {t(REWARD_GRADES[correction.toGrade].label)} · {formatDateTime(correction.occurredAt, locale)} · v{correction.economyVersion}
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="font-semibold tabular-nums text-indigo-700">{correction.previousAmount} → {correction.amount}</p>
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
