import { CalendarEvent, Task } from './types';

export interface EventGroups {
  currentEvents: CalendarEvent[];
  pastEvents: CalendarEvent[];
}

const eventTimestamp = (event: CalendarEvent): number => {
  return new Date(`${event.date}T${event.time || '00:00'}:00`).getTime();
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
  const currentEvents: CalendarEvent[] = [];
  const pastEvents: CalendarEvent[] = [];

  events.forEach(event => {
    const linkedTask = linkedTasks.get(event.id);
    if (event.date < today || linkedTask?.status === 'done') {
      pastEvents.push(event);
    } else {
      currentEvents.push(event);
    }
  });

  currentEvents.sort((a, b) => eventTimestamp(a) - eventTimestamp(b));
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

  return { currentEvents, pastEvents };
};
