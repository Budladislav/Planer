import { Task } from './types';
import { getDateString, getWeekDates } from './utils';

export interface DateRange {
  start: string;
  end: string;
}

export type ReportPeriod =
  | { type: 'week'; value: string }
  | { type: 'month'; value: string }
  | { type: 'custom'; start: string; end: string };

const pad2 = (value: number): string => value.toString().padStart(2, '0');

export const getReportDateRange = (period: ReportPeriod): DateRange | null => {
  if (period.type === 'week') {
    const dates = getWeekDates(period.value);
    return dates.length === 7 ? { start: dates[0], end: dates[6] } : null;
  }

  if (period.type === 'month') {
    const match = /^(\d{4})-(\d{2})$/.exec(period.value);
    if (!match) return null;
    const year = Number(match[1]);
    const month = Number(match[2]);
    if (month < 1 || month > 12) return null;
    const end = getDateString(new Date(year, month, 0));
    return { start: `${period.value}-01`, end };
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(period.start) || !/^\d{4}-\d{2}-\d{2}$/.test(period.end)) {
    return null;
  }

  return period.start <= period.end
    ? { start: period.start, end: period.end }
    : { start: period.end, end: period.start };
};

const getCompletedDate = (task: Task): string | null => {
  if (task.status !== 'done' || !task.completedAt) return null;
  const date = new Date(task.completedAt);
  return Number.isNaN(date.getTime()) ? null : getDateString(date);
};

export const getCompletedTasksForRange = (tasks: Task[], range: DateRange): Task[] => {
  return tasks
    .filter(task => {
      const completedDate = getCompletedDate(task);
      return completedDate !== null && completedDate >= range.start && completedDate <= range.end;
    })
    .sort((a, b) => Date.parse(b.completedAt ?? '') - Date.parse(a.completedAt ?? ''));
};

const formatTimestamp = (timestamp: string): string => {
  const date = new Date(timestamp);
  return `${getDateString(date)} ${pad2(date.getHours())}:${pad2(date.getMinutes())}`;
};

const singleLine = (value: string): string => value.replace(/\s+/g, ' ').trim();

export const buildCompletedTasksReport = (
  tasks: Task[],
  range: DateRange,
  generatedAt = new Date(),
): string => {
  const completedTasks = getCompletedTasksForRange(tasks, range);
  const totalFocusSeconds = completedTasks.reduce((sum, task) => sum + (task.timeSpent ?? 0), 0);
  const lines = [
    'MONOFOCUS COMPLETED TASKS REPORT',
    `period_start: ${range.start}`,
    `period_end: ${range.end}`,
    `generated_at: ${formatTimestamp(generatedAt.toISOString())}`,
    `tasks_count: ${completedTasks.length}`,
    `total_focus_seconds: ${totalFocusSeconds}`,
    '',
    'TASKS',
  ];

  if (completedTasks.length === 0) {
    lines.push('(no completed tasks)');
    return `${lines.join('\n')}\n`;
  }

  completedTasks.forEach((task, index) => {
    lines.push(
      `${index + 1}. completed_at: ${formatTimestamp(task.completedAt as string)}`,
      `   title: ${singleLine(task.title)}`,
      `   focus_seconds: ${task.timeSpent ?? 0}`,
    );
  });

  return `${lines.join('\n')}\n`;
};
