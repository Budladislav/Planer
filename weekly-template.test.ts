import { describe, expect, it } from 'vitest';
import type { Task, WeeklyTemplate } from './types';
import {
  buildWeeklyTemplateApplication,
  DEFAULT_WEEKLY_TEMPLATE_ID,
  duplicateWeeklyTemplate,
  getActiveWeeklyTemplate,
  getOrderedWeeklyTemplateTasks,
  getWeeklyTemplateRewardTaskId,
  migrateWeeklyTemplateState,
  WEEKLY_TEMPLATE_POOL_SLOT,
  weeklyTemplateDaySlot,
} from './weekly-template';

const template: WeeklyTemplate = {
  id: 'template-a',
  name: 'First shift',
  tasks: [
    { id: 'pool', title: 'Plan week', dayIndex: null, createdAt: 'now', updatedAt: 'now' },
    { id: 'monday', title: 'Monday task', dayIndex: 0, createdAt: 'now', updatedAt: 'now' },
    { id: 'sunday', title: 'Sunday task', dayIndex: 6, createdAt: 'now', updatedAt: 'now' },
  ],
  orderBySlot: {
    [WEEKLY_TEMPLATE_POOL_SLOT]: ['pool'],
    [weeklyTemplateDaySlot(0)]: ['monday'],
    [weeklyTemplateDaySlot(6)]: ['sunday'],
  },
  applications: {},
  createdAt: 'now',
  updatedAt: 'now',
};

describe('weekly template', () => {
  it('migrates valid tasks, normalizes slot order and discards malformed links', () => {
    const migrated = migrateWeeklyTemplateState({
      tasks: [
        { id: 'a', title: ' First ', dayIndex: 1 },
        { id: 'b', title: 'Second', dayIndex: 99 },
        { id: 'a', title: 'Duplicate', dayIndex: 2 },
        { id: 'empty', title: '   ', dayIndex: 0 },
      ],
      orderBySlot: { 'day-1': ['missing', 'a', 'a'], week: ['b'] },
      applications: { '2026-W40': { a: 'task-a', missing: 'task-x' }, invalid: { a: 'task-a' } },
    }, '2026-09-09T00:00:00.000Z');

    const active = getActiveWeeklyTemplate(migrated);
    expect(migrated.activeTemplateId).toBe(DEFAULT_WEEKLY_TEMPLATE_ID);
    expect(active.name).toBe('Template 1');
    expect(active.tasks.map(task => ({ id: task.id, title: task.title, dayIndex: task.dayIndex }))).toEqual([
      { id: 'a', title: 'First', dayIndex: 1 },
      { id: 'b', title: 'Second', dayIndex: null },
    ]);
    expect(active.orderBySlot['day-1']).toEqual(['a']);
    expect(active.orderBySlot.week).toEqual(['b']);
    expect(active.applications).toEqual({ '2026-W40': { a: 'task-a' } });
  });

  it('keeps explicit order inside each template slot', () => {
    const reordered = {
      ...template,
      tasks: [
        ...template.tasks,
        { id: 'second-pool', title: 'Second pool', dayIndex: null, createdAt: 'now', updatedAt: 'now' },
      ],
      orderBySlot: { ...template.orderBySlot, week: ['second-pool', 'pool'] },
    } satisfies WeeklyTemplate;
    expect(getOrderedWeeklyTemplateTasks(reordered, WEEKLY_TEMPLATE_POOL_SLOT).map(task => task.id)).toEqual(['second-pool', 'pool']);
  });

  it('creates normal tasks in the week pool and exact weekdays across a year boundary', () => {
    let id = 0;
    const result = buildWeeklyTemplateApplication({
      template,
      targetWeek: '2027-W01',
      existingTasks: [],
      now: '2026-12-30T12:00:00.000Z',
      createId: () => `task-${++id}`,
    });

    expect(result.skipped).toBe(0);
    expect(result.items.map(item => ({ templateTaskId: item.templateTaskId, plan: item.task.plan }))).toEqual([
      { templateTaskId: 'pool', plan: { day: null, week: '2027-W01', month: '2027-01', year: '2027' } },
      { templateTaskId: 'monday', plan: { day: '2027-01-04', week: '2027-W01', month: '2027-01', year: '2027' } },
      { templateTaskId: 'sunday', plan: { day: '2027-01-10', week: '2027-W01', month: '2027-01', year: '2027' } },
    ]);
  });

  it('skips live tasks from an earlier application but recreates deleted ones', () => {
    const linkedTask = { id: 'live-task' } as Task;
    const appliedTemplate: WeeklyTemplate = {
      ...template,
      applications: { '2026-W40': { pool: 'live-task', monday: 'deleted-task' } },
    };
    let id = 0;
    const result = buildWeeklyTemplateApplication({
      template: appliedTemplate,
      targetWeek: '2026-W40',
      existingTasks: [linkedTask],
      now: '2026-09-09T12:00:00.000Z',
      createId: () => `new-${++id}`,
    });

    expect(result.skipped).toBe(1);
    expect(result.items.map(item => item.templateTaskId)).toEqual(['monday', 'sunday']);
  });

  it('uses a stable isolated Rewards Lab id for template grades', () => {
    expect(getWeeklyTemplateRewardTaskId('abc')).toBe('weekly-template:abc');
  });

  it('duplicates structure with fresh task ids and no application history', () => {
    let id = 0;
    const duplicate = duplicateWeeklyTemplate({
      source: { ...template, applications: { '2026-W40': { pool: 'live-task' } } },
      id: 'template-b',
      name: 'Second shift',
      now: '2026-09-10T00:00:00.000Z',
      createTaskId: () => `copy-${++id}`,
    });

    expect(duplicate.template).toEqual(expect.objectContaining({
      id: 'template-b', name: 'Second shift', applications: {}, createdAt: '2026-09-10T00:00:00.000Z',
    }));
    expect(duplicate.template.tasks.map(task => task.id)).toEqual(['copy-1', 'copy-2', 'copy-3']);
    expect(duplicate.template.orderBySlot.week).toEqual(['copy-1']);
    expect(duplicate.template.orderBySlot['day-0']).toEqual(['copy-2']);
    expect(duplicate.taskCopies).toEqual([
      { sourceTaskId: 'pool', targetTaskId: 'copy-1' },
      { sourceTaskId: 'monday', targetTaskId: 'copy-2' },
      { sourceTaskId: 'sunday', targetTaskId: 'copy-3' },
    ]);
  });
});
