import React, { useEffect, useState } from 'react';
import { NotebookPen, Pencil, Plus, Save, Trash2, X } from 'lucide-react';
import { useAppStore } from '../store';
import { getWeekDateRange } from '../utils';
import { formatWorkShift, getWorkShiftForWeek } from '../week-shifts';
import { Modal } from './Modal';
import { useI18n } from '../i18n';

interface WeekMetaBadgesProps {
  week: string;
  onEdit?: () => void;
  maxNotes?: number;
  compact?: boolean;
  className?: string;
  showNotes?: boolean;
  showEditor?: boolean;
  showShift?: boolean;
}

export const WeekMetaBadges: React.FC<WeekMetaBadgesProps> = ({
  week,
  onEdit,
  maxNotes = 2,
  compact = false,
  className = '',
  showNotes = true,
  showEditor = true,
  showShift = true,
}) => {
  const { state } = useAppStore();
  const { language, t } = useI18n();
  const shift = getWorkShiftForWeek(state.workShiftSettings, week);
  const notes = state.weekNotes[week] ?? [];
  const visibleNotes = notes.slice(0, maxNotes);
  const hiddenCount = Math.max(0, notes.length - visibleNotes.length);

  return (
    <div className={`flex min-w-0 items-center gap-1.5 ${compact ? 'flex-nowrap overflow-hidden' : 'flex-wrap'} ${className}`}>
      {showShift && shift && (
        <span className={`flex-shrink-0 rounded-lg bg-brand-50 font-semibold text-brand-700 ${compact ? 'px-1.5 py-0.5 text-[9px]' : 'px-2 py-1 text-[10px]'}`}>
          {formatWorkShift(shift, language)}
        </span>
      )}
      {showNotes && visibleNotes.map(note => (
        <button
          key={note.id}
          type="button"
          onClick={onEdit}
          className={`inline-flex min-w-0 items-center gap-1 rounded bg-amber-50 font-semibold text-amber-800 hover:bg-amber-100 ${
            compact ? 'max-w-[10rem] px-1.5 py-0.5 text-[9px]' : 'max-w-[12rem] px-2 py-1 text-[10px]'
          }`}
          title={note.text}
        >
          <NotebookPen className="h-3 w-3 flex-shrink-0" />
          <span className="truncate">{note.text}</span>
        </button>
      ))}
      {showNotes && hiddenCount > 0 && (
        <button
          type="button"
          onClick={onEdit}
          className={`flex-shrink-0 rounded bg-amber-100 font-semibold text-amber-800 hover:bg-amber-200 ${compact ? 'px-1.5 py-0.5 text-[9px]' : 'px-2 py-1 text-[10px]'}`}
          title={t('Show {count} more week notes', { count: hiddenCount })}
        >
          +{hiddenCount}
        </button>
      )}
      {showEditor && onEdit && (
        <button
          type="button"
          onClick={onEdit}
          className={`flex flex-shrink-0 items-center justify-center rounded text-amber-700 hover:bg-amber-50 ${compact ? 'h-6 w-6' : 'h-7 w-7'}`}
          title={notes.length ? t('Edit week notes') : t('Add week note')}
          aria-label={notes.length ? t('Edit week notes') : t('Add week note')}
        >
          <NotebookPen className={compact ? 'h-3.5 w-3.5' : 'h-4 w-4'} />
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
  const { t } = useI18n();
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
      title={t('Week {week} notes', { week: week.split('-W')[1] })}
    >
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
          <span>{week}</span>
          <span>{range.start}–{range.end}</span>
        </div>

        <form onSubmit={addNote} className="space-y-2">
          <label className="block text-xs font-bold uppercase text-slate-500" htmlFor="week-note-draft">
            {t('New note')}
          </label>
          <textarea
            id="week-note-draft"
            value={draft}
            onChange={event => setDraft(event.target.value)}
            maxLength={240}
            rows={2}
            className="field w-full resize-none"
            placeholder={t('Vacation, important goal, reminder…')}
          />
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] text-slate-400">{draft.length}/240</span>
            <button
              type="submit"
              disabled={!draft.trim()}
              className="button-primary"
            >
              <Plus className="h-4 w-4" /> {t('Add note')}
            </button>
          </div>
        </form>

        <div className="border-t border-slate-100 pt-3">
          <div className="mb-2 text-xs font-bold uppercase text-slate-500">
            {t('Saved notes ({count})', { count: notes.length })}
          </div>
          {notes.length === 0 ? (
            <div className="empty-state py-6">
              {t('No notes for this week yet.')}
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
                        className="field-compact w-full resize-none"
                      />
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingId(null);
                            setEditingText('');
                          }}
                          className="button-secondary min-h-8 px-2 py-1 text-xs"
                        >
                          <X className="h-3.5 w-3.5" /> {t('Cancel')}
                        </button>
                        <button
                          type="button"
                          onClick={() => saveEdit(note.id)}
                          disabled={!editingText.trim()}
                          className="button-primary min-h-8 px-2 py-1 text-xs"
                        >
                          <Save className="h-3.5 w-3.5" /> {t('Save')}
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
                        title={t('Edit note')}
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => dispatch({ type: 'DELETE_WEEK_NOTE', payload: { week, id: note.id } })}
                        className="rounded p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600"
                        title={t('Delete note')}
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
