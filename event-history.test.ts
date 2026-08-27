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
  plan: { month: '2026-08', day: '2026-08-20', week: '2026-W34' },
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

    expect(groups.nearEvents).toHaveLength(0);
    expect(groups.distantEvents).toHaveLength(0);
    expect(groups.currentEvents).toHaveLength(0);
    expect(groups.pastEvents.map(item => item.id)).toEqual(['future']);
  });

  it('returns an undone future event to the current list', () => {
    const groups = groupEventsForDisplay(
      [event('future', '2026-08-20')],
      [linkedTask('future', 'todo', null)],
      '2026-08-16',
    );

    expect(groups.nearEvents.map(item => item.id)).toEqual(['future']);
    expect(groups.distantEvents).toHaveLength(0);
    expect(groups.currentEvents.map(item => item.id)).toEqual(['future']);
  });

  it('sorts upcoming groups forward and past events from recent to old', () => {
    const groups = groupEventsForDisplay(
      [
        event('old', '2026-08-10'),
        event('new', '2026-08-15'),
        event('later', '2026-08-20', '10:00'),
        event('sooner', '2026-08-20', '08:00'),
        event('distant-later', '2026-11-20'),
        event('distant-sooner', '2026-10-01'),
      ],
      [],
      '2026-08-16',
    );

    expect(groups.nearEvents.map(item => item.id)).toEqual(['sooner', 'later']);
    expect(groups.distantEvents.map(item => item.id)).toEqual(['distant-sooner', 'distant-later']);
    expect(groups.currentEvents.map(item => item.id)).toEqual([
      'sooner', 'later', 'distant-sooner', 'distant-later',
    ]);
    expect(groups.pastEvents.map(item => item.id)).toEqual(['new', 'old']);
  });

  it('keeps the end of next month near across a year boundary', () => {
    const groups = groupEventsForDisplay(
      [
        event('today', '2026-12-15'),
        event('next-month-end', '2027-01-31'),
        event('first-distant', '2027-02-01'),
        event('yesterday', '2026-12-14'),
      ],
      [],
      '2026-12-15',
    );

    expect(groups.nearEvents.map(item => item.id)).toEqual(['today', 'next-month-end']);
    expect(groups.distantEvents.map(item => item.id)).toEqual(['first-distant']);
    expect(groups.pastEvents.map(item => item.id)).toEqual(['yesterday']);
  });
});
