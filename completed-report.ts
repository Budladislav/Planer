import { AppLanguage, Capture, LongTermGoal, Task } from './types';
import { getGoalTaskCounts } from './goal-tasks';
import { getDateString, getWeekDates } from './utils';

export interface DateRange {
  start: string;
  end: string;
}

export type ReportRewardGrade = 'common' | 'uncommon' | 'rare' | 'legendary' | 'mythic';

export interface TaskRewardReportEntry {
  taskId: string;
  amount: number;
  grade: ReportRewardGrade;
  keyGrade: ReportRewardGrade | null;
}

export interface RewardRedemptionReportEntry {
  id: string;
  kind: 'reward' | 'purchase';
  title: string;
  occurredAt: string;
  creditsSpent: number;
  keyGrade: ReportRewardGrade | null;
}

export interface RewardsReportData {
  currencyName: string;
  taskRewards: Record<string, TaskRewardReportEntry>;
  redemptions: RewardRedemptionReportEntry[];
  creditsEarned: number;
  creditsSpent: number;
  keysFound: number;
  keysSpent: number;
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

const rewardGradeLabel = (grade: ReportRewardGrade, ru: boolean): string => ({
  common: ru ? 'обычный' : 'common',
  uncommon: ru ? 'необычный' : 'uncommon',
  rare: ru ? 'редкий' : 'rare',
  legendary: ru ? 'легендарный' : 'legendary',
  mythic: ru ? 'мифический' : 'mythic',
}[grade]);

export const buildProgressReport = (
  tasks: Task[],
  captures: Capture[],
  goals: LongTermGoal[],
  range: DateRange,
  language: AppLanguage = 'en',
  generatedAt = new Date(),
  rewards: RewardsReportData | null = null,
): string => {
  const completedTasks = getCompletedTasksForRange(tasks, range);
  const realizedCaptures = getRealizedCapturesForRange(captures, range);
  const activeGoals = goals.filter(goal => goal.status === 'active');
  const completedGoals = getCompletedGoalsForRange(goals, range);
  const goalById = new Map(goals.map(goal => [goal.id, goal]));
  const ru = language === 'ru';
  const lines = ru ? [
    'ОТЧЁТ О ПРОГРЕССЕ TAKT',
    `начало_периода: ${range.start}`,
    `конец_периода: ${range.end}`,
    `создан: ${formatTimestamp(generatedAt.toISOString())}`,
    `выполнено_задач: ${completedTasks.length}`,
    `реализовано_желаний: ${realizedCaptures.length}`,
    `завершено_больших_целей: ${completedGoals.length}`,
    '',
    '=== ВЫПОЛНЕННЫЕ ЗАДАЧИ ===',
  ] : [
    'TAKT PROGRESS REPORT',
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
      const linkedGoal = task.goalId ? goalById.get(task.goalId) : null;
      const taskReward = rewards?.taskRewards[task.id];
      lines.push(...(ru ? [
        `${index + 1}. выполнено: ${formatTimestamp(task.completedAt as string)}`,
        `   название: ${singleLine(task.title)}`,
        ...(linkedGoal ? [`   цель: ${singleLine(linkedGoal.title)}`] : []),
        ...(rewards ? [taskReward
          ? `   награда: +${taskReward.amount} ${rewards.currencyName}; грейд: ${rewardGradeLabel(taskReward.grade, true)}${taskReward.keyGrade ? `; ключ: ${rewardGradeLabel(taskReward.keyGrade, true)}` : ''}`
          : '   награда: не начислялась'] : []),
      ] : [
        `${index + 1}. completed_at: ${formatTimestamp(task.completedAt as string)}`,
        `   title: ${singleLine(task.title)}`,
        ...(linkedGoal ? [`   goal: ${singleLine(linkedGoal.title)}`] : []),
        ...(rewards ? [taskReward
          ? `   reward: +${taskReward.amount} ${rewards.currencyName}; grade: ${rewardGradeLabel(taskReward.grade, false)}${taskReward.keyGrade ? `; key: ${rewardGradeLabel(taskReward.keyGrade, false)}` : ''}`
          : '   reward: not accrued'] : []),
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
    const counts = getGoalTaskCounts(tasks, goal.id);
    lines.push(...(ru ? [
      `${index + 1}. начало: ${goal.startedAt ? formatTimestamp(goal.startedAt) : 'не указано'}`,
      `   название: ${singleLine(goal.title)}`,
      `   текущая_ситуация: ${singleLine(goal.currentState) || '—'}`,
      `   зачем: ${singleLine(goal.why) || '—'}`,
      `   следующий_шаг: ${singleLine(goal.nextStep) || '—'}`,
      `   связанные_задачи: активных ${counts.active}, выполнено ${counts.completed}`,
    ] : [
      `${index + 1}. started_at: ${goal.startedAt ? formatTimestamp(goal.startedAt) : 'not specified'}`,
      `   title: ${singleLine(goal.title)}`,
      `   current_situation: ${singleLine(goal.currentState) || '—'}`,
      `   why: ${singleLine(goal.why) || '—'}`,
      `   next_step: ${singleLine(goal.nextStep) || '—'}`,
      `   linked_tasks: active ${counts.active}, completed ${counts.completed}`,
    ]));
  });

  lines.push('', ru ? '--- Завершённые за период ---' : '--- Completed during the period ---');
  if (completedGoals.length === 0) lines.push(ru ? '(нет завершённых целей)' : '(no completed goals)');
  else completedGoals.forEach((goal, index) => {
    const counts = getGoalTaskCounts(tasks, goal.id);
    lines.push(...(ru ? [
      `${index + 1}. начало: ${goal.startedAt ? formatTimestamp(goal.startedAt) : 'не указано'}`,
      `   завершено: ${formatTimestamp(goal.completedAt as string)}`,
      ...(goal.startedAt ? [`   прошло_дней: ${elapsedDays(goal.startedAt, goal.completedAt as string)}`] : []),
      `   название: ${singleLine(goal.title)}`,
      `   связанные_задачи: активных ${counts.active}, выполнено ${counts.completed}`,
    ] : [
      `${index + 1}. started_at: ${goal.startedAt ? formatTimestamp(goal.startedAt) : 'not specified'}`,
      `   completed_at: ${formatTimestamp(goal.completedAt as string)}`,
      ...(goal.startedAt ? [`   elapsed_days: ${elapsedDays(goal.startedAt, goal.completedAt as string)}`] : []),
      `   title: ${singleLine(goal.title)}`,
      `   linked_tasks: active ${counts.active}, completed ${counts.completed}`,
    ]));
  });

  if (rewards) {
    lines.push('', ru ? '=== НАГРАДЫ ===' : '=== REWARDS ===');
    lines.push(...(ru ? [
      `заработано_кредов: ${rewards.creditsEarned} ${rewards.currencyName}`,
      `потрачено_кредов: ${rewards.creditsSpent} ${rewards.currencyName}`,
      `получено_ключей: ${rewards.keysFound}`,
      `потрачено_ключей: ${rewards.keysSpent}`,
      `получено_наград_и_покупок: ${rewards.redemptions.length}`,
      '',
      '--- Полученные награды и покупки ---',
    ] : [
      `credits_earned: ${rewards.creditsEarned} ${rewards.currencyName}`,
      `credits_spent: ${rewards.creditsSpent} ${rewards.currencyName}`,
      `keys_found: ${rewards.keysFound}`,
      `keys_spent: ${rewards.keysSpent}`,
      `rewards_and_purchases_redeemed: ${rewards.redemptions.length}`,
      '',
      '--- Redeemed rewards and purchases ---',
    ]));
    if (rewards.redemptions.length === 0) {
      lines.push(ru ? '(нет полученных наград и покупок)' : '(no redeemed rewards or purchases)');
    } else {
      rewards.redemptions.forEach((redemption, index) => {
        lines.push(...(ru ? [
          `${index + 1}. получено: ${formatTimestamp(redemption.occurredAt)}`,
          `   название: ${singleLine(redemption.title)}`,
          `   тип: ${redemption.kind === 'reward' ? 'награда' : 'покупка'}`,
          `   потрачено_кредов: ${redemption.creditsSpent}`,
          ...(redemption.keyGrade ? [`   потрачен_ключ: ${rewardGradeLabel(redemption.keyGrade, true)}`] : []),
        ] : [
          `${index + 1}. redeemed_at: ${formatTimestamp(redemption.occurredAt)}`,
          `   title: ${singleLine(redemption.title)}`,
          `   type: ${redemption.kind}`,
          `   credits_spent: ${redemption.creditsSpent}`,
          ...(redemption.keyGrade ? [`   key_spent: ${rewardGradeLabel(redemption.keyGrade, false)}`] : []),
        ]));
      });
    }
  }

  return `${lines.join('\n')}\n`;
};
