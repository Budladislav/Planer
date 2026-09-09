import { Task } from './types';
import { getMonthForWeek, getTaskPlanningMonth, isValidMonthString } from './month-planning';

export const isValidYearString = (year: string): boolean => {
  if (!/^\d{4}$/.test(year)) return false;
  const value = Number(year);
  return value >= 2020 && value <= 2100;
};

export const getYearMonths = (year: string): string[] => {
  if (!isValidYearString(year)) return [];
  return Array.from({ length: 12 }, (_, index) => `${year}-${String(index + 1).padStart(2, '0')}`);
};

export const getTaskPlanningYear = (task: Pick<Task, 'plan'>): string | null => {
  const month = getTaskPlanningMonth(task);
  if (month && isValidMonthString(month)) return month.slice(0, 4);
  if (task.plan.year && isValidYearString(task.plan.year)) return task.plan.year;
  if (task.plan.week) return getMonthForWeek(task.plan.week)?.slice(0, 4) ?? null;
  return null;
};

export const planTaskForYear = (task: Task, targetYear: string): Task['plan'] => {
  if (!isValidYearString(targetYear)) return task.plan;
  const sourceYear = getTaskPlanningYear(task);
  if (sourceYear === targetYear) return { ...task.plan, year: targetYear };
  return { year: targetYear, month: null, week: null, day: null };
};

export const yearMonthOrderKey = (year: string, month: string): string => `${year}|${month}`;

export const partitionYearMonths = (
  months: string[],
  currentMonth: string,
): { pastMonths: string[]; currentAndFutureMonths: string[] } => ({
  pastMonths: months.filter(month => month < currentMonth),
  currentAndFutureMonths: months.filter(month => month >= currentMonth),
});
