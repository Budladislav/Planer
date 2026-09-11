import React, { useState } from 'react';
import { useAppStore } from '../../store';
import { CalendarCheck2, Check, ChevronDown, ChevronLeft, ChevronRight, Pencil, RotateCcw, X } from 'lucide-react';
import { formatDateReadable, getTodayString, generateId, getDateString, getWeekString } from '../../utils';
import {
  getCompletedTasksForLocalDay,
  getPreviousLocalDayTimestamp,
  getTaskCompletionTimestamp,
} from '../../today-tasks';
import { ConfirmModal } from '../Modal';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Task } from '../../types';
import { completeTask, deleteTask, reopenTask } from '../../task-lifecycle';
import { RewardCompletionMeta, RewardGradeIncrementButton, RewardGradeMarker, RewardGradeSelector, RewardGradeSurface } from '../../features/rewards-lab/ui/RewardGradeControls';
import { RewardsBalancePill } from '../../features/rewards-lab/ui/RewardsBalancePill';
import { DayMetaBadges, DayNotesEditor } from '../DayNotes';
import { useI18n } from '../../i18n';
import { EmptyState, GradedTaskRow, TaskCard, TaskIconButton } from '../ui/Primitives';
import { WeekTaskMoveButton, WeekTaskMoveSheet, type WeekTaskMoveTarget } from '../week/WeekTaskMoveControl';
import { TaskGoalLinkControl } from '../tasks/TaskGoalLinkControl';
import { planTaskForWeekBucket } from '../../task-planning';
import { getWeekPoolTasks } from '../../planning-visibility';

const AddToStartIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" {...props}>
    <path d="M12 2 3 11h5v10h8V11h5L12 2Z" fill="currentColor" />
    <path d="M12 8v8M8 12h8" stroke="white" strokeWidth="2" strokeLinecap="round" />
  </svg>
);

const AddToEndIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" {...props}>
    <path d="m12 22 9-9h-5V3H8v10H3l9 9Z" fill="currentColor" />
    <path d="M12 8v8M8 12h8" stroke="white" strokeWidth="2" strokeLinecap="round" />
  </svg>
);

// Sortable Task Item Component
const SortableTaskItem: React.FC<{ 
  task: Task; 
  onComplete: (id: string) => void;
  onCompleteYesterday?: (id: string) => void;
  onMove: (id: string) => void;
  onUpdate: (id: string, updates: Partial<Task>) => void;
  onDeleteConfirm: (id: string) => void;
}> = ({ task, onComplete, onCompleteYesterday, onMove, onUpdate, onDeleteConfirm }) => {
  const { t } = useI18n();
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(task.title);
  const [showActions, setShowActions] = useState(false);
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editTitle.trim()) return;
    
    onUpdate(task.id, { 
      title: editTitle.trim(),
    });
    setIsEditing(false);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditTitle(task.title);
  };

  // Update edit state when task changes
  React.useEffect(() => {
    setEditTitle(task.title);
  }, [task.title]);

  // Auto-resize textarea
  React.useEffect(() => {
    if (isEditing && textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [isEditing, editTitle]);

  if (isEditing) {
    return (
      <form onSubmit={handleSaveEdit} className="task-editor">
        <div>
          <label className="block text-xs font-bold text-slate-500 uppercase mb-1">{t('Title')}</label>
          <textarea
            ref={textareaRef}
            required
            value={editTitle}
            onChange={(e) => {
              setEditTitle(e.target.value);
              if (textareaRef.current) {
                textareaRef.current.style.height = 'auto';
                textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
              }
            }}
            className="field w-full min-h-[2.5rem] resize-none overflow-hidden"
            rows={1}
            autoFocus
          />
        </div>
        <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={handleCancelEdit}
              className="button-secondary"
            >
              {t('Cancel')}
            </button>
            <button type="submit" className="button-primary">
              {t('Save')}
            </button>
        </div>
      </form>
    );
  }

  return (
    <TaskCard
      ref={setNodeRef}
      style={style}
      onClick={() => setShowActions((prev) => !prev)}
    >
      <RewardGradeSurface taskId={task.id} goalLinked={task.goalId !== null} eventLinked={task.eventId !== null} />
      <div
        {...attributes}
        {...listeners}
        className="flex flex-1 min-w-0 cursor-grab touch-none items-center gap-2 active:cursor-grabbing"
      >
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <TaskIconButton
            label={t('Delete task')}
            tone="danger"
            onClick={(e) => {
              e.stopPropagation();
              onDeleteConfirm(task.id);
            }}
          >
            <X className="h-3.5 w-3.5" />
          </TaskIconButton>
          <span className={`${showActions ? 'sr-only' : 'truncate'} text-sm font-medium text-slate-950 ${task.status === 'done' ? 'line-through' : ''}`}>
            {task.title}
          </span>
        </div>
        <div className="flex flex-shrink-0 items-center gap-1">
          <RewardGradeIncrementButton taskId={task.id} goalLinked={task.goalId !== null} eventLinked={task.eventId !== null} />
          <TaskIconButton
            label={t('Edit task')}
            onClick={(e) => {
              e.stopPropagation();
              setIsEditing(true);
            }}
          >
            <Pencil className="h-3.5 w-3.5" />
          </TaskIconButton>
          <TaskIconButton
            label={t('Mark as done')}
            tone="success"
            onClick={(e) => {
              e.stopPropagation();
              onComplete(task.id);
            }}
          >
            <Check className="h-4 w-4" />
          </TaskIconButton>
        </div>
      </div>

      <div
        className={`overflow-hidden px-1 transition-all duration-200 sm:px-4 ${
          showActions ? 'mt-2 max-h-96 opacity-100' : 'mt-0 max-h-0 opacity-0'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {showActions && (
          <div className="space-y-2">
            <p className="break-words px-2 text-sm font-medium leading-relaxed text-slate-950">{task.title}</p>
            <div className="mx-auto w-full max-w-sm">
              <RewardGradeSelector taskId={task.id} compact goalLinked={task.goalId !== null} eventLinked={task.eventId !== null} />
            </div>
            <TaskGoalLinkControl task={task} />
            <div className="flex justify-center gap-1">
              <WeekTaskMoveButton onClick={() => onMove(task.id)} />
              {onCompleteYesterday && (
                <TaskIconButton
                  label={t('Record this task as completed yesterday')}
                  tone="warning"
                  onClick={() => onCompleteYesterday(task.id)}
                >
                  <CalendarCheck2 className="h-3.5 w-3.5" />
                </TaskIconButton>
              )}
            </div>
          </div>
        )}
      </div>
    </TaskCard>
  );
};


const DayOverview: React.FC<{ date: string; navigable?: boolean }> = ({ date, navigable = false }) => {
  const { state, dispatch } = useAppStore();
  const { locale, t } = useI18n();
  const [quickAdd, setQuickAdd] = useState('');
  const [notesEditorDate, setNotesEditorDate] = useState<string | null>(null);
  const [moveTaskId, setMoveTaskId] = useState<string | null>(null);
  const actualToday = getTodayString();
  const todayStr = date;
  const isToday = todayStr === actualToday;
  const [deleteConfirm, setDeleteConfirm] = useState<{ isOpen: boolean; taskId: string | null }>({
    isOpen: false,
    taskId: null,
  });

  // Today keeps the carry-forward behavior; another day shows only its own pending tasks.
  const allTodayTasks = state.tasks.filter(t => {
    if (!t.plan.day || t.status !== 'todo') return false;
    return isToday ? t.plan.day <= todayStr : t.plan.day === todayStr;
  });
  const todoTasks = allTodayTasks.filter(t => t.status === 'todo');
  const completedTodayTasks = getCompletedTasksForLocalDay(state.tasks, todayStr);
  const availableTasks = todoTasks;

  // Order for today, stored in global state (persists across reloads)
  const savedOrder = state.taskOrderByDay[todayStr] || [];
  const availableIds = availableTasks.map(t => t.id);

  // Derive current order of task IDs from saved order + current tasks
  let orderedIds: string[];
  if (savedOrder.length > 0) {
    const validSaved = savedOrder.filter(id => availableIds.includes(id));
    const missing = availableIds.filter(id => !validSaved.includes(id));
    orderedIds = [...validSaved, ...missing];
  } else {
    // Fallback: preserve current order of tasks as-is
    orderedIds = [...availableIds];
  }
  
  // Get ordered tasks
  const orderedTasks = orderedIds
    .map(id => availableTasks.find(t => t.id === id))
    .filter(Boolean) as Task[];

  const todayTasks = orderedTasks;

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 200,
        tolerance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    // Reordering within list based on current ordered IDs
    const oldIndex = orderedIds.indexOf(activeId);
    const newIndex = orderedIds.indexOf(overId);
    if (oldIndex !== -1 && newIndex !== -1) {
      const newOrder = arrayMove(orderedIds, oldIndex, newIndex);
      dispatch({ type: 'UPDATE_TASK_ORDER', payload: { day: todayStr, order: newOrder } });
    }
  };

  const handleQuickAdd = (e: React.FormEvent, position: 'start' | 'end' = 'end') => {
    e.preventDefault();
    if (!quickAdd.trim()) return;
    
    const newTaskId = generateId();
    dispatch({
      type: 'ADD_TASK',
      payload: {
        id: newTaskId,
        title: quickAdd.trim(),
        status: 'todo',
        plan: { day: todayStr, week: getWeekString(todayStr), month: todayStr.slice(0, 7), year: todayStr.slice(0, 4) },
        projectId: null,
        eventId: null,
        goalId: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        completedAt: null,
      }
    });
    const newOrder = position === 'start' ? [newTaskId, ...orderedIds] : [...orderedIds, newTaskId];
    dispatch({ type: 'UPDATE_TASK_ORDER', payload: { day: todayStr, order: newOrder } });
    setQuickAdd('');
  };

  const handleDeleteConfirm = (id: string) => {
    setDeleteConfirm({ isOpen: true, taskId: id });
  };

  const handleDelete = (id: string) => {
    // Remove from task order if present
    const newOrder = orderedIds.filter(taskId => taskId !== id);
    dispatch({ type: 'UPDATE_TASK_ORDER', payload: { day: todayStr, order: newOrder } });
    const task = state.tasks.find(candidate => candidate.id === id);
    if (task) deleteTask(dispatch, task);
  };

  const handleComplete = (id: string) => {
    const task = state.tasks.find(candidate => candidate.id === id);
    if (!task) return;
    // Remove from task order if present
    const newOrder = orderedIds.filter(taskId => taskId !== id);
    dispatch({ type: 'UPDATE_TASK_ORDER', payload: { day: todayStr, order: newOrder } });
    completeTask(dispatch, task);
  };

  const handleCompleteYesterday = (id: string) => {
    const task = state.tasks.find(candidate => candidate.id === id);
    if (!task) return;
    const newOrder = orderedIds.filter(taskId => taskId !== id);
    const completedAt = getPreviousLocalDayTimestamp();
    dispatch({ type: 'UPDATE_TASK_ORDER', payload: { day: todayStr, order: newOrder } });
    completeTask(dispatch, task, { completedAt });
  };

  const handleMove = (id: string, target: WeekTaskMoveTarget) => {
    const task = state.tasks.find(candidate => candidate.id === id);
    if (!task) return;
    const targetWeek = target.type === 'day' ? getWeekString(target.day) : target.week;
    const day = target.type === 'day' ? target.day : null;
    dispatch({
      type: 'UPDATE_TASK',
      payload: {
        id,
        plan: day
          ? { day, week: getWeekString(day), month: day.slice(0, 7), year: day.slice(0, 4) }
          : planTaskForWeekBucket(task, targetWeek),
      },
    });

    const sourceDay = task.plan.day;
    if (sourceDay) {
      const sourceOrder = state.taskOrderByDay[sourceDay] || [];
      if (sourceOrder.includes(id)) {
        dispatch({
          type: 'UPDATE_TASK_ORDER',
          payload: { day: sourceDay, order: sourceOrder.filter(taskId => taskId !== id) },
        });
      }
    }
    if (sourceDay !== todayStr && orderedIds.includes(id)) {
      dispatch({
        type: 'UPDATE_TASK_ORDER',
        payload: { day: todayStr, order: orderedIds.filter(taskId => taskId !== id) },
      });
    }

    if (day) {
      const targetOrder = state.taskOrderByDay[day] || [];
      if (!targetOrder.includes(id)) {
        dispatch({ type: 'UPDATE_TASK_ORDER', payload: { day, order: [...targetOrder, id] } });
      }
    } else {
      const savedTargetOrder = state.taskOrderByWeekBucket[targetWeek] || [];
      const targetTaskIds = getWeekPoolTasks(state.tasks, targetWeek).map(item => item.id);
      const bucketOrder = [
        ...savedTargetOrder.filter(taskId => targetTaskIds.includes(taskId) && taskId !== id),
        ...targetTaskIds.filter(taskId => !savedTargetOrder.includes(taskId) && taskId !== id),
      ];
      dispatch({
        type: 'UPDATE_TASK_ORDER_WEEK_BUCKET',
        payload: { week: targetWeek, order: [...bucketOrder, id] },
      });
    }
    setMoveTaskId(null);
  };

  const handleUndoComplete = (id: string) => {
    const task = state.tasks.find(candidate => candidate.id === id);
    if (!task) return;
    const currentOrder = state.taskOrderByDay[todayStr] || [];
    if (!currentOrder.includes(id)) {
      dispatch({ type: 'UPDATE_TASK_ORDER', payload: { day: todayStr, order: [...currentOrder, id] } });
    }
    reopenTask(dispatch, task, {
      plan: { day: todayStr, week: getWeekString(todayStr), month: todayStr.slice(0, 7), year: todayStr.slice(0, 4) },
    });
  };

  const toggleCompletedToday = () => {
    dispatch({
      type: 'UPDATE_UI_PREFERENCES',
      payload: { todayCompletedExpanded: !state.uiPreferences.todayCompletedExpanded },
    });
  };

  const handleUpdate = (id: string, updates: Partial<Task>) => {
    dispatch({ type: 'UPDATE_TASK', payload: { id, ...updates } });
  };

  const navigateDay = (delta: number) => {
    const next = new Date(`${todayStr}T12:00:00`);
    next.setDate(next.getDate() + delta);
    const target = getDateString(next);
    dispatch(target === actualToday ? { type: 'SET_VIEW', payload: 'today' } : { type: 'OPEN_DAY', payload: target });
  };

  return (
    <>
      <div className="page-container">
          {navigable && (
            <div className="period-switcher">
              <button type="button" onClick={() => navigateDay(-1)} className="icon-button" title={t('Previous day')}><ChevronLeft className="h-5 w-5" /></button>
              <div className="min-w-0 flex-1 text-center">
                <div className="truncate font-semibold text-slate-700">{formatDateReadable(todayStr, state.uiPreferences.language)}</div>
                {!isToday && <button type="button" onClick={() => dispatch({ type: 'SET_VIEW', payload: 'today' })} className="mt-0.5 text-xs font-semibold text-brand-600 hover:text-brand-700">{t('Go to today')}</button>}
              </div>
              <button type="button" onClick={() => navigateDay(1)} className="icon-button" title={t('Next day')}><ChevronRight className="h-5 w-5" /></button>
            </div>
          )}
          <div className="mb-2 flex min-h-10 flex-wrap items-center justify-center gap-2">
            <DayMetaBadges
              date={todayStr}
              onEdit={() => setNotesEditorDate(todayStr)}
              showNotes={false}
            />
            <p className="text-sm text-muted">
              {t('{todo} left • {done} done', { todo: todoTasks.length, done: completedTodayTasks.length })}
            </p>
            <RewardsBalancePill />
          </div>
          {(state.dayNotes[todayStr]?.length ?? 0) > 0 && (
            <DayMetaBadges
              date={todayStr}
              onEdit={() => setNotesEditorDate(todayStr)}
              maxNotes={2}
              showEditor={false}
              className="mb-2 justify-center"
            />
          )}

          {/* Tasks List - with bottom padding for fixed form */}
          <div className="space-y-3 pb-20 lg:pb-4">
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <div className="flex flex-col space-y-4">
                {todayTasks.length === 0 ? (
                  <div className="flex items-center justify-center">
                    <EmptyState>
                      {isToday ? t('No pending tasks for today. Check your Week plan?') : t('No pending tasks for this day.')}
                    </EmptyState>
                  </div>
                ) : (
                  <div className="flex-1">
                    <SortableContext items={todayTasks.map(t => t.id)} strategy={verticalListSortingStrategy}>
                      <div className="space-y-2">
                        {todayTasks.map(task => (
                        <SortableTaskItem 
                          key={task.id} 
                          task={task} 
                          onComplete={handleComplete}
                          onCompleteYesterday={isToday ? handleCompleteYesterday : undefined}
                          onMove={setMoveTaskId}
                          onUpdate={handleUpdate}
                          onDeleteConfirm={handleDeleteConfirm}
                        />
                        ))}
                      </div>
                    </SortableContext>
                  </div>
                )}
              </div>
            </DndContext>

            <section className="surface-card">
              <button
                type="button"
                onClick={toggleCompletedToday}
                className="disclosure-button"
                aria-expanded={state.uiPreferences.todayCompletedExpanded}
              >
                <span className="flex min-w-0 items-center gap-2 text-sm font-semibold text-slate-700">
                  {isToday
                    ? t('Completed today ({count})', { count: completedTodayTasks.length })
                    : t('Completed on this day ({count})', { count: completedTodayTasks.length })}
                </span>
                <span className="flex flex-shrink-0 items-center gap-2 text-xs text-slate-500">
                  <ChevronDown className={`h-4 w-4 transition-transform ${state.uiPreferences.todayCompletedExpanded ? 'rotate-180' : ''}`} />
                </span>
              </button>

              {state.uiPreferences.todayCompletedExpanded && (
                <div className="divide-y divide-slate-100 border-t border-slate-100">
                  {completedTodayTasks.length === 0 ? (
                    <p className="px-3 py-4 text-center text-sm italic text-slate-400">{isToday ? t('No tasks completed today yet.') : t('No tasks completed on this day.')}</p>
                  ) : completedTodayTasks.map(task => (
                    <GradedTaskRow key={task.id} className="flex items-center gap-2 overflow-hidden px-3 py-2.5">
                      <RewardGradeSurface taskId={task.id} goalLinked={task.goalId !== null} eventLinked={task.eventId !== null} />
                      <RewardGradeMarker taskId={task.id} goalLinked={task.goalId !== null} eventLinked={task.eventId !== null} />
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-medium text-slate-950 line-through">{task.title}</div>
                        <div className="mt-0.5 text-xs text-slate-400">
                          {new Date(getTaskCompletionTimestamp(task)).toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </div>
                      <RewardCompletionMeta taskId={task.id} />
                      <TaskIconButton
                        label={t("Return task to today's list")}
                        tone="primary"
                        onClick={() => handleUndoComplete(task.id)}
                      >
                        <RotateCcw className="h-3.5 w-3.5" />
                      </TaskIconButton>
                    </GradedTaskRow>
                  ))}
                </div>
              )}
            </section>
          </div>

          {/* Add Form - Fixed at bottom */}
          {todayStr >= actualToday && <form onSubmit={handleQuickAdd} className="sticky-composer mobile-composer-fixed fixed left-0 right-0 z-20 lg:hidden">
            <div className="max-w-3xl mx-auto flex items-center gap-2">
              <button
                type="button"
                className="directional-add-button"
                title={t('Add task to start')}
                aria-label={t('Add task to start')}
                onClick={(event) => handleQuickAdd(event, 'start')}
              >
                <AddToStartIcon className="h-9 w-9" />
              </button>
              <input 
                type="text" 
                value={quickAdd}
                onChange={e => setQuickAdd(e.target.value)}
                placeholder={isToday ? t('Add a task for today...') : t('Add a task for this day...')}
                className="field min-w-0 flex-1"
              />
              <button
                type="submit"
                className="directional-add-button"
                title={t('Add task to end')}
                aria-label={t('Add task to end')}
              >
                <AddToEndIcon className="h-9 w-9" />
              </button>
            </div>
          </form>}
          <DayNotesEditor date={notesEditorDate} onClose={() => setNotesEditorDate(null)} />

          {/* Add Form - Desktop */}
          {todayStr >= actualToday && <form onSubmit={handleQuickAdd} className="hidden lg:flex items-center gap-2">
            <button
              type="button"
              className="directional-add-button"
              title={t('Add task to start')}
              aria-label={t('Add task to start')}
              onClick={(event) => handleQuickAdd(event, 'start')}
            >
              <AddToStartIcon className="h-9 w-9" />
            </button>
            <input 
              type="text" 
              value={quickAdd}
              onChange={e => setQuickAdd(e.target.value)}
              placeholder={isToday ? t('Add a task for today...') : t('Add a task for this day...')}
              className="field min-w-0 flex-1"
            />
            <button
              type="submit"
              className="directional-add-button"
              title={t('Add task to end')}
              aria-label={t('Add task to end')}
            >
              <AddToEndIcon className="h-9 w-9" />
            </button>
          </form>}
      </div>

      {moveTaskId && (
        <WeekTaskMoveSheet
          week={getWeekString(todayStr)}
          onMove={(target) => handleMove(moveTaskId, target)}
          onClose={() => setMoveTaskId(null)}
        />
      )}

      <ConfirmModal
        isOpen={deleteConfirm.isOpen}
        onClose={() => setDeleteConfirm({ isOpen: false, taskId: null })}
        onConfirm={() => {
          if (deleteConfirm.taskId) {
            handleDelete(deleteConfirm.taskId);
            setDeleteConfirm({ isOpen: false, taskId: null });
          }
        }}
        title={t('Delete Task')}
        message={t('Delete this task permanently?')}
        variant="danger"
        confirmText={t('Delete')}
      />
    </>
  );
};

export const TodayView: React.FC = () => <DayOverview date={getTodayString()} />;

export const DayView: React.FC = () => {
  const { state } = useAppStore();
  const date = state.dayNavigationTarget ?? getTodayString();
  return <DayOverview date={date} navigable />;
};
