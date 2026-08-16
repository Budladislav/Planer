import { Task } from './types';
import { getWeekString } from './utils';
import { getMonthForWeek, getTaskPlanningMonth } from './month-planning';

export const planTaskForWeek = (task: Task, targetWeek: string): Task['plan'] => {
  const sourceWeek = task.plan.day
    ? getWeekString(task.plan.day)
    : task.plan.week;

  return {
    day: sourceWeek === targetWeek ? task.plan.day : null,
    week: targetWeek,
    month: sourceWeek === targetWeek
      ? getTaskPlanningMonth(task) ?? getMonthForWeek(targetWeek)
      : getMonthForWeek(targetWeek),
  };
};
