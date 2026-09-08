import React, { useState } from 'react';
import { useAppStore } from '../../store';
import { CalendarArrowDown, Check, ChevronDown, Pencil, Plus, RotateCcw } from 'lucide-react';
import { getDateString, getTodayString, generateId, formatDateReadable, getWeekString } from '../../utils';
import {
  getCompletedTasksForLocalDay,
  getLocalDateFromTimestamp,
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
import { RewardGradeIncrementButton, RewardGradeMarker, RewardGradeSelector, RewardGradeSurface } from '../../features/rewards-lab/ui/RewardGradeControls';
import { RewardsBalancePill } from '../../features/rewards-lab/ui/RewardsBalancePill';
import { DayMetaBadges, DayNotesEditor } from '../DayNotes';
import { useI18n } from '../../i18n';

// Sortable Task Item Component
const SortableTaskItem: React.FC<{ 
  task: Task; 
  onComplete: (id: string) => void;
  onCompleteYesterday: (id: string) => void;
  onMoveTomorrow: (id: string) => void;
  onUpdate: (id: string, updates: Partial<Task>) => void;
  onDeleteConfirm: (id: string) => void;
}> = ({ task, onComplete, onCompleteYesterday, onMoveTomorrow, onUpdate, onDeleteConfirm }) => {
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
      <form onSubmit={handleSaveEdit} className="p-3 bg-white border-2 border-indigo-100 rounded-lg shadow-md space-y-3 text-sm">
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
            className="w-full p-2 border border-slate-300 rounded-lg focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none resize-none overflow-hidden min-h-[2.5rem]"
            rows={1}
            autoFocus
          />
        </div>
        <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={handleCancelEdit}
              className="px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-100 rounded-lg"
            >
              {t('Cancel')}
            </button>
            <button type="submit" className="px-3 py-1.5 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">
              {t('Save')}
            </button>
        </div>
      </form>
    );
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="relative w-full max-w-full overflow-hidden rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm transition-all hover:border-slate-300"
      onClick={() => setShowActions((prev) => !prev)}
    >
      <RewardGradeSurface taskId={task.id} />
      <div
        {...attributes}
        {...listeners}
        className={`flex gap-2 flex-1 min-w-0 cursor-grab active:cursor-grabbing touch-none ${
          showActions ? 'items-start' : 'items-center'
        }`}
      >
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <RewardGradeMarker taskId={task.id} />
          <span className={`text-sm text-slate-700 font-medium ${showActions ? 'break-all' : 'truncate'} ${task.status === 'done' ? 'line-through text-slate-400' : ''}`}>
            {task.title}
          </span>
        </div>
        <div className="flex flex-shrink-0 items-center gap-1">
          {!showActions && <RewardGradeIncrementButton taskId={task.id} />}
          {showActions && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setIsEditing(true);
              }}
              onMouseDown={(e) => e.stopPropagation()}
              onTouchStart={(e) => e.stopPropagation()}
              className="-my-1 flex h-10 w-10 items-center justify-center rounded-lg text-slate-600"
              title={t('Edit task')}
              aria-label={t('Edit task')}
            >
              <span className="flex h-8 w-8 items-center justify-center rounded-md bg-slate-100 transition-colors hover:bg-slate-200">
                <Pencil className="h-4 w-4" />
              </span>
            </button>
          )}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onComplete(task.id);
            }}
            onMouseDown={(e) => e.stopPropagation()}
            onTouchStart={(e) => e.stopPropagation()}
            className={`-my-1 flex h-10 w-10 items-center justify-center rounded-lg text-green-700 ${showActions ? 'mt-0' : ''}`}
            title={t('Mark as done')}
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-md bg-green-50 transition-colors hover:bg-green-100">
              <Check className="h-4 w-4" />
            </span>
          </button>
        </div>
      </div>

      <div
        className={`flex flex-wrap items-center justify-between gap-2 px-1 transition-all duration-200 sm:px-4 ${
          showActions ? 'mt-2 opacity-100 max-h-64' : 'mt-0 opacity-0 max-h-0 overflow-hidden'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {showActions && (
          <div className="w-full">
            <RewardGradeSelector taskId={task.id} compact />
          </div>
        )}
        <button
          onClick={() => onDeleteConfirm(task.id)}
          className="px-3 py-1.5 text-xs font-semibold text-red-700 bg-red-50 rounded hover:bg-red-100 transition-colors"
          title={t('Delete task')}
        >
          {t('Delete')}
        </button>
        <div className="flex items-center gap-2 flex-1 justify-center">
          <button
            onClick={() => onMoveTomorrow(task.id)}
            className="inline-flex items-center gap-1.5 whitespace-nowrap rounded bg-sky-50 px-3 py-1.5 text-xs font-semibold text-sky-800 transition-colors hover:bg-sky-100"
            title={t('Move this task to tomorrow')}
          >
            <CalendarArrowDown className="h-3.5 w-3.5" />
            {t('Tomorrow')}
          </button>
          <button
            onClick={() => onCompleteYesterday(task.id)}
            className="whitespace-nowrap rounded bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-800 transition-colors hover:bg-amber-100"
            title={t('Record this task as completed yesterday')}
          >
            {t('Done yesterday')}
          </button>
        </div>
      </div>
    </div>
  );
};


export const TodayView: React.FC = () => {
  const { state, dispatch } = useAppStore();
  const { language, locale, t } = useI18n();
  const [quickAdd, setQuickAdd] = useState('');
  const [notesEditorDate, setNotesEditorDate] = useState<string | null>(null);
  const todayStr = getTodayString();
  const [deleteConfirm, setDeleteConfirm] = useState<{ isOpen: boolean; taskId: string | null }>({
    isOpen: false,
    taskId: null,
  });

  // All tasks for today and past days that are not done
  // Show tasks scheduled for today OR past days that are still todo
  const allTodayTasks = state.tasks.filter(t => {
    if (!t.plan.day) return false;
    // Show today's tasks regardless of status
    if (t.plan.day === todayStr) return true;
    // Show past days' tasks only if they are still todo
    return t.plan.day < todayStr && t.status === 'todo';
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

  const handleQuickAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickAdd.trim()) return;
    
    const newTaskId = generateId();
    dispatch({
      type: 'ADD_TASK',
      payload: {
        id: newTaskId,
        title: quickAdd.trim(),
        status: 'todo',
        plan: { day: todayStr, week: null, month: todayStr.slice(0, 7) },
        projectId: null,
        eventId: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        completedAt: null,
      }
    });
    // Add new task to the end of the order (based on current orderedIds)
    const newOrder = [...orderedIds, newTaskId];
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
    // Always set plan.day to today when completing, so it appears in Done under today's date
    completeTask(dispatch, task, {
      plan: { day: todayStr, week: null, month: todayStr.slice(0, 7) },
    });
  };

  const handleCompleteYesterday = (id: string) => {
    const task = state.tasks.find(candidate => candidate.id === id);
    if (!task) return;
    const newOrder = orderedIds.filter(taskId => taskId !== id);
    const completedAt = getPreviousLocalDayTimestamp();
    const completedDay = getLocalDateFromTimestamp(completedAt) ?? todayStr;
    dispatch({ type: 'UPDATE_TASK_ORDER', payload: { day: todayStr, order: newOrder } });
    completeTask(dispatch, task, {
      completedAt,
      plan: { day: completedDay, week: getWeekString(completedDay), month: completedDay.slice(0, 7) },
    });
  };

  const handleMoveTomorrow = (id: string) => {
    const tomorrow = new Date(`${todayStr}T12:00:00`);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = getDateString(tomorrow);
    dispatch({
      type: 'UPDATE_TASK',
      payload: {
        id,
        plan: { day: tomorrowStr, week: getWeekString(tomorrowStr), month: tomorrowStr.slice(0, 7) },
      },
    });
  };

  const handleUndoComplete = (id: string) => {
    const task = state.tasks.find(candidate => candidate.id === id);
    if (!task) return;
    const currentOrder = state.taskOrderByDay[todayStr] || [];
    if (!currentOrder.includes(id)) {
      dispatch({ type: 'UPDATE_TASK_ORDER', payload: { day: todayStr, order: [...currentOrder, id] } });
    }
    reopenTask(dispatch, task, {
      plan: { day: todayStr, week: null, month: todayStr.slice(0, 7) },
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

  return (
    <>
      <div className="max-w-3xl mx-auto">
          {/* Today Section - Header */}
          <div className="text-center mb-3">
            <h2 className="hidden text-3xl font-bold text-slate-900 lg:block">{t('Today')}</h2>
            <p className="text-slate-500">{formatDateReadable(todayStr, language)}</p>
            <DayMetaBadges
              date={todayStr}
              onEdit={() => setNotesEditorDate(todayStr)}
              maxNotes={2}
              className="mt-1 justify-center"
            />
            <div className="mt-1 flex flex-wrap items-center justify-center gap-2">
              <p className="text-sm text-slate-400">
                {t('{todo} left • {done} done', { todo: todoTasks.length, done: completedTodayTasks.length })}
              </p>
              <RewardsBalancePill />
            </div>
          </div>

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
                    <div className="text-center py-8 text-slate-400 italic border border-dashed border-slate-200 rounded-lg w-full">
                      {t('No pending tasks for today. Check your Week plan?')}
                    </div>
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
                          onCompleteYesterday={handleCompleteYesterday}
                          onMoveTomorrow={handleMoveTomorrow}
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

            <section className="overflow-hidden rounded-lg border border-slate-200 bg-white">
              <button
                type="button"
                onClick={toggleCompletedToday}
                className="flex w-full items-center justify-between gap-3 px-3 py-2.5 text-left transition-colors hover:bg-slate-50"
                aria-expanded={state.uiPreferences.todayCompletedExpanded}
              >
                <span className="flex min-w-0 items-center gap-2 text-sm font-semibold text-slate-700">
                  <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-green-50 text-green-700">
                    <Check className="h-3.5 w-3.5" />
                  </span>
                  {t('Completed today ({count})', { count: completedTodayTasks.length })}
                </span>
                <span className="flex flex-shrink-0 items-center gap-2 text-xs text-slate-500">
                  <ChevronDown className={`h-4 w-4 transition-transform ${state.uiPreferences.todayCompletedExpanded ? 'rotate-180' : ''}`} />
                </span>
              </button>

              {state.uiPreferences.todayCompletedExpanded && (
                <div className="divide-y divide-slate-100 border-t border-slate-100">
                  {completedTodayTasks.length === 0 ? (
                    <p className="px-3 py-4 text-center text-sm italic text-slate-400">{t('No tasks completed today yet.')}</p>
                  ) : completedTodayTasks.map(task => (
                    <div key={task.id} className="flex items-center gap-3 px-3 py-2.5">
                      <RewardGradeMarker taskId={task.id} />
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-medium text-slate-500 line-through">{task.title}</div>
                        <div className="mt-0.5 text-xs text-slate-400">
                          {new Date(getTaskCompletionTimestamp(task)).toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleUndoComplete(task.id)}
                        className="flex flex-shrink-0 items-center gap-1 rounded-md bg-slate-100 px-2.5 py-1.5 text-xs font-semibold text-slate-600 transition-colors hover:bg-slate-200"
                        title={t("Return task to today's list")}
                      >
                        <RotateCcw className="h-3.5 w-3.5" />
                        {t('Undo')}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>

          {/* Add Form - Fixed at bottom */}
          <form onSubmit={handleQuickAdd} className="lg:hidden fixed bottom-16 left-0 right-0 p-4 bg-slate-50 border-t border-slate-200 z-20">
            <div className="max-w-3xl mx-auto flex items-center gap-3">
              <input 
                type="text" 
                value={quickAdd}
                onChange={e => setQuickAdd(e.target.value)}
                placeholder={t('Add a task for today...')}
                className="flex-1 p-3 border border-slate-300 rounded-lg focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-shadow bg-white"
              />
              <button 
                type="submit" 
                className="w-12 h-12 bg-slate-900 text-white rounded-full shadow-lg hover:bg-slate-800 hover:shadow-xl hover:scale-110 transition-all flex items-center justify-center flex-shrink-0"
                title={t('Add task')}
              >
                <Plus className="w-6 h-6" />
              </button>
            </div>
          </form>
          <DayNotesEditor date={notesEditorDate} onClose={() => setNotesEditorDate(null)} />

          {/* Add Form - Desktop */}
          <form onSubmit={handleQuickAdd} className="hidden lg:flex items-center gap-3">
            <input 
              type="text" 
              value={quickAdd}
              onChange={e => setQuickAdd(e.target.value)}
              placeholder={t('Add a task for today...')}
              className="flex-1 p-3 border border-slate-300 rounded-lg focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-shadow"
            />
            <button 
              type="submit" 
              className="w-12 h-12 bg-slate-900 text-white rounded-full shadow-lg hover:bg-slate-800 hover:shadow-xl hover:scale-110 transition-all flex items-center justify-center flex-shrink-0"
              title={t('Add task')}
            >
              <Plus className="w-6 h-6" />
            </button>
          </form>
      </div>

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
