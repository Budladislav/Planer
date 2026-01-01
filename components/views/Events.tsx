import React, { useState } from 'react';
import { useAppStore } from '../../store';
import { CalendarEvent } from '../../types';
import { getTodayString, generateId, formatDateShort } from '../../utils';
import { Plus, Edit2, Trash2 } from 'lucide-react';

export const EventsView: React.FC = () => {
  const { state, dispatch } = useAppStore();
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form state
  const [newTitle, setNewTitle] = useState('');
  const [newDate, setNewDate] = useState(getTodayString());
  const [newTime, setNewTime] = useState('09:00');

  // Edit state
  const [editTitle, setEditTitle] = useState('');
  const [editDate, setEditDate] = useState('');
  const [editTime, setEditTime] = useState('');

  // Sort events: by date (ascending), then by time (ascending)
  const sortedEvents = [...state.events].sort((a, b) => {
    if (a.date !== b.date) {
      return a.date.localeCompare(b.date);
    }
    return a.time.localeCompare(b.time);
  });

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    dispatch({
      type: 'ADD_EVENT',
      payload: {
        id: generateId(),
        title: newTitle.trim(),
        date: newDate,
        time: newTime,
        note: null,
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
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingId || !editTitle.trim()) return;

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
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditTitle('');
    setEditDate('');
    setEditTime('');
  };

  const handleDelete = (id: string) => {
    if (window.confirm('Delete this event?')) {
      dispatch({ type: 'DELETE_EVENT', payload: id });
    }
  };

  return (
    <div className="max-w-3xl mx-auto">
      {/* Header - Centered */}
      <div className="text-center mb-6">
        <h2 className="text-3xl font-bold text-slate-900">Events</h2>
        <p className="text-slate-500">Fixed date and time entries</p>
      </div>

      {/* Events List - with bottom padding for fixed form */}
      <div className="pb-48 lg:pb-8 space-y-2 min-h-[60vh] flex flex-col">
        {sortedEvents.length === 0 ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center py-12 border-2 border-dashed border-slate-200 rounded-xl w-full">
              <p className="text-slate-400 font-medium">No events yet</p>
            </div>
          </div>
        ) : (
          <div className="flex-1 space-y-2">
            {sortedEvents.map((event) => (
              <div
                key={event.id}
                className="bg-white border border-slate-200 rounded-lg p-4 hover:shadow-sm transition-shadow group"
              >
                {editingId === event.id ? (
                  <form onSubmit={handleSaveEdit} className="space-y-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Title</label>
                      <input
                        type="text"
                        required
                        value={editTitle}
                        onChange={(e) => setEditTitle(e.target.value)}
                        className="w-full p-2 border border-slate-300 rounded-lg focus:border-indigo-500 outline-none"
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
                ) : (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1 text-slate-900">
                      <span className="text-base">{formatDateShort(event.date)}</span>
                      <span className="text-slate-400">,</span>
                      <span className="text-base">{event.time}</span>
                      <span className="text-slate-400">,</span>
                      <span className="text-base">{event.title}</span>
                    </div>
                    <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => handleStartEdit(event)}
                        className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                        title="Edit"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(event.id)}
                        className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add Form - Fixed at bottom */}
      <form onSubmit={handleAdd} className="lg:hidden fixed bottom-16 left-0 right-0 p-4 bg-slate-50 border-t border-slate-200 z-20">
        <div className="max-w-3xl mx-auto space-y-3">
          <input
            type="text"
            required
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            placeholder="Event title"
            className="w-full p-3 border border-slate-300 rounded-lg focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-shadow bg-white"
          />
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
          <button 
            type="submit" 
            className="w-full p-3 bg-slate-900 text-white rounded-lg hover:bg-slate-800 font-medium"
          >
            Add Event
          </button>
        </div>
      </form>

      {/* Add Form - Desktop */}
      <form onSubmit={handleAdd} className="hidden lg:block space-y-3">
        <input
          type="text"
          required
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          placeholder="Event title"
          className="w-full p-3 border border-slate-300 rounded-lg focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-shadow mb-3"
        />
        <div className="grid grid-cols-2 gap-3 mb-3">
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
        <button 
          type="submit" 
          className="w-full p-3 bg-slate-900 text-white rounded-lg hover:bg-slate-800 font-medium"
        >
          Add Event
        </button>
      </form>
    </div>
  );
};

