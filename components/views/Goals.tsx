import React, { useState } from 'react';
import {
  Archive,
  Check,
  ChevronDown,
  CircleCheckBig,
  Pencil,
  Plus,
  RotateCcw,
  Save,
  Trash2,
  X,
} from 'lucide-react';
import { useAppStore } from '../../store';
import { GoalNote, LongTermGoal } from '../../types';
import { getDateString, getTodayString } from '../../utils';
import { ConfirmModal } from '../Modal';
import { useI18n } from '../../i18n';

const toDateInputValue = (timestamp: string): string => {
  const date = new Date(timestamp);
  return Number.isNaN(date.getTime()) ? '' : getDateString(date);
};

const replaceLocalDate = (timestamp: string, dateString: string): string | null => {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateString);
  if (!match) return null;
  const original = new Date(timestamp);
  const updated = new Date(
    Number(match[1]),
    Number(match[2]) - 1,
    Number(match[3]),
    Number.isNaN(original.getTime()) ? 12 : original.getHours(),
    Number.isNaN(original.getTime()) ? 0 : original.getMinutes(),
  );
  return Number.isNaN(updated.getTime()) ? null : updated.toISOString();
};

const GoalNoteRow: React.FC<{ goalId: string; note: GoalNote }> = ({ goalId, note }) => {
  const { dispatch } = useAppStore();
  const { locale, t } = useI18n();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(note.text);

  const save = () => {
    const text = draft.trim();
    if (!text) return;
    dispatch({ type: 'UPDATE_GOAL_NOTE', payload: { goalId, noteId: note.id, text } });
    setEditing(false);
  };

  return (
    <div className="rounded-lg border border-slate-100 bg-slate-50/80 p-2.5">
      {editing ? (
        <div className="space-y-2">
          <textarea
            autoFocus
            value={draft}
            onChange={event => setDraft(event.target.value)}
            rows={2}
            maxLength={500}
            className="w-full resize-none rounded border border-slate-300 bg-white p-2 text-sm outline-none focus:border-violet-500"
          />
          <div className="flex justify-end gap-1">
            <button type="button" onClick={() => setEditing(false)} className="rounded p-1.5 text-slate-500 hover:bg-white" title={t('Cancel')}>
              <X className="h-4 w-4" />
            </button>
            <button type="button" onClick={save} disabled={!draft.trim()} className="rounded p-1.5 text-violet-700 hover:bg-white disabled:opacity-40" title={t('Save note')}>
              <Save className="h-4 w-4" />
            </button>
          </div>
        </div>
      ) : (
        <div className="flex items-start gap-2">
          <div className="min-w-0 flex-1">
            <p className="whitespace-pre-wrap break-words text-sm text-slate-700">{note.text}</p>
            <time className="mt-1 block text-[10px] text-slate-400" dateTime={note.createdAt}>
              {new Date(note.createdAt).toLocaleDateString(locale)}
            </time>
          </div>
          <button type="button" onClick={() => setEditing(true)} className="rounded p-1 text-slate-400 hover:bg-white hover:text-violet-600" title={t('Edit note')}>
            <Pencil className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={() => dispatch({ type: 'DELETE_GOAL_NOTE', payload: { goalId, noteId: note.id } })}
            className="rounded p-1 text-slate-400 hover:bg-red-50 hover:text-red-600"
            title={t('Delete note')}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      )}
    </div>
  );
};

interface GoalCardProps {
  goal: LongTermGoal;
  onDelete: () => void;
}

const GoalCard: React.FC<GoalCardProps> = ({ goal, onDelete }) => {
  const { dispatch } = useAppStore();
  const { t } = useI18n();
  const [expanded, setExpanded] = useState(goal.status === 'active');
  const [editingTitle, setEditingTitle] = useState(false);
  const [title, setTitle] = useState(goal.title);
  const [currentState, setCurrentState] = useState(goal.currentState);
  const [nextStep, setNextStep] = useState(goal.nextStep);
  const [noteDraft, setNoteDraft] = useState('');

  const update = (updates: Partial<Omit<LongTermGoal, 'id' | 'notes'>>) => {
    dispatch({ type: 'UPDATE_GOAL', payload: { id: goal.id, ...updates } });
  };

  const saveTitle = () => {
    const value = title.trim();
    if (!value) return;
    update({ title: value });
    setEditingTitle(false);
  };

  const addNote = (event: React.FormEvent) => {
    event.preventDefault();
    if (!noteDraft.trim()) return;
    dispatch({ type: 'ADD_GOAL_NOTE', payload: { goalId: goal.id, text: noteDraft } });
    setNoteDraft('');
  };

  return (
    <article className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-start gap-2 p-3">
        <button
          type="button"
          onClick={() => setExpanded(value => !value)}
          className="mt-0.5 rounded p-1 text-slate-400 hover:bg-slate-50"
          aria-expanded={expanded}
          title={expanded ? t('Collapse goal') : t('Expand goal')}
        >
          <ChevronDown className={`h-4 w-4 transition-transform ${expanded ? 'rotate-180' : ''}`} />
        </button>
        <div className="min-w-0 flex-1">
          {editingTitle ? (
            <input
              autoFocus
              value={title}
              onChange={event => setTitle(event.target.value)}
              onKeyDown={event => {
                if (event.key === 'Enter') saveTitle();
                if (event.key === 'Escape') setEditingTitle(false);
              }}
              className="w-full rounded border border-violet-300 px-2 py-1 font-semibold text-slate-800 outline-none focus:ring-2 focus:ring-violet-100"
            />
          ) : (
            <h3 className={`break-words font-semibold ${goal.status === 'completed' ? 'text-slate-500 line-through' : 'text-slate-800'}`}>{goal.title}</h3>
          )}
          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-slate-400">
            <label className="flex items-center gap-1">
              <span>{t('Started')}</span>
              <input
                type="date"
                value={toDateInputValue(goal.createdAt)}
                max={goal.completedAt ? toDateInputValue(goal.completedAt) : getTodayString()}
                onChange={event => {
                  const createdAt = replaceLocalDate(goal.createdAt, event.target.value);
                  if (createdAt) update({ createdAt });
                }}
                className="rounded border border-slate-200 bg-white px-1 py-0.5 text-[11px] text-slate-600 outline-none focus:border-violet-400"
              />
            </label>
            {goal.status === 'completed' && goal.completedAt && (
              <label className="flex items-center gap-1">
                <span>{t('Finished')}</span>
                <input
                  type="date"
                  value={toDateInputValue(goal.completedAt)}
                  min={toDateInputValue(goal.createdAt)}
                  max={getTodayString()}
                  onChange={event => {
                    const completedAt = replaceLocalDate(goal.completedAt!, event.target.value);
                    if (completedAt) update({ completedAt });
                  }}
                  className="rounded border border-slate-200 bg-white px-1 py-0.5 text-[11px] text-slate-600 outline-none focus:border-violet-400"
                />
              </label>
            )}
          </div>
        </div>
        <button
          type="button"
          onClick={() => editingTitle ? saveTitle() : setEditingTitle(true)}
          disabled={editingTitle && !title.trim()}
          className="rounded p-1.5 text-slate-400 hover:bg-slate-50 hover:text-violet-600 disabled:opacity-40"
          title={editingTitle ? t('Save title') : t('Edit title')}
        >
          {editingTitle ? <Check className="h-4 w-4" /> : <Pencil className="h-4 w-4" />}
        </button>
        {goal.status === 'active' ? (
          <button
            type="button"
            onClick={() => dispatch({ type: 'COMPLETE_GOAL', payload: goal.id })}
            className="rounded p-1.5 text-slate-400 hover:bg-emerald-50 hover:text-emerald-600"
            title={t('Complete goal')}
          >
            <CircleCheckBig className="h-4 w-4" />
          </button>
        ) : (
          <button
            type="button"
            onClick={() => dispatch({ type: 'REOPEN_GOAL', payload: goal.id })}
            className="rounded p-1.5 text-slate-400 hover:bg-violet-50 hover:text-violet-600"
            title={t('Return to active goals')}
          >
            <RotateCcw className="h-4 w-4" />
          </button>
        )}
        {goal.status === 'active' && (
          <button
            type="button"
            onClick={() => dispatch({ type: 'ARCHIVE_GOAL', payload: goal.id })}
            className="rounded p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
            title={t('Archive goal')}
          >
            <Archive className="h-4 w-4" />
          </button>
        )}
        <button type="button" onClick={onDelete} className="rounded p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600" title={t('Delete goal')}>
          <Trash2 className="h-4 w-4" />
        </button>
      </div>

      {expanded && (
        <div className="space-y-4 border-t border-slate-100 p-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block text-xs font-semibold text-slate-500">
              {t('Current situation')}
              <textarea
                value={currentState}
                onChange={event => setCurrentState(event.target.value)}
                onBlur={() => update({ currentState: currentState.trim() })}
                rows={3}
                maxLength={500}
                placeholder={t('Where things stand now…')}
                className="mt-1 w-full resize-none rounded-lg border border-slate-200 p-2 text-sm font-normal text-slate-700 outline-none focus:border-violet-400 focus:ring-1 focus:ring-violet-200"
              />
            </label>
            <label className="block text-xs font-semibold text-slate-500">
              {t('Next step')}
              <textarea
                value={nextStep}
                onChange={event => setNextStep(event.target.value)}
                onBlur={() => update({ nextStep: nextStep.trim() })}
                rows={3}
                maxLength={500}
                placeholder={t('The next concrete action…')}
                className="mt-1 w-full resize-none rounded-lg border border-slate-200 p-2 text-sm font-normal text-slate-700 outline-none focus:border-violet-400 focus:ring-1 focus:ring-violet-200"
              />
            </label>
          </div>

          <div>
            <div className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500">{t('Progress notes')}</div>
            {goal.notes.length > 0 && (
              <div className="mb-2 space-y-2">
                {goal.notes.map(note => <GoalNoteRow key={note.id} goalId={goal.id} note={note} />)}
              </div>
            )}
            <form onSubmit={addNote} className="flex items-end gap-2">
              <label className="min-w-0 flex-1 text-xs font-semibold text-slate-500">
                {t('New note')}
                <textarea
                  value={noteDraft}
                  onChange={event => setNoteDraft(event.target.value)}
                  rows={2}
                  maxLength={500}
                  placeholder={t('Decision, update, result…')}
                  className="mt-1 w-full resize-none rounded-lg border border-slate-200 p-2 text-sm font-normal text-slate-700 outline-none focus:border-violet-400"
                />
              </label>
              <button
                type="submit"
                disabled={!noteDraft.trim()}
                className="mb-0.5 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-violet-600 text-white hover:bg-violet-700 disabled:opacity-40"
                title={t('Add note')}
              >
                <Plus className="h-4 w-4" />
              </button>
            </form>
          </div>
        </div>
      )}
    </article>
  );
};

export const GoalsView: React.FC = () => {
  const { state, dispatch } = useAppStore();
  const { t } = useI18n();
  const [draft, setDraft] = useState('');
  const [completedExpanded, setCompletedExpanded] = useState(false);
  const [archivedExpanded, setArchivedExpanded] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const active = state.goals.filter(goal => goal.status === 'active');
  const completed = state.goals.filter(goal => goal.status === 'completed');
  const archived = state.goals.filter(goal => goal.status === 'archived');

  const addGoal = (event: React.FormEvent) => {
    event.preventDefault();
    if (!draft.trim()) return;
    dispatch({ type: 'ADD_GOAL', payload: { title: draft } });
    setDraft('');
  };

  const renderSection = (
    title: string,
    goals: LongTermGoal[],
    expanded: boolean,
    setExpanded: React.Dispatch<React.SetStateAction<boolean>>,
  ) => goals.length > 0 && (
    <section className="space-y-2">
      <button
        type="button"
        onClick={() => setExpanded(value => !value)}
        className="flex w-full items-center justify-between rounded-lg px-2 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100"
        aria-expanded={expanded}
      >
        <span>{title} ({goals.length})</span>
        <ChevronDown className={`h-4 w-4 transition-transform ${expanded ? 'rotate-180' : ''}`} />
      </button>
      {expanded && <div className="space-y-3">{goals.map(goal => <GoalCard key={goal.id} goal={goal} onDelete={() => setDeleteId(goal.id)} />)}</div>}
    </section>
  );

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <header className="text-center">
        <div className="flex items-center justify-center gap-2">
          <h2 className="text-3xl font-bold text-slate-900">{t('Long-term goals')}</h2>
          <span className="rounded-full bg-violet-100 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-violet-700">{t('Experimental')}</span>
        </div>
        <p className="mt-1 text-sm text-slate-500">{t('Keep the destination, current situation and next step together.')}</p>
      </header>

      <form onSubmit={addGoal} className="flex gap-2 rounded-xl border border-violet-100 bg-white p-3 shadow-sm">
        <input
          value={draft}
          onChange={event => setDraft(event.target.value)}
          placeholder={t('Name a big goal…')}
          className="min-w-0 flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-200"
        />
        <button type="submit" disabled={!draft.trim()} className="inline-flex items-center gap-1.5 rounded-lg bg-violet-600 px-3 py-2 text-sm font-semibold text-white hover:bg-violet-700 disabled:opacity-40">
          <Plus className="h-4 w-4" /> {t('Add')}
        </button>
      </form>

      {active.length === 0 ? (
        <div className="rounded-xl border-2 border-dashed border-slate-200 px-4 py-10 text-center text-sm text-slate-400">
          {t('No active big goals yet.')}
        </div>
      ) : (
        <section className="space-y-3">{active.map(goal => <GoalCard key={goal.id} goal={goal} onDelete={() => setDeleteId(goal.id)} />)}</section>
      )}

      {renderSection(t('Completed'), completed, completedExpanded, setCompletedExpanded)}
      {renderSection(t('Archived'), archived, archivedExpanded, setArchivedExpanded)}

      <ConfirmModal
        isOpen={deleteId !== null}
        onClose={() => setDeleteId(null)}
        onConfirm={() => {
          if (deleteId) dispatch({ type: 'DELETE_GOAL', payload: deleteId });
          setDeleteId(null);
        }}
        title={t('Delete goal')}
        message={t('Delete this goal and all of its progress notes permanently?')}
        variant="danger"
        confirmText={t('Delete')}
      />
    </div>
  );
};
