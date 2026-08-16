import { Task } from './types';
import { getWeekDates, getWeekString, isValidWeekString } from './utils';

export const isValidMonthString = (month: string): boolean => {
  const match = /^(\d{4})-(\d{2})$/.exec(month);
  if (!match) return false;
  const year = Number(match[1]);
  const monthNumber = Number(match[2]);
  return year >= 2020 && year <= 2100 && monthNumber >= 1 && monthNumber <= 12;
};

export const getMonthForWeek = (week: string): string | null => {
  if (!isValidWeekString(week)) return null;
  return getWeekDates(week)[3]?.slice(0, 7) ?? null;
};

export const getMonthWeeks = (month: string): string[] => {
  if (!isValidMonthString(month)) return [];
  const [year, monthNumber] = month.split('-').map(Number);
  const lastDay = new Date(year, monthNumber, 0).getDate();
  const weeks: string[] = [];

  for (let day = 1; day <= lastDay; day += 1) {
    const week = getWeekString(`${month}-${day.toString().padStart(2, '0')}`);
    if (weeks.at(-1) !== week) weeks.push(week);
  }

  return weeks;
};

export const getTaskPlanningMonth = (task: Pick<Task, 'plan'>): string | null => {
  if (task.plan.month && isValidMonthString(task.plan.month)) return task.plan.month;
  if (task.plan.day) return task.plan.day.slice(0, 7);
  if (task.plan.week) return getMonthForWeek(task.plan.week);
  return null;
};

export const planTaskForMonth = (task: Task, targetMonth: string): Task['plan'] => {
  const currentMonth = getTaskPlanningMonth(task);
  if (currentMonth === targetMonth) return { ...task.plan, month: targetMonth };
  return { month: targetMonth, week: null, day: null };
};

export const monthWeekOrderKey = (month: string, week: string): string => `${month}|${week}`;
