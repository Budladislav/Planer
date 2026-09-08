import React, { useEffect, useState } from 'react';
import { NotebookPen, Pencil, Plus, Save, Trash2, X } from 'lucide-react';
import { useAppStore } from '../store';
import { formatDateReadable } from '../utils';
import { Modal } from './Modal';
import { useI18n } from '../i18n';

interface DayMetaBadgesProps {
  date: string;
  onEdit?: () => void;
  maxNotes?: number;
  compact?: boolean;
  className?: string;
}

export const DayMetaBadges: React.FC<DayMetaBadgesProps> = ({
  date,
  onEdit,
  maxNotes = 1,
  compact = false,
  className = '',
}) => {
  const { state } = useAppStore();
  const { t } = useI18n();
  const notes = state.dayNotes[date] ?? [];
  const visibleNotes = notes.slice(0, maxNotes);
  const hiddenCount = Math.max(0, notes.length - visibleNotes.length);

  return (
    <div className={`flex min-w-0 flex-wrap items-center gap-1.5 ${className}`}>
      {visibleNotes.map(note => (
        <button
          key={note.id}
          type="button"
          onClick={onEdit}
          className={`inline-flex min-w-0 items-center gap-1 rounded bg-sky-50 font-medium text-sky-800 hover:bg-sky-100 ${
            compact ? 'max-w-full px-1.5 py-0.5 text-[9px]' : 'max-w-[16rem] px-2 py-1 text-[10px]'
          }`}
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
          className="rounded bg-sky-100 px-1.5 py-0.5 text-[9px] font-semibold text-sky-800 hover:bg-sky-200"
          title={t('Show {count} more day notes', { count: hiddenCount })}
        >
          +{hiddenCount}
        </button>
      )}
      {onEdit && (
        <button
          type="button"
          onClick={onEdit}
          className={`flex flex-shrink-0 items-center justify-center rounded text-sky-700 hover:bg-sky-50 ${
            compact ? 'h-6 w-6' : 'h-7 w-7'
          }`}
          title={notes.length ? t('Edit day notes') : t('Add day note')}
          aria-label={notes.length ? t('Edit day notes') : t('Add day note')}
        >
          <Pencil className={compact ? 'h-3 w-3' : 'h-3.5 w-3.5'} />
        </button>
      )}
    </div>
  );
};

interface DayNotesEditorProps {
  date: string | null;
  onClose: () => void;
}

export const DayNotesEditor: React.FC<DayNotesEditorProps> = ({ date, onClose }) => {
  const { state, dispatch } = useAppStore();
  const { language, t } = useI18n();
  const [draft, setDraft] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState('');

  useEffect(() => {
    setDraft('');
    setEditingId(null);
    setEditingText('');
  }, [date]);

  if (!date) return null;
  const notes = state.dayNotes[date] ?? [];

  const addNote = (event: React.FormEvent) => {
    event.preventDefault();
    const text = draft.trim();
    if (!text) return;
    dispatch({ type: 'ADD_DAY_NOTE', payload: { date, text } });
    setDraft('');
  };

  const saveEdit = (id: string) => {
    const text = editingText.trim();
    if (!text) return;
    dispatch({ type: 'UPDATE_DAY_NOTE', payload: { date, id, text } });
    setEditingId(null);
    setEditingText('');
  };

  return (
    <Modal isOpen onClose={onClose} title={t('Day notes')}>
      <div className="space-y-4">
        <div className="text-xs text-slate-500">{formatDateReadable(date, language)}</div>

        <form onSubmit={addNote} className="space-y-2">
          <label className="block text-xs font-bold uppercase text-slate-500" htmlFor="day-note-draft">
            {t('New note')}
          </label>
          <textarea
            id="day-note-draft"
            value={draft}
            onChange={event => setDraft(event.target.value)}
            maxLength={240}
            rows={2}
            className="field w-full resize-none"
            placeholder={t('Reminder, context, plan…')}
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
          <div className="mb-2 text-xs font-bold uppercase text-slate-500">{t('Saved notes ({count})', { count: notes.length })}</div>
          {notes.length === 0 ? (
            <div className="empty-state py-6">
              {t('No notes for this day yet.')}
            </div>
          ) : (
            <div className="space-y-2">
              {notes.map(note => (
                <div key={note.id} className="rounded-lg border border-sky-100 bg-sky-50/50 p-3">
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
                        className="rounded p-1.5 text-slate-400 hover:bg-white hover:text-sky-700"
                        title={t('Edit note')}
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => dispatch({ type: 'DELETE_DAY_NOTE', payload: { date, id: note.id } })}
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
