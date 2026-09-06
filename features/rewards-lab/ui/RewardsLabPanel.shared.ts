import {
  FAIR_BAG_SLOTS,
  RewardDefinition,
  RewardGrade,
  RewardsLabState,
  WalletTransaction,
  getV2RewardAmount,
} from '../domain';

export type Confirmation =
  | { kind: 'redeem'; reward: RewardDefinition }
  | { kind: 'refund'; transaction: WalletTransaction }
  | { kind: 'archive'; reward: RewardDefinition }
  | { kind: 'disable' }
  | { kind: 'reset' }
  | { kind: 'erase' };

const averageCommonReward = FAIR_BAG_SLOTS.reduce<number>(
  (total, luckSlot) => total + getV2RewardAmount('common', luckSlot),
  0,
) / FAIR_BAG_SLOTS.length;

export const buttonBase = 'inline-flex min-h-9 items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50';
export const primaryButton = `${buttonBase} bg-indigo-600 text-white hover:bg-indigo-700`;
export const secondaryButton = `${buttonBase} border border-slate-200 bg-white text-slate-700 hover:bg-slate-50`;
export const dangerButton = `${buttonBase} border border-red-200 bg-white text-red-700 hover:bg-red-50`;
export const fieldClass = 'w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100';

export const gradeStyles: Record<RewardGrade, { dot: string; badge: string }> = {
  common: { dot: 'bg-slate-400', badge: 'border-slate-200 bg-slate-50 text-slate-700' },
  uncommon: { dot: 'bg-emerald-500', badge: 'border-emerald-200 bg-emerald-50 text-emerald-800' },
  rare: { dot: 'bg-blue-500', badge: 'border-blue-200 bg-blue-50 text-blue-800' },
  legendary: { dot: 'bg-amber-400', badge: 'border-amber-200 bg-amber-50 text-amber-900' },
  mythic: { dot: 'bg-red-500', badge: 'border-red-200 bg-red-50 text-red-800' },
};

export const formatDateTime = (value: string, locale: string): string => {
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

export const getCommonTaskEstimate = (cost: number): string => {
  const estimate = cost / averageCommonReward;
  return Number.isInteger(estimate) ? estimate.toString() : estimate.toFixed(1);
};

export const unrefundedSpendIds = (state: RewardsLabState): Set<string> => {
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

export const latestUnrefundedSpend = (state: RewardsLabState): WalletTransaction | null => {
  const spendIds = unrefundedSpendIds(state);
  for (let index = state.ledger.length - 1; index >= 0; index -= 1) {
    const item = state.ledger[index];
    if (item.kind === 'spend' && spendIds.has(item.id)) return item;
  }
  return null;
};

export const isOneTimeRewardUsed = (
  reward: RewardDefinition,
  state: RewardsLabState,
): boolean => {
  if (reward.repeatable) return false;
  const spendIds = unrefundedSpendIds(state);
  return state.ledger.some(
    (item) => item.kind === 'spend' && item.rewardId === reward.id && spendIds.has(item.id),
  );
};
