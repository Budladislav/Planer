import React, { useState, useEffect, useRef } from 'react';
import { useAppStore } from '../../store';
import { Capture } from '../../types';
import { generateId, getTodayString, getWeekString, getWeekRange, getWeekDateRange } from '../../utils';
import { Trash2, Inbox, Plus, ChevronLeft, ChevronRight, Check } from 'lucide-react';
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
    const [captureText, setCaptureText] = useState(item.text);
    const [taskType, setTaskType] = useState<'today' | 'week'>('today');
    const [isFrog, setIsFrog] = useState(false);
    const [selectedWeek, setSelectedWeek] = useState(getWeekString());
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    // Sync captureText with item.text when item changes
    useEffect(() => {
      setCaptureText(item.text);
    }, [item.text]);

    // Auto-resize textarea
    useEffect(() => {
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
        textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
      }
    }, [captureText]);

    const getWeekOffset = (weekStr: string): number => {
      const currentWeek = getWeekString();
      const [currentYear, currentWeekNum] = currentWeek.split('-W').map(Number);
      const [targetYear, targetWeekNum] = weekStr.split('-W').map(Number);
      
      if (targetYear === currentYear) {
        return targetWeekNum - currentWeekNum;
      } else if (targetYear > currentYear) {
        // Future year: weeks from current week to end of year + weeks in target year
        // For range 0-4, this should work correctly
        return (52 - currentWeekNum + 1) + targetWeekNum;
      } else {
        // Past year: negative offset
        return -(currentWeekNum - 1 + (52 - targetWeekNum + 1));
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
      // Allow any future week (offset >= 0), no upper limit
      if (offset >= 0) {
        setSelectedWeek(newWeek);
      }
    };

    const handleSaveAndClose = () => {
      if (captureText.trim() && captureText.trim() !== item.text) {
        const trimmedText = captureText.trim();
        dispatch({ type: 'UPDATE_CAPTURE', payload: { id: item.id, text: trimmedText } });
      }
      setProcessingId(null);
    };

    const handleConvertToTask = () => {
      if (!captureText.trim()) return;
      
      const today = getTodayString();
      
      // Determine plan.day and plan.week
      let planDay: string | null = null;
      let planWeek: string | null = null;
      
      if (taskType === 'today') {
        planDay = today;
        planWeek = getWeekString(today); // Set week for consistency with Week View
      } else {
        planWeek = selectedWeek;
      }
      
      dispatch({
        type: 'ADD_TASK',
        payload: {
          id: generateId(),
          title: captureText.trim(),
          status: 'todo',
          plan: {
            day: planDay,
            week: planWeek,
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
        <div 
          className="p-3 bg-white border border-slate-200 rounded-lg shadow-sm text-sm cursor-pointer hover:bg-slate-50 transition-colors"
          onClick={() => setProcessingId(item.id)}
        >
          <div className="flex items-center justify-between gap-2">
            <span className="text-sm text-slate-700 font-medium flex-1 min-w-0 truncate">
              {item.text}
            </span>
            <button 
               onClick={(e) => {
                 e.stopPropagation();
                 setDeleteConfirm({ isOpen: true, captureId: item.id });
               }}
               className="p-1.5 text-slate-400 hover:text-red-500 transition-colors flex-shrink-0"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      );
    }

    const weekDateRange = getWeekDateRange(selectedWeek);

    return (
      <div className="p-3 bg-white border border-slate-200 rounded-lg shadow-sm space-y-3 text-sm">
        <div className="flex justify-center items-center relative">
           <h3 className="text-sm font-bold text-slate-900">Process capture</h3>
           <button 
             onClick={handleSaveAndClose}
             className="absolute right-0 w-8 h-8 flex items-center justify-center text-green-600 hover:text-green-700 hover:bg-green-50 rounded-lg transition-colors"
             title="Save and close (Ctrl+Enter)"
           >
             <Check className="w-5 h-5" />
           </button>
        </div>
        
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Title</label>
            <textarea
              ref={textareaRef}
              value={captureText}
              onChange={(e) => {
                setCaptureText(e.target.value);
                if (textareaRef.current) {
                  textareaRef.current.style.height = 'auto';
                  textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
                }
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                  e.preventDefault();
                  handleSaveAndClose();
                }
              }}
              className="w-full p-2 border border-slate-300 rounded-lg focus:border-indigo-500 outline-none text-sm resize-none min-h-[2.5rem] max-h-[12rem] overflow-y-auto"
              placeholder="Title..."
              rows={1}
            />
          </div>

          <div className="flex gap-2">
            <button 
              onClick={() => setTaskType('today')} 
              className={`flex-1 py-1.5 text-xs font-semibold rounded border ${
                taskType === 'today' 
                  ? 'bg-indigo-600 text-white border-indigo-600' 
                  : 'bg-white text-slate-600 border-slate-200 hover:border-indigo-300'
              }`}
            >
              Today
            </button>
            <button 
              onClick={() => setTaskType('week')} 
              className={`flex-1 py-1.5 text-xs font-semibold rounded border ${
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
                <ChevronLeft className={`w-3.5 h-3.5 ${selectedWeek === getWeekString() ? 'text-slate-300' : 'text-slate-600'}`} />
              </button>
              <div className="flex-1 text-center px-4">
                <div className="font-mono font-medium text-slate-700 text-xs">
                  {getWeekRange(selectedWeek)}
                </div>
                <div className="text-xs text-slate-500 mt-0.5">
                  {weekDateRange.start} - {weekDateRange.end}
                </div>
              </div>
              <button 
                onClick={() => changeWeek(1)} 
                className="p-1 hover:bg-slate-100 rounded transition-colors"
              >
                <ChevronRight className="w-3.5 h-3.5 text-slate-600" />
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
            className="w-full py-1.5 text-xs font-semibold bg-indigo-600 text-white rounded hover:bg-indigo-700"
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