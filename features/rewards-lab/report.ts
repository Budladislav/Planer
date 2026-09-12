import type {
  DateRange,
  ReportRewardGrade,
  RewardsReportData,
  RewardRedemptionReportEntry,
} from '../../completed-report';
import { getDateString } from '../../utils';
import {
  RewardsLabState,
  getActiveSpendTransactions,
  isRewardClaimActive,
} from './domain';

const isInRange = (value: string, range: DateRange): boolean => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return false;
  const day = getDateString(date);
  return day >= range.start && day <= range.end;
};

const keyGradeForId = (
  state: RewardsLabState,
  keyId: string | null | undefined,
): ReportRewardGrade | null => (
  keyId ? state.keys.find(key => key.id === keyId)?.grade ?? null : null
);

export const buildRewardsReportData = (
  state: RewardsLabState,
  range: DateRange,
): RewardsReportData => {
  const claims = Object.values(state.claims)
    .filter(claim => isInRange(claim.completedAt, range) && isRewardClaimActive(state, claim.taskId));
  const taskRewards = Object.fromEntries(claims.map(claim => [claim.taskId, {
    taskId: claim.taskId,
    amount: claim.amount,
    grade: claim.grade,
    keyGrade: claim.economyVersion === 3 ? keyGradeForId(state, claim.keyId) : null,
  }]));
  const redemptions: RewardRedemptionReportEntry[] = getActiveSpendTransactions(state)
    .filter(item => isInRange(item.occurredAt, range))
    .flatMap(item => {
      const kind = item.rewardId ? 'reward' as const : item.purchaseId ? 'purchase' as const : null;
      if (!kind) return [];
      return [{
        id: item.id,
        kind,
        title: item.label,
        occurredAt: item.occurredAt,
        creditsSpent: Math.abs(item.amount),
        keyGrade: keyGradeForId(state, item.keyId),
      }];
    })
    .sort((left, right) => Date.parse(right.occurredAt) - Date.parse(left.occurredAt));

  return {
    currencyName: state.currencyName,
    taskRewards,
    redemptions,
    creditsEarned: claims.reduce((total, claim) => total + claim.amount, 0),
    creditsSpent: redemptions.reduce((total, redemption) => total + redemption.creditsSpent, 0),
    keysFound: claims.filter(claim => claim.economyVersion === 3 && claim.keyId).length,
    keysSpent: redemptions.filter(redemption => redemption.keyGrade !== null).length,
  };
};
