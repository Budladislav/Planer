import React, { useState } from 'react';
import { useAppStore } from '../../store';
import { Capture } from '../../types';
import { generateId, getTodayString, getWeekString, getWeekRange, getWeekDateRange } from '../../utils';
import { Trash2, X, Inbox, Plus, ChevronLeft, ChevronRight } from 'lucide-react';
import { ConfirmModal } from '../Modal';

export const InboxView: React.FC = () => {
  const { state, dispatch } = useAppStore();
  const [captureInput, setCaptureInput] = useState('');
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{ isOpen: boolean; captureId: string | null }>({
    isOpen: false,
    captureId: null,
  });

  // Filter new captures
  const newCaptures = state.captures.filter(c => c.status === 'new');

  const handleCapture = (e: React.FormEvent) => {
    e.preventDefault();
    if (captureInput.trim()) {
      dispatch({ type: 'ADD_CAPTURE', payload: captureInput.trim() });
      setCaptureInput('');
    }
  };

  // --- Processing Component ---
  const ProcessItem: React.FC<{ item: Capture }> = ({ item }) => {
    // Form States
    const [taskTitle, setTaskTitle] = useState(item.text);
    const [taskType, setTaskType] = useState<'today' | 'week'>('today');
    const [isFrog, setIsFrog] = useState(false);
    const [selectedWeek, setSelectedWeek] = useState(getWeekString());

    const getWeekOffset = (weekStr: string): number => {
      const currentWeek = getWeekString();
      const [currentYear, currentWeekNum] = currentWeek.split('-W').map(Number);
      const [targetYear, targetWeekNum] = weekStr.split('-W').map(Number);
      
      if (targetYear === currentYear) {
        return targetWeekNum - currentWeekNum;
      } else if (targetYear > currentYear) {
        return (52 - currentWeekNum) + targetWeekNum;
      } else {
        return -((currentWeekNum - 1) + (52 - targetWeekNum));
      }
    };

    const changeWeek = (delta: number) => {
      const [yearStr, weekStr] = selectedWeek.split('-W');
      let year = parseInt(yearStr);
      let week = parseInt(weekStr) + delta;
      
      if (week > 52) { year++; week = 1; }
      if (week < 1) { year--; week = 52; }
      
      const newWeek = `${year}-W${week.toString().padStart(2, '0')}`;
      const offset = getWeekOffset(newWeek);
      if (offset >= 0 && offset <= 4) {
        setSelectedWeek(newWeek);
      }
    };

    const handleConvertToTask = () => {
      if (!taskTitle.trim()) return;
      
      const today = getTodayString();
      
      dispatch({
        type: 'ADD_TASK',
        payload: {
          id: generateId(),
          title: taskTitle.trim(),
          status: 'todo',
          plan: {
            day: taskType === 'today' ? today : null,
            week: taskType === 'week' ? selectedWeek : null,
          },
          frog: isFrog,
          projectId: null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }
      });
      dispatch({ type: 'PROCESS_CAPTURE', payload: { id: item.id, status: 'processed' } });
      setProcessingId(null);
    };

    if (processingId !== item.id) {
      return (
        <div className="flex items-center justify-between p-3 bg-white border border-slate-200 rounded-lg shadow-sm text-sm">
          <span className="font-medium text-slate-800">{item.text}</span>
          <div className="flex gap-2">
            <button 
              onClick={() => setProcessingId(item.id)}
              className="px-3 py-1.5 text-sm bg-indigo-50 text-indigo-700 font-medium rounded hover:bg-indigo-100 transition-colors"
            >
              Process
            </button>
            <button 
               onClick={() => setDeleteConfirm({ isOpen: true, captureId: item.id })}
               className="p-1.5 text-slate-400 hover:text-red-500 transition-colors"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      );
    }

    const weekDateRange = getWeekDateRange(selectedWeek);

    return (
      <div className="p-6 bg-white border-2 border-indigo-100 rounded-xl shadow-md space-y-4">
        <div className="flex justify-between items-start">
           <h3 className="text-lg font-bold text-slate-900">Process capture</h3>
           <button onClick={() => setProcessingId(null)}><X className="w-5 h-5 text-slate-400" /></button>
        </div>
        
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Title</label>
            <input
              type="text"
              value={taskTitle}
              onChange={(e) => setTaskTitle(e.target.value)}
              className="w-full p-2 border border-slate-300 rounded-lg focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
              placeholder="Task title"
              autoFocus
            />
          </div>

          <div className="flex gap-2">
            <button 
              onClick={() => setTaskType('today')} 
              className={`flex-1 py-2 text-sm font-medium rounded border ${
                taskType === 'today' 
                  ? 'bg-indigo-600 text-white border-indigo-600' 
                  : 'bg-white text-slate-600 border-slate-200 hover:border-indigo-300'
              }`}
            >
              Today
            </button>
            <button 
              onClick={() => setTaskType('week')} 
              className={`flex-1 py-2 text-sm font-medium rounded border ${
                taskType === 'week' 
                  ? 'bg-indigo-600 text-white border-indigo-600' 
                  : 'bg-white text-slate-600 border-slate-200 hover:border-indigo-300'
              }`}
            >
              Week
            </button>
          </div>

          {taskType === 'week' && (
            <div className="flex items-center justify-between bg-white border border-slate-200 rounded-lg p-2">
              <button 
                onClick={() => changeWeek(-1)} 
                className="p-1 hover:bg-slate-100 rounded transition-colors"
                disabled={selectedWeek === getWeekString()}
              >
                <ChevronLeft className={`w-4 h-4 ${selectedWeek === getWeekString() ? 'text-slate-300' : 'text-slate-600'}`} />
              </button>
              <div className="flex-1 text-center px-4">
                <div className="font-mono font-medium text-slate-700 text-sm">
                  {getWeekRange(selectedWeek)}
                </div>
                <div className="text-xs text-slate-500 mt-1">
                  {weekDateRange.start} - {weekDateRange.end}
                </div>
              </div>
              <button 
                onClick={() => changeWeek(1)} 
                className="p-1 hover:bg-slate-100 rounded transition-colors"
                disabled={getWeekOffset(selectedWeek) >= 4}
              >
                <ChevronRight className={`w-4 h-4 ${getWeekOffset(selectedWeek) >= 4 ? 'text-slate-300' : 'text-slate-600'}`} />
              </button>
            </div>
          )}

          <div className="flex justify-center">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input 
                type="checkbox" 
                checked={isFrog} 
                onChange={e => setIsFrog(e.target.checked)} 
                className="w-4 h-4 text-indigo-600 rounded" 
              />
              <span className="text-sm text-slate-700">Eat the Frog? 🐸</span>
            </label>
          </div>

          <button 
            onClick={handleConvertToTask} 
            className="w-full py-2 bg-indigo-600 text-white font-medium rounded hover:bg-indigo-700"
          >
            Confirm Task
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="max-w-3xl mx-auto">
      {/* Header - Centered */}
      <div className="text-center mb-3">
        <h2 className="text-3xl font-bold text-slate-900">Inbox</h2>
        <p className="text-slate-500">Capture everything. Process later.</p>
      </div>

      {/* Content - with bottom padding for fixed form */}
      <div className="pb-20 lg:pb-4 space-y-3 min-h-[60vh] flex flex-col">
        {newCaptures.length === 0 ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center py-12 border-2 border-dashed border-slate-200 rounded-xl w-full">
              <Inbox className="w-12 h-12 mx-auto text-slate-300 mb-2" />
              <p className="text-slate-400 font-medium">Inbox is empty</p>
            </div>
          </div>
        ) : (
          <div className="flex-1 space-y-3">
            {newCaptures.map(c => <ProcessItem key={c.id} item={c} />)}
          </div>
        )}
      </div>

      {/* Add Form - Fixed at bottom */}
      <form onSubmit={handleCapture} className="lg:hidden fixed bottom-16 left-0 right-0 p-4 bg-slate-50 border-t border-slate-200 z-20">
        <div className="max-w-3xl mx-auto flex items-center gap-3">
          <input
            type="text"
            value={captureInput}
            onChange={(e) => setCaptureInput(e.target.value)}
            placeholder="What's on your mind?"
            className="flex-1 p-3 border border-slate-300 rounded-lg focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-shadow bg-white"
          />
          <button 
            type="submit"
            className="w-12 h-12 bg-slate-900 text-white rounded-full shadow-lg hover:bg-slate-800 hover:shadow-xl hover:scale-110 transition-all flex items-center justify-center flex-shrink-0"
            title="Add capture"
          >
            <Plus className="w-6 h-6" />
          </button>
        </div>
      </form>

      {/* Add Form - Desktop */}
      <form onSubmit={handleCapture} className="hidden lg:flex items-center gap-3">
        <input
          type="text"
          value={captureInput}
          onChange={(e) => setCaptureInput(e.target.value)}
          placeholder="What's on your mind?"
          className="flex-1 p-3 border border-slate-300 rounded-lg focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-shadow"
        />
        <button 
          type="submit"
          className="w-12 h-12 bg-slate-900 text-white rounded-full shadow-lg hover:bg-slate-800 hover:shadow-xl hover:scale-110 transition-all flex items-center justify-center flex-shrink-0"
          title="Add capture"
        >
          <Plus className="w-6 h-6" />
        </button>
      </form>

      <ConfirmModal
        isOpen={deleteConfirm.isOpen}
        onClose={() => setDeleteConfirm({ isOpen: false, captureId: null })}
        onConfirm={() => {
          if (deleteConfirm.captureId) {
            dispatch({ type: 'DELETE_CAPTURE', payload: deleteConfirm.captureId });
            setDeleteConfirm({ isOpen: false, captureId: null });
          }
        }}
        title="Delete Capture"
        message="Delete this capture permanently?"
        variant="danger"
        confirmText="Delete"
      />
    </div>
  );
};