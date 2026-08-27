import React, { useEffect, useState } from 'react';
import { NotebookPen, Pencil, Plus, Save, Trash2, X } from 'lucide-react';
import { useAppStore } from '../store';
import { getWeekDateRange } from '../utils';
import { formatWorkShift, getWorkShiftForWeek } from '../week-shifts';
import { Modal } from './Modal';

interface WeekMetaBadgesProps {
  week: string;
  onEdit?: () => void;
  maxNotes?: number;
  className?: string;
}

export const WeekMetaBadges: React.FC<WeekMetaBadgesProps> = ({
  week,
  onEdit,
  maxNotes = 2,
  className = '',
}) => {
  const { state } = useAppStore();
  const shift = getWorkShiftForWeek(state.workShiftSettings, week);
  const notes = state.weekNotes[week] ?? [];
  const visibleNotes = notes.slice(0, maxNotes);
  const hiddenCount = Math.max(0, notes.length - visibleNotes.length);

  return (
    <div className={`flex min-w-0 flex-wrap items-center gap-1.5 ${className}`}>
      {shift && (
        <span className="flex-shrink-0 rounded bg-indigo-50 px-2 py-1 text-[10px] font-semibold text-indigo-700">
          {formatWorkShift(shift)}
        </span>
      )}
      {visibleNotes.map(note => (
        <button
          key={note.id}
          type="button"
          onClick={onEdit}
          className="inline-flex max-w-[12rem] items-center gap-1 rounded bg-amber-50 px-2 py-1 text-[10px] font-semibold text-amber-800 hover:bg-amber-100"
          title={note.text}
        >
          <NotebookPen className="h-3 w-3 flex-shrink-0" />
          <span className="truncate">{note.text}</span>
        </button>
      ))}
      {hiddenCount > 0 && (
        <button
          type="button"
          onClick={onEdit}
          className="rounded bg-amber-100 px-2 py-1 text-[10px] font-semibold text-amber-800 hover:bg-amber-200"
          title={`Show ${hiddenCount} more week notes`}
        >
          +{hiddenCount}
        </button>
      )}
      {onEdit && (
        <button
          type="button"
          onClick={onEdit}
          className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded text-amber-700 hover:bg-amber-50"
          title={notes.length ? 'Edit week notes' : 'Add week note'}
          aria-label={notes.length ? 'Edit week notes' : 'Add week note'}
        >
          {notes.length ? <Pencil className="h-3.5 w-3.5" /> : <Plus className="h-4 w-4" />}
        </button>
      )}
    </div>
  );
};

interface WeekNotesEditorProps {
  week: string | null;
  onClose: () => void;
}

export const WeekNotesEditor: React.FC<WeekNotesEditorProps> = ({ week, onClose }) => {
  const { state, dispatch } = useAppStore();
  const [draft, setDraft] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState('');

  useEffect(() => {
    setDraft('');
    setEditingId(null);
    setEditingText('');
  }, [week]);

  if (!week) return null;

  const notes = state.weekNotes[week] ?? [];
  const range = getWeekDateRange(week);

  const addNote = (event: React.FormEvent) => {
    event.preventDefault();
    const text = draft.trim();
    if (!text) return;
    dispatch({ type: 'ADD_WEEK_NOTE', payload: { week, text } });
    setDraft('');
  };

  const saveEdit = (id: string) => {
    const text = editingText.trim();
    if (!text) return;
    dispatch({ type: 'UPDATE_WEEK_NOTE', payload: { week, id, text } });
    setEditingId(null);
    setEditingText('');
  };

  return (
    <Modal
      isOpen
      onClose={onClose}
      title={`Week ${week.split('-W')[1]} notes`}
    >
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
          <span>{week}</span>
          <span>{range.start}–{range.end}</span>
        </div>

        <form onSubmit={addNote} className="space-y-2">
          <label className="block text-xs font-bold uppercase text-slate-500" htmlFor="week-note-draft">
            New note
          </label>
          <textarea
            id="week-note-draft"
            value={draft}
            onChange={event => setDraft(event.target.value)}
            maxLength={240}
            rows={2}
            className="w-full resize-none rounded-lg border border-slate-300 p-2 text-sm outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
            placeholder="Vacation, important goal, reminder…"
          />
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] text-slate-400">{draft.length}/240</span>
            <button
              type="submit"
              disabled={!draft.trim()}
              className="inline-flex items-center gap-1.5 rounded bg-amber-600 px-3 py-2 text-sm font-semibold text-white hover:bg-amber-700 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Plus className="h-4 w-4" /> Add note
            </button>
          </div>
        </form>

        <div className="border-t border-slate-100 pt-3">
          <div className="mb-2 text-xs font-bold uppercase text-slate-500">
            Saved notes ({notes.length})
          </div>
          {notes.length === 0 ? (
            <div className="rounded-lg border border-dashed border-slate-200 px-3 py-6 text-center text-sm text-slate-400">
              No notes for this week yet.
            </div>
          ) : (
            <div className="space-y-2">
              {notes.map(note => (
                <div key={note.id} className="rounded-lg border border-amber-100 bg-amber-50/50 p-3">
                  {editingId === note.id ? (
                    <div className="space-y-2">
                      <textarea
                        autoFocus
                        value={editingText}
                        onChange={event => setEditingText(event.target.value)}
                        maxLength={240}
                        rows={2}
                        className="w-full resize-none rounded border border-amber-200 bg-white p-2 text-sm outline-none focus:border-amber-500"
                      />
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingId(null);
                            setEditingText('');
                          }}
                          className="inline-flex items-center gap-1 rounded px-2 py-1 text-xs font-semibold text-slate-500 hover:bg-white"
                        >
                          <X className="h-3.5 w-3.5" /> Cancel
                        </button>
                        <button
                          type="button"
                          onClick={() => saveEdit(note.id)}
                          disabled={!editingText.trim()}
                          className="inline-flex items-center gap-1 rounded bg-amber-600 px-2 py-1 text-xs font-semibold text-white disabled:opacity-40"
                        >
                          <Save className="h-3.5 w-3.5" /> Save
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-start gap-2">
                      <p className="min-w-0 flex-1 whitespace-pre-wrap break-words text-sm text-slate-700">{note.text}</p>
                      <button
                        type="button"
                        onClick={() => {
                          setEditingId(note.id);
                          setEditingText(note.text);
                        }}
                        className="rounded p-1.5 text-slate-400 hover:bg-white hover:text-amber-700"
                        title="Edit note"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => dispatch({ type: 'DELETE_WEEK_NOTE', payload: { week, id: note.id } })}
                        className="rounded p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600"
                        title="Delete note"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
};
