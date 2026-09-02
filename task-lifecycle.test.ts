import { afterEach, describe, expect, it, vi } from 'vitest';
import { completeTask, deleteTask, reopenTask, subscribeToTaskLifecycle } from './task-lifecycle';
import type { Action } from './state';
import type { Task } from './types';

const makeTask = (overrides: Partial<Task> = {}): Task => ({
  id: 'task-1',
  title: 'Lifecycle task',
  status: 'todo',
  plan: { day: '2026-08-28', week: null, month: '2026-08' },
  projectId: null,
  eventId: null,
  createdAt: '2026-08-28T08:00:00.000Z',
  updatedAt: '2026-08-28T08:00:00.000Z',
  completedAt: null,
  ...overrides,
});

afterEach(() => {
  vi.useRealTimers();
});

describe('task lifecycle commands', () => {
  it('dispatches completion before emitting one complete task snapshot', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-08-28T10:30:00.000Z'));
    const order: string[] = [];
    const actions: Action[] = [];
    const dispatch = (action: Action) => {
      order.push('dispatch');
      actions.push(action);
    };
    const events: unknown[] = [];
    const unsubscribe = subscribeToTaskLifecycle(event => {
      order.push('event');
      events.push(event);
    });

    const completed = completeTask(dispatch, makeTask(), {
      timeSpent: 90,
      plan: { day: '2026-08-28', week: null, month: '2026-08' },
    });
    unsubscribe();

    expect(completed).toBe(true);
    expect(order).toEqual(['dispatch', 'event']);
    expect(actions).toEqual([{
      type: 'UPDATE_TASK',
      payload: {
        id: 'task-1',
        status: 'done',
        completedAt: '2026-08-28T10:30:00.000Z',
        timeSpent: 90,
        plan: { day: '2026-08-28', week: null, month: '2026-08' },
      },
    }]);
    expect(events).toEqual([expect.objectContaining({
      type: 'task.completed',
      taskId: 'task-1',
      title: 'Lifecycle task',
      completedAt: '2026-08-28T10:30:00.000Z',
      occurredAt: '2026-08-28T10:30:00.000Z',
      task: expect.objectContaining({
        id: 'task-1',
        status: 'done',
        completedAt: '2026-08-28T10:30:00.000Z',
        timeSpent: 90,
      }),
    })]);
  });

  it('preserves an explicit Done yesterday completion timestamp', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-08-28T10:30:00.000Z'));
    const actions: Action[] = [];
    const events: unknown[] = [];
    const unsubscribe = subscribeToTaskLifecycle(event => events.push(event));

    completeTask(action => actions.push(action), makeTask(), {
      completedAt: '2026-08-27T12:00:00.000Z',
      plan: { day: '2026-08-27', week: '2026-W35', month: '2026-08' },
    });
    unsubscribe();

    expect(actions[0]).toMatchObject({ payload: { completedAt: '2026-08-27T12:00:00.000Z' } });
    expect(events[0]).toMatchObject({
      type: 'task.completed',
      completedAt: '2026-08-27T12:00:00.000Z',
      occurredAt: '2026-08-28T10:30:00.000Z',
    });
  });

  it('does not emit or dispatch when asked to complete an already done task', () => {
    const dispatch = vi.fn<(action: Action) => void>();
    const listener = vi.fn();
    const unsubscribe = subscribeToTaskLifecycle(listener);

    const completed = completeTask(dispatch, makeTask({
      status: 'done',
      completedAt: '2026-08-28T09:00:00.000Z',
    }));
    unsubscribe();

    expect(completed).toBe(false);
    expect(dispatch).not.toHaveBeenCalled();
    expect(listener).not.toHaveBeenCalled();
  });

  it('isolates listener failures and continues notifying other listeners', () => {
    const dispatch = vi.fn<(action: Action) => void>();
    const failingUnsubscribe = subscribeToTaskLifecycle(() => {
      throw new Error('experimental sidecar failed');
    });
    const healthyListener = vi.fn();
    const healthyUnsubscribe = subscribeToTaskLifecycle(healthyListener);

    expect(() => completeTask(dispatch, makeTask())).not.toThrow();

    failingUnsubscribe();
    healthyUnsubscribe();
    expect(dispatch).toHaveBeenCalledOnce();
    expect(healthyListener).toHaveBeenCalledOnce();
  });

  it('reopens once, clears completion, and carries the previous timestamp', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-08-28T11:00:00.000Z'));
    const task = makeTask({
      status: 'done',
      completedAt: '2026-08-28T10:30:00.000Z',
    });
    const actions: Action[] = [];
    const events: unknown[] = [];
    const unsubscribe = subscribeToTaskLifecycle(event => events.push(event));

    const reopened = reopenTask(action => actions.push(action), task, {
      plan: { day: '2026-08-28', week: null, month: '2026-08' },
    });
    unsubscribe();

    expect(reopened).toBe(true);
    expect(actions).toEqual([{
      type: 'UPDATE_TASK',
      payload: {
        id: 'task-1',
        status: 'todo',
        completedAt: null,
        plan: { day: '2026-08-28', week: null, month: '2026-08' },
      },
    }]);
    expect(events).toEqual([expect.objectContaining({
      type: 'task.reopened',
      taskId: 'task-1',
      previousCompletedAt: '2026-08-28T10:30:00.000Z',
      task: expect.objectContaining({ status: 'todo', completedAt: null }),
    })]);
  });

  it('does not emit or dispatch when asked to reopen a todo task', () => {
    const dispatch = vi.fn<(action: Action) => void>();
    const listener = vi.fn();
    const unsubscribe = subscribeToTaskLifecycle(listener);

    const reopened = reopenTask(dispatch, makeTask());
    unsubscribe();

    expect(reopened).toBe(false);
    expect(dispatch).not.toHaveBeenCalled();
    expect(listener).not.toHaveBeenCalled();
  });

  it('deletes before emitting the task snapshot and previous completion time', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-08-28T12:00:00.000Z'));
    const task = makeTask({
      status: 'done',
      completedAt: '2026-08-28T10:30:00.000Z',
    });
    const order: string[] = [];
    const actions: Action[] = [];
    const events: unknown[] = [];
    const unsubscribe = subscribeToTaskLifecycle(event => {
      order.push('event');
      events.push(event);
    });

    deleteTask(action => {
      order.push('dispatch');
      actions.push(action);
    }, task);
    unsubscribe();

    expect(order).toEqual(['dispatch', 'event']);
    expect(actions).toEqual([{ type: 'DELETE_TASK', payload: 'task-1' }]);
    expect(events).toEqual([expect.objectContaining({
      type: 'task.deleted',
      taskId: 'task-1',
      previousCompletedAt: '2026-08-28T10:30:00.000Z',
      occurredAt: '2026-08-28T12:00:00.000Z',
      task,
    })]);
  });
});
