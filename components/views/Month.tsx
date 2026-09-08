import React, { useMemo, useState } from 'react';
import {
  DndContext,
  DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  closestCenter,
  useDroppable,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { ArrowRightLeft, Check, ChevronDown, ChevronLeft, ChevronRight, Pencil, Plus, X } from 'lucide-react';
import { useAppStore } from '../../store';
import { Task } from '../../types';
import {
  getMonthWeeks,
  getTaskPlanningMonth,
  monthWeekOrderKey,
  partitionMonthWeeks,
  planTaskForMonth,
} from '../../month-planning';
import { formatDateShort, generateId, getTodayString, getWeekDateRange, getWeekString } from '../../utils';
import { ConfirmModal } from '../Modal';
import { WeekMetaBadges, WeekNotesEditor } from '../WeekNotes';
import { MonthMetaBadges, MonthNotesEditor } from '../MonthNotes';
import { completeTask, deleteTask } from '../../task-lifecycle';
import { useI18n } from '../../i18n';
import { RewardGradeIncrementButton, RewardGradeSelector, RewardGradeSurface } from '../../features/rewards-lab/ui/RewardGradeControls';
import { TaskCard, TaskIconButton } from '../ui/Primitives';

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

interface MonthTaskCardProps {
  task: Task;
  containerId: string;
  onMove: (taskId: string) => void;
  onEdit: (task: Task) => void;
  onComplete: (taskId: string) => void;
  onDelete: (taskId: string) => void;
}

const MonthTaskCard: React.FC<MonthTaskCardProps> = ({ task, containerId, onMove, onEdit, onComplete, onDelete }) => {
  const { t } = useI18n();
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: task.id,
    data: { containerId },
  });
  const [showActions, setShowActions] = useState(false);

  return (
    <TaskCard
      ref={setNodeRef}
      data-task-id={task.id}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.45 : 1,
      }}
      className="px-2"
      onClick={() => setShowActions(value => !value)}
    >
      <RewardGradeSurface taskId={task.id} />
      <div className="flex min-w-0 items-center gap-2">
        <div
          {...attributes}
          {...listeners}
          className="flex min-w-0 flex-1 touch-none items-center gap-2 cursor-grab active:cursor-grabbing"
          title={t('Drag task')}
        >
          <RewardGradeIncrementButton taskId={task.id} />
          <span className={`min-w-0 flex-1 text-slate-700 ${showActions ? 'sr-only' : 'truncate'}`}>
            {task.title}
          </span>
          {task.plan.day && (
            <span className="flex-shrink-0 rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-500">
              {formatDateShort(task.plan.day).slice(0, 5)}
            </span>
          )}
        </div>
        <div className="flex flex-shrink-0 items-center gap-1">
          <TaskIconButton label={t('Move')} tone="primary" onClick={event => { event.stopPropagation(); onMove(task.id); }}>
            <ArrowRightLeft className="h-3.5 w-3.5" />
          </TaskIconButton>
          <TaskIconButton label={t('Delete')} tone="danger" onClick={event => { event.stopPropagation(); onDelete(task.id); }}>
            <X className="h-3.5 w-3.5" />
          </TaskIconButton>
          <TaskIconButton label={t('Edit task')} onClick={event => { event.stopPropagation(); onEdit(task); }}>
            <Pencil className="h-3.5 w-3.5" />
          </TaskIconButton>
          <TaskIconButton label={t('Mark as done')} tone="success" onClick={event => { event.stopPropagation(); onComplete(task.id); }}>
            <Check className="h-4 w-4" />
          </TaskIconButton>
        </div>
      </div>

      <div
        className={`overflow-hidden px-2 transition-all ${
          showActions ? 'mt-2 max-h-96 opacity-100' : 'max-h-0 opacity-0'
        }`}
        onClick={event => event.stopPropagation()}
      >
        {showActions && (
          <div className="space-y-2">
            <p className="break-words text-sm leading-relaxed text-slate-700">{task.title}</p>
            <div className="mx-auto w-full max-w-sm">
              <RewardGradeSelector taskId={task.id} compact />
            </div>
          </div>
        )}
      </div>
    </TaskCard>
  );
};

interface TaskContainerProps {
  id: string;
  tasks: Task[];
  children: React.ReactNode;
  emptyText: string;
}

const TaskContainer: React.FC<TaskContainerProps> = ({ id, tasks, children, emptyText }) => {
  const { setNodeRef, isOver } = useDroppable({ id, data: { containerId: id } });
  return (
    <div
      ref={setNodeRef}
      data-container-id={id}
      className={`min-h-14 space-y-2 rounded-xl p-2 transition-colors ${isOver ? 'bg-brand-50 ring-2 ring-brand-100' : 'bg-slate-50/70'}`}
    >
      <SortableContext items={tasks.map(task => task.id)} strategy={verticalListSortingStrategy}>
        {children}
      </SortableContext>
      {tasks.length === 0 && <div className="py-2 text-center text-xs italic text-slate-400">{emptyText}</div>}
    </div>
  );
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
          ? { month: currentMonth, week: targetWeek, day: null }
          : { month: currentMonth, week: null, day: null },
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
        plan: { month: currentMonth, week: targetWeek, day: null },
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
    <MonthTaskCard
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
        <TaskContainer id={weekContainer(week)} tasks={tasks} emptyText={t('Drop a month task into this week')}>
          {tasks.map(task => renderTask(task, weekContainer(week)))}
        </TaskContainer>
      </section>
    );
  };

  return (
    <div className="page-container">
      <div className="mb-2 flex min-h-7 flex-wrap items-center justify-center gap-2 text-sm text-muted">
        <span>{t('{count} planned tasks', { count: todoTasks.length })}</span>
        <MonthMetaBadges month={currentMonth} onEdit={() => setNotesEditorMonth(currentMonth)} maxNotes={2} />
      </div>

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
          <TaskContainer id={poolContainer(currentMonth)} tasks={monthPoolTasks} emptyText={t('Drop tasks here to choose their week later')}>
            {monthPoolTasks.map(task => renderTask(task, poolContainer(currentMonth)))}
          </TaskContainer>
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
              <button type="button" onClick={() => moveTaskTo(moveTaskId, null)} className="button-secondary h-auto justify-start p-3 text-left">
                {t('Month pool')}
              </button>
              {weeks.map(week => (
                <button key={week} type="button" onClick={() => moveTaskTo(moveTaskId, week)} className="button-secondary h-auto justify-start p-3 text-left">
                  {t('Week {week}', { week: week.split('-W')[1] })}
                </button>
              ))}
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
