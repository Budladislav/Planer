import React, { useState, useEffect, useRef } from 'react';
import { useAppStore } from '../../store';
import { Capture } from '../../types';
import { generateId, getDateString, getTodayString, getWeekString, getWeekRange, getWeekDateRange, getISOWeeksInYear, getWeekDates } from '../../utils';
import {
  CalendarDays,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Inbox,
  Pencil,
  Plus,
  RotateCcw,
  Trash2,
} from 'lucide-react';
import { ConfirmModal } from '../Modal';
import { getMonthForWeek } from '../../month-planning';
import { useI18n } from '../../i18n';

const toDateInputValue = (timestamp: string): string => {
  const date = new Date(timestamp);
  return Number.isNaN(date.getTime()) ? '' : getDateString(date);
};

const replaceLocalDate = (timestamp: string, dateString: string): string | null => {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateString);
  if (!match) return null;

  const original = new Date(timestamp);
  const hours = Number.isNaN(original.getTime()) ? 12 : original.getHours();
  const minutes = Number.isNaN(original.getTime()) ? 0 : original.getMinutes();
  const seconds = Number.isNaN(original.getTime()) ? 0 : original.getSeconds();
  const milliseconds = Number.isNaN(original.getTime()) ? 0 : original.getMilliseconds();
  const updated = new Date(
    Number(match[1]),
    Number(match[2]) - 1,
    Number(match[3]),
    hours,
    minutes,
    seconds,
    milliseconds,
  );
  return Number.isNaN(updated.getTime()) ? null : updated.toISOString();
};

export const InboxView: React.FC = () => {
  const { state, dispatch } = useAppStore();
  const { language, t } = useI18n();
  const [captureInput, setCaptureInput] = useState('');
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [completedExpanded, setCompletedExpanded] = useState(false);
  const [editingCompletedId, setEditingCompletedId] = useState<string | null>(null);
  const [editingCompletedText, setEditingCompletedText] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState<{ isOpen: boolean; captureId: string | null }>({
    isOpen: false,
    captureId: null,
  });

  // Filter new captures
  const newCaptures = state.captures.filter(c => c.status === 'new');
  const completedCaptures = state.captures
    .filter(c => c.status === 'completed' && c.completedAt)
    .sort((a, b) => Date.parse(b.completedAt!) - Date.parse(a.completedAt!));

  const formatElapsed = (createdAt: string, completedAt: string) => {
    const elapsedMs = Date.parse(completedAt) - Date.parse(createdAt);
    if (!Number.isFinite(elapsedMs) || elapsedMs < 0) return t('Period unavailable');

    const days = Math.floor(elapsedMs / 86_400_000);
    if (days === 0) return t('Realized the same day');
    return t('Realized after {days} days', { days });
  };

  const handleCapture = (e: React.FormEvent) => {
    e.preventDefault();
    if (captureInput.trim()) {
      dispatch({ type: 'ADD_CAPTURE', payload: captureInput.trim() });
      setCaptureInput('');
    }
  };

  const startEditingCompleted = (item: Capture) => {
    setEditingCompletedId(item.id);
    setEditingCompletedText(item.text);
  };

  const saveCompletedTitle = (item: Capture) => {
    const text = editingCompletedText.trim();
    if (text && text !== item.text) {
      dispatch({ type: 'UPDATE_CAPTURE', payload: { id: item.id, text } });
    }
    if (text) {
      setEditingCompletedId(null);
      setEditingCompletedText('');
    }
  };

  // --- Processing Component ---
  const ProcessItem: React.FC<{ item: Capture }> = ({ item }) => {
    // Form States
    const [captureText, setCaptureText] = useState(item.text);
    const [taskType, setTaskType] = useState<'today' | 'week'>('today');
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

    const changeWeek = (delta: number) => {
      const [yearStr, weekStr] = selectedWeek.split('-W');
      let year = parseInt(yearStr);
      let week = parseInt(weekStr) + delta;
      
      if (week > getISOWeeksInYear(year)) { year++; week = 1; }
      if (week < 1) { year--; week = getISOWeeksInYear(year); }
      
      const newWeek = `${year}-W${week.toString().padStart(2, '0')}`;
      if (getWeekDates(newWeek)[0] >= getWeekDates(getWeekString())[0]) {
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
            month: planDay?.slice(0, 7) ?? (planWeek ? getMonthForWeek(planWeek) : null),
          },
          projectId: null,
          eventId: null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          completedAt: null,
        }
      });
      dispatch({ type: 'PROCESS_CAPTURE', payload: { id: item.id, status: 'processed' } });
      setProcessingId(null);
    };

    if (processingId !== item.id) {
      return (
        <div 
          className="px-3 py-2 bg-white border border-slate-200 rounded-lg shadow-sm text-sm cursor-pointer hover:bg-slate-50 transition-colors"
          onClick={() => setProcessingId(item.id)}
        >
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0 flex-1">
              <span className="block truncate text-sm font-medium text-slate-700">
                {item.text}
              </span>
              <label
                className="mt-0.5 flex items-center gap-1 text-[11px] text-slate-400"
                onClick={event => event.stopPropagation()}
              >
                <CalendarDays className="h-3 w-3" aria-hidden="true" />
                <span>{t('Created')}</span>
                <input
                  type="date"
                  value={toDateInputValue(item.createdAt)}
                  max={getTodayString()}
                  onChange={event => {
                    const createdAt = replaceLocalDate(item.createdAt, event.target.value);
                    if (createdAt) dispatch({ type: 'UPDATE_CAPTURE_CREATED_AT', payload: { id: item.id, createdAt } });
                  }}
                  aria-label={t('Creation date for {title}', { title: item.text })}
                  className="rounded border border-slate-200 bg-white px-1 py-0.5 text-[11px] text-slate-600 outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-300"
                />
              </label>
            </div>
            <button
               type="button"
               onClick={(e) => {
                 e.stopPropagation();
                 dispatch({ type: 'COMPLETE_CAPTURE', payload: item.id });
                 setCompletedExpanded(true);
               }}
               className="p-1.5 text-slate-400 hover:text-emerald-600 transition-colors flex-shrink-0"
               title={t('Mark as realized')}
               aria-label={t('Mark {title} as realized', { title: item.text })}
            >
              <Check className="w-4 h-4" />
            </button>
            <button 
               type="button"
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
           <h3 className="text-sm font-bold text-slate-900">{t('Process wish')}</h3>
           <button 
             onClick={handleSaveAndClose}
             className="absolute right-0 w-8 h-8 flex items-center justify-center text-green-600 hover:text-green-700 hover:bg-green-50 rounded-lg transition-colors"
             title={t('Save and close (Ctrl+Enter)')}
           >
             <Check className="w-5 h-5" />
           </button>
        </div>
        
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">{t('Title')}</label>
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
              placeholder={`${t('Title')}…`}
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
              {t('Today')}
            </button>
            <button 
              onClick={() => setTaskType('week')} 
              className={`flex-1 py-1.5 text-xs font-semibold rounded border ${
                taskType === 'week' 
                  ? 'bg-indigo-600 text-white border-indigo-600' 
                  : 'bg-white text-slate-600 border-slate-200 hover:border-indigo-300'
              }`}
            >
              {t('Week')}
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
                  {getWeekRange(selectedWeek, language)}
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

          <button 
            onClick={handleConvertToTask} 
            className="w-full py-1.5 text-xs font-semibold bg-indigo-600 text-white rounded hover:bg-indigo-700"
          >
            {t('Confirm Task')}
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="max-w-3xl mx-auto">
      {/* Header - Centered */}
      <div className="text-center mb-3">
        <h2 className="text-3xl font-bold text-slate-900">{t('I wish')}</h2>
        <p className="text-slate-500">{t('Capture everything. Process later.')}</p>
      </div>

      {/* Content - with bottom padding for fixed form */}
      <div className="pb-20 lg:pb-4 space-y-4 min-h-[60vh] flex flex-col">
        {completedCaptures.length > 0 && (
          <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <button
              type="button"
              onClick={() => setCompletedExpanded(value => !value)}
              aria-expanded={completedExpanded}
              className="flex w-full items-center justify-between gap-3 px-3 py-3 text-left hover:bg-slate-50"
            >
              <span className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                <Check className="h-4 w-4 text-emerald-600" aria-hidden="true" />
                {t('Realized ({count})', { count: completedCaptures.length })}
              </span>
              <ChevronDown
                className={`h-4 w-4 text-slate-400 transition-transform ${completedExpanded ? 'rotate-180' : ''}`}
                aria-hidden="true"
              />
            </button>

            {completedExpanded && (
              <div className="divide-y divide-slate-100 border-t border-slate-100">
                {completedCaptures.map(item => {
                  const isEditing = editingCompletedId === item.id;
                  return (
                  <article key={item.id} className="px-3 py-3">
                    <div className="flex items-start gap-2">
                      <div className="min-w-0 flex-1">
                        {isEditing ? (
                          <input
                            type="text"
                            autoFocus
                            value={editingCompletedText}
                            onChange={event => setEditingCompletedText(event.target.value)}
                            onKeyDown={event => {
                              if (event.key === 'Enter') saveCompletedTitle(item);
                              if (event.key === 'Escape') setEditingCompletedId(null);
                            }}
                            aria-label={`${t('Edit title')}: ${item.text}`}
                            className="w-full rounded border border-indigo-300 px-2 py-1 text-sm font-medium text-slate-700 outline-none focus:ring-2 focus:ring-indigo-200"
                          />
                        ) : (
                          <p className="break-words text-sm font-medium text-slate-700">{item.text}</p>
                        )}
                        <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] leading-relaxed text-slate-400">
                          <label className="flex items-center gap-1">
                            <span>{t('Created')}</span>
                            <input
                              type="date"
                              value={toDateInputValue(item.createdAt)}
                              max={toDateInputValue(item.completedAt!)}
                              onChange={event => {
                                const createdAt = replaceLocalDate(item.createdAt, event.target.value);
                                if (createdAt) {
                                  dispatch({
                                    type: 'UPDATE_CAPTURE_CREATED_AT',
                                    payload: { id: item.id, createdAt },
                                  });
                                }
                              }}
                              aria-label={t('Creation date for {title}', { title: item.text })}
                              className="rounded border border-slate-200 bg-white px-1 py-0.5 text-[11px] text-slate-600 outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-300"
                            />
                          </label>
                          <label className="flex items-center gap-1">
                            <span>{t('Realized')}</span>
                            <input
                              type="date"
                              value={toDateInputValue(item.completedAt!)}
                              min={toDateInputValue(item.createdAt)}
                              max={getTodayString()}
                              onChange={event => {
                                const completedAt = replaceLocalDate(item.completedAt!, event.target.value);
                                if (completedAt) {
                                  dispatch({
                                    type: 'UPDATE_CAPTURE_COMPLETED_AT',
                                    payload: { id: item.id, completedAt },
                                  });
                                }
                              }}
                              aria-label={t('Realized date for {title}', { title: item.text })}
                              className="rounded border border-slate-200 bg-white px-1 py-0.5 text-[11px] text-slate-600 outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-300"
                            />
                          </label>
                          <span className="basis-full font-medium text-emerald-600">
                            {formatElapsed(item.createdAt, item.completedAt!)}
                          </span>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => isEditing ? saveCompletedTitle(item) : startEditingCompleted(item)}
                        disabled={isEditing && !editingCompletedText.trim()}
                        className="flex-shrink-0 p-1.5 text-slate-400 transition-colors hover:text-indigo-600 disabled:cursor-not-allowed disabled:opacity-40"
                        title={isEditing ? t('Save title') : t('Edit title')}
                        aria-label={`${isEditing ? t('Save title') : t('Edit title')}: ${item.text}`}
                      >
                        {isEditing ? <Check className="h-4 w-4" /> : <Pencil className="h-4 w-4" />}
                      </button>
                      <button
                        type="button"
                        onClick={() => dispatch({ type: 'REOPEN_CAPTURE', payload: item.id })}
                        className="flex-shrink-0 p-1.5 text-slate-400 transition-colors hover:text-indigo-600"
                        title={t('Return to I wish')}
                        aria-label={t('Return {title} to I wish', { title: item.text })}
                      >
                        <RotateCcw className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeleteConfirm({ isOpen: true, captureId: item.id })}
                        className="flex-shrink-0 p-1.5 text-slate-400 transition-colors hover:text-red-500"
                        title={t('Delete permanently')}
                        aria-label={t('Delete {title}', { title: item.text })}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </article>
                  );
                })}
              </div>
            )}
          </section>
        )}

        {newCaptures.length === 0 ? (
          <div className="text-center py-8 border-2 border-dashed border-slate-200 rounded-xl w-full">
            <Inbox className="w-12 h-12 mx-auto text-slate-300 mb-2" />
            <p className="text-slate-400 font-medium">{t('No ideas waiting to be processed')}</p>
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
            placeholder={t("What's on your mind?")}
            className="flex-1 p-3 border border-slate-300 rounded-lg focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-shadow bg-white"
          />
          <button 
            type="submit"
            className="w-12 h-12 bg-slate-900 text-white rounded-full shadow-lg hover:bg-slate-800 hover:shadow-xl hover:scale-110 transition-all flex items-center justify-center flex-shrink-0"
            title={t('Add wish')}
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
          placeholder={t("What's on your mind?")}
          className="flex-1 p-3 border border-slate-300 rounded-lg focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-shadow"
        />
        <button 
          type="submit"
          className="w-12 h-12 bg-slate-900 text-white rounded-full shadow-lg hover:bg-slate-800 hover:shadow-xl hover:scale-110 transition-all flex items-center justify-center flex-shrink-0"
          title={t('Add wish')}
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
        title={t('Delete wish')}
        message={t('Delete this wish permanently?')}
        variant="danger"
        confirmText={t('Delete')}
      />
    </div>
  );
};
