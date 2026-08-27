import React, { useMemo, useState } from 'react';
import { CalendarDays, ChevronLeft, ChevronRight, Pencil } from 'lucide-react';
import { buildEventCalendarMonth } from '../../event-calendar';
import { CalendarEvent } from '../../types';
import { formatDateReadable } from '../../utils';
import { Modal } from '../Modal';
import { WeekMetaBadges, WeekNotesEditor } from '../WeekNotes';

interface EventsCalendarProps {
  events: CalendarEvent[];
  month: string;
  onMonthChange: (month: string) => void;
  onEditEvent: (event: CalendarEvent) => void;
}

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const shiftMonth = (month: string, delta: number): string => {
  const [year, monthNumber] = month.split('-').map(Number);
  const next = new Date(year, monthNumber - 1 + delta, 1, 12);
  return `${next.getFullYear()}-${(next.getMonth() + 1).toString().padStart(2, '0')}`;
};

export const EventsCalendar: React.FC<EventsCalendarProps> = ({
  events,
  month,
  onMonthChange,
  onEditEvent,
}) => {
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [editingWeek, setEditingWeek] = useState<string | null>(null);
  const weeks = useMemo(() => buildEventCalendarMonth(month), [month]);
  const eventsByDate = useMemo(() => {
    const grouped: Record<string, CalendarEvent[]> = {};
    events.forEach(event => {
      (grouped[event.date] ??= []).push(event);
    });
    Object.values(grouped).forEach(dayEvents => {
      dayEvents.sort((a, b) => a.time.localeCompare(b.time));
    });
    return grouped;
  }, [events]);

  const monthLabel = new Date(`${month}-01T12:00:00`).toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  });
  const selectedEvents = selectedDate ? eventsByDate[selectedDate] ?? [] : [];

  return (
    <>
      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-100 px-2 py-2 sm:px-3">
          <button
            type="button"
            onClick={() => onMonthChange(shiftMonth(month, -1))}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100"
            title="Previous month"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <div className="flex min-w-0 items-center gap-2 font-semibold text-slate-700">
            <CalendarDays className="h-4 w-4 flex-shrink-0 text-amber-600" />
            <span className="truncate">{monthLabel}</span>
          </div>
          <button
            type="button"
            onClick={() => onMonthChange(shiftMonth(month, 1))}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100"
            title="Next month"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>

        <div className="grid grid-cols-7 border-b border-slate-100 bg-slate-50">
          {WEEKDAYS.map(day => (
            <div key={day} className="py-1.5 text-center text-[10px] font-bold uppercase text-slate-400 sm:text-xs">
              {day}
            </div>
          ))}
        </div>

        {weeks.map(({ week, days }) => (
          <div key={week} className="border-b border-slate-100 last:border-b-0">
            <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 bg-slate-50/80 px-2 py-1.5">
              <span className="flex-shrink-0 text-[10px] font-bold uppercase text-slate-400">
                W{week.split('-W')[1]}
              </span>
              <WeekMetaBadges
                week={week}
                onEdit={() => setEditingWeek(week)}
                maxNotes={2}
                className="min-w-0 flex-1"
              />
            </div>
            <div className="grid grid-cols-7">
              {days.map(day => {
                const dayEvents = eventsByDate[day.date] ?? [];
                return (
                  <button
                    key={day.date}
                    type="button"
                    onClick={() => setSelectedDate(day.date)}
                    className={`min-h-16 min-w-0 border-r border-slate-100 p-1 text-left align-top last:border-r-0 hover:bg-amber-50/50 sm:min-h-24 sm:p-1.5 ${
                      day.isInMonth ? 'bg-white' : 'bg-slate-50/50 text-slate-300'
                    }`}
                    title={dayEvents.length ? `${dayEvents.length} event${dayEvents.length === 1 ? '' : 's'}` : 'No events'}
                  >
                    <div className="flex items-center justify-between gap-0.5">
                      <span className={`text-[11px] font-semibold sm:text-xs ${day.isInMonth ? 'text-slate-600' : 'text-slate-300'}`}>
                        {day.dayOfMonth}
                      </span>
                      {dayEvents.length > 0 && (
                        <span className="rounded-full bg-amber-100 px-1 text-[9px] font-bold text-amber-700 sm:hidden">
                          {dayEvents.length}
                        </span>
                      )}
                    </div>
                    <div className="mt-1 space-y-0.5">
                      {dayEvents.slice(0, 3).map(event => (
                        <div key={event.id} className="min-w-0 rounded-sm bg-amber-100 px-0.5 py-0.5 text-[8px] font-medium leading-tight text-amber-800 sm:px-1 sm:text-[9px]">
                          <span className="sm:hidden">{event.time}</span>
                          <span className="hidden truncate sm:block">{event.time} {event.title}</span>
                        </div>
                      ))}
                      {dayEvents.length > 3 && (
                        <div className="text-center text-[8px] font-semibold text-amber-700 sm:text-[9px]">+{dayEvents.length - 3}</div>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </section>

      <Modal
        isOpen={selectedDate !== null}
        onClose={() => setSelectedDate(null)}
        title={selectedDate ? formatDateReadable(selectedDate) : 'Day events'}
      >
        {selectedEvents.length === 0 ? (
          <div className="rounded-lg border border-dashed border-slate-200 px-3 py-8 text-center text-sm text-slate-400">
            No events planned for this day.
          </div>
        ) : (
          <div className="space-y-2">
            {selectedEvents.map(event => (
              <button
                key={event.id}
                type="button"
                onClick={() => {
                  setSelectedDate(null);
                  onEditEvent(event);
                }}
                className="flex w-full items-start gap-3 rounded-lg border border-slate-200 p-3 text-left hover:border-amber-200 hover:bg-amber-50/40"
              >
                <span className="rounded bg-amber-100 px-2 py-1 text-xs font-bold text-amber-800">{event.time}</span>
                <span className="min-w-0 flex-1 break-words text-sm text-slate-700">{event.title}</span>
                <Pencil className="mt-0.5 h-4 w-4 flex-shrink-0 text-slate-400" />
              </button>
            ))}
          </div>
        )}
      </Modal>

      <WeekNotesEditor week={editingWeek} onClose={() => setEditingWeek(null)} />
    </>
  );
};
