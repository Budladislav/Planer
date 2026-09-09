import React, { useMemo, useState } from 'react';
import {
  DndContext,
  DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  closestCenter,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import { arrayMove, sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import { ChevronDown, ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import { useAppStore } from '../../store';
import { Task } from '../../types';
import { generateId, getTodayString } from '../../utils';
import {
  getTaskPlanningYear,
  getYearMonths,
  isValidYearString,
  partitionYearMonths,
  planTaskForYear,
  yearMonthOrderKey,
} from '../../year-planning';
import { getTaskPlanningMonth } from '../../month-planning';
import { completeTask, deleteTask } from '../../task-lifecycle';
import { useI18n } from '../../i18n';
import { ConfirmModal } from '../Modal';
import { MonthMetaBadges, MonthNotesEditor } from '../MonthNotes';
import { YearMetaBadges, YearNotesEditor } from '../YearNotes';
import { PeriodTaskCard, PeriodTaskContainer } from '../planning/PeriodTaskCard';
import { RewardsBalancePill } from '../../features/rewards-lab/ui/RewardsBalancePill';

const poolContainer = (year: string): string => `year-pool:${year}`;
const monthContainer = (month: string): string => `year-month:${month}`;

const applyOrder = (tasks: Task[], savedOrder: string[] | undefined): Task[] => {
  if (!savedOrder?.length) return tasks;
  const taskMap = new Map(tasks.map(task => [task.id, task]));
  const ordered = savedOrder.flatMap(id => {
    const task = taskMap.get(id);
    if (!task) return [];
    taskMap.delete(id);
    return [task];
  });
  return [...ordered, ...taskMap.values()];
};

export const YearView: React.FC = () => {
  const { state, dispatch } = useAppStore();
  const { locale, t } = useI18n();
  const today = getTodayString();
  const currentCalendarMonth = today.slice(0, 7);
  const [currentYear, setCurrentYear] = useState(today.slice(0, 4));
  const [moveTaskId, setMoveTaskId] = useState<string | null>(null);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editYear, setEditYear] = useState(currentYear);
  const [quickAddTarget, setQuickAddTarget] = useState<string | null | undefined>(undefined);
  const [quickAddTitle, setQuickAddTitle] = useState('');
  const [deleteTaskId, setDeleteTaskId] = useState<string | null>(null);
  const [notesEditorYear, setNotesEditorYear] = useState<string | null>(null);
  const [notesEditorMonth, setNotesEditorMonth] = useState<string | null>(null);
  const [pastMonthsExpanded, setPastMonthsExpanded] = useState(false);

  const months = useMemo(() => getYearMonths(currentYear), [currentYear]);
  const { pastMonths, currentAndFutureMonths } = useMemo(
    () => partitionYearMonths(months, currentCalendarMonth),
    [currentCalendarMonth, months],
  );
  const todoTasks = useMemo(
    () => state.tasks.filter(task => task.status === 'todo' && getTaskPlanningYear(task) === currentYear),
    [currentYear, state.tasks],
  );
  const doneTasks = useMemo(
    () => state.tasks.filter(task => task.status === 'done' && getTaskPlanningYear(task) === currentYear),
    [currentYear, state.tasks],
  );
  const yearPoolTasks = useMemo(
    () => applyOrder(todoTasks.filter(task => !getTaskPlanningMonth(task)), state.taskOrderByYearBucket[currentYear]),
    [currentYear, state.taskOrderByYearBucket, todoTasks],
  );
  const tasksByMonth = useMemo(() => Object.fromEntries(months.map(month => [
    month,
    applyOrder(
      todoTasks.filter(task => getTaskPlanningMonth(task) === month),
      state.taskOrderByYearMonth[yearMonthOrderKey(currentYear, month)],
    ),
  ])) as Record<string, Task[]>, [currentYear, months, state.taskOrderByYearMonth, todoTasks]);
  const containerByTask = useMemo(() => {
    const map = new Map<string, string>();
    yearPoolTasks.forEach(task => map.set(task.id, poolContainer(currentYear)));
    months.forEach(month => tasksByMonth[month]?.forEach(task => map.set(task.id, monthContainer(month))));
    return map;
  }, [currentYear, months, tasksByMonth, yearPoolTasks]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const tasksForContainer = (containerId: string): Task[] => {
    if (containerId.startsWith('year-pool:')) return yearPoolTasks;
    return tasksByMonth[containerId.slice('year-month:'.length)] ?? [];
  };

  const saveContainerOrder = (containerId: string, order: string[]) => {
    if (containerId.startsWith('year-pool:')) {
      dispatch({ type: 'UPDATE_TASK_ORDER_YEAR_BUCKET', payload: { year: currentYear, order } });
      return;
    }
    const month = containerId.slice('year-month:'.length);
    dispatch({ type: 'UPDATE_TASK_ORDER_YEAR_MONTH', payload: { key: yearMonthOrderKey(currentYear, month), order } });
    dispatch({ type: 'UPDATE_TASK_ORDER_MONTH_BUCKET', payload: { month, order } });
  };

  const moveTaskTo = (taskId: string, targetMonth: string | null) => {
    const task = state.tasks.find(item => item.id === taskId);
    if (!task) return;
    dispatch({
      type: 'UPDATE_TASK',
      payload: {
        id: taskId,
        plan: targetMonth
          ? { year: currentYear, month: targetMonth, week: null, day: null }
          : { year: currentYear, month: null, week: null, day: null },
      },
    });
    if (targetMonth) {
      const ids = (tasksByMonth[targetMonth] ?? []).map(item => item.id).filter(id => id !== taskId);
      dispatch({ type: 'UPDATE_TASK_ORDER_YEAR_MONTH', payload: { key: yearMonthOrderKey(currentYear, targetMonth), order: [...ids, taskId] } });
      const monthIds = (state.taskOrderByMonthBucket[targetMonth] ?? []).filter(id => id !== taskId);
      dispatch({ type: 'UPDATE_TASK_ORDER_MONTH_BUCKET', payload: { month: targetMonth, order: [...monthIds, taskId] } });
    } else {
      const ids = yearPoolTasks.map(item => item.id).filter(id => id !== taskId);
      dispatch({ type: 'UPDATE_TASK_ORDER_YEAR_BUCKET', payload: { year: currentYear, order: [...ids, taskId] } });
    }
    setMoveTaskId(null);
  };

  const handleDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over) return;
    const activeId = String(active.id);
    const overId = String(over.id);
    const source = containerByTask.get(activeId);
    const target = overId.startsWith('year-pool:') || overId.startsWith('year-month:')
      ? overId
      : containerByTask.get(overId);
    if (!source || !target) return;
    if (source === target) {
      const tasks = tasksForContainer(source);
      const oldIndex = tasks.findIndex(task => task.id === activeId);
      const newIndex = tasks.findIndex(task => task.id === overId);
      if (oldIndex === -1 || newIndex === -1 || oldIndex === newIndex) return;
      saveContainerOrder(source, arrayMove(tasks, oldIndex, newIndex).map(task => task.id));
      return;
    }
    moveTaskTo(activeId, target.startsWith('year-month:') ? target.slice('year-month:'.length) : null);
  };

  const openEditor = (task: Task) => {
    setEditingTask(task);
    setEditTitle(task.title);
    setEditYear(getTaskPlanningYear(task) ?? currentYear);
  };

  const saveEdit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!editingTask || !editTitle.trim() || !isValidYearString(editYear)) return;
    dispatch({
      type: 'UPDATE_TASK',
      payload: { id: editingTask.id, title: editTitle.trim(), plan: planTaskForYear(editingTask, editYear) },
    });
    setEditingTask(null);
  };

  const addTask = (event: React.FormEvent) => {
    event.preventDefault();
    if (!quickAddTitle.trim() || quickAddTarget === undefined) return;
    const id = generateId();
    const targetMonth = quickAddTarget;
    dispatch({
      type: 'ADD_TASK',
      payload: {
        id,
        title: quickAddTitle.trim(),
        status: 'todo',
        plan: { year: currentYear, month: targetMonth, week: null, day: null },
        projectId: null,
        eventId: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        completedAt: null,
      },
    });
    if (targetMonth) {
      const ids = (tasksByMonth[targetMonth] ?? []).map(task => task.id);
      dispatch({ type: 'UPDATE_TASK_ORDER_YEAR_MONTH', payload: { key: yearMonthOrderKey(currentYear, targetMonth), order: [...ids, id] } });
      dispatch({ type: 'UPDATE_TASK_ORDER_MONTH_BUCKET', payload: { month: targetMonth, order: [...(state.taskOrderByMonthBucket[targetMonth] ?? []), id] } });
    } else {
      dispatch({ type: 'UPDATE_TASK_ORDER_YEAR_BUCKET', payload: { year: currentYear, order: [...yearPoolTasks.map(task => task.id), id] } });
    }
    setQuickAddTitle('');
    setQuickAddTarget(undefined);
  };

  const changeYear = (delta: number) => {
    const next = Math.min(2100, Math.max(2020, Number(currentYear) + delta));
    setCurrentYear(String(next));
    setPastMonthsExpanded(false);
  };

  const renderTask = (task: Task, containerId: string) => (
    <PeriodTaskCard
      key={task.id}
      task={task}
      containerId={containerId}
      onMove={setMoveTaskId}
      onEdit={openEditor}
      onComplete={() => completeTask(dispatch, task)}
      onDelete={setDeleteTaskId}
    />
  );

  const renderMonth = (month: string) => {
    const tasks = tasksByMonth[month] ?? [];
    const label = new Date(`${month}-01T12:00:00`).toLocaleDateString(locale, { month: 'long' });
    return (
      <section key={month} className="section-card p-2">
        <div className="mb-1 flex min-w-0 items-center gap-2 px-1">
          <h3 className="min-w-0 flex-1 truncate text-sm font-semibold capitalize text-slate-700">{label}</h3>
          <MonthMetaBadges month={month} onEdit={() => setNotesEditorMonth(month)} maxNotes={1} compact className="min-w-0" />
          <button type="button" onClick={() => setQuickAddTarget(month)} className="icon-button-compact h-7 w-7 text-brand-600 hover:bg-brand-50" title={t('Add task to {month}', { month: label })}>
            <Plus className="h-4 w-4" />
          </button>
        </div>
        <PeriodTaskContainer id={monthContainer(month)} tasks={tasks} emptyText={t('Drop a year task into this month')}>
          {tasks.map(task => renderTask(task, monthContainer(month)))}
        </PeriodTaskContainer>
      </section>
    );
  };

  return (
    <div className="page-container">
      <div className="mb-2 flex min-h-10 flex-wrap items-center justify-center gap-2 text-sm text-muted">
        <YearMetaBadges year={currentYear} onEdit={() => setNotesEditorYear(currentYear)} showNotes={false} />
        <span>{t('{todo} left • {done} done', { todo: todoTasks.length, done: doneTasks.length })}</span>
        <RewardsBalancePill />
      </div>
      {(state.yearNotes[currentYear]?.length ?? 0) > 0 && (
        <YearMetaBadges year={currentYear} onEdit={() => setNotesEditorYear(currentYear)} maxNotes={2} showEditor={false} className="mb-2 justify-center" />
      )}
      <div className="period-switcher">
        <button type="button" onClick={() => changeYear(-1)} disabled={currentYear === '2020'} className="icon-button" title={t('Previous year')}><ChevronLeft className="h-5 w-5" /></button>
        <div className="font-semibold text-slate-700">{currentYear}</div>
        <button type="button" onClick={() => changeYear(1)} disabled={currentYear === '2100'} className="icon-button" title={t('Next year')}><ChevronRight className="h-5 w-5" /></button>
      </div>

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <section className="section-card border-dashed p-2">
          <div className="mb-1 flex items-center justify-between px-1">
            <h3 className="text-sm font-semibold text-slate-600">{t('Year tasks (no month)')}</h3>
            <button type="button" onClick={() => setQuickAddTarget(null)} className="icon-button-compact h-7 w-7 text-brand-600 hover:bg-brand-50" title={t('Add year task')}><Plus className="h-4 w-4" /></button>
          </div>
          <PeriodTaskContainer id={poolContainer(currentYear)} tasks={yearPoolTasks} emptyText={t('Drop tasks here to choose their month later')}>
            {yearPoolTasks.map(task => renderTask(task, poolContainer(currentYear)))}
          </PeriodTaskContainer>
        </section>
        <div className="mt-3 space-y-2">
          {pastMonths.length > 0 && (
            <div className="surface-card bg-slate-50/60 p-1.5 shadow-none">
              <button type="button" aria-expanded={pastMonthsExpanded} onClick={() => setPastMonthsExpanded(value => !value)} className="disclosure-button py-2 text-slate-500">
                <span>{t('Past months ({count})', { count: pastMonths.length })}</span>
                <ChevronDown className={`h-4 w-4 transition-transform ${pastMonthsExpanded ? 'rotate-180' : ''}`} />
              </button>
              {pastMonthsExpanded && <div className="mt-1.5 space-y-2">{pastMonths.map(renderMonth)}</div>}
            </div>
          )}
          {currentAndFutureMonths.map(renderMonth)}
        </div>
      </DndContext>

      {moveTaskId && (
        <div className="sheet-backdrop" onClick={() => setMoveTaskId(null)}>
          <div className="sheet-panel sm:w-[440px]" onClick={event => event.stopPropagation()}>
            <div className="flex items-center justify-between"><h3 className="font-semibold text-slate-800">{t('Where to move task?')}</h3><button type="button" onClick={() => setMoveTaskId(null)} className="text-sm text-slate-400">{t('Close')}</button></div>
            <div className="grid max-h-[60vh] grid-cols-2 gap-2 overflow-y-auto">
              <button type="button" onClick={() => moveTaskTo(moveTaskId, null)} className="button-secondary h-auto justify-start p-3 text-left">{t('Year pool')}</button>
              {months.map(month => {
                const label = new Date(`${month}-01T12:00:00`).toLocaleDateString(locale, { month: 'long' });
                return <button type="button" key={month} onClick={() => moveTaskTo(moveTaskId, month)} className="button-secondary h-auto justify-start p-3 text-left capitalize">{label}</button>;
              })}
            </div>
          </div>
        </div>
      )}

      {quickAddTarget !== undefined && (
        <div className="sheet-backdrop" onClick={() => setQuickAddTarget(undefined)}>
          <form onSubmit={addTask} className="sheet-panel sm:w-[440px]" onClick={event => event.stopPropagation()}>
            <h3 className="font-semibold text-slate-800">{quickAddTarget
              ? t('Add task to {month}', { month: new Date(`${quickAddTarget}-01T12:00:00`).toLocaleDateString(locale, { month: 'long' }) })
              : t('Add task to {year}', { year: currentYear })}
            </h3>
            <input autoFocus required value={quickAddTitle} onChange={event => setQuickAddTitle(event.target.value)} className="field w-full" placeholder={t('Task title...')} />
            <div className="flex justify-end gap-2"><button type="button" onClick={() => setQuickAddTarget(undefined)} className="button-secondary">{t('Cancel')}</button><button type="submit" className="button-primary">{t('Add')}</button></div>
          </form>
        </div>
      )}

      {editingTask && (
        <div className="sheet-backdrop" onClick={() => setEditingTask(null)}>
          <form onSubmit={saveEdit} className="sheet-panel sm:w-[440px]" onClick={event => event.stopPropagation()}>
            <h3 className="font-semibold text-slate-800">{t('Edit task')}</h3>
            <textarea autoFocus required rows={2} value={editTitle} onChange={event => setEditTitle(event.target.value)} className="field w-full resize-none" />
            <label className="block text-xs font-medium text-slate-500">{t('Planning year')}<input type="number" min="2020" max="2100" value={editYear} onChange={event => setEditYear(event.target.value)} className="field mt-1 block w-full" /></label>
            <div className="flex justify-end gap-2"><button type="button" onClick={() => setEditingTask(null)} className="button-secondary">{t('Cancel')}</button><button type="submit" className="button-primary">{t('Save')}</button></div>
          </form>
        </div>
      )}

      <ConfirmModal
        isOpen={deleteTaskId !== null}
        onClose={() => setDeleteTaskId(null)}
        onConfirm={() => {
          if (!deleteTaskId) return;
          const task = state.tasks.find(candidate => candidate.id === deleteTaskId);
          if (task) deleteTask(dispatch, task);
        }}
        title={t('Delete Task')}
        message={t('Delete this task permanently?')}
        variant="danger"
        confirmText={t('Delete')}
      />
      <YearNotesEditor year={notesEditorYear} onClose={() => setNotesEditorYear(null)} />
      <MonthNotesEditor month={notesEditorMonth} onClose={() => setNotesEditorMonth(null)} />
    </div>
  );
};
