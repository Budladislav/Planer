import { getMonthForWeek } from './month-planning';
import type {
  Task,
  WeeklyTemplate,
  WeeklyTemplateDayIndex,
  WeeklyTemplateState,
  WeeklyTemplateTask,
} from './types';
import { getWeekDates, getWeekString, isValidWeekString } from './utils';

export const WEEKLY_TEMPLATE_POOL_SLOT = 'week';
export const DEFAULT_WEEKLY_TEMPLATE_ID = 'weekly-template-default';
export const DEFAULT_WEEKLY_TEMPLATE_NAME = 'Template 1';
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

const migrateTemplate = (
  value: unknown,
  now: string,
  fallbackId: string,
  fallbackName: string,
  seenTaskIds: Set<string>,
): WeeklyTemplate => {
  const parsed = isRecord(value) ? value : {};
  const tasks = Array.isArray(parsed.tasks)
    ? parsed.tasks.flatMap((item): WeeklyTemplateTask[] => {
        if (!isRecord(item) || typeof item.title !== 'string' || !item.title.trim()) return [];
        const id = typeof item.id === 'string' && item.id ? item.id : '';
        if (!id || seenTaskIds.has(id)) return [];
        seenTaskIds.add(id);
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
          (entry): entry is [string, string] => tasks.some(task => task.id === entry[0]) && typeof entry[1] === 'string' && Boolean(entry[1]),
        ));
        return Object.keys(links).length > 0 ? [[week, links]] : [];
      }))
    : {};

  const createdAt = typeof parsed.createdAt === 'string' ? parsed.createdAt : now;
  return {
    id: typeof parsed.id === 'string' && parsed.id ? parsed.id : fallbackId,
    name: typeof parsed.name === 'string' && parsed.name.trim() ? parsed.name.trim() : fallbackName,
    tasks,
    orderBySlot,
    applications,
    createdAt,
    updatedAt: typeof parsed.updatedAt === 'string' ? parsed.updatedAt : createdAt,
  };
};

export const migrateWeeklyTemplateState = (value: unknown, now: string): WeeklyTemplateState => {
  const parsed = isRecord(value) ? value : {};
  const seenTemplateIds = new Set<string>();
  const seenTemplateNames = new Set<string>();
  const seenTaskIds = new Set<string>();

  const rawTemplates = Array.isArray(parsed.templates) ? parsed.templates : null;
  const templates = (rawTemplates ?? [parsed]).flatMap((item, index): WeeklyTemplate[] => {
    const template = migrateTemplate(
      item,
      now,
      index === 0 ? DEFAULT_WEEKLY_TEMPLATE_ID : `weekly-template-${index + 1}`,
      index === 0 ? DEFAULT_WEEKLY_TEMPLATE_NAME : `Template ${index + 1}`,
      seenTaskIds,
    );
    const normalizedName = template.name.toLocaleLowerCase();
    if (seenTemplateIds.has(template.id) || seenTemplateNames.has(normalizedName)) return [];
    seenTemplateIds.add(template.id);
    seenTemplateNames.add(normalizedName);
    return [template];
  });

  if (templates.length === 0) {
    templates.push(migrateTemplate({}, now, DEFAULT_WEEKLY_TEMPLATE_ID, DEFAULT_WEEKLY_TEMPLATE_NAME, seenTaskIds));
  }

  const requestedActiveId = typeof parsed.activeTemplateId === 'string' ? parsed.activeTemplateId : '';
  const activeTemplateId = templates.some(template => template.id === requestedActiveId)
    ? requestedActiveId
    : templates[0].id;
  return { templates, activeTemplateId };
};

export const getActiveWeeklyTemplate = (state: WeeklyTemplateState): WeeklyTemplate => (
  state.templates.find(template => template.id === state.activeTemplateId) ?? state.templates[0]
);

export const isTaskCreatedFromWeeklyTemplate = (
  state: WeeklyTemplateState,
  taskId: string,
): boolean => state.templates.some(template => (
  Object.values(template.applications).some(application => Object.values(application).includes(taskId))
));

export const isWeeklyTemplateNameAvailable = (
  state: WeeklyTemplateState,
  name: string,
  exceptId?: string,
): boolean => {
  const normalized = name.trim().toLocaleLowerCase();
  return Boolean(normalized) && !state.templates.some(
    template => template.id !== exceptId && template.name.toLocaleLowerCase() === normalized,
  );
};

export const createEmptyWeeklyTemplate = ({
  id,
  name,
  now,
}: {
  id: string;
  name: string;
  now: string;
}): WeeklyTemplate => migrateTemplate({ id, name }, now, id, name, new Set());

export const duplicateWeeklyTemplate = ({
  source,
  id,
  name,
  now,
  createTaskId,
}: {
  source: WeeklyTemplate;
  id: string;
  name: string;
  now: string;
  createTaskId: () => string;
}): { template: WeeklyTemplate; taskCopies: Array<{ sourceTaskId: string; targetTaskId: string }> } => {
  const taskCopies = source.tasks.map(task => ({ sourceTaskId: task.id, targetTaskId: createTaskId() }));
  const idMap = new Map(taskCopies.map(copy => [copy.sourceTaskId, copy.targetTaskId]));
  return {
    template: {
      id,
      name: name.trim(),
      tasks: source.tasks.map(task => ({ ...task, id: idMap.get(task.id)!, createdAt: now, updatedAt: now })),
      orderBySlot: Object.fromEntries(Object.entries(source.orderBySlot).map(([slot, order]) => [
        slot,
        order.flatMap(taskId => idMap.get(taskId) ?? []),
      ])),
      applications: {},
      createdAt: now,
      updatedAt: now,
    },
    taskCopies,
  };
};

export const getOrderedWeeklyTemplateTasks = (
  template: WeeklyTemplate,
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
  template: WeeklyTemplate;
  targetWeek: string;
  today: string;
  existingTasks: readonly Task[];
  now: string;
  createId: () => string;
}

export const buildWeeklyTemplateApplication = ({
  template,
  targetWeek,
  today,
  existingTasks,
  now,
  createId,
}: BuildWeeklyTemplateApplicationOptions): { items: WeeklyTemplateTaskApplication[]; skipped: number; skippedExisting: number; skippedPast: number } => {
  if (!isValidWeekString(targetWeek) || targetWeek < getWeekString(today)) {
    return { items: [], skipped: template.tasks.length, skippedExisting: 0, skippedPast: template.tasks.length };
  }
  const dates = getWeekDates(targetWeek);
  if (dates.length !== 7) return { items: [], skipped: template.tasks.length, skippedExisting: 0, skippedPast: template.tasks.length };

  const liveTaskIds = new Set(existingTasks.map(task => task.id));
  const applied = template.applications[targetWeek] ?? {};
  const orderedTemplateTasks = [
    ...getOrderedWeeklyTemplateTasks(template, WEEKLY_TEMPLATE_POOL_SLOT),
    ...Array.from({ length: 7 }, (_, index) => (
      getOrderedWeeklyTemplateTasks(template, weeklyTemplateDaySlot(index as WeeklyTemplateDayIndex))
    )).flat(),
  ];
  const items: WeeklyTemplateTaskApplication[] = [];
  let skippedExisting = 0;
  let skippedPast = 0;

  orderedTemplateTasks.forEach(templateTask => {
    const existingTaskId = applied[templateTask.id];
    if (existingTaskId && liveTaskIds.has(existingTaskId)) {
      skippedExisting += 1;
      return;
    }

    const day = templateTask.dayIndex === null ? null : dates[templateTask.dayIndex];
    if (day && day < today) {
      skippedPast += 1;
      return;
    }
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
        goalId: null,
        planningImportance: null,
        createdAt: now,
        updatedAt: now,
        completedAt: null,
      },
    });
  });

  return { items, skipped: skippedExisting + skippedPast, skippedExisting, skippedPast };
};
