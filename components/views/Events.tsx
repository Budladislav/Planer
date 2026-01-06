import React, { useMemo, useState } from 'react';
import { useAppStore } from '../../store';
import { CalendarEvent } from '../../types';
import { getTodayString, generateId, formatDateShort, getWeekString, formatEventTitle } from '../../utils';
import { Plus, Trash2, ChevronDown, ChevronRight } from 'lucide-react';
import { ConfirmModal } from '../Modal';

const EventItem: React.FC<{ 
  event: CalendarEvent;
  editingId: string | null;
  onStartEdit: (event: CalendarEvent) => void;
  onDelete: (id: string) => void;
}> = ({ event, editingId, onStartEdit, onDelete }) => {
  const [showActions, setShowActions] = useState(false);

  if (editingId === event.id) {
    return null; // Edit form will be rendered separately
  }

  return (
    <div
      className="bg-white border border-slate-200 rounded-lg p-3 hover:shadow-sm transition-all overflow-hidden text-sm"
    >
      <div 
        className={`cursor-pointer ${showActions ? 'space-y-2' : ''}`}
        onClick={() => setShowActions(prev => !prev)}
      >
        <div className={`flex items-center flex-1 min-w-0 ${showActions ? 'items-start' : 'items-center'}`}>
          <span className="text-sm text-slate-900">{formatDateShort(event.date)}</span>
          <span className="text-slate-400">,</span>
          <span className="text-sm text-slate-900 ml-1">{event.time}</span>
          <span className="text-slate-400">,</span>
          {!showActions && (
            <span className="text-sm text-slate-900 ml-1 truncate">
              {event.title}
            </span>
          )}
        </div>
        {showActions && (
          <div className="w-full">
            <span className="text-sm text-slate-900 break-words block">
              {event.title}
            </span>
          </div>
        )}
      </div>
      <div
        className={`flex items-center justify-between px-4 gap-3 transition-all duration-200 ${
          showActions ? 'mt-3 opacity-100 max-h-40' : 'mt-0 opacity-0 max-h-0 overflow-hidden'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={() => onDelete(event.id)}
          className="px-3 py-1.5 text-xs font-semibold text-red-700 bg-red-50 rounded hover:bg-red-100"
          title="Delete"
        >
          Delete
        </button>
        <button
          onClick={() => onStartEdit(event)}
          className="px-3 py-1.5 text-xs font-semibold text-slate-600 bg-slate-100 rounded hover:bg-slate-200"
          title="Edit"
        >
          Edit
        </button>
      </div>
    </div>
  );
};

export const EventsView: React.FC = () => {
  const { state, dispatch } = useAppStore();
  const [deleteConfirm, setDeleteConfirm] = useState<{ isOpen: boolean; eventId: string | null }>({
    isOpen: false,
    eventId: null,
  });
  const [editingId, setEditingId] = useState<string | null>(null);
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);

  // Form state
  const [newTitle, setNewTitle] = useState('');
  const [newDate, setNewDate] = useState(getTodayString());
  const [newTime, setNewTime] = useState('09:00');

  // Edit state
  const [editTitle, setEditTitle] = useState('');
  const [editDate, setEditDate] = useState('');
  const [editTime, setEditTime] = useState('');
  const [originalEvent, setOriginalEvent] = useState<CalendarEvent | null>(null);

  const [showPastEvents, setShowPastEvents] = useState(false);
  const todayStr = getTodayString();

  // Sort events: by date (ascending), then by time (ascending)
  const sortedEvents = useMemo(() => {
    return [...state.events].sort((a, b) => {
      if (a.date !== b.date) {
        return a.date.localeCompare(b.date);
      }
      return a.time.localeCompare(b.time);
    });
  }, [state.events]);

  // Separate events into current/future and past
  const { currentEvents, pastEvents } = useMemo(() => {
    const current: CalendarEvent[] = [];
    const past: CalendarEvent[] = [];
    
    sortedEvents.forEach(event => {
      if (event.date < todayStr) {
        past.push(event);
      } else {
        current.push(event);
      }
    });
    
    return { currentEvents: current, pastEvents: past };
  }, [sortedEvents, todayStr]);

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    const eventId = generateId();
    const eventTitle = formatEventTitle(newTime, newTitle.trim());

    // Create event
    dispatch({
      type: 'ADD_EVENT',
      payload: {
        id: eventId,
        title: newTitle.trim(),
        date: newDate,
        time: newTime,
        note: null,
      },
    });

    // Create task linked to event
    dispatch({
      type: 'ADD_TASK',
      payload: {
        id: generateId(),
        title: eventTitle,
        status: 'todo',
        plan: { day: newDate, week: getWeekString(newDate) },
        frog: false,
        projectId: null,
        eventId: eventId, // Link to event
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    });

    setNewTitle('');
    setNewDate(getTodayString());
    setNewTime('09:00');
  };

  const handleStartEdit = (event: CalendarEvent) => {
    setEditingId(event.id);
    setEditTitle(event.title);
    setEditDate(event.date);
    setEditTime(event.time);
    setOriginalEvent(event); // Save original event to find and delete old task
    // Auto-resize textarea after state update
    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
        textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
      }
    }, 0);
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingId || !editTitle.trim()) return;

    // Update the event - task will be updated automatically in store
    dispatch({
      type: 'UPDATE_EVENT',
      payload: {
        id: editingId,
        title: editTitle.trim(),
        date: editDate,
        time: editTime,
      },
    });

    setEditingId(null);
    setEditTitle('');
    setEditDate('');
    setEditTime('');
    setOriginalEvent(null);
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditTitle('');
    setEditDate('');
    setEditTime('');
    setOriginalEvent(null);
  };

  // Auto-resize textarea when editing
  React.useEffect(() => {
    if (editingId && textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [editingId, editTitle]);

  const handleDelete = (id: string) => {
    setDeleteConfirm({ isOpen: true, eventId: id });
  };

  const handleDeleteConfirm = () => {
    if (deleteConfirm.eventId) {
      dispatch({ type: 'DELETE_EVENT', payload: deleteConfirm.eventId });
      setDeleteConfirm({ isOpen: false, eventId: null });
    }
  };

  return (
    <>
    <div className="max-w-3xl mx-auto">
      {/* Header - Centered */}
      <div className="text-center mb-3">
        <h2 className="text-3xl font-bold text-slate-900">Events</h2>
        <p className="text-slate-500">Events create a task copy in the corresponding day</p>
      </div>

      {/* Events List - with bottom padding for fixed form */}
      <div className="pb-32 lg:pb-6 space-y-2 min-h-[60vh] flex flex-col">
        {currentEvents.length === 0 && pastEvents.length === 0 ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center py-12 border-2 border-dashed border-slate-200 rounded-xl w-full">
              <p className="text-slate-400 font-medium">No events yet</p>
            </div>
          </div>
        ) : (
          <div className="flex-1 space-y-2">
            {/* Current and future events */}
            {currentEvents.map((event) => (
              <React.Fragment key={event.id}>
                {editingId === event.id ? (
                  <div className="bg-white border border-slate-200 rounded-lg p-4">
                    <form onSubmit={handleSaveEdit} className="space-y-4">
                      <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Title</label>
                        <textarea
                          ref={textareaRef}
                          required
                          value={editTitle}
                          onChange={(e) => {
                            setEditTitle(e.target.value);
                            if (textareaRef.current) {
                              textareaRef.current.style.height = 'auto';
                              textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
                            }
                          }}
                          className="w-full p-2 border border-slate-300 rounded-lg focus:border-indigo-500 outline-none resize-none overflow-hidden min-h-[2.5rem]"
                          rows={1}
                          autoFocus
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Date</label>
                          <input
                            type="date"
                            required
                            value={editDate}
                            onChange={(e) => setEditDate(e.target.value)}
                            className="w-full p-2 border border-slate-300 rounded-lg focus:border-indigo-500 outline-none"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Time</label>
                          <input
                            type="time"
                            required
                            value={editTime}
                            onChange={(e) => setEditTime(e.target.value)}
                            className="w-full p-2 border border-slate-300 rounded-lg focus:border-indigo-500 outline-none"
                          />
                        </div>
                      </div>
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={handleCancelEdit}
                          className="px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-100 rounded-lg"
                        >
                          Cancel
                        </button>
                        <button type="submit" className="px-3 py-1.5 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">
                          Save
                        </button>
                      </div>
                    </form>
                  </div>
                ) : (
                  <EventItem 
                    event={event}
                    editingId={editingId}
                    onStartEdit={handleStartEdit}
                    onDelete={handleDelete}
                  />
                )}
              </React.Fragment>
            ))}

            {/* Past events - collapsible */}
            {pastEvents.length > 0 && (
              <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
                <button
                  type="button"
                  onClick={() => setShowPastEvents(prev => !prev)}
                  className="w-full flex items-center justify-between px-4 py-3 hover:bg-slate-50 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    {showPastEvents ? (
                      <ChevronDown className="w-5 h-5 text-slate-400 flex-shrink-0" />
                    ) : (
                      <ChevronRight className="w-5 h-5 text-slate-400 flex-shrink-0" />
                    )}
                    <span className="text-sm font-semibold text-slate-700">
                      Past events ({pastEvents.length})
                    </span>
                  </div>
                </button>
                {showPastEvents && (
                  <div className="px-2 pb-3 space-y-1">
                    {pastEvents.map((event) => (
                      <React.Fragment key={event.id}>
                        {editingId === event.id ? (
                          <div className="bg-white border border-slate-200 rounded-lg p-4">
                            <form onSubmit={handleSaveEdit} className="space-y-4">
                              <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Title</label>
                                <textarea
                                  ref={textareaRef}
                                  required
                                  value={editTitle}
                                  onChange={(e) => {
                                    setEditTitle(e.target.value);
                                    if (textareaRef.current) {
                                      textareaRef.current.style.height = 'auto';
                                      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
                                    }
                                  }}
                                  className="w-full p-2 border border-slate-300 rounded-lg focus:border-indigo-500 outline-none resize-none overflow-hidden min-h-[2.5rem]"
                                  rows={1}
                                  autoFocus
                                />
                              </div>
                              <div className="grid grid-cols-2 gap-4">
                                <div>
                                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Date</label>
                                  <input
                                    type="date"
                                    required
                                    value={editDate}
                                    onChange={(e) => setEditDate(e.target.value)}
                                    className="w-full p-2 border border-slate-300 rounded-lg focus:border-indigo-500 outline-none"
                                  />
                                </div>
                                <div>
                                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Time</label>
                                  <input
                                    type="time"
                                    required
                                    value={editTime}
                                    onChange={(e) => setEditTime(e.target.value)}
                                    className="w-full p-2 border border-slate-300 rounded-lg focus:border-indigo-500 outline-none"
                                  />
                                </div>
                              </div>
                              <div className="flex justify-end gap-2">
                                <button
                                  type="button"
                                  onClick={handleCancelEdit}
                                  className="px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-100 rounded-lg"
                                >
                                  Cancel
                                </button>
                                <button type="submit" className="px-3 py-1.5 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">
                                  Save
                                </button>
                              </div>
                            </form>
                          </div>
                        ) : (
                          <EventItem 
                            event={event}
                            editingId={editingId}
                            onStartEdit={handleStartEdit}
                            onDelete={handleDelete}
                          />
                        )}
                      </React.Fragment>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Add Form - Fixed at bottom */}
      <form onSubmit={handleAdd} className="lg:hidden fixed bottom-16 left-0 right-0 p-4 bg-slate-50 border-t border-slate-200 z-20">
        <div className="max-w-3xl mx-auto space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <input
              type="date"
              required
              value={newDate}
              onChange={(e) => setNewDate(e.target.value)}
              className="w-full p-3 border border-slate-300 rounded-lg focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none bg-white"
            />
            <input
              type="time"
              required
              value={newTime}
              onChange={(e) => setNewTime(e.target.value)}
              className="w-full p-3 border border-slate-300 rounded-lg focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none bg-white"
            />
          </div>
          <div className="flex items-center gap-3">
            <input
              type="text"
              required
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="Event title"
              className="flex-1 p-3 border border-slate-300 rounded-lg focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-shadow bg-white"
            />
            <button 
              type="submit" 
              className="w-12 h-12 bg-slate-900 text-white rounded-full shadow-lg hover:bg-slate-800 hover:shadow-xl hover:scale-110 transition-all flex items-center justify-center flex-shrink-0"
              title="Add event"
            >
              <Plus className="w-6 h-6" />
            </button>
          </div>
        </div>
      </form>

      {/* Add Form - Desktop */}
      <form onSubmit={handleAdd} className="hidden lg:block space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <input
            type="date"
            required
            value={newDate}
            onChange={(e) => setNewDate(e.target.value)}
            className="w-full p-3 border border-slate-300 rounded-lg focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
          />
          <input
            type="time"
            required
            value={newTime}
            onChange={(e) => setNewTime(e.target.value)}
            className="w-full p-3 border border-slate-300 rounded-lg focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
          />
        </div>
        <div className="flex items-center gap-3">
          <input
            type="text"
            required
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            placeholder="Event title"
            className="flex-1 p-3 border border-slate-300 rounded-lg focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-shadow"
          />
          <button 
            type="submit" 
            className="w-12 h-12 bg-slate-900 text-white rounded-full shadow-lg hover:bg-slate-800 hover:shadow-xl hover:scale-110 transition-all flex items-center justify-center flex-shrink-0"
            title="Add event"
          >
            <Plus className="w-6 h-6" />
          </button>
        </div>
      </form>
    </div>

    <ConfirmModal
      isOpen={deleteConfirm.isOpen}
      onClose={() => setDeleteConfirm({ isOpen: false, eventId: null })}
      onConfirm={handleDeleteConfirm}
      title="Delete Event"
      message="Delete this event? (The corresponding task will also be deleted)"
      variant="danger"
      confirmText="Delete"
    />
    </>
  );
};
