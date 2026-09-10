import type { CalendarEvent, Task } from './types';
import { getLocalDateFromTimestamp, getTaskCompletionTimestamp } from './today-tasks';
import { getWeekString } from './utils';

export const getYearPoolTasks = (tasks: readonly Task[], year: string): Task[] => tasks.filter(task => (
  task.status === 'todo'
  && task.plan.year === year
  && !task.plan.month
  && !task.plan.week
  && !task.plan.day
));

export const getMonthPoolTasks = (tasks: readonly Task[], month: string): Task[] => tasks.filter(task => (
  task.status === 'todo'
  && task.plan.month === month
  && !task.plan.week
  && !task.plan.day
));

export const getWeekPoolTasks = (tasks: readonly Task[], week: string): Task[] => tasks.filter(task => (
  task.status === 'todo'
  && task.plan.week === week
  && !task.plan.day
));

export const getEventsForMonth = (events: readonly CalendarEvent[], month: string): CalendarEvent[] => events
  .filter(event => event.date.startsWith(`${month}-`))
  .sort((left, right) => `${left.date}T${left.time}`.localeCompare(`${right.date}T${right.time}`));

export const getEventsForWeek = (events: readonly CalendarEvent[], week: string): CalendarEvent[] => events
  .filter(event => getWeekString(event.date) === week)
  .sort((left, right) => `${left.date}T${left.time}`.localeCompare(`${right.date}T${right.time}`));

export const getCompletedTasksForLocalPeriod = (
  tasks: readonly Task[],
  period: string,
): Task[] => tasks.filter(task => {
  if (task.status !== 'done') return false;
  const day = getLocalDateFromTimestamp(getTaskCompletionTimestamp(task));
  if (!day) return false;
  if (/^\d{4}-W\d{2}$/.test(period)) return getWeekString(day) === period;
  return day.startsWith(period);
});
