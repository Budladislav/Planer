import React, { useState } from 'react';
import { useAppStore } from '../../store';
import { Task } from '../../types';
import { generateId, formatDateReadable, getTodayString, formatTime } from '../../utils';
import { Check, Trash2, Calendar, Plus, ChevronDown, ChevronRight } from 'lucide-react';

export const DoneView: React.FC = () => {
  const { state, dispatch } = useAppStore();
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
    if (window.confirm('Delete this task permanently?')) {
      dispatch({ type: 'DELETE_TASK', payload: id });
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
    return (
      <div className="group flex items-center p-3 bg-white border border-slate-200 rounded-lg hover:shadow-sm transition-all opacity-75">
        <div className="flex-shrink-0 w-6 h-6 rounded-full bg-green-500 border-2 border-green-500 text-white mr-3 flex items-center justify-center">
          <Check className="w-4 h-4" />
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-slate-900 line-through text-slate-500 truncate">
            {task.title}
          </p>
          <div className="flex items-center gap-2 mt-1">
            {task.frog && <span className="text-xs bg-green-100 text-green-800 px-1.5 py-0.5 rounded">Frog 🐸</span>}
            {task.timeSpent && task.timeSpent > 0 && (
              <span className="text-xs text-slate-500">
                {formatTime(task.timeSpent)}
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={() => handleUndo(task.id)}
            className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
            title="Mark as todo"
          >
            <Check className="w-4 h-4 rotate-180" />
          </button>
          <button
            onClick={() => handleDelete(task.id)}
            className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            title="Delete"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="max-w-3xl mx-auto">
      {/* Header - Centered */}
      <div className="text-center mb-6">
        <h2 className="text-3xl font-bold text-slate-900">Done</h2>
        <p className="text-slate-500">
          Completed tasks: {doneTasks.length}
        </p>
      </div>

      {/* Tasks List - with bottom padding for fixed form */}
      <div className="pb-24 lg:pb-4 space-y-6 min-h-[60vh] flex flex-col">
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
                      className="w-full flex items-center justify-between p-4 hover:bg-slate-50 transition-colors text-left"
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
                      <div className="px-4 pb-4 space-y-2 bg-slate-50/50">
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
  );
};

