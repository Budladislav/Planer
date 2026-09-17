import { REWARD_GRADES, RewardGrade, RewardsLabState } from './types';
import { isRewardClaimActive } from './economy';

export interface RewardPeriodSummary {
  amount: number;
  taskCount: number;
  gradeCounts: Record<RewardGrade, number>;
  keyCount: number;
  keyGradeCounts: Record<RewardGrade, number>;
}

export type RewardPeriodScale = 'day' | 'week' | 'month';

export interface RewardPeriodResult {
  from: Date;
  to: Date;
  summary: RewardPeriodSummary;
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
  const summary: RewardPeriodSummary = {
    amount: 0,
    taskCount: 0,
    gradeCounts: emptyGradeCounts(),
    keyCount: 0,
    keyGradeCounts: emptyGradeCounts(),
  };

  Object.values(state.claims).forEach(claim => {
    const completedAt = new Date(claim.completedAt).getTime();
    if (!Number.isFinite(completedAt)
      || completedAt < fromTime
      || completedAt >= toTime
      || !isRewardClaimActive(state, claim.taskId)) return;
    summary.amount += claim.amount;
    summary.taskCount += 1;
    summary.gradeCounts[claim.grade] += 1;
    if (claim.economyVersion === 3 && claim.keyId) {
      const key = state.keys.find(item => item.id === claim.keyId);
      if (key) {
        summary.keyCount += 1;
        summary.keyGradeCounts[key.grade] += 1;
      }
    }
  });

  return summary;
};

export const getRewardPeriodResult = (
  state: RewardsLabState,
  scale: RewardPeriodScale,
  offset = 0,
  currentDate = new Date(),
): RewardPeriodResult => {
  const from = new Date(currentDate);
  from.setHours(0, 0, 0, 0);

  if (scale === 'day') {
    from.setDate(from.getDate() + offset);
  } else if (scale === 'week') {
    const mondayOffset = (from.getDay() + 6) % 7;
    from.setDate(from.getDate() - mondayOffset + offset * 7);
  } else {
    from.setDate(1);
    from.setMonth(from.getMonth() + offset);
  }

  const to = new Date(from);
  if (scale === 'day') to.setDate(to.getDate() + 1);
  else if (scale === 'week') to.setDate(to.getDate() + 7);
  else to.setMonth(to.getMonth() + 1);

  return { from, to, summary: summarizeActiveRewards(state, from, to) };
};

export const getPastRewardPeriodCount = (
  state: RewardsLabState,
  scale: RewardPeriodScale,
  currentDate = new Date(),
): number => {
  const activeCompletionTimes = Object.values(state.claims).flatMap(claim => {
    if (!isRewardClaimActive(state, claim.taskId)) return [];
    const time = new Date(claim.completedAt).getTime();
    return Number.isFinite(time) ? [time] : [];
  });
  if (activeCompletionTimes.length === 0) return 0;

  const earliest = new Date(Math.min(...activeCompletionTimes));
  const currentStart = getRewardPeriodResult(state, scale, 0, currentDate).from;
  const earliestStart = getRewardPeriodResult(state, scale, 0, earliest).from;
  if (earliestStart >= currentStart) return 0;

  if (scale === 'month') {
    return (currentStart.getFullYear() - earliestStart.getFullYear()) * 12
      + currentStart.getMonth() - earliestStart.getMonth();
  }

  const localCalendarDay = (date: Date): number => Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / 86_400_000;
  const dayDifference = localCalendarDay(currentStart) - localCalendarDay(earliestStart);
  return scale === 'week' ? Math.floor(dayDifference / 7) : dayDifference;
};

export const getCurrentRewardResults = (
  state: RewardsLabState,
  currentDate = new Date(),
): { day: RewardPeriodSummary; week: RewardPeriodSummary; month: RewardPeriodSummary } => {
  return {
    day: getRewardPeriodResult(state, 'day', 0, currentDate).summary,
    week: getRewardPeriodResult(state, 'week', 0, currentDate).summary,
    month: getRewardPeriodResult(state, 'month', 0, currentDate).summary,
  };
};

export const rewardGrades = Object.keys(REWARD_GRADES) as RewardGrade[];
