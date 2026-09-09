import React, { useEffect, useState } from 'react';
import { NotebookPen, Pencil, Plus, Save, Trash2, X } from 'lucide-react';
import { useAppStore } from '../store';
import { useI18n } from '../i18n';
import { Modal } from './Modal';

type YearMetaBadgesProps = {
  year: string;
  onEdit?: () => void;
  maxNotes?: number;
  className?: string;
  showNotes?: boolean;
  showEditor?: boolean;
};

export const YearMetaBadges: React.FC<YearMetaBadgesProps> = ({
  year,
  onEdit,
  maxNotes = 2,
  className = '',
  showNotes = true,
  showEditor = true,
}) => {
  const { state } = useAppStore();
  const { t } = useI18n();
  const notes = state.yearNotes[year] ?? [];
  const visibleNotes = notes.slice(0, maxNotes);
  const hiddenCount = Math.max(0, notes.length - visibleNotes.length);

  return (
    <div className={`flex min-w-0 flex-wrap items-center gap-1.5 ${className}`}>
      {showNotes && visibleNotes.map(note => (
        <button
          key={note.id}
          type="button"
          onClick={onEdit}
          className="inline-flex max-w-[16rem] min-w-0 items-center gap-1 rounded bg-violet-50 px-2 py-1 text-[10px] font-semibold text-violet-800 hover:bg-violet-100"
          title={note.text}
        >
          <NotebookPen className="h-3 w-3 flex-shrink-0" />
          <span className="truncate">{note.text}</span>
        </button>
      ))}
      {showNotes && hiddenCount > 0 && (
        <button type="button" onClick={onEdit} className="rounded bg-violet-100 px-1.5 py-0.5 text-[9px] font-semibold text-violet-800">
          +{hiddenCount}
        </button>
      )}
      {showEditor && onEdit && (
        <button
          type="button"
          onClick={onEdit}
          className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded text-violet-700 hover:bg-violet-50"
          title={notes.length ? t('Edit year notes') : t('Add year note')}
          aria-label={notes.length ? t('Edit year notes') : t('Add year note')}
        >
          <NotebookPen className="h-4 w-4" />
        </button>
      )}
    </div>
  );
};

type YearNotesEditorProps = { year: string | null; onClose: () => void };

export const YearNotesEditor: React.FC<YearNotesEditorProps> = ({ year, onClose }) => {
  const { state, dispatch } = useAppStore();
  const { t } = useI18n();
  const [draft, setDraft] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState('');

  useEffect(() => {
    setDraft('');
    setEditingId(null);
    setEditingText('');
  }, [year]);

  if (!year) return null;
  const notes = state.yearNotes[year] ?? [];

  const saveEdit = (id: string) => {
    if (!editingText.trim()) return;
    dispatch({ type: 'UPDATE_YEAR_NOTE', payload: { year, id, text: editingText } });
    setEditingId(null);
    setEditingText('');
  };

  return (
    <Modal isOpen onClose={onClose} title={t('Notes for {year}', { year })} hideFooter>
      <div className="space-y-4">
        <form
          className="flex items-end gap-2"
          onSubmit={event => {
            event.preventDefault();
            if (!draft.trim()) return;
            dispatch({ type: 'ADD_YEAR_NOTE', payload: { year, text: draft } });
            setDraft('');
          }}
        >
          <label className="min-w-0 flex-1 text-xs font-semibold text-slate-500">
            {t('New note')}
            <textarea value={draft} onChange={event => setDraft(event.target.value)} rows={2} className="field mt-1 w-full resize-none" placeholder={t('New year note...')} />
          </label>
          <button type="submit" disabled={!draft.trim()} className="button-primary mb-0.5 h-10 w-10 p-0" title={t('Add year note')} aria-label={t('Add year note')}>
            <Plus className="h-4 w-4" />
          </button>
        </form>
        <div className="space-y-2">
          {notes.length === 0 ? (
            <p className="rounded-xl bg-slate-50 px-3 py-4 text-center text-sm italic text-slate-400">{t('No year notes yet.')}</p>
          ) : notes.map(note => (
            <article key={note.id} className="rounded-xl border border-violet-100 bg-violet-50/50 p-3">
              {editingId === note.id ? (
                <div className="space-y-2">
                  <textarea autoFocus value={editingText} onChange={event => setEditingText(event.target.value)} rows={3} className="field w-full resize-none" />
                  <div className="flex justify-end gap-2">
                    <button type="button" onClick={() => { setEditingId(null); setEditingText(''); }} className="button-secondary min-h-8 px-2.5 py-1.5 text-xs"><X className="h-3.5 w-3.5" /> {t('Cancel')}</button>
                    <button type="button" onClick={() => saveEdit(note.id)} disabled={!editingText.trim()} className="button-primary min-h-8 px-2.5 py-1.5 text-xs"><Save className="h-3.5 w-3.5" /> {t('Save')}</button>
                  </div>
                </div>
              ) : (
                <div className="flex items-start gap-2">
                  <p className="min-w-0 flex-1 whitespace-pre-wrap break-words text-sm leading-relaxed text-slate-700">{note.text}</p>
                  <button type="button" onClick={() => { setEditingId(note.id); setEditingText(note.text); }} className="icon-button-compact" title={t('Edit note')} aria-label={t('Edit note')}><Pencil className="h-4 w-4" /></button>
                  <button type="button" onClick={() => dispatch({ type: 'DELETE_YEAR_NOTE', payload: { year, id: note.id } })} className="icon-button-compact text-red-500 hover:bg-red-50 hover:text-red-700" title={t('Delete note')} aria-label={t('Delete note')}><Trash2 className="h-4 w-4" /></button>
                </div>
              )}
            </article>
          ))}
        </div>
      </div>
    </Modal>
  );
};
