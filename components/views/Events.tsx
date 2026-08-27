import React, { useMemo, useRef, useState } from 'react';
import { ChevronDown, Plus } from 'lucide-react';
import { groupEventsForDisplay } from '../../event-history';
import { useAppStore } from '../../store';
import { CalendarEvent } from '../../types';
import { formatDateShort, formatEventTitle, generateId, getTodayString, getWeekString } from '../../utils';
import { EventsCalendar } from '../events/EventsCalendar';
import { ConfirmModal, Modal } from '../Modal';

interface EventItemProps {
  event: CalendarEvent;
  onStartEdit: (event: CalendarEvent) => void;
  onDelete: (id: string) => void;
}

const EventItem: React.FC<EventItemProps> = ({ event, onStartEdit, onDelete }) => {
  const [showActions, setShowActions] = useState(false);

  return (
    <div className="overflow-hidden rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm transition-all hover:shadow-sm">
      <div
        className={`cursor-pointer ${showActions ? 'space-y-2' : ''}`}
        onClick={() => setShowActions(previous => !previous)}
      >
        <div className={`flex min-w-0 flex-1 items-center ${showActions ? 'items-start' : 'items-center'}`}>
          <span className="text-sm text-slate-900">{formatDateShort(event.date)}</span>
          <span className="text-slate-400">,</span>
          <span className="ml-1 text-sm text-slate-900">{event.time}</span>
          <span className="text-slate-400">,</span>
          {!showActions && <span className="ml-1 truncate text-sm text-slate-900">{event.title}</span>}
        </div>
        {showActions && <span className="block break-words text-sm text-slate-900">{event.title}</span>}
      </div>
      <div
        className={`flex items-center justify-between gap-3 px-4 transition-all duration-200 ${
          showActions ? 'mt-2 max-h-40 opacity-100' : 'mt-0 max-h-0 overflow-hidden opacity-0'
        }`}
        onClick={event => event.stopPropagation()}
      >
        <button
          type="button"
          onClick={() => onDelete(event.id)}
          className="rounded bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-100"
        >
          Delete
        </button>
        <button
          type="button"
          onClick={() => onStartEdit(event)}
          className="rounded bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-200"
        >
          Edit
        </button>
      </div>
    </div>
  );
};

interface CollapsibleEventSectionProps {
  title: string;
  events: CalendarEvent[];
  expanded: boolean;
  onToggle: () => void;
  onEdit: (event: CalendarEvent) => void;
  onDelete: (id: string) => void;
}

const CollapsibleEventSection: React.FC<CollapsibleEventSectionProps> = ({
  title,
  events,
  expanded,
  onToggle,
  onEdit,
  onDelete,
}) => (
  <section className="overflow-hidden rounded-lg border border-slate-200 bg-white">
    <button
      type="button"
      onClick={onToggle}
      className="flex w-full items-center justify-between px-4 py-3 transition-colors hover:bg-slate-50"
      aria-expanded={expanded}
    >
      <span className="text-sm font-semibold text-slate-700">{title} ({events.length})</span>
      <ChevronDown className={`h-5 w-5 flex-shrink-0 text-slate-400 transition-transform ${expanded ? 'rotate-180' : ''}`} />
    </button>
    {expanded && (
      <div className="space-y-1 border-t border-slate-100 px-2 py-2">
        {events.length === 0 ? (
          <p className="px-2 py-4 text-center text-sm italic text-slate-400">No events in this section.</p>
        ) : events.map(event => (
          <EventItem key={event.id} event={event} onStartEdit={onEdit} onDelete={onDelete} />
        ))}
      </div>
    )}
  </section>
);

export const EventsView: React.FC = () => {
  const { state, dispatch } = useAppStore();
  const today = getTodayString();
  const [calendarMonth, setCalendarMonth] = useState(today.slice(0, 7));
  const [deleteConfirm, setDeleteConfirm] = useState<{ isOpen: boolean; eventId: string | null }>({
    isOpen: false,
    eventId: null,
  });
  const [editingId, setEditingId] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const [newTitle, setNewTitle] = useState('');
  const [newDate, setNewDate] = useState(today);
  const [newTime, setNewTime] = useState('09:00');
  const [editTitle, setEditTitle] = useState('');
  const [editDate, setEditDate] = useState('');
  const [editTime, setEditTime] = useState('');

  const { nearEvents, distantEvents, pastEvents } = useMemo(
    () => groupEventsForDisplay(state.events, state.tasks, today),
    [state.events, state.tasks, today],
  );

  const handleAdd = (event: React.FormEvent) => {
    event.preventDefault();
    const title = newTitle.trim();
    if (!title) return;

    const eventId = generateId();
    dispatch({
      type: 'ADD_EVENT',
      payload: { id: eventId, title, date: newDate, time: newTime, note: null },
    });
    dispatch({
      type: 'ADD_TASK',
      payload: {
        id: generateId(),
        title: formatEventTitle(newTime, title),
        status: 'todo',
        plan: { day: newDate, week: getWeekString(newDate), month: newDate.slice(0, 7) },
        projectId: null,
        eventId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        completedAt: null,
      },
    });
    setNewTitle('');
    setNewDate(today);
    setNewTime('09:00');
  };

  const handleStartEdit = (event: CalendarEvent) => {
    setEditingId(event.id);
    setEditTitle(event.title);
    setEditDate(event.date);
    setEditTime(event.time);
    setTimeout(() => {
      if (!textareaRef.current) return;
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }, 0);
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditTitle('');
    setEditDate('');
    setEditTime('');
  };

  const handleSaveEdit = (event: React.FormEvent) => {
    event.preventDefault();
    const title = editTitle.trim();
    if (!editingId || !title) return;
    dispatch({
      type: 'UPDATE_EVENT',
      payload: { id: editingId, title, date: editDate, time: editTime },
    });
    handleCancelEdit();
  };

  const updatePreference = (payload: Partial<typeof state.uiPreferences>) => {
    dispatch({ type: 'UPDATE_UI_PREFERENCES', payload });
  };

  return (
    <>
      <div className="mx-auto max-w-3xl">
        <div className="hidden text-center lg:mb-3 lg:block">
          <h2 className="text-3xl font-bold text-slate-900">Events</h2>
          <p className="text-slate-500">Events create a linked task on the corresponding day</p>
        </div>

        <div className="space-y-3 pb-48 lg:pb-6">
          <section>
            <div className="mb-1.5 flex items-center justify-between pl-1 pr-12 lg:pr-1">
              <h3 className="text-sm font-semibold text-slate-600">Current and next month</h3>
              <span className="text-xs text-slate-400">{nearEvents.length}</span>
            </div>
            {nearEvents.length === 0 ? (
              <div className="rounded-lg border border-dashed border-slate-200 bg-white px-3 py-6 text-center text-sm italic text-slate-400">
                No upcoming events in the current or next month.
              </div>
            ) : (
              <div className="space-y-1">
                {nearEvents.map(event => (
                  <EventItem key={event.id} event={event} onStartEdit={handleStartEdit} onDelete={id => setDeleteConfirm({ isOpen: true, eventId: id })} />
                ))}
              </div>
            )}
          </section>

          <CollapsibleEventSection
            title="Distant events"
            events={distantEvents}
            expanded={state.uiPreferences.eventsDistantExpanded}
            onToggle={() => updatePreference({ eventsDistantExpanded: !state.uiPreferences.eventsDistantExpanded })}
            onEdit={handleStartEdit}
            onDelete={id => setDeleteConfirm({ isOpen: true, eventId: id })}
          />

          <EventsCalendar
            events={state.events}
            month={calendarMonth}
            onMonthChange={setCalendarMonth}
            onEditEvent={handleStartEdit}
          />

          <CollapsibleEventSection
            title="Past events"
            events={pastEvents}
            expanded={state.uiPreferences.eventsPastExpanded}
            onToggle={() => updatePreference({ eventsPastExpanded: !state.uiPreferences.eventsPastExpanded })}
            onEdit={handleStartEdit}
            onDelete={id => setDeleteConfirm({ isOpen: true, eventId: id })}
          />
        </div>

        <form onSubmit={handleAdd} className="fixed bottom-16 left-0 right-0 z-20 border-t border-slate-200 bg-slate-50 p-4 lg:hidden">
          <div className="mx-auto max-w-3xl space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <input type="date" required value={newDate} onChange={event => setNewDate(event.target.value)} className="w-full rounded-lg border border-slate-300 bg-white p-3 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500" />
              <input type="time" required value={newTime} onChange={event => setNewTime(event.target.value)} className="w-full rounded-lg border border-slate-300 bg-white p-3 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500" />
            </div>
            <div className="flex items-center gap-3">
              <input type="text" required value={newTitle} onChange={event => setNewTitle(event.target.value)} placeholder="Event title" className="min-w-0 flex-1 rounded-lg border border-slate-300 bg-white p-3 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500" />
              <button type="submit" className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-slate-900 text-white shadow-lg transition-all hover:scale-105 hover:bg-slate-800" title="Add event">
                <Plus className="h-6 w-6" />
              </button>
            </div>
          </div>
        </form>

        <form onSubmit={handleAdd} className="hidden space-y-3 lg:block">
          <div className="grid grid-cols-2 gap-3">
            <input type="date" required value={newDate} onChange={event => setNewDate(event.target.value)} className="w-full rounded-lg border border-slate-300 p-3 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500" />
            <input type="time" required value={newTime} onChange={event => setNewTime(event.target.value)} className="w-full rounded-lg border border-slate-300 p-3 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500" />
          </div>
          <div className="flex items-center gap-3">
            <input type="text" required value={newTitle} onChange={event => setNewTitle(event.target.value)} placeholder="Event title" className="min-w-0 flex-1 rounded-lg border border-slate-300 p-3 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500" />
            <button type="submit" className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-slate-900 text-white shadow-lg transition-all hover:scale-105 hover:bg-slate-800" title="Add event">
              <Plus className="h-6 w-6" />
            </button>
          </div>
        </form>
      </div>

      <Modal isOpen={editingId !== null} onClose={handleCancelEdit} title="Edit event" hideFooter>
        <form onSubmit={handleSaveEdit} className="space-y-4">
          <label className="block text-xs font-bold uppercase text-slate-500">
            Title
            <textarea
              ref={textareaRef}
              required
              value={editTitle}
              onChange={event => {
                setEditTitle(event.target.value);
                if (!textareaRef.current) return;
                textareaRef.current.style.height = 'auto';
                textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
              }}
              className="mt-1 min-h-10 w-full resize-none overflow-hidden rounded-lg border border-slate-300 p-2 text-sm normal-case outline-none focus:border-indigo-500"
              rows={1}
              autoFocus
            />
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="text-xs font-bold uppercase text-slate-500">
              Date
              <input type="date" required value={editDate} onChange={event => setEditDate(event.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 p-2 text-sm font-normal normal-case outline-none focus:border-indigo-500" />
            </label>
            <label className="text-xs font-bold uppercase text-slate-500">
              Time
              <input type="time" required value={editTime} onChange={event => setEditTime(event.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 p-2 text-sm font-normal normal-case outline-none focus:border-indigo-500" />
            </label>
          </div>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={handleCancelEdit} className="rounded px-3 py-2 text-sm text-slate-600 hover:bg-slate-100">Cancel</button>
            <button type="submit" className="rounded bg-indigo-600 px-3 py-2 text-sm font-semibold text-white hover:bg-indigo-700">Save</button>
          </div>
        </form>
      </Modal>

      <ConfirmModal
        isOpen={deleteConfirm.isOpen}
        onClose={() => setDeleteConfirm({ isOpen: false, eventId: null })}
        onConfirm={() => {
          if (deleteConfirm.eventId) dispatch({ type: 'DELETE_EVENT', payload: deleteConfirm.eventId });
          setDeleteConfirm({ isOpen: false, eventId: null });
        }}
        title="Delete Event"
        message="Delete this event? (The corresponding task will also be deleted)"
        variant="danger"
        confirmText="Delete"
      />
    </>
  );
};
