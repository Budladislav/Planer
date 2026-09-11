import type { PlanningImportance, PlanningImportanceSource, Task } from './types';

const SOURCE_RANK: Record<PlanningImportanceSource, number> = {
  week: 1,
  month: 2,
  year: 3,
};

export const getActivePlanningImportance = (
  task: Pick<Task, 'planningImportance'>,
): PlanningImportanceSource | null => (
  task.planningImportance && !task.planningImportance.dismissed
    ? task.planningImportance.source
    : null
);

export const applyPlanningImportance = (
  current: PlanningImportance | null | undefined,
  source: PlanningImportanceSource,
): PlanningImportance => {
  if (!current || current.dismissed) return { source, dismissed: false };
  return SOURCE_RANK[source] > SOURCE_RANK[current.source]
    ? { source, dismissed: false }
    : current;
};

export const dismissPlanningImportance = (
  current: PlanningImportance | null | undefined,
): PlanningImportance | null => current ? { ...current, dismissed: true } : null;

export const restorePlanningImportance = (
  current: PlanningImportance | null | undefined,
): PlanningImportance | null => current ? { ...current, dismissed: false } : null;
