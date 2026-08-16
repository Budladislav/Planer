import { Task } from './types';
import { getWeekString } from './utils';

export const planTaskForWeek = (task: Task, targetWeek: string): Task['plan'] => {
  const sourceWeek = task.plan.day
    ? getWeekString(task.plan.day)
    : task.plan.week;

  return {
    day: sourceWeek === targetWeek ? task.plan.day : null,
    week: targetWeek,
  };
};
