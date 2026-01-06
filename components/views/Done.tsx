import React, { useState } from 'react';
import { useAppStore } from '../../store';
import { Task } from '../../types';
import { generateId, getTodayString, formatTime } from '../../utils';
import { Trash2, Calendar, Plus, ChevronDown, ChevronRight } from 'lucide-react';
import { ConfirmModal } from '../Modal';

export const DoneView: React.FC = () => {
  const { state, dispatch } = useAppStore();
  const [deleteConfirm, setDeleteConfirm] = useState<{ isOpen: boolean; taskId: string | null }>({
    isOpen: false,
    taskId: null,
  });
  const [quickAdd, setQuickAdd] = useState('');
  const todayStr = getTodayString();
  
  // State for expanded dates - default: today is expanded
  const [expandedDates, setExpandedDates] = useState<Set<string>>(() => {
    return new Set([todayStr]);
  });

  // Get all done tasks, sorted by updatedAt (most recent first)
  const doneTasks = state.tasks
    .filter(t => t.status === 'done')
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

  // Group by date
  const tasksByDate = doneTasks.reduce((acc, task) => {
    const date = task.plan.day || task.updatedAt.split('T')[0];
    if (!acc[date]) {
      acc[date] = [];
    }
    acc[date].push(task);
    return acc;
  }, {} as Record<string, Task[]>);

  const handleQuickAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickAdd.trim()) return;

    dispatch({
      type: 'ADD_TASK',
      payload: {
        id: generateId(),
        title: quickAdd.trim(),
        status: 'done',
        plan: { day: getTodayString(), week: null },
        frog: false,
        projectId: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    });
    setQuickAdd('');
  };

  const handleUndo = (id: string) => {
    dispatch({ type: 'UPDATE_TASK', payload: { id, status: 'todo' } });
  };

  const handleDelete = (id: string) => {
    setDeleteConfirm({ isOpen: true, taskId: id });
  };

  const handleDeleteConfirm = () => {
    if (deleteConfirm.taskId) {
      dispatch({ type: 'DELETE_TASK', payload: deleteConfirm.taskId });
      setDeleteConfirm({ isOpen: false, taskId: null });
    }
  };

  const toggleDate = (date: string) => {
    setExpandedDates(prev => {
      const newSet = new Set(prev);
      if (newSet.has(date)) {
        newSet.delete(date);
      } else {
        newSet.add(date);
      }
      return newSet;
    });
  };

  const formatDateWithYear = (dateStr: string): string => {
    const date = new Date(dateStr);
    const weekday = date.toLocaleDateString('en-US', { weekday: 'long' });
    const month = date.toLocaleDateString('en-US', { month: 'short' });
    const day = date.getDate();
    const year = date.getFullYear();
    return `${weekday}, ${month} ${day}, ${year}`;
  };

  const TaskItem: React.FC<{ task: Task }> = ({ task }) => {
    const [showActions, setShowActions] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [editTitle, setEditTitle] = useState(task.title);
    const [editFrog, setEditFrog] = useState(task.frog);

    // Only allow "Undone" for tasks completed today
    const completedDate = task.plan.day || task.updatedAt.split('T')[0];
    const canUndo = completedDate === todayStr;

    const handleSaveEdit = (e: React.FormEvent) => {
      e.preventDefault();
      if (!editTitle.trim()) return;
      
      dispatch({
        type: 'UPDATE_TASK',
        payload: {
          id: task.id,
          title: editTitle.trim(),
          frog: editFrog,
        },
      });
      setIsEditing(false);
    };

    const handleCancelEdit = () => {
      setIsEditing(false);
      setEditTitle(task.title);
      setEditFrog(task.frog);
    };

    if (isEditing) {
      return (
        <form onSubmit={handleSaveEdit} className="p-3 bg-white border-2 border-indigo-100 rounded-lg shadow-md space-y-3 text-sm">
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Title</label>
            <input
              type="text"
              required
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              className="w-full p-2 border border-slate-300 rounded-lg focus:border-indigo-500 outline-none"
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
        className="p-3 bg-white border border-slate-200 rounded-lg shadow-sm w-full max-w-full overflow-hidden"
        onClick={() => setShowActions((prev) => !prev)}
      >
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            {task.frog && <span className="flex-shrink-0">🐸</span>}
            <span className="text-sm break-all line-through text-slate-500">
              {task.title}
            </span>
            {task.timeSpent && task.timeSpent > 0 && (
              <span className="text-xs text-slate-400 flex-shrink-0">
                ({formatTime(task.timeSpent)})
              </span>
            )}
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setIsEditing(true);
            }}
            className="px-2 py-1 bg-slate-100 text-slate-600 font-semibold rounded hover:bg-slate-200 text-xs flex-shrink-0"
            title="Edit"
          >
            Edit
          </button>
        </div>

        <div
          className={`flex items-center justify-between px-4 gap-3 transition-all duration-200 ${
            showActions ? 'opacity-100 max-h-40 mt-3' : 'opacity-0 max-h-0 overflow-hidden'
          }`}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={() => handleDelete(task.id)}
            className="px-3 py-1.5 text-xs font-semibold text-red-700 bg-red-50 rounded hover:bg-red-100"
            title="Delete"
          >
            Delete
          </button>
          {canUndo && (
            <button
              onClick={() => handleUndo(task.id)}
              className="px-3 py-1.5 text-xs font-semibold text-indigo-700 bg-indigo-50 rounded hover:bg-indigo-100"
              title="Mark as todo"
            >
              Undone
            </button>
          )}
        </div>
      </div>
    );
  };

  return (
    <>
    <div className="max-w-3xl mx-auto">
      {/* Header - Centered */}
      <div className="text-center mb-3">
        <h2 className="text-3xl font-bold text-slate-900">Done</h2>
        <p className="text-slate-500">
          Completed tasks: {doneTasks.length}
        </p>
      </div>

      {/* Tasks List - with bottom padding for fixed form */}
      <div className="pb-20 lg:pb-4 space-y-4 min-h-[60vh] flex flex-col">
        {doneTasks.length === 0 ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center py-12 border-2 border-dashed border-slate-200 rounded-xl w-full">
              <p className="text-slate-400 font-medium">No completed tasks yet</p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {Object.entries(tasksByDate)
              .sort((a, b) => b[0].localeCompare(a[0])) // Most recent first
              .map(([date, tasks]) => {
                const isExpanded = expandedDates.has(date);
                const totalTime = tasks.reduce((sum, task) => sum + (task.timeSpent || 0), 0);
                const dateObj = new Date(date);
                const year = dateObj.getFullYear();
                
                return (
                  <div key={date} className="border border-slate-200 rounded-lg overflow-hidden">
                    <button
                      onClick={() => toggleDate(date)}
                      className="w-full flex items-center justify-between px-3 py-2 hover:bg-slate-50 transition-colors text-left"
                    >
                      <div className="flex items-center gap-3 flex-1">
                        {isExpanded ? (
                          <ChevronDown className="w-5 h-5 text-slate-400 flex-shrink-0" />
                        ) : (
                          <ChevronRight className="w-5 h-5 text-slate-400 flex-shrink-0" />
                        )}
                        <Calendar className="w-4 h-4 text-slate-400 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <h3 className="text-sm font-semibold text-slate-700">
                            {formatDateWithYear(date)}
                          </h3>
                          <div className="flex items-center gap-3 mt-1">
                            <span className="text-xs text-slate-500">
                              {tasks.length} {tasks.length === 1 ? 'task' : 'tasks'}
                            </span>
                            {totalTime > 0 && (
                              <>
                                <span className="text-xs text-slate-400">•</span>
                                <span className="text-xs text-indigo-600 font-medium">
                                  {formatTime(totalTime)}
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    </button>
                    {isExpanded && (
                      <div className="px-3 pb-3 space-y-2 bg-slate-50/50">
                        {tasks.map(task => (
                          <TaskItem key={task.id} task={task} />
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
          </div>
        )}
      </div>

      {/* Add Form - Fixed at bottom */}
      <form onSubmit={handleQuickAdd} className="lg:hidden fixed bottom-16 left-0 right-0 p-4 bg-slate-50 border-t border-slate-200 z-20">
        <div className="max-w-3xl mx-auto flex items-center gap-3">
          <input 
            type="text" 
            value={quickAdd}
            onChange={e => setQuickAdd(e.target.value)}
            placeholder="Add a completed task..."
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
          placeholder="Add a completed task..."
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

    <ConfirmModal
      isOpen={deleteConfirm.isOpen}
      onClose={() => setDeleteConfirm({ isOpen: false, taskId: null })}
      onConfirm={handleDeleteConfirm}
      title="Delete Task"
      message="Delete this task permanently?"
      variant="danger"
      confirmText="Delete"
    />
    </>
  );
};

