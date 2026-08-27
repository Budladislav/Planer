import React, { useState, useEffect, useRef } from 'react';
import { useAppStore } from '../../store';
import { Check, ChevronDown, Pause, Play, Plus, RotateCcw } from 'lucide-react';
import { getTodayString, generateId, formatDateReadable, formatTime, getWeekString } from '../../utils';
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

// Sortable Task Item Component
const SortableTaskItem: React.FC<{ 
  task: Task; 
  onSetActive: (id: string) => void;
  onComplete: (id: string) => void;
  onCompleteYesterday: (id: string) => void;
  onUpdate: (id: string, updates: Partial<Task>) => void;
  onDeleteConfirm: (id: string) => void;
  isFirst?: boolean;
}> = ({ task, onSetActive, onComplete, onCompleteYesterday, onUpdate, onDeleteConfirm, isFirst = false }) => {
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
          <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Title</label>
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
              Cancel
            </button>
            <button type="submit" className="px-3 py-1.5 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">
              Save
            </button>
        </div>
      </form>
    );
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`px-3 py-2 rounded-lg w-full max-w-full overflow-hidden transition-all text-sm ${
        isFirst
          ? 'bg-indigo-50/50 border-2 border-indigo-300 shadow-sm'
          : 'bg-white border border-slate-200 hover:border-slate-300'
      }`}
      onClick={() => setShowActions((prev) => !prev)}
    >
      <div
        {...attributes}
        {...listeners}
        className={`flex gap-2 flex-1 min-w-0 cursor-grab active:cursor-grabbing touch-none ${
          showActions ? 'items-start' : 'items-center'
        }`}
      >
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <span className={`text-sm text-slate-700 font-medium ${showActions ? 'break-all' : 'truncate'} ${task.status === 'done' ? 'line-through text-slate-400' : ''}`}>
            {task.title}
          </span>
          {task.timeSpent && task.timeSpent > 0 && (
            <span className="text-xs text-slate-500 flex-shrink-0">({formatTime(task.timeSpent)})</span>
          )}
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onComplete(task.id);
          }}
          onMouseDown={(e) => e.stopPropagation()}
          onTouchStart={(e) => e.stopPropagation()}
          className={`-my-1 flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg text-green-700 ${showActions ? 'mt-0' : ''}`}
          title="Mark as done"
        >
          <span className="flex h-8 w-8 items-center justify-center rounded-md bg-green-50 transition-colors hover:bg-green-100">
            <Check className="h-4 w-4" />
          </span>
        </button>
      </div>

      <div
        className={`flex flex-wrap items-center justify-between gap-2 px-1 transition-all duration-200 sm:px-4 ${
          showActions ? 'mt-2 opacity-100 max-h-64' : 'mt-0 opacity-0 max-h-0 overflow-hidden'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={() => onDeleteConfirm(task.id)}
          className="px-3 py-1.5 text-xs font-semibold text-red-700 bg-red-50 rounded hover:bg-red-100 transition-colors"
          title="Delete task"
        >
          Delete
        </button>
        <div className="flex items-center gap-2 flex-1 justify-center">
          <button
            onClick={() => setIsEditing(true)}
            className="px-3 py-1.5 text-xs font-semibold text-slate-600 bg-slate-100 rounded hover:bg-slate-200 transition-colors"
            title="Edit task"
          >
            Edit
          </button>
          <button
            onClick={() => onCompleteYesterday(task.id)}
            className="whitespace-nowrap rounded bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-800 transition-colors hover:bg-amber-100"
            title="Record this task as completed yesterday"
          >
            Done yesterday
          </button>
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onSetActive(task.id);
          }}
          className="px-3 py-1.5 text-xs font-semibold text-indigo-700 bg-indigo-50 rounded hover:bg-indigo-100 transition-colors flex items-center gap-1.5"
          title="Start focus"
        >
          <Play className="w-3.5 h-3.5 fill-current" />
          Focus
        </button>
      </div>
    </div>
  );
};


export const TodayView: React.FC = () => {
  const { state, dispatch } = useAppStore();
  const [quickAdd, setQuickAdd] = useState('');
  const todayStr = getTodayString();
  const [deleteConfirm, setDeleteConfirm] = useState<{ isOpen: boolean; taskId: string | null }>({
    isOpen: false,
    taskId: null,
  });

  const activeTask = state.tasks.find(t => t.id === state.activeTaskId);
  
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
  const completedTodayTime = completedTodayTasks.reduce((sum, task) => sum + (task.timeSpent || 0), 0);
  
  // Tasks for today that are todo and NOT the active task
  const availableTasks = todoTasks.filter(t => t.id !== state.activeTaskId);

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
  
  // Timer state
  const [timerSeconds, setTimerSeconds] = useState(0);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const timerStartTimeRef = useRef<number | null>(null);
  const [isCompleting, setIsCompleting] = useState(false);
  
  // Get ordered tasks
  const orderedTasks = orderedIds
    .map(id => availableTasks.find(t => t.id === id))
    .filter(Boolean) as Task[];

  // All tasks go to the list (no automatic focus card)
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

  // Timer effect - start/stop timer based on active task (persistent via store)
  useEffect(() => {
    if (state.activeTaskId) {
      const currentTask = state.tasks.find(t => t.id === state.activeTaskId);
      if (currentTask) {
        const existingTime = currentTask.timeSpent || 0;
        const startedAt = state.activeTaskStartedAt ?? Date.now();
        timerStartTimeRef.current = startedAt;

        const compute = () => {
          const elapsed = Math.floor((Date.now() - startedAt) / 1000);
          setTimerSeconds(existingTime + Math.max(elapsed, 0));
        };

        compute();
        timerIntervalRef.current = setInterval(compute, 1000);
      }
    } else {
      // Stop timer
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }
      timerStartTimeRef.current = null;
      setTimerSeconds(0);
    }
    
    return () => {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
    };
  }, [state.activeTaskId, state.activeTaskStartedAt, state.tasks]);

  const handleDone = () => {
    if (activeTask && !isCompleting) {
      setIsCompleting(true);
      
      // Add celebration effect
      setTimeout(() => {
        // Save accumulated time
        const finalTime = timerSeconds;
        // Always set plan.day to today when completing, so it appears in Done under today's date
        dispatch({ 
          type: 'UPDATE_TASK', 
          payload: { 
            id: activeTask.id, 
            status: 'done',
            timeSpent: finalTime,
            plan: { day: todayStr, week: null, month: todayStr.slice(0, 7) }
          } 
        });
        // При завершении задачи она переходит в Done
        dispatch({ type: 'SET_ACTIVE_TASK', payload: { id: null, startedAt: null } });
        setIsCompleting(false);
      }, 600);
    }
  };

  const handleUnfocus = () => {
    if (activeTask) {
      // Save accumulated time when pausing
      const finalTime = timerSeconds;
      dispatch({ 
        type: 'UPDATE_TASK', 
        payload: { 
          id: activeTask.id,
          timeSpent: finalTime
        } 
      });
    }
    // Просто останавливаем фокус - задача остаётся на своём месте в порядке
    dispatch({ type: 'SET_ACTIVE_TASK', payload: { id: null, startedAt: null } });
  };

  const handleSetActive = (id: string) => {
    // Просто запускаем фокус для задачи по её id
    // Не удаляем из порядка - экран фокуса всё равно перекрывает весь UI
    dispatch({ type: 'SET_ACTIVE_TASK', payload: { id, startedAt: Date.now() } });
  };

  const handleDeleteConfirm = (id: string) => {
    setDeleteConfirm({ isOpen: true, taskId: id });
  };

  const handleDelete = (id: string) => {
    // Remove from task order if present
    const newOrder = orderedIds.filter(taskId => taskId !== id);
    dispatch({ type: 'UPDATE_TASK_ORDER', payload: { day: todayStr, order: newOrder } });
    dispatch({ type: 'DELETE_TASK', payload: id });
  };

  const handleComplete = (id: string) => {
    // Remove from task order if present
    const newOrder = orderedIds.filter(taskId => taskId !== id);
    dispatch({ type: 'UPDATE_TASK_ORDER', payload: { day: todayStr, order: newOrder } });
    // Always set plan.day to today when completing, so it appears in Done under today's date
    dispatch({ 
      type: 'UPDATE_TASK', 
      payload: { 
        id, 
        status: 'done',
        plan: { day: todayStr, week: null, month: todayStr.slice(0, 7) }
      } 
    });
  };

  const handleCompleteYesterday = (id: string) => {
    const newOrder = orderedIds.filter(taskId => taskId !== id);
    const completedAt = getPreviousLocalDayTimestamp();
    const completedDay = getLocalDateFromTimestamp(completedAt) ?? todayStr;
    dispatch({ type: 'UPDATE_TASK_ORDER', payload: { day: todayStr, order: newOrder } });
    dispatch({
      type: 'UPDATE_TASK',
      payload: {
        id,
        status: 'done',
        completedAt,
        plan: { day: completedDay, week: getWeekString(completedDay), month: completedDay.slice(0, 7) },
      },
    });
  };

  const handleUndoComplete = (id: string) => {
    const currentOrder = state.taskOrderByDay[todayStr] || [];
    if (!currentOrder.includes(id)) {
      dispatch({ type: 'UPDATE_TASK_ORDER', payload: { day: todayStr, order: [...currentOrder, id] } });
    }
    dispatch({
      type: 'UPDATE_TASK',
      payload: {
        id,
        status: 'todo',
        plan: { day: todayStr, week: null, month: todayStr.slice(0, 7) },
      },
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
      {activeTask ? (
        // Active Task View - Centered with background
        <div className={`fixed inset-0 flex items-center justify-center p-4 bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 transition-all duration-500 ${isCompleting ? 'scale-110 opacity-0' : ''}`}>
          <div className="max-w-3xl w-full">
            <div className="relative group">
              <div className={`absolute -inset-1 rounded-2xl bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 opacity-60 blur-xl transition duration-1000 group-hover:opacity-80 ${isCompleting ? 'animate-ping' : ''}`}></div>
              <div className={`relative bg-white/95 backdrop-blur-sm rounded-2xl p-12 shadow-2xl border border-white/50 transition-all duration-500 overflow-hidden ${
                isCompleting ? 'scale-110 rotate-3' : ''
              }`}>
                <h3 className="text-3xl md:text-5xl font-bold text-slate-900 mb-6 leading-tight text-center break-words overflow-hidden max-w-full px-4">
                  {activeTask.title}
                </h3>
                <div className="text-center mb-12">
                  <div className={`text-4xl md:text-6xl font-mono font-bold text-indigo-600 transition-colors ${isCompleting ? 'text-green-500' : ''}`}>
                    {formatTime(timerSeconds)}
                  </div>
                </div>
                
                <div className="flex flex-wrap gap-4 justify-center">
                  <button
                    onClick={handleDone}
                    disabled={isCompleting}
                    className={`flex items-center gap-2 px-10 py-4 bg-slate-900 text-white rounded-xl hover:bg-slate-800 transition-all font-medium text-lg shadow-lg hover:shadow-xl hover:-translate-y-1 ${isCompleting ? 'animate-pulse scale-110' : ''}`}
                  >
                    <Check className={`w-6 h-6 ${isCompleting ? 'animate-spin' : ''}`} />
                    Mark Done
                  </button>
                  <button
                    onClick={handleUnfocus}
                    disabled={isCompleting}
                    className="flex items-center gap-2 px-8 py-4 bg-white/80 border-2 border-slate-200 text-slate-600 rounded-xl hover:border-slate-300 hover:bg-white transition-all font-medium disabled:opacity-50"
                  >
                    <Pause className="w-5 h-5" />
                    Pause
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        // No Active Task View - Combined Today + Focus layout
        <div className="max-w-3xl mx-auto">
          {/* Today Section - Header */}
          <div className="text-center mb-3">
            <h2 className="hidden text-3xl font-bold text-slate-900 lg:block">Today</h2>
            <p className="text-slate-500">{formatDateReadable(todayStr)}</p>
            <p className="text-slate-400 text-sm mt-1">
              {todoTasks.length} left • {completedTodayTasks.length} done
              {completedTodayTime > 0 && (
                <span className="text-indigo-600 font-medium">
                  {' • '}
                  {formatTime(completedTodayTime)}
                </span>
              )}
            </p>
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
                      No pending tasks for today. Check your Week plan?
                    </div>
                  </div>
                ) : (
                  <div className="flex-1">
                    <SortableContext items={todayTasks.map(t => t.id)} strategy={verticalListSortingStrategy}>
                      <div className="space-y-2">
                        {todayTasks.map((task, index) => (
                        <SortableTaskItem 
                          key={task.id} 
                          task={task} 
                          onSetActive={handleSetActive}
                          onComplete={handleComplete}
                          onCompleteYesterday={handleCompleteYesterday}
                          onUpdate={handleUpdate}
                          onDeleteConfirm={handleDeleteConfirm}
                          isFirst={index === 0}
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
                  Completed today ({completedTodayTasks.length})
                </span>
                <span className="flex flex-shrink-0 items-center gap-2 text-xs text-slate-500">
                  {completedTodayTime > 0 && formatTime(completedTodayTime)}
                  <ChevronDown className={`h-4 w-4 transition-transform ${state.uiPreferences.todayCompletedExpanded ? 'rotate-180' : ''}`} />
                </span>
              </button>

              {state.uiPreferences.todayCompletedExpanded && (
                <div className="divide-y divide-slate-100 border-t border-slate-100">
                  {completedTodayTasks.length === 0 ? (
                    <p className="px-3 py-4 text-center text-sm italic text-slate-400">No tasks completed today yet.</p>
                  ) : completedTodayTasks.map(task => (
                    <div key={task.id} className="flex items-center gap-3 px-3 py-2.5">
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-medium text-slate-500 line-through">{task.title}</div>
                        <div className="mt-0.5 text-xs text-slate-400">
                          {new Date(getTaskCompletionTimestamp(task)).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          {task.timeSpent && task.timeSpent > 0 ? ` • ${formatTime(task.timeSpent)}` : ''}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleUndoComplete(task.id)}
                        className="flex flex-shrink-0 items-center gap-1 rounded-md bg-slate-100 px-2.5 py-1.5 text-xs font-semibold text-slate-600 transition-colors hover:bg-slate-200"
                        title="Return task to today's list"
                      >
                        <RotateCcw className="h-3.5 w-3.5" />
                        Undo
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
                placeholder="Add a task for today..."
                className="flex-1 p-3 border border-slate-300 rounded-lg focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-shadow bg-white"
              />
              <button 
                type="submit" 
                className="w-12 h-12 bg-slate-900 text-white rounded-full shadow-lg hover:bg-slate-800 hover:shadow-xl hover:scale-110 transition-all flex items-center justify-center flex-shrink-0"
                title="Add task"
              >
                <Plus className="w-6 h-6" />
              </button>
            </div>
          </form>

          {/* Add Form - Desktop */}
          <form onSubmit={handleQuickAdd} className="hidden lg:flex items-center gap-3">
            <input 
              type="text" 
              value={quickAdd}
              onChange={e => setQuickAdd(e.target.value)}
              placeholder="Add a task for today..."
              className="flex-1 p-3 border border-slate-300 rounded-lg focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-shadow"
            />
            <button 
              type="submit" 
              className="w-12 h-12 bg-slate-900 text-white rounded-full shadow-lg hover:bg-slate-800 hover:shadow-xl hover:scale-110 transition-all flex items-center justify-center flex-shrink-0"
              title="Add task"
            >
              <Plus className="w-6 h-6" />
            </button>
          </form>
        </div>
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
        title="Delete Task"
        message="Delete this task permanently?"
        variant="danger"
        confirmText="Delete"
      />
    </>
  );
};
