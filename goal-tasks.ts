import type { Task } from './types';
import { getMonthForWeek, isValidMonthString } from './month-planning';
import { getWeekString, isValidWeekString } from './utils';
import { isValidYearString } from './year-planning';

export type GoalTaskHorizon = 'today' | 'week' | 'month' | 'year';

export const isValidGoalTaskTarget = (horizon: GoalTaskHorizon, target: string): boolean => {
  if (horizon === 'today') return /^\d{4}-\d{2}-\d{2}$/.test(target);
  if (horizon === 'week') return isValidWeekString(target);
  if (horizon === 'month') return isValidMonthString(target);
  return isValidYearString(target);
};

export const defaultGoalTaskTarget = (horizon: GoalTaskHorizon, today: string): string => {
  if (horizon === 'today') return today;
  if (horizon === 'week') return getWeekString(today);
  if (horizon === 'month') return today.slice(0, 7);
  return today.slice(0, 4);
};

export const buildGoalTask = ({
  id,
  goalId,
  title,
  horizon,
  target,
  now,
}: {
  id: string;
  goalId: string;
  title: string;
  horizon: GoalTaskHorizon;
  target: string;
  now: string;
}): Task | null => {
  const normalizedTitle = title.trim();
  if (!normalizedTitle || !isValidGoalTaskTarget(horizon, target)) return null;

  const plan: Task['plan'] = horizon === 'today'
    ? { day: target, week: null, month: target.slice(0, 7), year: target.slice(0, 4) }
    : horizon === 'week'
      ? {
          day: null,
          week: target,
          month: getMonthForWeek(target),
          year: getMonthForWeek(target)?.slice(0, 4) ?? target.slice(0, 4),
        }
      : horizon === 'month'
        ? { day: null, week: null, month: target, year: target.slice(0, 4) }
        : { day: null, week: null, month: null, year: target };

  return {
    id,
    title: normalizedTitle,
    status: 'todo',
    plan,
    projectId: null,
    eventId: null,
    goalId,
    createdAt: now,
    updatedAt: now,
    completedAt: null,
  };
};

export const getGoalTaskCounts = (tasks: Task[], goalId: string): { active: number; completed: number } => (
  tasks.reduce((counts, task) => {
    if (task.goalId !== goalId) return counts;
    if (task.status === 'done') counts.completed += 1;
    else counts.active += 1;
    return counts;
  }, { active: 0, completed: 0 })
);
