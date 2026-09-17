import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Archive,
  CalendarDays,
  CalendarRange,
  Check,
  ChevronDown,
  CircleCheckBig,
  Flag,
  Link2Off,
  ListChecks,
  Pencil,
  Plus,
  RotateCcw,
  Save,
  SquareArrowOutUpRight,
  Trash2,
  X,
} from 'lucide-react';
import { useAppStore } from '../../store';
import { GoalNote, LongTermGoal, Task } from '../../types';
import { getTodayString } from '../../utils';
import { ConfirmModal } from '../Modal';
import { useI18n } from '../../i18n';
import { EmptyState } from '../ui/Primitives';
import { OptionalStartDateField, StartDateModeButton } from '../ui/OptionalStartDate';
import { replaceOptionalStartDate, toOptionalDateInputValue } from '../../optional-start-date';
import {
  buildGoalTask,
  defaultGoalTaskTarget,
  getGoalTaskCounts,
  isValidGoalTaskTarget,
  type GoalTaskHorizon,
} from '../../goal-tasks';
import { getTaskPlanningMonth, monthWeekOrderKey } from '../../month-planning';
import { yearMonthOrderKey } from '../../year-planning';

const taskDestinationLabel = (task: Task, locale: string, t: (key: string, variables?: Record<string, string | number>) => string): string => {
  if (task.plan.day) return new Date(`${task.plan.day}T12:00:00`).toLocaleDateString(locale, { day: 'numeric', month: 'short', year: 'numeric' });
  if (task.plan.week) return t('Week {week}', { week: task.plan.week.split('-W')[1] });
  if (task.plan.month) return new Date(`${task.plan.month}-01T12:00:00`).toLocaleDateString(locale, { month: 'long', year: 'numeric' });
  return task.plan.year ?? t('No planning period');
};

const taskDestinationView = (task: Task): 'today' | 'week' | 'month' | 'year' | 'done' => {
  if (task.status === 'done') return 'done';
  if (task.plan.day || task.plan.week) return task.plan.day === getTodayString() ? 'today' : 'week';
  if (task.plan.month) return 'month';
  return 'year';
};

const GoalTaskSheet: React.FC<{
  goal: LongTermGoal;
  initialTitle: string;
  onClose: () => void;
}> = ({ goal, initialTitle, onClose }) => {
  const { state, dispatch } = useAppStore();
  const { t } = useI18n();
  const today = getTodayString();
  const [title, setTitle] = useState(initialTitle);
  const [horizon, setHorizon] = useState<GoalTaskHorizon>('today');
  const [target, setTarget] = useState(today);

  const changeHorizon = (value: GoalTaskHorizon) => {
    setHorizon(value);
    setTarget(defaultGoalTaskTarget(value, today));
  };

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    const task = buildGoalTask({
      id: crypto.randomUUID(),
      goalId: goal.id,
      title,
      horizon,
      target,
      now: new Date().toISOString(),
    });
    if (!task) return;
    dispatch({ type: 'ADD_TASK', payload: task });
    if (task.plan.day) {
      dispatch({ type: 'UPDATE_TASK_ORDER', payload: {
        day: task.plan.day,
        order: [...(state.taskOrderByDay[task.plan.day] ?? []), task.id],
      } });
    } else if (task.plan.week) {
      dispatch({ type: 'UPDATE_TASK_ORDER_WEEK_BUCKET', payload: {
        week: task.plan.week,
        order: [...(state.taskOrderByWeekBucket[task.plan.week] ?? []), task.id],
      } });
      const month = getTaskPlanningMonth(task);
      if (month) dispatch({ type: 'UPDATE_TASK_ORDER_MONTH_WEEK', payload: {
        key: monthWeekOrderKey(month, task.plan.week),
        order: [...(state.taskOrderByMonthWeek[monthWeekOrderKey(month, task.plan.week)] ?? []), task.id],
      } });
    } else if (task.plan.month) {
      dispatch({ type: 'UPDATE_TASK_ORDER_MONTH_BUCKET', payload: {
        month: task.plan.month,
        order: [...(state.taskOrderByMonthBucket[task.plan.month] ?? []), task.id],
      } });
      dispatch({ type: 'UPDATE_TASK_ORDER_YEAR_MONTH', payload: {
        key: yearMonthOrderKey(task.plan.year!, task.plan.month),
        order: [...(state.taskOrderByYearMonth[yearMonthOrderKey(task.plan.year!, task.plan.month)] ?? []), task.id],
      } });
    } else if (task.plan.year) {
      dispatch({ type: 'UPDATE_TASK_ORDER_YEAR_BUCKET', payload: {
        year: task.plan.year,
        order: [...(state.taskOrderByYearBucket[task.plan.year] ?? []), task.id],
      } });
    }
    onClose();
  };

  const targetInput = horizon === 'today'
    ? <input type="date" value={target} min={today} onChange={event => setTarget(event.target.value)} className="field w-full" aria-label={t('Task day')} />
    : horizon === 'week'
      ? <input type="week" value={target} min={defaultGoalTaskTarget('week', today)} onChange={event => setTarget(event.target.value)} className="field w-full" aria-label={t('Task week')} />
      : horizon === 'month'
        ? <input type="month" value={target} min={today.slice(0, 7)} onChange={event => setTarget(event.target.value)} className="field w-full" aria-label={t('Task month')} />
        : <input type="number" min={Number(today.slice(0, 4))} max="2100" value={target} onChange={event => setTarget(event.target.value)} className="field w-full" aria-label={t('Task year')} />;

  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <form className="sheet-panel sm:w-[460px]" onSubmit={submit} onClick={event => event.stopPropagation()} role="dialog" aria-modal="true" aria-label={t('Create task for goal')}>
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="font-semibold text-slate-800">{t('Create task for goal')}</h2>
            <p className="mt-0.5 text-xs text-slate-500">{goal.title}</p>
          </div>
          <button type="button" className="text-sm text-slate-400" onClick={onClose}>{t('Close')}</button>
        </div>
        <label className="block text-xs font-semibold text-slate-500">
          {t('Task title')}
          <textarea value={title} onChange={event => setTitle(event.target.value)} rows={2} className="field mt-1 w-full resize-none font-normal" autoFocus />
        </label>
        <label className="block text-xs font-semibold text-slate-500">
          {t('Planning horizon')}
          <select value={horizon} onChange={event => changeHorizon(event.target.value as GoalTaskHorizon)} className="field mt-1 w-full font-normal">
            <option value="today">{t('Today')}</option>
            <option value="week">{t('Week')}</option>
            <option value="month">{t('Month')}</option>
            <option value="year">{t('Year')}</option>
          </select>
        </label>
        {targetInput}
        <div className="flex gap-2">
          <button type="button" className="button-secondary flex-1" onClick={onClose}>{t('Cancel')}</button>
          <button type="submit" className="button-primary flex-1" disabled={!title.trim() || !isValidGoalTaskTarget(horizon, target)}>{t('Create task')}</button>
        </div>
      </form>
    </div>
  );
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
  linkedTasks: Task[];
  highlighted: boolean;
  onDelete: () => void;
}

const GoalCard: React.FC<GoalCardProps> = ({ goal, linkedTasks, highlighted, onDelete }) => {
  const { dispatch } = useAppStore();
  const { locale, t } = useI18n();
  const cardRef = useRef<HTMLElement>(null);
  const [expanded, setExpanded] = useState(goal.status === 'active');
  const [editingTitle, setEditingTitle] = useState(false);
  const [title, setTitle] = useState(goal.title);
  const [why, setWhy] = useState(goal.why);
  const [currentState, setCurrentState] = useState(goal.currentState);
  const [nextStep, setNextStep] = useState(goal.nextStep);
  const [noteDraft, setNoteDraft] = useState('');
  const [taskSheetOpen, setTaskSheetOpen] = useState(false);
  const counts = getGoalTaskCounts(linkedTasks, goal.id);
  const sortedLinkedTasks = [...linkedTasks].sort((left, right) => {
    if (left.status !== right.status) return left.status === 'todo' ? -1 : 1;
    return Date.parse(right.updatedAt) - Date.parse(left.updatedAt);
  });

  useEffect(() => {
    if (!highlighted) return;
    setExpanded(true);
    window.requestAnimationFrame(() => cardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }));
  }, [highlighted]);

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
    <article
      ref={cardRef}
      data-goal-id={goal.id}
      className={`surface-card transition-shadow ${highlighted ? 'ring-2 ring-brand-300 ring-offset-2' : ''}`}
    >
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
              className="field-compact w-full font-semibold"
            />
          ) : (
            <h3 className={`break-words font-semibold ${goal.status === 'completed' ? 'text-slate-500 line-through' : 'text-slate-800'}`}>{goal.title}</h3>
          )}
          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-slate-400">
            <OptionalStartDateField
              value={goal.startedAt}
              label={t('Started')}
              ariaLabel={t('Start date for {title}', { title: goal.title })}
              max={goal.completedAt ? toOptionalDateInputValue(goal.completedAt) : getTodayString()}
              onChange={startedAt => update({ startedAt })}
            />
            {goal.status === 'completed' && goal.completedAt && (
              <label className="flex items-center gap-1">
                <span>{t('Finished')}</span>
                <input
                  type="date"
                  value={toOptionalDateInputValue(goal.completedAt)}
                  min={toOptionalDateInputValue(goal.startedAt)}
                  max={getTodayString()}
                  onChange={event => {
                    const completedAt = replaceOptionalStartDate(goal.completedAt, event.target.value);
                    if (completedAt) update({ completedAt });
                  }}
                  className="rounded border border-slate-200 bg-white px-1 py-0.5 text-[11px] text-slate-600 outline-none focus:border-violet-400"
                />
              </label>
            )}
            <span className="inline-flex items-center gap-1 text-slate-500">
              <Flag className="h-3 w-3 text-brand-500" aria-hidden="true" />
              {t('{active} active • {completed} done', { active: counts.active, completed: counts.completed })}
            </span>
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
          <label className="block text-xs font-semibold text-slate-500">
            {t('Why')}
            <textarea
              value={why}
              onChange={event => setWhy(event.target.value)}
              onBlur={() => update({ why: why.trim() })}
              rows={3}
              maxLength={1000}
              placeholder={t('Why this goal matters…')}
              className="field mt-1 w-full resize-y font-normal"
            />
          </label>
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
                className="field mt-1 w-full resize-none font-normal"
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
                className="field mt-1 w-full resize-none font-normal"
              />
              <button
                type="button"
                onClick={() => setTaskSheetOpen(true)}
                disabled={!nextStep.trim()}
                className="button-secondary mt-2 w-full justify-center text-xs disabled:opacity-40"
              >
                <ListChecks className="h-4 w-4" aria-hidden="true" />
                {t('Create task from next step')}
              </button>
            </label>
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between gap-2">
              <div className="text-xs font-bold uppercase tracking-wide text-slate-500">{t('Linked tasks')}</div>
              <span className="text-[11px] text-slate-400">{t('{active} active • {completed} done', { active: counts.active, completed: counts.completed })}</span>
            </div>
            {sortedLinkedTasks.length === 0 ? (
              <p className="rounded-xl border border-dashed border-slate-200 px-3 py-4 text-center text-xs text-slate-400">{t('No linked tasks yet.')}</p>
            ) : (
              <div className="space-y-1.5">
                {sortedLinkedTasks.map(task => (
                  <div key={task.id} className="flex items-center gap-2 rounded-xl border border-slate-100 bg-slate-50/80 px-2.5 py-2">
                    {task.status === 'done'
                      ? <CircleCheckBig className="h-4 w-4 flex-shrink-0 text-emerald-500" aria-hidden="true" />
                      : task.plan.day
                        ? <CalendarDays className="h-4 w-4 flex-shrink-0 text-brand-500" aria-hidden="true" />
                        : <CalendarRange className="h-4 w-4 flex-shrink-0 text-brand-500" aria-hidden="true" />}
                    <div className="min-w-0 flex-1">
                      <p className={`break-words text-sm ${task.status === 'done' ? 'text-slate-950 line-through' : 'text-slate-700'}`}>{task.title}</p>
                      <p className="text-[10px] text-slate-400">{taskDestinationLabel(task, locale, t)}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => dispatch({ type: 'SET_VIEW', payload: taskDestinationView(task) })}
                      className="rounded-lg p-1.5 text-slate-400 hover:bg-white hover:text-brand-600"
                      title={t('Open task location')}
                      aria-label={t('Open task location')}
                    >
                      <SquareArrowOutUpRight className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => dispatch({ type: 'UPDATE_TASK', payload: { id: task.id, goalId: null } })}
                      className="rounded-lg p-1.5 text-slate-400 hover:bg-white hover:text-red-600"
                      title={t('Unlink from goal')}
                      aria-label={t('Unlink from goal')}
                    >
                      <Link2Off className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
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
                  className="field mt-1 w-full resize-none font-normal"
                />
              </label>
              <button
                type="submit"
                disabled={!noteDraft.trim()}
                className="composer-submit mb-0.5 h-9 w-9"
                title={t('Add note')}
              >
                <Plus className="h-4 w-4" />
              </button>
            </form>
          </div>
        </div>
      )}
      {taskSheetOpen && <GoalTaskSheet goal={goal} initialTitle={nextStep} onClose={() => setTaskSheetOpen(false)} />}
    </article>
  );
};

export const GoalsView: React.FC = () => {
  const { state, dispatch } = useAppStore();
  const { t } = useI18n();
  const [draft, setDraft] = useState('');
  const [startDateUnknown, setStartDateUnknown] = useState(false);
  const [completedExpanded, setCompletedExpanded] = useState(false);
  const [archivedExpanded, setArchivedExpanded] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const active = state.goals.filter(goal => goal.status === 'active');
  const completed = state.goals.filter(goal => goal.status === 'completed');
  const archived = state.goals.filter(goal => goal.status === 'archived');
  const targetGoal = state.goalNavigationTargetId
    ? state.goals.find(goal => goal.id === state.goalNavigationTargetId)
    : null;
  const tasksByGoal = useMemo(() => {
    const groups = new Map<string, Task[]>();
    state.tasks.forEach(task => {
      if (!task.goalId) return;
      groups.set(task.goalId, [...(groups.get(task.goalId) ?? []), task]);
    });
    return groups;
  }, [state.tasks]);

  useEffect(() => {
    if (targetGoal?.status === 'completed') setCompletedExpanded(true);
    if (targetGoal?.status === 'archived') setArchivedExpanded(true);
  }, [targetGoal?.id, targetGoal?.status]);

  const addGoal = (event: React.FormEvent) => {
    event.preventDefault();
    if (!draft.trim()) return;
    dispatch({ type: 'ADD_GOAL', payload: { title: draft, startDateKnown: !startDateUnknown } });
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
        className="disclosure-button px-2 py-2 text-slate-600"
        aria-expanded={expanded}
      >
        <span>{title} ({goals.length})</span>
        <ChevronDown className={`h-4 w-4 transition-transform ${expanded ? 'rotate-180' : ''}`} />
      </button>
      {expanded && <div className="space-y-3">{goals.map(goal => (
        <GoalCard
          key={goal.id}
          goal={goal}
          linkedTasks={tasksByGoal.get(goal.id) ?? []}
          highlighted={state.goalNavigationTargetId === goal.id}
          onDelete={() => setDeleteId(goal.id)}
        />
      ))}</div>}
    </section>
  );

  return (
    <div className="page-container space-y-4">
      <form onSubmit={addGoal} className="section-card flex flex-wrap gap-2">
        <input
          value={draft}
          onChange={event => setDraft(event.target.value)}
          placeholder={t('Name a big goal…')}
          className="field min-w-0 flex-1"
        />
        <StartDateModeButton unknown={startDateUnknown} onChange={setStartDateUnknown} />
        <button type="submit" disabled={!draft.trim()} className="button-primary px-3" title={t('Add')} aria-label={t('Add')}>
          <Plus className="h-4 w-4" /> <span className="hidden sm:inline">{t('Add')}</span>
        </button>
      </form>

      {active.length === 0 ? (
        <EmptyState className="py-10">
          {t('No active big goals yet.')}
        </EmptyState>
      ) : (
        <section className="space-y-3">{active.map(goal => (
          <GoalCard
            key={goal.id}
            goal={goal}
            linkedTasks={tasksByGoal.get(goal.id) ?? []}
            highlighted={state.goalNavigationTargetId === goal.id}
            onDelete={() => setDeleteId(goal.id)}
          />
        ))}</section>
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
        message={t('Delete this goal and all of its progress notes permanently? Linked tasks will stay in the planner and become unlinked.')}
        variant="danger"
        confirmText={t('Delete')}
      />
    </div>
  );
};
