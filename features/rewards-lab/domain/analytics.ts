import { REWARD_GRADES, RewardGrade, RewardsLabState } from './types';
import { isRewardClaimActive } from './economy';

export interface RewardPeriodSummary {
  amount: number;
  taskCount: number;
  gradeCounts: Record<RewardGrade, number>;
}

const emptyGradeCounts = (): Record<RewardGrade, number> => ({
  common: 0,
  uncommon: 0,
  rare: 0,
  legendary: 0,
  mythic: 0,
});

export const summarizeActiveRewards = (
  state: RewardsLabState,
  from: Date,
  to: Date,
): RewardPeriodSummary => {
  const fromTime = from.getTime();
  const toTime = to.getTime();
  const summary: RewardPeriodSummary = { amount: 0, taskCount: 0, gradeCounts: emptyGradeCounts() };

  Object.values(state.claims).forEach(claim => {
    const completedAt = new Date(claim.completedAt).getTime();
    if (!Number.isFinite(completedAt)
      || completedAt < fromTime
      || completedAt >= toTime
      || !isRewardClaimActive(state, claim.taskId)) return;
    summary.amount += claim.amount;
    summary.taskCount += 1;
    summary.gradeCounts[claim.grade] += 1;
  });

  return summary;
};

export const getCurrentRewardResults = (
  state: RewardsLabState,
  currentDate = new Date(),
): { week: RewardPeriodSummary; month: RewardPeriodSummary } => {
  const weekStart = new Date(currentDate);
  weekStart.setHours(0, 0, 0, 0);
  const mondayOffset = (weekStart.getDay() + 6) % 7;
  weekStart.setDate(weekStart.getDate() - mondayOffset);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 7);

  const monthStart = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
  const monthEnd = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1);
  return {
    week: summarizeActiveRewards(state, weekStart, weekEnd),
    month: summarizeActiveRewards(state, monthStart, monthEnd),
  };
};

export const rewardGrades = Object.keys(REWARD_GRADES) as RewardGrade[];
