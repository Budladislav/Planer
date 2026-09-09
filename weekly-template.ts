import { getMonthForWeek } from './month-planning';
import type {
  Task,
  WeeklyTemplateDayIndex,
  WeeklyTemplateState,
  WeeklyTemplateTask,
} from './types';
import { getWeekDates, isValidWeekString } from './utils';

export const WEEKLY_TEMPLATE_POOL_SLOT = 'week';
export const weeklyTemplateDaySlot = (dayIndex: WeeklyTemplateDayIndex): string => `day-${dayIndex}`;

export const getWeeklyTemplateTaskSlot = (task: Pick<WeeklyTemplateTask, 'dayIndex'>): string => (
  task.dayIndex === null ? WEEKLY_TEMPLATE_POOL_SLOT : weeklyTemplateDaySlot(task.dayIndex)
);

export const getWeeklyTemplateRewardTaskId = (templateTaskId: string): string => `weekly-template:${templateTaskId}`;

const validDayIndex = (value: unknown): value is WeeklyTemplateDayIndex => (
  Number.isInteger(value) && Number(value) >= 0 && Number(value) <= 6
);

const isRecord = (value: unknown): value is Record<string, unknown> => (
  typeof value === 'object' && value !== null
);

const normalizeSlotOrder = (
  tasks: WeeklyTemplateTask[],
  rawOrder: unknown,
  slot: string,
): string[] => {
  const available = tasks.filter(task => getWeeklyTemplateTaskSlot(task) === slot).map(task => task.id);
  const availableSet = new Set(available);
  const requested = Array.isArray(rawOrder)
    ? rawOrder.filter((id): id is string => typeof id === 'string' && availableSet.has(id))
    : [];
  const deduplicated = [...new Set(requested)];
  return [...deduplicated, ...available.filter(id => !deduplicated.includes(id))];
};

export const migrateWeeklyTemplateState = (value: unknown, now: string): WeeklyTemplateState => {
  const parsed = isRecord(value) ? value : {};
  const seenIds = new Set<string>();
  const tasks = Array.isArray(parsed.tasks)
    ? parsed.tasks.flatMap((item): WeeklyTemplateTask[] => {
        if (!isRecord(item) || typeof item.title !== 'string' || !item.title.trim()) return [];
        const id = typeof item.id === 'string' && item.id ? item.id : '';
        if (!id || seenIds.has(id)) return [];
        seenIds.add(id);
        const dayIndex = item.dayIndex === null || validDayIndex(item.dayIndex) ? item.dayIndex : null;
        const createdAt = typeof item.createdAt === 'string' ? item.createdAt : now;
        return [{
          id,
          title: item.title.trim(),
          dayIndex,
          createdAt,
          updatedAt: typeof item.updatedAt === 'string' ? item.updatedAt : createdAt,
        }];
      })
    : [];

  const rawOrders = isRecord(parsed.orderBySlot) ? parsed.orderBySlot : {};
  const slots = [WEEKLY_TEMPLATE_POOL_SLOT, ...Array.from({ length: 7 }, (_, index) => weeklyTemplateDaySlot(index as WeeklyTemplateDayIndex))];
  const orderBySlot = Object.fromEntries(
    slots.map(slot => [slot, normalizeSlotOrder(tasks, rawOrders[slot], slot)]),
  );

  const applications = isRecord(parsed.applications)
    ? Object.fromEntries(Object.entries(parsed.applications).flatMap(([week, mapping]) => {
        if (!isValidWeekString(week) || !isRecord(mapping)) return [];
        const links = Object.fromEntries(Object.entries(mapping).filter(
          (entry): entry is [string, string] => seenIds.has(entry[0]) && typeof entry[1] === 'string' && Boolean(entry[1]),
        ));
        return Object.keys(links).length > 0 ? [[week, links]] : [];
      }))
    : {};

  return { tasks, orderBySlot, applications };
};

export const getOrderedWeeklyTemplateTasks = (
  template: WeeklyTemplateState,
  slot: string,
): WeeklyTemplateTask[] => {
  const available = template.tasks.filter(task => getWeeklyTemplateTaskSlot(task) === slot);
  const byId = new Map(available.map(task => [task.id, task]));
  const requested = template.orderBySlot[slot] ?? [];
  const ordered = requested.flatMap(id => {
    const task = byId.get(id);
    if (!task) return [];
    byId.delete(id);
    return [task];
  });
  return [...ordered, ...byId.values()];
};

export interface WeeklyTemplateTaskApplication {
  templateTaskId: string;
  task: Task;
}

export interface BuildWeeklyTemplateApplicationOptions {
  template: WeeklyTemplateState;
  targetWeek: string;
  existingTasks: readonly Task[];
  now: string;
  createId: () => string;
}

export const buildWeeklyTemplateApplication = ({
  template,
  targetWeek,
  existingTasks,
  now,
  createId,
}: BuildWeeklyTemplateApplicationOptions): { items: WeeklyTemplateTaskApplication[]; skipped: number } => {
  if (!isValidWeekString(targetWeek)) return { items: [], skipped: template.tasks.length };
  const dates = getWeekDates(targetWeek);
  if (dates.length !== 7) return { items: [], skipped: template.tasks.length };

  const liveTaskIds = new Set(existingTasks.map(task => task.id));
  const applied = template.applications[targetWeek] ?? {};
  const orderedTemplateTasks = [
    ...getOrderedWeeklyTemplateTasks(template, WEEKLY_TEMPLATE_POOL_SLOT),
    ...Array.from({ length: 7 }, (_, index) => (
      getOrderedWeeklyTemplateTasks(template, weeklyTemplateDaySlot(index as WeeklyTemplateDayIndex))
    )).flat(),
  ];
  const items: WeeklyTemplateTaskApplication[] = [];
  let skipped = 0;

  orderedTemplateTasks.forEach(templateTask => {
    const existingTaskId = applied[templateTask.id];
    if (existingTaskId && liveTaskIds.has(existingTaskId)) {
      skipped += 1;
      return;
    }

    const day = templateTask.dayIndex === null ? null : dates[templateTask.dayIndex];
    const month = day?.slice(0, 7) ?? getMonthForWeek(targetWeek);
    items.push({
      templateTaskId: templateTask.id,
      task: {
        id: createId(),
        title: templateTask.title,
        status: 'todo',
        plan: { day, week: targetWeek, month, year: month?.slice(0, 4) ?? targetWeek.slice(0, 4) },
        projectId: null,
        eventId: null,
        createdAt: now,
        updatedAt: now,
        completedAt: null,
      },
    });
  });

  return { items, skipped };
};
