import { CalendarEvent, Task } from './types';

export interface EventGroups {
  nearEvents: CalendarEvent[];
  distantEvents: CalendarEvent[];
  currentEvents: CalendarEvent[];
  pastEvents: CalendarEvent[];
}

const eventTimestamp = (event: CalendarEvent): number => {
  return new Date(`${event.date}T${event.time || '00:00'}:00`).getTime();
};

const getEndOfNextMonth = (today: string): string => {
  const [year, month] = today.split('-').map(Number);
  const endOfNextMonth = new Date(Date.UTC(year, month + 1, 0));
  return endOfNextMonth.toISOString().slice(0, 10);
};

export const groupEventsForDisplay = (
  events: CalendarEvent[],
  tasks: Task[],
  today: string,
): EventGroups => {
  const linkedTasks = new Map(
    tasks
      .filter(task => task.eventId)
      .map(task => [task.eventId as string, task]),
  );
  const nearEvents: CalendarEvent[] = [];
  const distantEvents: CalendarEvent[] = [];
  const pastEvents: CalendarEvent[] = [];
  const nearEventsEndDate = getEndOfNextMonth(today);

  events.forEach(event => {
    const linkedTask = linkedTasks.get(event.id);
    if (event.date < today || linkedTask?.status === 'done') {
      pastEvents.push(event);
    } else if (event.date <= nearEventsEndDate) {
      nearEvents.push(event);
    } else {
      distantEvents.push(event);
    }
  });

  nearEvents.sort((a, b) => eventTimestamp(a) - eventTimestamp(b));
  distantEvents.sort((a, b) => eventTimestamp(a) - eventTimestamp(b));
  pastEvents.sort((a, b) => {
    const aTask = linkedTasks.get(a.id);
    const bTask = linkedTasks.get(b.id);
    const aTimestamp = aTask?.status === 'done'
      ? Date.parse(aTask.completedAt ?? aTask.updatedAt)
      : eventTimestamp(a);
    const bTimestamp = bTask?.status === 'done'
      ? Date.parse(bTask.completedAt ?? bTask.updatedAt)
      : eventTimestamp(b);
    return bTimestamp - aTimestamp;
  });

  // Keep the pre-3.1 view API working while consumers move to the two upcoming groups.
  const currentEvents = [...nearEvents, ...distantEvents];
  return { nearEvents, distantEvents, currentEvents, pastEvents };
};
