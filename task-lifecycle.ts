import type { Action } from './state';
import type { Task } from './types';

type TaskDispatch = (action: Action) => void;

type TaskCompletionUpdates = Omit<Partial<Task>, 'id' | 'status' | 'completedAt'> & {
  completedAt?: string;
};

type TaskReopenUpdates = Omit<Partial<Task>, 'id' | 'status' | 'completedAt'>;

interface TaskLifecycleEventBase {
  taskId: string;
  title: string;
  occurredAt: string;
  task: Task;
}

export interface TaskCompletedEvent extends TaskLifecycleEventBase {
  type: 'task.completed';
  completedAt: string;
}

export interface TaskReopenedEvent extends TaskLifecycleEventBase {
  type: 'task.reopened';
  previousCompletedAt: string | null;
}

export type TaskLifecycleEvent = TaskCompletedEvent | TaskReopenedEvent;

type TaskLifecycleListener = (event: TaskLifecycleEvent) => void;

const listeners = new Set<TaskLifecycleListener>();

/**
 * Subscribe to ephemeral, user-driven task lifecycle events.
 *
 * These events are deliberately not persisted and are never inferred from
 * hydration, imports, or reducer state changes. Consumers must treat them as
 * notifications: a failing listener cannot interrupt the planner command.
 */
export const subscribeToTaskLifecycle = (listener: TaskLifecycleListener): (() => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

const publishTaskLifecycleEvent = (event: TaskLifecycleEvent): void => {
  listeners.forEach(listener => {
    try {
      listener(event);
    } catch {
      // Sidecar integrations must never prevent core task actions.
    }
  });
};

/**
 * Complete a task and then notify optional sidecars. Supplying the task
 * snapshot keeps this command independent from React state and reducer effects.
 */
export const completeTask = (
  dispatch: TaskDispatch,
  task: Task,
  updates: TaskCompletionUpdates = {},
): boolean => {
  if (task.status === 'done') return false;

  const occurredAt = new Date().toISOString();
  const completedAt = updates.completedAt ?? occurredAt;
  const payload: Partial<Task> & { id: string } = {
    ...updates,
    id: task.id,
    status: 'done',
    completedAt,
  };

  // The core planner update is always requested before any optional listener.
  dispatch({ type: 'UPDATE_TASK', payload });

  const completedTask: Task = {
    ...task,
    ...payload,
    status: 'done',
    completedAt,
    updatedAt: occurredAt,
  };
  publishTaskLifecycleEvent({
    type: 'task.completed',
    taskId: completedTask.id,
    title: completedTask.title,
    completedAt,
    occurredAt,
    task: completedTask,
  });
  return true;
};

/** Reopen a completed task and notify optional sidecars after the core update. */
export const reopenTask = (
  dispatch: TaskDispatch,
  task: Task,
  updates: TaskReopenUpdates = {},
): boolean => {
  if (task.status !== 'done') return false;

  const occurredAt = new Date().toISOString();
  const payload: Partial<Task> & { id: string } = {
    ...updates,
    id: task.id,
    status: 'todo',
    completedAt: null,
  };

  dispatch({ type: 'UPDATE_TASK', payload });

  const reopenedTask: Task = {
    ...task,
    ...payload,
    status: 'todo',
    completedAt: null,
    updatedAt: occurredAt,
  };
  publishTaskLifecycleEvent({
    type: 'task.reopened',
    taskId: reopenedTask.id,
    title: reopenedTask.title,
    previousCompletedAt: task.completedAt,
    occurredAt,
    task: reopenedTask,
  });
  return true;
};
