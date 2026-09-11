import { getActivePlanningImportance } from '../../planning-importance';
import type { Task } from '../../types';
import { REWARD_GRADES, type RewardGrade, type RewardImportanceReason } from './domain';

const GRADES = Object.keys(REWARD_GRADES) as RewardGrade[];
const PLANNING_FLOORS: Record<'week' | 'month' | 'year', RewardGrade> = {
  week: 'uncommon',
  month: 'rare',
  year: 'rare',
};

const higherGrade = (left: RewardGrade, right: RewardGrade): RewardGrade => (
  GRADES.indexOf(left) >= GRADES.indexOf(right) ? left : right
);

export interface AutomaticGradeRule {
  minimumGrade: RewardGrade;
  reasons: RewardImportanceReason[];
}

export const getTaskAutomaticGradeRule = (
  task: Pick<Task, 'goalId' | 'eventId' | 'planningImportance'>,
): AutomaticGradeRule => {
  const reasons: RewardImportanceReason[] = [];
  let minimumGrade: RewardGrade = 'common';
  const planningSource = getActivePlanningImportance(task);

  if (planningSource) {
    reasons.push(planningSource);
    minimumGrade = higherGrade(minimumGrade, PLANNING_FLOORS[planningSource]);
  }
  if (task.goalId) {
    reasons.push('goal');
    minimumGrade = higherGrade(minimumGrade, 'uncommon');
  }
  if (task.eventId) {
    reasons.push('event');
    minimumGrade = higherGrade(minimumGrade, 'uncommon');
  }
  return { minimumGrade, reasons };
};

export const getEffectiveTaskGrade = (
  manualGrade: RewardGrade,
  minimumGrade: RewardGrade,
): RewardGrade => higherGrade(manualGrade, minimumGrade);
