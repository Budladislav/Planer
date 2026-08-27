import type { Task } from './types';

const pad2 = (value: number): string => value.toString().padStart(2, '0');

export const getLocalDateFromTimestamp = (timestamp: string): string | null => {
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return null;

  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
};

export const getTaskCompletionTimestamp = (task: Task): string => (
  task.completedAt ?? task.updatedAt
);

export const getCompletedTasksForLocalDay = (
  tasks: Task[],
  localDay: string,
): Task[] => tasks
  .filter(task => (
    task.status === 'done'
    && getLocalDateFromTimestamp(getTaskCompletionTimestamp(task)) === localDay
  ))
  .sort((left, right) => {
    const timestampDifference = new Date(getTaskCompletionTimestamp(right)).getTime()
      - new Date(getTaskCompletionTimestamp(left)).getTime();
    return timestampDifference || left.id.localeCompare(right.id);
  });

export const getPreviousLocalDayTimestamp = (now = new Date()): string => {
  const previousDay = new Date(now);
  previousDay.setDate(previousDay.getDate() - 1);
  return previousDay.toISOString();
};
