import React, { useState, useEffect, useRef } from 'react';
import { useAppStore } from '../../store';
import { Check, Pause, Target, Play, Plus, Trash2, Edit2, X } from 'lucide-react';
import { getTodayString, generateId, formatDateReadable, formatTime } from '../../utils';
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
  onDelete: (id: string) => void;
  onComplete: (id: string) => void;
  onUpdate: (id: string, updates: Partial<Task>) => void;
  isFirst?: boolean;
}> = ({ task, onSetActive, onDelete, onComplete, onUpdate, isFirst = false }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(task.title);
  const [editFrog, setEditFrog] = useState(task.frog);
  const [showActions, setShowActions] = useState(false);
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
      frog: editFrog,
    });
    setIsEditing(false);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditTitle(task.title);
    setEditFrog(task.frog);
  };

  // Update edit state when task changes
  React.useEffect(() => {
    setEditTitle(task.title);
    setEditFrog(task.frog);
  }, [task.title, task.frog]);

  if (isEditing) {
    return (
      <form onSubmit={handleSaveEdit} className="p-4 bg-white border-2 border-indigo-100 rounded-lg shadow-md space-y-4">
        <div>
          <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Title</label>
          <input
            type="text"
            required
            value={editTitle}
            onChange={(e) => setEditTitle(e.target.value)}
            className="w-full p-2 border border-slate-300 rounded-lg focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
            autoFocus
          />
        </div>
        <div className="flex justify-center">
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={editFrog}
              onChange={(e) => setEditFrog(e.target.checked)}
              className="w-4 h-4 text-indigo-600 rounded"
            />
            <span className="text-sm text-slate-700">Eat the Frog? 🐸</span>
          </label>
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
      className={`p-4 rounded-lg w-full max-w-full overflow-hidden transition-colors ${
        isFirst
          ? 'bg-indigo-50/50 border-2 border-indigo-300 shadow-sm'
          : 'bg-white border border-slate-200 hover:border-slate-300'
      }`}
      onClick={() => setShowActions((prev) => !prev)}
    >
      <div
        {...attributes}
        {...listeners}
        className="flex items-center gap-3 flex-1 min-w-0 cursor-grab active:cursor-grabbing touch-none"
      >
        {task.frog && <span role="img" aria-label="frog" className="flex-shrink-0">🐸</span>}
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <span className={`text-slate-700 font-medium truncate ${task.status === 'done' ? 'line-through text-slate-400' : ''}`}>
            {task.title}
          </span>
          {task.timeSpent && task.timeSpent > 0 && (
            <span className="text-xs text-slate-500 flex-shrink-0">({formatTime(task.timeSpent)})</span>
          )}
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation();
            setIsEditing(true);
          }}
          onMouseDown={(e) => e.stopPropagation()}
          onTouchStart={(e) => e.stopPropagation()}
          className="px-3 py-1.5 text-xs font-semibold text-slate-600 bg-slate-100 rounded hover:bg-slate-200 flex-shrink-0 transition-colors"
          title="Edit task"
        >
          Edit
        </button>
      </div>

      <div
        className={`flex items-center justify-between px-4 gap-3 transition-all duration-200 ${
          showActions ? 'mt-3 opacity-100 max-h-40' : 'mt-0 opacity-0 max-h-0 overflow-hidden'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={() => {
            if (window.confirm('Delete this task permanently?')) {
              onDelete(task.id);
            }
          }}
          className="px-3 py-1.5 text-xs font-semibold text-red-700 bg-red-50 rounded hover:bg-red-100 transition-colors"
          title="Delete task"
        >
          Delete
        </button>
        <button
          onClick={() => onComplete(task.id)}
          className="px-3 py-1.5 text-xs font-semibold text-green-700 bg-green-50 rounded hover:bg-green-100 transition-colors"
          title="Mark as done"
        >
          Done
        </button>
      </div>
    </div>
  );
};


export const TodayView: React.FC<{ onNavigate: (v: any) => void }> = ({ onNavigate }) => {
  const { state, dispatch } = useAppStore();
  const [quickAdd, setQuickAdd] = useState('');
  const todayStr = getTodayString();

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
  const doneTasks = allTodayTasks.filter(t => t.status === 'done');
  
  // Tasks for today that are todo and NOT the active task
  const availableTasks = todoTasks.filter(t => t.id !== state.activeTaskId);
  
  // Store the position of the active task when it becomes active
  const [activeTaskPosition, setActiveTaskPosition] = useState<number | null>(null);

  // Use local state for task order (can be persisted to store later)
  const [taskOrder, setTaskOrder] = useState<string[]>(() => {
    // Initialize with sorted order (frogs first)
    return availableTasks.sort((a, b) => {
      if (a.frog && !b.frog) return -1;
      if (!a.frog && b.frog) return 1;
      return 0;
    }).map(t => t.id);
  });

  // Track previous activeTaskId to detect when task is paused
  const prevActiveTaskIdRef = useRef<string | null>(state.activeTaskId);
  
  // Timer state
  const [timerSeconds, setTimerSeconds] = useState(0);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const timerStartTimeRef = useRef<number | null>(null);
  const [isCompleting, setIsCompleting] = useState(false);
  
  // Update order when tasks change (only add new tasks, preserve position when task returns from active)
  useEffect(() => {
    const currentIds = availableTasks.map(t => t.id);
    
    // Check if we just paused (activeTaskId went from something to null)
    if (prevActiveTaskIdRef.current !== null && state.activeTaskId === null && activeTaskPosition !== null) {
      // Find the task that was just paused (it should be in availableTasks but not in taskOrder)
      const pausedTaskId = currentIds.find(id => !taskOrder.includes(id));
      if (pausedTaskId !== undefined) {
        // Restore it to its previous position
        const newOrder = [...taskOrder];
        newOrder.splice(activeTaskPosition, 0, pausedTaskId);
        setTaskOrder(newOrder);
        setActiveTaskPosition(null);
        prevActiveTaskIdRef.current = null;
        return;
      }
    }
    
    // Update ref
    prevActiveTaskIdRef.current = state.activeTaskId;
    
    // Keep existing order for tasks that are still available
    const existingOrder = taskOrder.filter(id => currentIds.includes(id));
    // Add new tasks at the end (only truly new tasks, not returning from active)
    const newIds = currentIds.filter(id => !taskOrder.includes(id));
    // Only update if there are actually new tasks
    if (newIds.length > 0) {
      setTaskOrder([...existingOrder, ...newIds]);
    }
  }, [availableTasks.length, state.activeTaskId]);

  // Get ordered tasks
  const orderedTasks = taskOrder
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

    // Reordering within list
    const oldIndex = taskOrder.indexOf(activeId);
    const newIndex = taskOrder.indexOf(overId);
    if (oldIndex !== -1 && newIndex !== -1) {
      setTaskOrder(arrayMove(taskOrder, oldIndex, newIndex));
    }
  };

  const handleQuickAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickAdd.trim()) return;
    
    dispatch({
      type: 'ADD_TASK',
      payload: {
        id: generateId(),
        title: quickAdd.trim(),
        status: 'todo',
        plan: { day: todayStr, week: null },
        frog: false,
        projectId: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }
    });
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
            plan: { day: todayStr, week: null }
          } 
        });
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
    dispatch({ type: 'SET_ACTIVE_TASK', payload: { id: null, startedAt: null } });
  };

  const handleSetActive = (id: string) => {
    // Save the position of the task before making it active
    const position = taskOrder.indexOf(id);
    if (position !== -1) {
      setActiveTaskPosition(position);
      // Remove from order temporarily
      setTaskOrder(taskOrder.filter(taskId => taskId !== id));
    }
    dispatch({ type: 'SET_ACTIVE_TASK', payload: { id, startedAt: Date.now() } });
  };

  const handleDelete = (id: string) => {
    // Remove from task order if present
    setTaskOrder(taskOrder.filter(taskId => taskId !== id));
    dispatch({ type: 'DELETE_TASK', payload: id });
  };

  const handleComplete = (id: string) => {
    // Remove from task order if present
    setTaskOrder(taskOrder.filter(taskId => taskId !== id));
    // Always set plan.day to today when completing, so it appears in Done under today's date
    dispatch({ 
      type: 'UPDATE_TASK', 
      payload: { 
        id, 
        status: 'done',
        plan: { day: todayStr, week: null }
      } 
    });
  };

  const handleUpdate = (id: string, updates: Partial<Task>) => {
    dispatch({ type: 'UPDATE_TASK', payload: { id, ...updates } });
  };

  return (
    <>
      {activeTask ? (
        // Active Task View - Centered with background
        <div className={`fixed inset-0 flex items-center justify-center p-4 transition-all duration-500 ${
          activeTask.frog 
            ? 'bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50' 
            : 'bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50'
        } ${isCompleting ? 'scale-110 opacity-0' : ''}`}>
          <div className="max-w-3xl w-full">
            <div className="relative group">
              <div className={`absolute -inset-1 rounded-2xl opacity-60 blur-xl transition duration-1000 group-hover:opacity-80 ${
                activeTask.frog
                  ? 'bg-gradient-to-r from-green-400 via-emerald-400 to-teal-400'
                  : 'bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400'
              } ${isCompleting ? 'animate-ping' : ''}`}></div>
              <div className={`relative bg-white/95 backdrop-blur-sm rounded-2xl p-12 shadow-2xl border border-white/50 transition-all duration-500 ${
                isCompleting ? 'scale-110 rotate-3' : ''
              }`}>
                <div className="flex items-center justify-center gap-3 mb-6">
                  {activeTask.frog && (
                    <span 
                      className={`text-5xl transition-all duration-300 ${
                        isCompleting ? 'animate-spin scale-150' : 'animate-bounce'
                      }`} 
                      role="img" 
                      aria-label="frog"
                    >
                      🐸
                    </span>
                  )}
                </div>
                <h3 className="text-3xl md:text-5xl font-bold text-slate-900 mb-6 leading-tight text-center">
                  {activeTask.title}
                </h3>
                <div className="text-center mb-12">
                  <div className={`text-4xl md:text-6xl font-mono font-bold transition-colors ${
                    activeTask.frog ? 'text-green-600' : 'text-indigo-600'
                  } ${isCompleting ? 'text-green-500' : ''}`}>
                    {formatTime(timerSeconds)}
                  </div>
                </div>
                
                <div className="flex flex-wrap gap-4 justify-center">
                  <button
                    onClick={handleDone}
                    disabled={isCompleting}
                    className={`flex items-center gap-2 px-10 py-4 rounded-xl transition-all font-medium text-lg shadow-lg hover:shadow-xl hover:-translate-y-1 ${
                      activeTask.frog
                        ? 'bg-green-600 text-white hover:bg-green-700'
                        : 'bg-slate-900 text-white hover:bg-slate-800'
                    } ${isCompleting ? 'animate-pulse scale-110' : ''}`}
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
          <div className="text-center mb-6">
            <h2 className="text-3xl font-bold text-slate-900">Today</h2>
            <p className="text-slate-500">{formatDateReadable(todayStr)}</p>
            <p className="text-slate-400 text-sm mt-1">
              {todoTasks.length} left • {doneTasks.length} done
              {(() => {
                const totalTime = doneTasks.reduce((sum, task) => sum + (task.timeSpent || 0), 0);
                return totalTime > 0 ? (
                  <span className="text-indigo-600 font-medium">
                    {' • '}
                    {formatTime(totalTime)}
                  </span>
                ) : null;
              })()}
            </p>
          </div>

          {/* Tasks List - with bottom padding for fixed form */}
          <div className="pb-24 lg:pb-4 min-h-[60vh] flex flex-col">
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <div className="space-y-4 flex-1 flex flex-col">
                {todayTasks.length === 0 ? (
                  <div className="flex-1 flex items-center justify-center">
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
                          onDelete={handleDelete}
                          onComplete={handleComplete}
                          onUpdate={handleUpdate}
                          isFirst={index === 0}
                        />
                        ))}
                      </div>
                    </SortableContext>
                  </div>
                )}
              </div>
            </DndContext>
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
              {todayTasks.length > 0 && (
                <button
                  onClick={() => handleSetActive(todayTasks[0].id)}
                  className="w-12 h-12 bg-indigo-600 text-white rounded-full shadow-lg hover:bg-indigo-700 hover:shadow-xl hover:scale-110 transition-all flex items-center justify-center flex-shrink-0"
                  title="Start Focus"
                >
                  <Play className="w-5 h-5 fill-current" />
                </button>
              )}
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
            {todayTasks.length > 0 && (
              <button
                onClick={() => handleSetActive(todayTasks[0].id)}
                className="w-12 h-12 bg-indigo-600 text-white rounded-full shadow-lg hover:bg-indigo-700 hover:shadow-xl hover:scale-110 transition-all flex items-center justify-center flex-shrink-0"
                title="Start Focus"
              >
                <Play className="w-5 h-5 fill-current" />
              </button>
            )}
          </form>
        </div>
      )}
    </>
  );
};