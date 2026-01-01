import React, { useState } from 'react';
import { useAppStore } from '../../store';
import { getWeekString, getWeekRange, generateId, getTodayString, getWeekDateRange } from '../../utils';
import { ArrowDownCircle, Trash2, Check, ChevronLeft, ChevronRight, Edit2, Plus } from 'lucide-react';

export const WeekView: React.FC = () => {
  const { state, dispatch } = useAppStore();
  const [currentWeek, setCurrentWeek] = useState(getWeekString());
  const [quickAdd, setQuickAdd] = useState('');

  const weekTasks = state.tasks.filter(t => t.plan.week === currentWeek && !t.plan.day); // Tasks in bucket, not assigned to day yet
  
  // Helper to change week
  const changeWeek = (delta: number) => {
     const [yearStr, weekStr] = currentWeek.split('-W');
     let year = parseInt(yearStr);
     let week = parseInt(weekStr) + delta;
     
     if (week > 52) { year++; week = 1; }
     if (week < 1) { year--; week = 52; }
     
     setCurrentWeek(`${year}-W${week.toString().padStart(2, '0')}`);
  };

  const handleQuickAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (quickAdd.trim()) {
      dispatch({
        type: 'ADD_TASK',
        payload: {
          id: generateId(),
          title: quickAdd.trim(),
          status: 'todo',
          plan: { week: currentWeek, day: null },
          frog: false,
          projectId: null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }
      });
      setQuickAdd('');
    }
  };

  const handleMoveToToday = (id: string) => {
    dispatch({
       type: 'UPDATE_TASK',
       payload: {
         id,
         plan: { day: getTodayString(), week: null } // Remove from week bucket, move to day
       }
    });
  };

  const TaskItem: React.FC<{ task: typeof weekTasks[0] }> = ({ task }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [editTitle, setEditTitle] = useState(task.title);
    const [editFrog, setEditFrog] = useState(task.frog);
    const [editWeek, setEditWeek] = useState(task.plan.week || currentWeek);

    const handleSaveEdit = (e: React.FormEvent) => {
      e.preventDefault();
      if (!editTitle.trim()) return;

      dispatch({
        type: 'UPDATE_TASK',
        payload: {
          id: task.id,
          title: editTitle.trim(),
          frog: editFrog,
          plan: { week: editWeek, day: null },
        },
      });
      setIsEditing(false);
    };

    const handleCancelEdit = () => {
      setIsEditing(false);
      setEditTitle(task.title);
      setEditFrog(task.frog);
      setEditWeek(task.plan.week || currentWeek);
    };

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
              className="w-full p-2 border border-slate-300 rounded-lg focus:border-indigo-500 outline-none"
              autoFocus
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Week</label>
            <div className="flex gap-2">
              <input
                type="number"
                min="2020"
                max="2100"
                value={editWeek.split('-W')[0]}
                onChange={(e) => {
                  const week = editWeek.split('-W')[1];
                  setEditWeek(`${e.target.value}-W${week}`);
                }}
                className="w-20 p-2 border border-slate-300 rounded-lg focus:border-indigo-500 outline-none"
                placeholder="Year"
              />
              <span className="self-center text-slate-400">-W</span>
              <input
                type="number"
                min="1"
                max="52"
                value={parseInt(editWeek.split('-W')[1])}
                onChange={(e) => {
                  const year = editWeek.split('-W')[0];
                  const week = e.target.value.padStart(2, '0');
                  setEditWeek(`${year}-W${week}`);
                }}
                className="w-16 p-2 border border-slate-300 rounded-lg focus:border-indigo-500 outline-none"
                placeholder="Week"
              />
            </div>
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
      <div className="flex items-center justify-between p-4 bg-white border border-slate-200 rounded-lg shadow-sm group">
        <div className="flex items-center gap-3">
           <span className={`font-medium ${task.status === 'done' ? 'line-through text-slate-400' : 'text-slate-700'}`}>
             {task.title}
           </span>
           {task.frog && <span>🐸</span>}
        </div>
        
        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
           <button 
             onClick={() => setIsEditing(true)}
             className="p-1.5 text-slate-400 hover:text-indigo-600"
             title="Edit"
           >
             <Edit2 className="w-4 h-4" />
           </button>
           <button 
             onClick={() => handleMoveToToday(task.id)}
             className="flex items-center gap-1 px-3 py-1.5 text-xs font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded"
             title="Do this Today"
           >
             <ArrowDownCircle className="w-3 h-3" />
             To Today
           </button>
           <button 
             onClick={() => {
               dispatch({ 
                 type: 'UPDATE_TASK', 
                 payload: { 
                   id: task.id, 
                   status: 'done',
                   plan: { week: null, day: getTodayString() } // Move to today when completed
                 } 
               });
             }}
             className="p-1.5 text-slate-400 hover:text-green-600"
           >
             <Check className="w-4 h-4" />
           </button>
           <button 
             onClick={() => dispatch({ type: 'DELETE_TASK', payload: task.id })}
             className="p-1.5 text-slate-400 hover:text-red-600"
           >
             <Trash2 className="w-4 h-4" />
           </button>
        </div>
      </div>
    );
  };

  const weekDateRange = getWeekDateRange(currentWeek);

  return (
    <div className="max-w-3xl mx-auto">
      {/* Header - Centered */}
      <div className="text-center mb-6">
        <h2 className="text-3xl font-bold text-slate-900">Weekly Plan</h2>
        <p className="text-slate-400 text-sm mt-1">
          {weekTasks.length} {weekTasks.length === 1 ? 'task' : 'tasks'} planned
        </p>
      </div>

      {/* Content - with bottom padding for fixed forms */}
      <div className="pb-48 lg:pb-24 min-h-[60vh] flex flex-col">
        {weekTasks.length === 0 ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center py-12 text-slate-400 border-2 border-dashed border-slate-200 rounded-xl w-full">
              No tasks planned specifically for this week's bucket.
            </div>
          </div>
        ) : (
          <div className="flex-1 space-y-3">
            <div className="grid gap-3">
              {weekTasks.map(task => (
                <TaskItem key={task.id} task={task} />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Week Selector - Fixed at bottom (mobile) */}
      <div className="lg:hidden fixed bottom-32 left-0 right-0 p-4 bg-slate-50 border-t border-slate-200 z-10">
        <div className="max-w-3xl mx-auto w-full">
          <div className="flex items-center justify-between bg-white border border-slate-200 rounded-lg p-2">
            <button 
              onClick={() => changeWeek(-1)} 
              className="p-2 hover:bg-slate-100 rounded transition-colors"
            >
              <ChevronLeft className="w-5 h-5 text-slate-600" />
            </button>
            <div className="flex-1 text-center px-4">
              <div className="font-mono font-medium text-slate-700 text-sm">
                {getWeekRange(currentWeek)}
              </div>
              <div className="text-xs text-slate-500 mt-1">
                {weekDateRange.start} - {weekDateRange.end}
              </div>
            </div>
            <button 
              onClick={() => changeWeek(1)} 
              className="p-2 hover:bg-slate-100 rounded transition-colors"
            >
              <ChevronRight className="w-5 h-5 text-slate-600" />
            </button>
          </div>
        </div>
      </div>

      {/* Add Form - Fixed at bottom (mobile) */}
      <form onSubmit={handleQuickAdd} className="lg:hidden fixed bottom-16 left-0 right-0 p-4 bg-slate-50 border-t border-slate-200 z-20">
        <div className="max-w-3xl mx-auto flex items-center gap-3">
          <input 
            type="text" 
            value={quickAdd}
            onChange={e => setQuickAdd(e.target.value)}
            placeholder={`Add task to ${getWeekRange(currentWeek)}...`}
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
      <form onSubmit={handleQuickAdd} className="hidden lg:flex items-center gap-3 mb-4">
        <input 
          type="text" 
          value={quickAdd}
          onChange={e => setQuickAdd(e.target.value)}
          placeholder={`Add task to ${getWeekRange(currentWeek)}...`}
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

      {/* Week Selector - Desktop */}
      <div className="hidden lg:block w-full">
        <div className="flex items-center justify-between bg-white border border-slate-200 rounded-lg p-3">
          <button 
            onClick={() => changeWeek(-1)} 
            className="p-2 hover:bg-slate-100 rounded transition-colors"
          >
            <ChevronLeft className="w-5 h-5 text-slate-600" />
          </button>
          <div className="flex-1 text-center px-4">
            <div className="font-mono font-medium text-slate-700">
              {getWeekRange(currentWeek)}
            </div>
            <div className="text-sm text-slate-500 mt-1">
              {weekDateRange.start} - {weekDateRange.end}
            </div>
          </div>
          <button 
            onClick={() => changeWeek(1)} 
            className="p-2 hover:bg-slate-100 rounded transition-colors"
          >
            <ChevronRight className="w-5 h-5 text-slate-600" />
          </button>
        </div>
      </div>
    </div>
  );
};