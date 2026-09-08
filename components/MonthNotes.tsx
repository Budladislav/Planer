import React, { useEffect, useState } from 'react';
import { NotebookPen, Pencil, Plus, Save, Trash2, X } from 'lucide-react';
import { useAppStore } from '../store';
import { useI18n } from '../i18n';
import { Modal } from './Modal';

interface MonthMetaBadgesProps {
  month: string;
  onEdit?: () => void;
  maxNotes?: number;
  compact?: boolean;
  className?: string;
}

export const MonthMetaBadges: React.FC<MonthMetaBadgesProps> = ({
  month,
  onEdit,
  maxNotes = 2,
  compact = false,
  className = '',
}) => {
  const { state } = useAppStore();
  const { t } = useI18n();
  const notes = state.monthNotes[month] ?? [];
  const visibleNotes = notes.slice(0, maxNotes);
  const hiddenCount = Math.max(0, notes.length - visibleNotes.length);

  return (
    <div className={`flex min-w-0 flex-wrap items-center gap-1.5 ${className}`}>
      {visibleNotes.map(note => (
        <button
          key={note.id}
          type="button"
          onClick={onEdit}
          className={`inline-flex min-w-0 items-center gap-1 rounded bg-violet-50 font-semibold text-violet-800 hover:bg-violet-100 ${
            compact ? 'max-w-[10rem] px-1.5 py-0.5 text-[9px]' : 'max-w-[16rem] px-2 py-1 text-[10px]'
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
          className="rounded bg-violet-100 px-1.5 py-0.5 text-[9px] font-semibold text-violet-800 hover:bg-violet-200"
          title={t('Show {count} more month notes', { count: hiddenCount })}
        >
          +{hiddenCount}
        </button>
      )}
      {onEdit && (
        <button
          type="button"
          onClick={onEdit}
          className={`flex flex-shrink-0 items-center justify-center rounded text-violet-700 hover:bg-violet-50 ${compact ? 'h-6 w-6' : 'h-7 w-7'}`}
          title={notes.length ? t('Edit month notes') : t('Add month note')}
          aria-label={notes.length ? t('Edit month notes') : t('Add month note')}
        >
          <NotebookPen className={compact ? 'h-3.5 w-3.5' : 'h-4 w-4'} />
        </button>
      )}
    </div>
  );
};

interface MonthNotesEditorProps {
  month: string | null;
  onClose: () => void;
}

export const MonthNotesEditor: React.FC<MonthNotesEditorProps> = ({ month, onClose }) => {
  const { state, dispatch } = useAppStore();
  const { locale, t } = useI18n();
  const [draft, setDraft] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState('');

  useEffect(() => {
    setDraft('');
    setEditingId(null);
    setEditingText('');
  }, [month]);

  if (!month) return null;
  const notes = state.monthNotes[month] ?? [];
  const monthLabel = new Date(`${month}-01T12:00:00`).toLocaleDateString(locale, { month: 'long', year: 'numeric' });

  const addNote = () => {
    const text = draft.trim();
    if (!text) return;
    dispatch({ type: 'ADD_MONTH_NOTE', payload: { month, text } });
    setDraft('');
  };

  const saveEdit = (id: string) => {
    const text = editingText.trim();
    if (!text) return;
    dispatch({ type: 'UPDATE_MONTH_NOTE', payload: { month, id, text } });
    setEditingId(null);
    setEditingText('');
  };

  return (
    <Modal isOpen onClose={onClose} title={t('Notes for {month}', { month: monthLabel })} hideFooter>
      <div className="space-y-4">
        <form
          className="flex items-end gap-2"
          onSubmit={event => {
            event.preventDefault();
            addNote();
          }}
        >
          <label className="min-w-0 flex-1 text-xs font-semibold text-slate-500">
            {t('New note')}
            <textarea
              value={draft}
              onChange={event => setDraft(event.target.value)}
              rows={2}
              className="field mt-1 w-full resize-none"
              placeholder={t('New month note...')}
            />
          </label>
          <button type="submit" disabled={!draft.trim()} className="button-primary mb-0.5 h-10 w-10 p-0" title={t('Add month note')} aria-label={t('Add month note')}>
            <Plus className="h-4 w-4" />
          </button>
        </form>

        <div className="space-y-2">
          {notes.length === 0 ? (
            <p className="rounded-xl bg-slate-50 px-3 py-4 text-center text-sm italic text-slate-400">{t('No month notes yet.')}</p>
          ) : notes.map(note => (
            <article key={note.id} className="rounded-xl border border-violet-100 bg-violet-50/50 p-3">
              {editingId === note.id ? (
                <div className="space-y-2">
                  <textarea
                    autoFocus
                    value={editingText}
                    onChange={event => setEditingText(event.target.value)}
                    rows={3}
                    className="field w-full resize-none"
                  />
                  <div className="flex justify-end gap-2">
                    <button type="button" onClick={() => { setEditingId(null); setEditingText(''); }} className="button-secondary min-h-8 px-2.5 py-1.5 text-xs">
                      <X className="h-3.5 w-3.5" /> {t('Cancel')}
                    </button>
                    <button type="button" onClick={() => saveEdit(note.id)} disabled={!editingText.trim()} className="button-primary min-h-8 px-2.5 py-1.5 text-xs">
                      <Save className="h-3.5 w-3.5" /> {t('Save')}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-start gap-2">
                  <p className="min-w-0 flex-1 whitespace-pre-wrap break-words text-sm leading-relaxed text-slate-700">{note.text}</p>
                  <button type="button" onClick={() => { setEditingId(note.id); setEditingText(note.text); }} className="icon-button-compact" title={t('Edit note')} aria-label={t('Edit note')}>
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button type="button" onClick={() => dispatch({ type: 'DELETE_MONTH_NOTE', payload: { month, id: note.id } })} className="icon-button-compact text-red-500 hover:bg-red-50 hover:text-red-700" title={t('Delete note')} aria-label={t('Delete note')}>
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              )}
            </article>
          ))}
        </div>
      </div>
    </Modal>
  );
};
