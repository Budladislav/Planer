import { describe, expect, it } from 'vitest';
import type { TaskLifecycleEvent } from '../../../task-lifecycle';
import type { Task } from '../../../types';
import {
  REWARDS_LAB_LIFECYCLE_OUTBOX_KEY,
  clearRewardsLabLifecycleOutbox,
  drainRewardsLabLifecycleOutbox,
  enqueueRewardsLabLifecycleEvent,
  getRewardsLabLifecycleOutboxSize,
} from './outbox';

class MemoryStorage {
  values = new Map<string, string>();
  failRemove = false;

  getItem(key: string): string | null {
    return this.values.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    this.values.set(key, value);
  }

  removeItem(key: string): void {
    if (this.failRemove) throw new Error('remove blocked');
    this.values.delete(key);
  }
}

const task = (overrides: Partial<Task> = {}): Task => ({
  id: 'task-1',
  title: 'Durable task',
  status: 'done',
  plan: { day: '2026-08-29', week: '2026-W35', month: '2026-08' },
  projectId: null,
  eventId: null,
  createdAt: '2026-08-29T08:00:00.000Z',
  updatedAt: '2026-08-29T10:00:00.000Z',
  completedAt: '2026-08-29T10:00:00.000Z',
  ...overrides,
});

const completedEvent = (taskId = 'task-1'): TaskLifecycleEvent => ({
  type: 'task.completed',
  taskId,
  title: `Task ${taskId}`,
  occurredAt: '2026-08-29T10:00:00.000Z',
  completedAt: '2026-08-29T10:00:00.000Z',
  task: task({ id: taskId, title: `Task ${taskId}` }),
});

const reopenedEvent = (taskId = 'task-1'): TaskLifecycleEvent => ({
  type: 'task.reopened',
  taskId,
  title: `Task ${taskId}`,
  occurredAt: '2026-08-29T11:00:00.000Z',
  previousCompletedAt: '2026-08-29T10:00:00.000Z',
  task: task({ id: taskId, title: `Task ${taskId}`, status: 'todo', completedAt: null }),
});

describe('Rewards Lab lifecycle outbox', () => {
  it('survives a reload boundary and drains strictly in insertion order', () => {
    const storage = new MemoryStorage();
    expect(enqueueRewardsLabLifecycleEvent(storage, completedEvent('first'))).toBe(true);
    expect(enqueueRewardsLabLifecycleEvent(storage, reopenedEvent('first'))).toBe(true);
    expect(enqueueRewardsLabLifecycleEvent(storage, completedEvent('second'))).toBe(true);

    // A new reader over the same storage simulates a page/runtime reload.
    const received: string[] = [];
    const result = drainRewardsLabLifecycleOutbox(storage, event => {
      received.push(`${event.type}:${event.taskId}`);
      return true;
    });

    expect(received).toEqual([
      'task.completed:first',
      'task.reopened:first',
      'task.completed:second',
    ]);
    expect(result).toEqual({ processed: 3, remaining: 0, complete: true });
    expect(storage.values.has(REWARDS_LAB_LIFECYCLE_OUTBOX_KEY)).toBe(false);
  });

  it('keeps the failed event and all later events for a future runtime/import retry', () => {
    const storage = new MemoryStorage();
    enqueueRewardsLabLifecycleEvent(storage, completedEvent('first'));
    enqueueRewardsLabLifecycleEvent(storage, completedEvent('second'));

    const failed = drainRewardsLabLifecycleOutbox(storage, () => false);
    expect(failed).toEqual({ processed: 0, remaining: 2, complete: false });
    expect(getRewardsLabLifecycleOutboxSize(storage)).toBe(2);

    const retried: string[] = [];
    const recovered = drainRewardsLabLifecycleOutbox(storage, event => {
      retried.push(event.taskId);
      return true;
    });
    expect(retried).toEqual(['first', 'second']);
    expect(recovered.complete).toBe(true);
  });

  it('does not acknowledge an event when the acknowledgement write fails', () => {
    const storage = new MemoryStorage();
    enqueueRewardsLabLifecycleEvent(storage, completedEvent());
    storage.failRemove = true;

    let calls = 0;
    const failedAck = drainRewardsLabLifecycleOutbox(storage, () => {
      calls += 1;
      return true;
    });
    expect(failedAck).toEqual({ processed: 0, remaining: 1, complete: false });
    expect(getRewardsLabLifecycleOutboxSize(storage)).toBe(1);

    storage.failRemove = false;
    expect(drainRewardsLabLifecycleOutbox(storage, () => {
      calls += 1;
      return true;
    }).complete).toBe(true);
    expect(calls).toBe(2);
  });

  it('clears only the experimental queue', () => {
    const storage = new MemoryStorage();
    storage.values.set('monofocus_v1', '{"planner":true}');
    enqueueRewardsLabLifecycleEvent(storage, completedEvent());

    expect(clearRewardsLabLifecycleOutbox(storage)).toBe(true);
    expect(getRewardsLabLifecycleOutboxSize(storage)).toBe(0);
    expect(storage.values.get('monofocus_v1')).toBe('{"planner":true}');
  });
});
