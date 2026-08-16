import { describe, expect, it } from 'vitest';
import { groupEventsForDisplay } from './event-history';
import { CalendarEvent, Task } from './types';

const event = (id: string, date: string, time = '09:00'): CalendarEvent => ({
  id,
  title: id,
  date,
  time,
  note: null,
});

const linkedTask = (eventId: string, status: Task['status'], completedAt: string | null): Task => ({
  id: `task-${eventId}`,
  title: eventId,
  status,
  plan: { day: '2026-08-20', week: '2026-W34' },
  projectId: null,
  eventId,
  createdAt: '2026-08-16T08:00:00.000Z',
  updatedAt: completedAt ?? '2026-08-16T08:00:00.000Z',
  completedAt,
});

describe('groupEventsForDisplay', () => {
  it('moves a future event to past immediately when its task is completed', () => {
    const groups = groupEventsForDisplay(
      [event('future', '2026-08-20')],
      [linkedTask('future', 'done', '2026-08-16T12:00:00.000Z')],
      '2026-08-16',
    );

    expect(groups.currentEvents).toHaveLength(0);
    expect(groups.pastEvents.map(item => item.id)).toEqual(['future']);
  });

  it('returns an undone future event to the current list', () => {
    const groups = groupEventsForDisplay(
      [event('future', '2026-08-20')],
      [linkedTask('future', 'todo', null)],
      '2026-08-16',
    );

    expect(groups.currentEvents.map(item => item.id)).toEqual(['future']);
  });

  it('sorts current events forward and past events from recent to old', () => {
    const groups = groupEventsForDisplay(
      [
        event('old', '2026-08-10'),
        event('new', '2026-08-15'),
        event('later', '2026-08-20', '10:00'),
        event('sooner', '2026-08-20', '08:00'),
      ],
      [],
      '2026-08-16',
    );

    expect(groups.currentEvents.map(item => item.id)).toEqual(['sooner', 'later']);
    expect(groups.pastEvents.map(item => item.id)).toEqual(['new', 'old']);
  });
});
