import type { TaskLifecycleEvent } from '../../../task-lifecycle';

export const REWARDS_LAB_LIFECYCLE_OUTBOX_KEY = 'monofocus:rewards-lab:lifecycle-outbox:v1';

const OUTBOX_SCHEMA_VERSION = 1 as const;

export interface RewardsLabLifecycleCompletedEvent {
  type: 'task.completed';
  taskId: string;
  title: string;
  occurredAt: string;
  completedAt: string;
}

export interface RewardsLabLifecycleReversalEvent {
  type: 'task.reopened' | 'task.deleted';
  taskId: string;
  title: string;
  occurredAt: string;
  previousCompletedAt: string | null;
}

export type RewardsLabLifecycleEvent =
  | RewardsLabLifecycleCompletedEvent
  | RewardsLabLifecycleReversalEvent;

export interface RewardsLabOutboxStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

interface PendingLifecycleEvent {
  id: string;
  event: RewardsLabLifecycleEvent;
}

interface PersistedLifecycleOutbox {
  schemaVersion: typeof OUTBOX_SCHEMA_VERSION;
  events: PendingLifecycleEvent[];
}

export interface DrainLifecycleOutboxResult {
  processed: number;
  remaining: number;
  complete: boolean;
}

const isRecord = (value: unknown): value is Record<string, unknown> => (
  typeof value === 'object' && value !== null && !Array.isArray(value)
);

const isNonEmptyString = (value: unknown): value is string => (
  typeof value === 'string' && value.trim().length > 0
);

const sanitizeEvent = (value: unknown): RewardsLabLifecycleEvent | null => {
  if (!isRecord(value)
    || !isNonEmptyString(value.taskId)
    || typeof value.title !== 'string'
    || !isNonEmptyString(value.occurredAt)) return null;

  if (value.type === 'task.completed' && isNonEmptyString(value.completedAt)) {
    return {
      type: 'task.completed',
      taskId: value.taskId,
      title: value.title,
      occurredAt: value.occurredAt,
      completedAt: value.completedAt,
    };
  }

  if (value.type === 'task.reopened'
    || value.type === 'task.deleted') {
    if (value.previousCompletedAt !== null && typeof value.previousCompletedAt !== 'string') return null;
    return {
      type: value.type,
      taskId: value.taskId,
      title: value.title,
      occurredAt: value.occurredAt,
      previousCompletedAt: value.previousCompletedAt,
    };
  }

  return null;
};

const emptyOutbox = (): PersistedLifecycleOutbox => ({
  schemaVersion: OUTBOX_SCHEMA_VERSION,
  events: [],
});

const loadOutbox = (storage: RewardsLabOutboxStorage): PersistedLifecycleOutbox => {
  try {
    const serialized = storage.getItem(REWARDS_LAB_LIFECYCLE_OUTBOX_KEY);
    if (serialized === null) return emptyOutbox();
    const parsed = JSON.parse(serialized) as unknown;
    if (!isRecord(parsed)
      || parsed.schemaVersion !== OUTBOX_SCHEMA_VERSION
      || !Array.isArray(parsed.events)) return emptyOutbox();

    const ids = new Set<string>();
    const events = parsed.events.flatMap((value): PendingLifecycleEvent[] => {
      if (!isRecord(value) || !isNonEmptyString(value.id) || ids.has(value.id)) return [];
      const event = sanitizeEvent(value.event);
      if (!event) return [];
      ids.add(value.id);
      return [{ id: value.id, event }];
    });
    return { schemaVersion: OUTBOX_SCHEMA_VERSION, events };
  } catch {
    return emptyOutbox();
  }
};

const saveOutbox = (
  storage: RewardsLabOutboxStorage,
  outbox: PersistedLifecycleOutbox,
): boolean => {
  try {
    if (outbox.events.length === 0) {
      storage.removeItem(REWARDS_LAB_LIFECYCLE_OUTBOX_KEY);
    } else {
      storage.setItem(REWARDS_LAB_LIFECYCLE_OUTBOX_KEY, JSON.stringify(outbox));
    }
    return true;
  } catch {
    return false;
  }
};

const createOutboxId = (): string => {
  try {
    if (typeof globalThis.crypto !== 'undefined' && typeof globalThis.crypto.randomUUID === 'function') {
      return globalThis.crypto.randomUUID();
    }
  } catch {
    // Fall through to a local, non-security-sensitive identifier.
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
};

const toRewardsLabEvent = (event: TaskLifecycleEvent): RewardsLabLifecycleEvent => (
  event.type === 'task.completed'
    ? {
        type: event.type,
        taskId: event.taskId,
        title: event.title,
        occurredAt: event.occurredAt,
        completedAt: event.completedAt,
      }
    : {
        type: event.type,
        taskId: event.taskId,
        title: event.title,
        occurredAt: event.occurredAt,
        previousCompletedAt: event.previousCompletedAt,
      }
);

/** Persist a lifecycle event before loading the optional Rewards Lab runtime. */
export const enqueueRewardsLabLifecycleEvent = (
  storage: RewardsLabOutboxStorage,
  event: TaskLifecycleEvent,
): boolean => {
  const outbox = loadOutbox(storage);
  outbox.events.push({ id: createOutboxId(), event: toRewardsLabEvent(event) });
  return saveOutbox(storage, outbox);
};

/** Remove all pending experimental lifecycle work without touching planner data. */
export const clearRewardsLabLifecycleOutbox = (storage: RewardsLabOutboxStorage): boolean => {
  try {
    storage.removeItem(REWARDS_LAB_LIFECYCLE_OUTBOX_KEY);
    return true;
  } catch {
    return false;
  }
};

export const getRewardsLabLifecycleOutboxSize = (storage: RewardsLabOutboxStorage): number => (
  loadOutbox(storage).events.length
);

/**
 * Drain strictly in insertion order. An item is acknowledged only after the
 * idempotent runtime reports success; a failed handler or acknowledgement
 * leaves it durable for the next attempt or page load.
 */
export const drainRewardsLabLifecycleOutbox = (
  storage: RewardsLabOutboxStorage,
  handle: (event: RewardsLabLifecycleEvent) => boolean,
): DrainLifecycleOutboxResult => {
  let processed = 0;

  while (true) {
    const outbox = loadOutbox(storage);
    const pending = outbox.events[0];
    if (!pending) return { processed, remaining: 0, complete: true };

    let handled = false;
    try {
      handled = handle(pending.event);
    } catch {
      handled = false;
    }
    if (!handled) {
      return { processed, remaining: outbox.events.length, complete: false };
    }

    // Re-read before acknowledgement so a concurrent append is not overwritten.
    const latest = loadOutbox(storage);
    const nextEvents = latest.events.filter(item => item.id !== pending.id);
    if (!saveOutbox(storage, { schemaVersion: OUTBOX_SCHEMA_VERSION, events: nextEvents })) {
      return { processed, remaining: latest.events.length, complete: false };
    }
    processed += 1;
  }
};
