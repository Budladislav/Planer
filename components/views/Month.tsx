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
import {
  getMonthWeeks,
  getTaskPlanningMonth,
  monthWeekOrderKey,
  partitionMonthWeeks,
  planTaskForMonth,
} from '../../month-planning';
import { generateId, getTodayString, getWeekDateRange, getWeekString } from '../../utils';
import { ConfirmModal } from '../Modal';
import { WeekMetaBadges, WeekNotesEditor } from '../WeekNotes';
import { MonthMetaBadges, MonthNotesEditor } from '../MonthNotes';
import { completeTask, deleteTask } from '../../task-lifecycle';
import { useI18n } from '../../i18n';
import { RewardsBalancePill } from '../../features/rewards-lab/ui/RewardsBalancePill';
import { PeriodTaskCard, PeriodTaskContainer } from '../planning/PeriodTaskCard';

const poolContainer = (month: string): string => `month-pool:${month}`;
const weekContainer = (week: string): string => `month-week:${week}`;

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

export const MonthView: React.FC = () => {
  const { state, dispatch } = useAppStore();
  const { locale, t } = useI18n();
  const today = getTodayString();
  const [currentMonth, setCurrentMonth] = useState(today.slice(0, 7));
  const [moveTaskId, setMoveTaskId] = useState<string | null>(null);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editMonth, setEditMonth] = useState(currentMonth);
  const [quickAddTarget, setQuickAddTarget] = useState<string | null | undefined>(undefined);
  const [quickAddTitle, setQuickAddTitle] = useState('');
  const [deleteTaskId, setDeleteTaskId] = useState<string | null>(null);
  const [notesEditorWeek, setNotesEditorWeek] = useState<string | null>(null);
  const [notesEditorMonth, setNotesEditorMonth] = useState<string | null>(null);
  const [pastWeeksExpanded, setPastWeeksExpanded] = useState(false);

  const weeks = useMemo(() => getMonthWeeks(currentMonth), [currentMonth]);
  const { pastWeeks, currentAndFutureWeeks } = useMemo(
    () => partitionMonthWeeks(weeks, getWeekString(today)),
    [today, weeks],
  );
  const todoTasks = useMemo(
    () => state.tasks.filter(task => task.status === 'todo' && getTaskPlanningMonth(task) === currentMonth),
    [currentMonth, state.tasks],
  );
  const canMoveToMonthPool = currentMonth >= today.slice(0, 7);
  const doneTasks = useMemo(
    () => state.tasks.filter(task => task.status === 'done' && getTaskPlanningMonth(task) === currentMonth),
    [currentMonth, state.tasks],
  );

  const monthPoolTasks = useMemo(() => applyOrder(
    todoTasks.filter(task => !task.plan.day && !task.plan.week),
    state.taskOrderByMonthBucket[currentMonth],
  ), [currentMonth, state.taskOrderByMonthBucket, todoTasks]);

  const tasksByWeek = useMemo(() => Object.fromEntries(weeks.map(week => {
    const raw = todoTasks.filter(task => {
      const taskWeek = task.plan.day ? getWeekString(task.plan.day) : task.plan.week;
      return taskWeek === week;
    });
    return [week, applyOrder(raw, state.taskOrderByMonthWeek[monthWeekOrderKey(currentMonth, week)])];
  })) as Record<string, Task[]>, [currentMonth, state.taskOrderByMonthWeek, todoTasks, weeks]);

  const containerByTask = useMemo(() => {
    const map = new Map<string, string>();
    monthPoolTasks.forEach(task => map.set(task.id, poolContainer(currentMonth)));
    weeks.forEach(week => tasksByWeek[week]?.forEach(task => map.set(task.id, weekContainer(week))));
    return map;
  }, [currentMonth, monthPoolTasks, tasksByWeek, weeks]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const tasksForContainer = (containerId: string): Task[] => {
    if (containerId.startsWith('month-pool:')) return monthPoolTasks;
    const week = containerId.slice('month-week:'.length);
    return tasksByWeek[week] ?? [];
  };

  const saveContainerOrder = (containerId: string, order: string[]) => {
    if (containerId.startsWith('month-pool:')) {
      dispatch({ type: 'UPDATE_TASK_ORDER_MONTH_BUCKET', payload: { month: currentMonth, order } });
      return;
    }
    const week = containerId.slice('month-week:'.length);
    dispatch({
      type: 'UPDATE_TASK_ORDER_MONTH_WEEK',
      payload: { key: monthWeekOrderKey(currentMonth, week), order },
    });
  };

  const moveTaskTo = (taskId: string, targetWeek: string | null) => {
    const task = state.tasks.find(item => item.id === taskId);
    if (!task) return;
    dispatch({
      type: 'UPDATE_TASK',
      payload: {
        id: taskId,
        plan: targetWeek
          ? { year: currentMonth.slice(0, 4), month: currentMonth, week: targetWeek, day: null }
          : { year: currentMonth.slice(0, 4), month: currentMonth, week: null, day: null },
      },
    });

    if (targetWeek) {
      const currentIds = (tasksByWeek[targetWeek] ?? []).map(item => item.id).filter(id => id !== taskId);
      dispatch({
        type: 'UPDATE_TASK_ORDER_MONTH_WEEK',
        payload: { key: monthWeekOrderKey(currentMonth, targetWeek), order: [...currentIds, taskId] },
      });
      const weekBucketIds = (state.taskOrderByWeekBucket[targetWeek] ?? []).filter(id => id !== taskId);
      dispatch({ type: 'UPDATE_TASK_ORDER_WEEK_BUCKET', payload: { week: targetWeek, order: [...weekBucketIds, taskId] } });
    } else {
      const poolIds = monthPoolTasks.map(item => item.id).filter(id => id !== taskId);
      dispatch({ type: 'UPDATE_TASK_ORDER_MONTH_BUCKET', payload: { month: currentMonth, order: [...poolIds, taskId] } });
    }
    setMoveTaskId(null);
  };

  const handleDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over) return;
    const activeId = String(active.id);
    const overId = String(over.id);
    const sourceContainer = containerByTask.get(activeId);
    const targetContainer = overId.startsWith('month-pool:') || overId.startsWith('month-week:')
      ? overId
      : containerByTask.get(overId);
    if (!sourceContainer || !targetContainer) return;

    if (sourceContainer === targetContainer) {
      const tasks = tasksForContainer(sourceContainer);
      const oldIndex = tasks.findIndex(task => task.id === activeId);
      const newIndex = tasks.findIndex(task => task.id === overId);
      if (oldIndex === -1 || newIndex === -1 || oldIndex === newIndex) return;
      saveContainerOrder(sourceContainer, arrayMove(tasks, oldIndex, newIndex).map(task => task.id));
      return;
    }

    const targetWeek = targetContainer.startsWith('month-week:')
      ? targetContainer.slice('month-week:'.length)
      : null;
    moveTaskTo(activeId, targetWeek);
  };

  const changeMonth = (delta: number) => {
    const [year, month] = currentMonth.split('-').map(Number);
    const next = new Date(year, month - 1 + delta, 1);
    setCurrentMonth(`${next.getFullYear()}-${(next.getMonth() + 1).toString().padStart(2, '0')}`);
    setPastWeeksExpanded(false);
  };

  const openEditor = (task: Task) => {
    setEditingTask(task);
    setEditTitle(task.title);
    setEditMonth(getTaskPlanningMonth(task) ?? currentMonth);
  };

  const saveEdit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!editingTask || !editTitle.trim()) return;
    dispatch({
      type: 'UPDATE_TASK',
      payload: {
        id: editingTask.id,
        title: editTitle.trim(),
        plan: planTaskForMonth(editingTask, editMonth),
      },
    });
    setEditingTask(null);
  };

  const addTask = (event: React.FormEvent) => {
    event.preventDefault();
    if (!quickAddTitle.trim() || quickAddTarget === undefined) return;
    const id = generateId();
    const targetWeek = quickAddTarget;
    dispatch({
      type: 'ADD_TASK',
      payload: {
        id,
        title: quickAddTitle.trim(),
        status: 'todo',
        plan: { year: currentMonth.slice(0, 4), month: currentMonth, week: targetWeek, day: null },
        projectId: null,
        eventId: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        completedAt: null,
      },
    });
    if (targetWeek) {
      dispatch({
        type: 'UPDATE_TASK_ORDER_MONTH_WEEK',
        payload: {
          key: monthWeekOrderKey(currentMonth, targetWeek),
          order: [...(tasksByWeek[targetWeek] ?? []).map(task => task.id), id],
        },
      });
      dispatch({
        type: 'UPDATE_TASK_ORDER_WEEK_BUCKET',
        payload: { week: targetWeek, order: [...(state.taskOrderByWeekBucket[targetWeek] ?? []), id] },
      });
    } else {
      dispatch({
        type: 'UPDATE_TASK_ORDER_MONTH_BUCKET',
        payload: { month: currentMonth, order: [...monthPoolTasks.map(task => task.id), id] },
      });
    }
    setQuickAddTitle('');
    setQuickAddTarget(undefined);
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

  const monthLabel = new Date(`${currentMonth}-01T12:00:00`).toLocaleDateString(locale, {
    month: 'long', year: 'numeric',
  });

  const renderWeek = (week: string) => {
    const range = getWeekDateRange(week);
    const tasks = tasksByWeek[week] ?? [];
    return (
      <section key={week} className="section-card p-2">
        <div className="mb-1 flex min-w-0 items-center gap-2 px-1">
          <h3 className="flex-shrink-0 text-sm font-semibold text-slate-700">{t('Week {week}', { week: week.split('-W')[1] })}</h3>
          <span className="flex-shrink-0 text-xs text-slate-400">{range.start}–{range.end}</span>
          <WeekMetaBadges
            week={week}
            onEdit={() => setNotesEditorWeek(week)}
            maxNotes={1}
            compact
            className="min-w-0 flex-1"
          />
          <button type="button" onClick={() => setQuickAddTarget(week)} className="icon-button-compact h-7 w-7 text-brand-600 hover:bg-brand-50" title={t('Add task to {week}', { week })}>
            <Plus className="h-4 w-4" />
          </button>
        </div>
        <PeriodTaskContainer id={weekContainer(week)} tasks={tasks} emptyText={t('Drop a month task into this week')}>
          {tasks.map(task => renderTask(task, weekContainer(week)))}
        </PeriodTaskContainer>
      </section>
    );
  };

  return (
    <div className="page-container">
      <div className="mb-2 flex min-h-10 flex-wrap items-center justify-center gap-2 text-sm text-muted">
        <MonthMetaBadges month={currentMonth} onEdit={() => setNotesEditorMonth(currentMonth)} showNotes={false} />
        <span>{t('{todo} left • {done} done', { todo: todoTasks.length, done: doneTasks.length })}</span>
        <RewardsBalancePill />
      </div>
      {(state.monthNotes[currentMonth]?.length ?? 0) > 0 && (
        <MonthMetaBadges
          month={currentMonth}
          onEdit={() => setNotesEditorMonth(currentMonth)}
          maxNotes={2}
          showEditor={false}
          className="mb-2 justify-center"
        />
      )}

      <div className="period-switcher">
        <button type="button" onClick={() => changeMonth(-1)} className="icon-button" title={t('Previous month')}>
          <ChevronLeft className="h-5 w-5" />
        </button>
        <div className="font-semibold text-slate-700">{monthLabel}</div>
        <button type="button" onClick={() => changeMonth(1)} className="icon-button" title={t('Next month')}>
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <section className="section-card border-dashed p-2">
          <div className="mb-1 flex items-center justify-between px-1">
            <h3 className="text-sm font-semibold text-slate-600">{t('Month tasks (no week)')}</h3>
            <button type="button" onClick={() => setQuickAddTarget(null)} className="icon-button-compact h-7 w-7 text-brand-600 hover:bg-brand-50" title={t('Add month task')}>
              <Plus className="h-4 w-4" />
            </button>
          </div>
          <PeriodTaskContainer id={poolContainer(currentMonth)} tasks={monthPoolTasks} emptyText={t('Drop tasks here to choose their week later')}>
            {monthPoolTasks.map(task => renderTask(task, poolContainer(currentMonth)))}
          </PeriodTaskContainer>
        </section>

        <div className="mt-3 space-y-2">
          {pastWeeks.length > 0 && (
            <div className="surface-card bg-slate-50/60 p-1.5 shadow-none">
              <button
                type="button"
                aria-expanded={pastWeeksExpanded}
                onClick={() => setPastWeeksExpanded(value => !value)}
                className="disclosure-button py-2 text-slate-500"
              >
                <span>{t('Past weeks ({count})', { count: pastWeeks.length })}</span>
                <ChevronDown className={`h-4 w-4 transition-transform ${pastWeeksExpanded ? 'rotate-180' : ''}`} />
              </button>
              {pastWeeksExpanded && (
                <div className="mt-1.5 space-y-2">
                  {pastWeeks.map(renderWeek)}
                </div>
              )}
            </div>
          )}
          {currentAndFutureWeeks.map(renderWeek)}
        </div>
      </DndContext>

      {moveTaskId && (
        <div className="sheet-backdrop" onClick={() => setMoveTaskId(null)}>
          <div className="sheet-panel sm:w-[440px]" onClick={event => event.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-slate-800">{t('Where to move task?')}</h3>
              <button type="button" onClick={() => setMoveTaskId(null)} className="text-sm text-slate-400">{t('Close')}</button>
            </div>
            <div className="grid max-h-[60vh] grid-cols-2 gap-2 overflow-y-auto">
              {canMoveToMonthPool && (
                <button type="button" onClick={() => moveTaskTo(moveTaskId, null)} className="button-secondary h-auto justify-start p-3 text-left">
                  {t('Month pool')}
                </button>
              )}
              {currentAndFutureWeeks.map(week => (
                <button key={week} type="button" onClick={() => moveTaskTo(moveTaskId, week)} className="button-secondary h-auto justify-start p-3 text-left">
                  {t('Week {week}', { week: week.split('-W')[1] })}
                </button>
              ))}
              {!canMoveToMonthPool && currentAndFutureWeeks.length === 0 && (
                <p className="col-span-2 rounded-xl bg-slate-50 px-3 py-4 text-center text-sm italic text-slate-400">
                  {t('No current or future destinations in this period.')}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {quickAddTarget !== undefined && (
        <div className="sheet-backdrop" onClick={() => setQuickAddTarget(undefined)}>
          <form onSubmit={addTask} className="sheet-panel sm:w-[440px]" onClick={event => event.stopPropagation()}>
            <h3 className="font-semibold text-slate-800">
              {quickAddTarget
                ? t('Add task to week {week}', { week: quickAddTarget.split('-W')[1] })
                : t('Add task to {month}', { month: monthLabel })}
            </h3>
            <input autoFocus required value={quickAddTitle} onChange={event => setQuickAddTitle(event.target.value)} className="field w-full" placeholder={t('Task title...')} />
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setQuickAddTarget(undefined)} className="button-secondary">{t('Cancel')}</button>
              <button type="submit" className="button-primary">{t('Add')}</button>
            </div>
          </form>
        </div>
      )}

      {editingTask && (
        <div className="sheet-backdrop" onClick={() => setEditingTask(null)}>
          <form onSubmit={saveEdit} className="sheet-panel sm:w-[440px]" onClick={event => event.stopPropagation()}>
            <h3 className="font-semibold text-slate-800">{t('Edit task')}</h3>
            <textarea autoFocus required rows={2} value={editTitle} onChange={event => setEditTitle(event.target.value)} className="field w-full resize-none" />
            <label className="block text-xs font-medium text-slate-500">
              {t('Planning month')}
              <input type="month" value={editMonth} onChange={event => setEditMonth(event.target.value)} className="field mt-1 block w-full" />
            </label>
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setEditingTask(null)} className="button-secondary">{t('Cancel')}</button>
              <button type="submit" className="button-primary">{t('Save')}</button>
            </div>
          </form>
        </div>
      )}

      <ConfirmModal
        isOpen={deleteTaskId !== null}
        onClose={() => setDeleteTaskId(null)}
        onConfirm={() => {
          if (deleteTaskId) {
            const task = state.tasks.find(candidate => candidate.id === deleteTaskId);
            if (task) deleteTask(dispatch, task);
          }
        }}
        title={t('Delete Task')}
        message={t('Delete this task permanently?')}
        variant="danger"
        confirmText={t('Delete')}
      />

      <WeekNotesEditor week={notesEditorWeek} onClose={() => setNotesEditorWeek(null)} />
      <MonthNotesEditor month={notesEditorMonth} onClose={() => setNotesEditorMonth(null)} />
    </div>
  );
};
