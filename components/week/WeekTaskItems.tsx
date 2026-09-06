import React, { useEffect, useState } from 'react';
import { useDroppable } from '@dnd-kit/core';
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useAppStore } from '../../store';
import { Task } from '../../types';
import { getTodayString, getWeekString, isValidWeekString } from '../../utils';
import { planTaskForWeek } from '../../task-planning';
import { completeTask } from '../../task-lifecycle';
import { RewardGradeMarker, RewardGradeSelector, RewardGradeSurface } from '../../features/rewards-lab/ui/RewardGradeControls';
import { useI18n } from '../../i18n';
import { weekBucketContainer, weekDayContainer } from './weekTaskContainers';

type DayTaskItemProps = {
  task: Task;
  todayStr: string;
  dispatch: ReturnType<typeof useAppStore>['dispatch'];
  onMove: (id: string) => void;
  onDeleteConfirm: (id: string) => void;
  dragListeners?: any;
  isDragging?: boolean;
};

const DayTaskItem: React.FC<DayTaskItemProps> = ({ task, todayStr, dispatch, onMove, onDeleteConfirm, dragListeners, isDragging = false }) => {
  const { t } = useI18n();
  const [wasDragging, setWasDragging] = useState(false);
  
  // Track if we just finished dragging to prevent onClick
  useEffect(() => {
    if (isDragging) {
      setWasDragging(true);
    } else if (wasDragging) {
      // Reset after a short delay to allow onClick to work again
      const timer = setTimeout(() => setWasDragging(false), 100);
      return () => clearTimeout(timer);
    }
  }, [isDragging, wasDragging]);
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(task.title);
  const [editWeek, setEditWeek] = useState<string>(() => task.plan.week || getWeekString(task.plan.day || todayStr));
  const [showActions, setShowActions] = useState(false);
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editTitle.trim()) return;
    if (!isValidWeekString(editWeek)) return;
    dispatch({
      type: 'UPDATE_TASK',
      payload: {
        id: task.id,
        title: editTitle.trim(),
        plan: planTaskForWeek(task, editWeek),
      },
    });
    setIsEditing(false);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditTitle(task.title);
    setEditWeek(task.plan.week || getWeekString(task.plan.day || todayStr));
  };

  const [yearPart, weekPart] = editWeek.split('-W');

  // Auto-resize textarea
  React.useEffect(() => {
    if (isEditing && textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [isEditing, editTitle]);

  if (isEditing) {
    return (
      <form onSubmit={handleSaveEdit} className="p-3 bg-white border border-indigo-100 rounded-lg shadow-sm space-y-3 text-sm">
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
            className="w-full p-2 border border-slate-300 rounded-lg focus:border-indigo-500 outline-none resize-none overflow-hidden min-h-[2.5rem]"
            rows={1}
            autoFocus
          />
        </div>
        <div>
          <label className="block text-xs font-bold text-slate-500 uppercase mb-1 mt-2">{t('Week')}</label>
          <div className="flex gap-2">
            <input
              type="number"
              min="2020"
              max="2100"
              value={yearPart || ''}
              onChange={(e) => {
                const nextYear = e.target.value;
                const week = weekPart || '';
                if (nextYear === '') {
                  setEditWeek(`-W${week}`);
                } else {
                  setEditWeek(`${nextYear}-W${week}`);
                }
              }}
              className="w-20 p-2 border border-slate-300 rounded-lg focus:border-indigo-500 outline-none"
              placeholder={t('Year')}
            />
            <span className="self-center text-slate-400">-W</span>
            <input
              type="number"
              min="1"
              max="53"
              value={weekPart ? parseInt(weekPart, 10) : ''}
              onChange={(e) => {
                const year = yearPart || '';
                const raw = e.target.value;
                if (raw === '') {
                  setEditWeek(`${year}-W`);
                  return;
                }
                let num = parseInt(raw, 10);
                if (isNaN(num)) {
                  return;
                }
                if (num < 1) num = 1;
                if (num > 53) num = 53;
                const week = String(num).padStart(2, '0');
                setEditWeek(`${year}-W${week}`);
              }}
              className="w-16 p-2 border border-slate-300 rounded-lg focus:border-indigo-500 outline-none"
              placeholder={t('Week')}
            />
          </div>
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
      className="relative px-3 py-2 bg-white border border-slate-200 rounded-lg shadow-sm w-full max-w-full overflow-hidden text-sm"
      onClick={() => {
        // Don't toggle actions if currently dragging or just finished dragging
        if (!isDragging && !wasDragging) {
          setShowActions(prev => !prev);
        }
      }}
    >
      <RewardGradeSurface taskId={task.id} />
      <div className={`flex justify-between gap-2 ${showActions ? 'items-start' : 'items-center'}`}>
        <div 
          className={`flex gap-2 flex-1 min-w-0 ${showActions ? 'items-start' : 'items-center'}`}
          {...(dragListeners || {})}
          onTouchStart={(e) => {
            if (dragListeners) {
              e.stopPropagation();
            }
          }}
          onTouchMove={(e) => {
            if (dragListeners) {
              e.stopPropagation();
            }
          }}
          style={{ 
            touchAction: dragListeners ? 'none' : 'auto',
            cursor: dragListeners ? (isDragging ? 'grabbing' : 'grab') : 'default',
            userSelect: 'none',
            WebkitUserSelect: 'none',
            WebkitTouchCallout: 'none'
          }}
        >
          <RewardGradeMarker taskId={task.id} />
          <span
            className={`block text-sm flex-1 min-w-0 ${
              showActions
                ? 'break-words whitespace-normal'
                : 'truncate whitespace-nowrap overflow-hidden'
            } ${task.status === 'done' ? 'line-through text-slate-400' : 'text-slate-700'}`}
            title={task.title}
          >
            {task.title}
          </span>
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation();
            e.preventDefault();
            onMove(task.id);
          }}
          onTouchStart={(e) => {
            e.stopPropagation();
          }}
          className={`px-2 py-1 bg-indigo-50 text-indigo-700 font-semibold rounded hover:bg-indigo-100 text-xs flex-shrink-0 ${
            showActions ? 'mt-0' : ''
          }`}
          title={t('Move')}
        >
          {t('Move')}
        </button>
      </div>

      <div
        className={`flex flex-wrap items-center justify-between px-4 gap-3 transition-all duration-200 ${
          showActions ? 'mt-2 opacity-100 max-h-56' : 'mt-0 opacity-0 max-h-0 overflow-hidden'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {showActions && (
          <div className="w-full">
            <RewardGradeSelector taskId={task.id} compact />
          </div>
        )}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDeleteConfirm(task.id);
          }}
          className="px-3 py-1.5 text-xs font-semibold text-red-700 bg-red-50 rounded hover:bg-red-100"
          title={t('Delete')}
        >
          {t('Delete')}
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            setIsEditing(true);
          }}
          className="px-3 py-1.5 text-xs font-semibold text-slate-600 bg-slate-100 rounded hover:bg-slate-200"
          title={t('Edit')}
        >
          {t('Edit')}
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            completeTask(dispatch, task, {
              plan: { week: null, day: getTodayString(), month: getTodayString().slice(0, 7) },
            });
          }}
          className="px-3 py-1.5 text-xs font-semibold text-green-700 bg-green-50 rounded hover:bg-green-100"
          title={t('Mark Done')}
        >
          {t('Done')}
        </button>
      </div>
    </div>
  );
};

// Sortable wrapper for DayTaskItem
export const SortableDayTaskItem: React.FC<DayTaskItemProps> = (props) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: props.task.id,
    data: { containerId: weekDayContainer(props.task.plan.day ?? '') },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} data-task-id={props.task.id}>
      <DayTaskItem {...props} dragListeners={listeners} isDragging={isDragging} />
    </div>
  );
};

type BucketTaskItemProps = {
  task: Task;
  currentWeek: string;
  dispatch: ReturnType<typeof useAppStore>['dispatch'];
  onMove: (id: string) => void;
  onDeleteConfirm: (id: string) => void;
  dragListeners?: any;
  isDragging?: boolean;
};

const BucketTaskItem: React.FC<BucketTaskItemProps> = ({ task, currentWeek, dispatch, onMove, onDeleteConfirm, dragListeners, isDragging = false }) => {
  const { t } = useI18n();
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(task.title);
  const [editWeek, setEditWeek] = useState(task.plan.week || currentWeek);
  const [showActions, setShowActions] = useState(false);
  const [wasDragging, setWasDragging] = useState(false);
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);
  
  // Track if we just finished dragging to prevent onClick
  useEffect(() => {
    if (isDragging) {
      setWasDragging(true);
    } else if (wasDragging) {
      // Reset after a short delay to allow onClick to work again
      const timer = setTimeout(() => setWasDragging(false), 100);
      return () => clearTimeout(timer);
    }
  }, [isDragging, wasDragging]);

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editTitle.trim()) return;
    if (!isValidWeekString(editWeek)) return;

    dispatch({
      type: 'UPDATE_TASK',
      payload: {
        id: task.id,
        title: editTitle.trim(),
        plan: planTaskForWeek(task, editWeek),
      },
    });
    setIsEditing(false);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditTitle(task.title);
    setEditWeek(task.plan.week || currentWeek);
  };

  // Auto-resize textarea
  React.useEffect(() => {
    if (isEditing && textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [isEditing, editTitle]);

  const [yearPart, weekPart] = editWeek.split('-W');

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
            className="w-full p-2 border border-slate-300 rounded-lg focus:border-indigo-500 outline-none resize-none overflow-hidden min-h-[2.5rem]"
            rows={1}
            autoFocus
          />
        </div>
        <div>
          <label className="block text-xs font-bold text-slate-500 uppercase mb-1">{t('Week')}</label>
          <div className="flex gap-2">
            <input
              type="number"
              min="2020"
              max="2100"
              value={yearPart || ''}
              onChange={(e) => {
                const nextYear = e.target.value;
                const week = weekPart || '';
                if (nextYear === '') {
                  setEditWeek(`-W${week}`);
                } else {
                  setEditWeek(`${nextYear}-W${week}`);
                }
              }}
              className="w-20 p-2 border border-slate-300 rounded-lg focus:border-indigo-500 outline-none"
              placeholder={t('Year')}
            />
            <span className="self-center text-slate-400">-W</span>
            <input
              type="number"
              min="1"
              max="53"
              value={weekPart ? parseInt(weekPart, 10) : ''}
              onChange={(e) => {
                const year = yearPart || '';
                const raw = e.target.value;
                if (raw === '') {
                  setEditWeek(`${year}-W`);
                  return;
                }
                let num = parseInt(raw, 10);
                if (isNaN(num)) {
                  return;
                }
                if (num < 1) num = 1;
                if (num > 53) num = 53;
                const week = String(num).padStart(2, '0');
                setEditWeek(`${year}-W${week}`);
              }}
              className="w-16 p-2 border border-slate-300 rounded-lg focus:border-indigo-500 outline-none"
              placeholder={t('Week')}
            />
          </div>
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
      className="relative px-3 py-2 bg-white border border-slate-200 rounded-lg shadow-sm w-full max-w-full overflow-hidden text-sm"
      onClick={() => {
        // Don't toggle actions if currently dragging or just finished dragging
        if (!isDragging && !wasDragging) {
          setShowActions(prev => !prev);
        }
      }}
    >
      <RewardGradeSurface taskId={task.id} />
      <div className={`flex justify-between gap-2 ${showActions ? 'items-start' : 'items-center'} min-w-0`}>
        <div 
          className={`flex gap-2 flex-1 min-w-0 ${showActions ? 'items-start' : 'items-center'}`}
          {...(dragListeners || {})}
          onTouchStart={(e) => {
            if (dragListeners) {
              e.stopPropagation();
            }
          }}
          onTouchMove={(e) => {
            if (dragListeners) {
              e.stopPropagation();
            }
          }}
          style={{ 
            touchAction: dragListeners ? 'none' : 'auto',
            cursor: dragListeners ? (isDragging ? 'grabbing' : 'grab') : 'default',
            userSelect: 'none',
            WebkitUserSelect: 'none',
            WebkitTouchCallout: 'none',
            minWidth: 0,
          }}
        >
          <RewardGradeMarker taskId={task.id} />
          <span
            className={`block text-sm flex-1 min-w-0 max-w-full ${
              showActions
                ? 'break-words whitespace-normal'
                : 'truncate whitespace-nowrap overflow-hidden'
            } ${task.status === 'done' ? 'line-through text-slate-400' : 'text-slate-700'}`}
            style={{
              wordBreak: showActions ? 'break-word' : 'normal',
              overflowWrap: showActions ? 'break-word' : 'normal',
            }}
          >
            {task.title}
          </span>
        </div>
        <button
          onClick={(e) => { 
            e.stopPropagation(); 
            e.preventDefault();
            onMove(task.id); 
          }}
          onTouchStart={(e) => {
            e.stopPropagation();
          }}
          className={`px-2 py-1 text-xs font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded flex-shrink-0 ${
            showActions ? 'mt-0' : ''
          }`}
          title={t('Move')}
        >
          {t('Move')}
        </button>
      </div>

      <div
        className={`flex flex-wrap items-center justify-between px-4 gap-3 transition-all duration-200 ${
          showActions ? 'mt-2 opacity-100 max-h-56' : 'mt-0 opacity-0 max-h-0 overflow-hidden'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {showActions && (
          <div className="w-full">
            <RewardGradeSelector taskId={task.id} compact />
          </div>
        )}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDeleteConfirm(task.id);
          }}
          className="px-3 py-1.5 text-xs font-semibold text-red-700 bg-red-50 rounded hover:bg-red-100"
          title={t('Delete')}
        >
          {t('Delete')}
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            setIsEditing(true);
          }}
          className="px-3 py-1.5 text-xs font-semibold text-slate-600 bg-slate-100 rounded hover:bg-slate-200"
          title={t('Edit')}
        >
          {t('Edit')}
        </button>
        <button
          onClick={() => {
            completeTask(dispatch, task, {
              plan: { week: null, day: getTodayString(), month: getTodayString().slice(0, 7) }, // Move to today when completed
            });
          }}
          className="px-3 py-1.5 text-xs font-semibold text-green-700 bg-green-50 rounded hover:bg-green-100"
          title={t('Mark Done')}
        >
          {t('Done')}
        </button>
      </div>
    </div>
  );
};

// Sortable wrapper for BucketTaskItem
export const SortableBucketTaskItem: React.FC<BucketTaskItemProps> = (props) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: props.task.id,
    data: { containerId: weekBucketContainer(props.currentWeek) },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    width: '100%',
    maxWidth: '100%',
    minWidth: 0,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} data-task-id={props.task.id} className="w-full max-w-full min-w-0 overflow-hidden">
      <BucketTaskItem {...props} dragListeners={listeners} isDragging={isDragging} />
    </div>
  );
};

export const WeekTaskDropZone: React.FC<{
  id: string;
  tasks: Task[];
  children: React.ReactNode;
  className?: string;
}> = ({ id, tasks, children, className = '' }) => {
  const { setNodeRef, isOver } = useDroppable({ id, data: { containerId: id } });
  return (
    <div
      ref={setNodeRef}
      data-container-id={id}
      className={`${className} min-h-12 transition-colors ${isOver ? 'bg-indigo-50 ring-2 ring-indigo-200' : ''}`}
    >
      <SortableContext items={tasks.map(task => task.id)} strategy={verticalListSortingStrategy}>
        {children}
      </SortableContext>
    </div>
  );
};
