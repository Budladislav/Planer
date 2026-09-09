import { AppLanguage, Capture, LongTermGoal, Task } from './types';
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

const getRealizedDate = (capture: Capture): string | null => {
  if (capture.status !== 'completed' || !capture.completedAt) return null;
  const date = new Date(capture.completedAt);
  return Number.isNaN(date.getTime()) ? null : getDateString(date);
};

export const getRealizedCapturesForRange = (captures: Capture[], range: DateRange): Capture[] => {
  return captures
    .filter(capture => {
      const completedDate = getRealizedDate(capture);
      return completedDate !== null && completedDate >= range.start && completedDate <= range.end;
    })
    .sort((a, b) => Date.parse(b.completedAt ?? '') - Date.parse(a.completedAt ?? ''));
};

export const getCompletedGoalsForRange = (goals: LongTermGoal[], range: DateRange): LongTermGoal[] => {
  return goals
    .filter(goal => {
      if (goal.status !== 'completed' || !goal.completedAt) return false;
      const date = new Date(goal.completedAt);
      if (Number.isNaN(date.getTime())) return false;
      const completedDate = getDateString(date);
      return completedDate >= range.start && completedDate <= range.end;
    })
    .sort((a, b) => Date.parse(b.completedAt ?? '') - Date.parse(a.completedAt ?? ''));
};

const formatTimestamp = (timestamp: string): string => {
  const date = new Date(timestamp);
  return `${getDateString(date)} ${pad2(date.getHours())}:${pad2(date.getMinutes())}`;
};

const singleLine = (value: string): string => value.replace(/\s+/g, ' ').trim();

const elapsedDays = (createdAt: string, completedAt: string): number => {
  const elapsed = Date.parse(completedAt) - Date.parse(createdAt);
  return Number.isFinite(elapsed) ? Math.max(0, Math.floor(elapsed / 86_400_000)) : 0;
};

export const buildProgressReport = (
  tasks: Task[],
  captures: Capture[],
  goals: LongTermGoal[],
  range: DateRange,
  language: AppLanguage = 'en',
  generatedAt = new Date(),
): string => {
  const completedTasks = getCompletedTasksForRange(tasks, range);
  const realizedCaptures = getRealizedCapturesForRange(captures, range);
  const activeGoals = goals.filter(goal => goal.status === 'active');
  const completedGoals = getCompletedGoalsForRange(goals, range);
  const ru = language === 'ru';
  const lines = ru ? [
    'ОТЧЁТ О ПРОГРЕССЕ MONOFOCUS',
    `начало_периода: ${range.start}`,
    `конец_периода: ${range.end}`,
    `создан: ${formatTimestamp(generatedAt.toISOString())}`,
    `выполнено_задач: ${completedTasks.length}`,
    `реализовано_желаний: ${realizedCaptures.length}`,
    `завершено_больших_целей: ${completedGoals.length}`,
    '',
    '=== ВЫПОЛНЕННЫЕ ЗАДАЧИ ===',
  ] : [
    'MONOFOCUS PROGRESS REPORT',
    `period_start: ${range.start}`,
    `period_end: ${range.end}`,
    `generated_at: ${formatTimestamp(generatedAt.toISOString())}`,
    `completed_tasks_count: ${completedTasks.length}`,
    `realized_wishes_count: ${realizedCaptures.length}`,
    `completed_long_term_goals_count: ${completedGoals.length}`,
    '',
    '=== COMPLETED TASKS ===',
  ];

  if (completedTasks.length === 0) {
    lines.push(ru ? '(нет выполненных задач)' : '(no completed tasks)');
  } else {
    completedTasks.forEach((task, index) => {
      lines.push(...(ru ? [
        `${index + 1}. выполнено: ${formatTimestamp(task.completedAt as string)}`,
        `   название: ${singleLine(task.title)}`,
      ] : [
        `${index + 1}. completed_at: ${formatTimestamp(task.completedAt as string)}`,
        `   title: ${singleLine(task.title)}`,
      ]));
    });
  }

  lines.push('', ru ? '=== РЕАЛИЗОВАННЫЕ ЖЕЛАНИЯ ===' : '=== REALIZED WISHES ===');
  if (realizedCaptures.length === 0) {
    lines.push(ru ? '(нет реализованных желаний)' : '(no realized wishes)');
  } else {
    realizedCaptures.forEach((capture, index) => {
      const startLine = capture.startedAt
        ? `${index + 1}. ${ru ? 'начало' : 'started_at'}: ${formatTimestamp(capture.startedAt)}`
        : `${index + 1}. ${ru ? 'начало' : 'started_at'}: ${ru ? 'не указано' : 'not specified'}`;
      lines.push(startLine, ...(
        ru ? [
          `   реализовано: ${formatTimestamp(capture.completedAt as string)}`,
          ...(capture.startedAt ? [`   прошло_дней: ${elapsedDays(capture.startedAt, capture.completedAt as string)}`] : []),
          `   название: ${singleLine(capture.text)}`,
        ] : [
          `   realized_at: ${formatTimestamp(capture.completedAt as string)}`,
          ...(capture.startedAt ? [`   elapsed_days: ${elapsedDays(capture.startedAt, capture.completedAt as string)}`] : []),
          `   title: ${singleLine(capture.text)}`,
        ]
      ));
    });
  }

  lines.push('', ru ? '=== БОЛЬШИЕ ЦЕЛИ ===' : '=== LONG-TERM GOALS ===');
  lines.push(ru ? '--- Активные ---' : '--- Active ---');
  if (activeGoals.length === 0) lines.push(ru ? '(нет активных целей)' : '(no active goals)');
  else activeGoals.forEach((goal, index) => {
    lines.push(...(ru ? [
      `${index + 1}. начало: ${goal.startedAt ? formatTimestamp(goal.startedAt) : 'не указано'}`,
      `   название: ${singleLine(goal.title)}`,
      `   текущая_ситуация: ${singleLine(goal.currentState) || '—'}`,
      `   следующий_шаг: ${singleLine(goal.nextStep) || '—'}`,
    ] : [
      `${index + 1}. started_at: ${goal.startedAt ? formatTimestamp(goal.startedAt) : 'not specified'}`,
      `   title: ${singleLine(goal.title)}`,
      `   current_situation: ${singleLine(goal.currentState) || '—'}`,
      `   next_step: ${singleLine(goal.nextStep) || '—'}`,
    ]));
  });

  lines.push('', ru ? '--- Завершённые за период ---' : '--- Completed during the period ---');
  if (completedGoals.length === 0) lines.push(ru ? '(нет завершённых целей)' : '(no completed goals)');
  else completedGoals.forEach((goal, index) => {
    lines.push(...(ru ? [
      `${index + 1}. начало: ${goal.startedAt ? formatTimestamp(goal.startedAt) : 'не указано'}`,
      `   завершено: ${formatTimestamp(goal.completedAt as string)}`,
      ...(goal.startedAt ? [`   прошло_дней: ${elapsedDays(goal.startedAt, goal.completedAt as string)}`] : []),
      `   название: ${singleLine(goal.title)}`,
    ] : [
      `${index + 1}. started_at: ${goal.startedAt ? formatTimestamp(goal.startedAt) : 'not specified'}`,
      `   completed_at: ${formatTimestamp(goal.completedAt as string)}`,
      ...(goal.startedAt ? [`   elapsed_days: ${elapsedDays(goal.startedAt, goal.completedAt as string)}`] : []),
      `   title: ${singleLine(goal.title)}`,
    ]));
  });

  return `${lines.join('\n')}\n`;
};
