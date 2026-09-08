import {
  FAIR_BAG_SLOTS,
  RewardDefinition,
  RewardGrade,
  PurchaseItem,
  RewardsLabState,
  WalletTransaction,
  getV2RewardAmount,
} from '../domain';

export { gradeStyles } from './rewardGradeStyles';

export type Confirmation =
  | { kind: 'redeem'; reward: RewardDefinition }
  | { kind: 'redeem-purchase'; purchase: PurchaseItem }
  | { kind: 'refund'; transaction: WalletTransaction }
  | { kind: 'archive'; reward: RewardDefinition }
  | { kind: 'upgrade-key'; fromGrade: RewardGrade }
  | { kind: 'undo-key-upgrade' }
  | { kind: 'disable' }
  | { kind: 'reset' }
  | { kind: 'erase' };

const averageCommonReward = FAIR_BAG_SLOTS.reduce<number>(
  (total, luckSlot) => total + getV2RewardAmount('common', luckSlot),
  0,
) / FAIR_BAG_SLOTS.length;

export const buttonBase = 'button-base';
export const primaryButton = 'button-primary';
export const secondaryButton = 'button-secondary';
export const dangerButton = 'button-danger border border-red-200 bg-white';
export const fieldClass = 'field w-full';

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
