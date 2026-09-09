import React, { useEffect, useState } from 'react';
import { useDroppable } from '@dnd-kit/core';
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Check, Pencil, X } from 'lucide-react';
import { useAppStore } from '../../store';
import { Task } from '../../types';
import { getTodayString, getWeekString, isValidWeekString } from '../../utils';
import { planTaskForWeek } from '../../task-planning';
import { completeTask } from '../../task-lifecycle';
import { RewardGradeIncrementButton, RewardGradeSelector, RewardGradeSurface } from '../../features/rewards-lab/ui/RewardGradeControls';
import { useI18n } from '../../i18n';
import { TaskCard, TaskIconButton } from '../ui/Primitives';
import { weekBucketContainer, weekDayContainer } from './weekTaskContainers';
import { WeekTaskMoveButton } from './WeekTaskMoveControl';

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
      <form onSubmit={handleSaveEdit} className="task-editor">
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
            className="field w-full min-h-[2.5rem] resize-none overflow-hidden"
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
              className="field-compact w-20"
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
              className="field-compact w-16"
              placeholder={t('Week')}
            />
          </div>
        </div>
        <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={handleCancelEdit}
              className="button-secondary"
            >
              {t('Cancel')}
            </button>
            <button type="submit" className="button-primary">
              {t('Save')}
            </button>
        </div>
      </form>
    );
  }

  return (
    <TaskCard
      onClick={() => {
        // Don't toggle actions if currently dragging or just finished dragging
        if (!isDragging && !wasDragging) {
          setShowActions(prev => !prev);
        }
      }}
    >
      <RewardGradeSurface taskId={task.id} />
      <div className="flex items-center justify-between gap-2">
        <div 
          className="flex flex-1 min-w-0 items-center gap-2"
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
          <RewardGradeIncrementButton taskId={task.id} />
          <span
            className={`min-w-0 flex-1 text-sm text-slate-950 ${showActions ? 'sr-only' : 'block truncate whitespace-nowrap'} ${task.status === 'done' ? 'line-through' : ''}`}
            title={task.title}
          >
            {task.title}
          </span>
        </div>
        <div className="flex flex-shrink-0 items-center gap-1">
          <WeekTaskMoveButton onClick={() => onMove(task.id)} />
          <TaskIconButton
            label={t('Mark as done')}
            tone="success"
            onClick={(e) => {
              e.stopPropagation();
              completeTask(dispatch, task, {
                plan: { week: null, day: getTodayString(), month: getTodayString().slice(0, 7), year: getTodayString().slice(0, 4) },
              });
            }}
          >
            <Check className="h-4 w-4" />
          </TaskIconButton>
        </div>
      </div>

      <div
        className={`overflow-hidden px-4 transition-all duration-200 ${
          showActions ? 'mt-2 max-h-96 opacity-100' : 'mt-0 max-h-0 opacity-0'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {showActions && (
          <div className="space-y-2">
            <p className="break-words text-sm leading-relaxed text-slate-950">{task.title}</p>
            <div className="mx-auto w-full max-w-sm">
              <RewardGradeSelector taskId={task.id} compact />
            </div>
            <div className="flex justify-center gap-1">
              <TaskIconButton label={t('Delete')} tone="danger" onClick={() => onDeleteConfirm(task.id)}>
                <X className="h-3.5 w-3.5" />
              </TaskIconButton>
              <TaskIconButton label={t('Edit task')} onClick={() => setIsEditing(true)}>
                <Pencil className="h-3.5 w-3.5" />
              </TaskIconButton>
            </div>
          </div>
        )}
      </div>
    </TaskCard>
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
      <form onSubmit={handleSaveEdit} className="task-editor">
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
            className="field w-full min-h-[2.5rem] resize-none overflow-hidden"
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
              className="field-compact w-20"
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
              className="field-compact w-16"
              placeholder={t('Week')}
            />
          </div>
        </div>
        <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={handleCancelEdit}
              className="button-secondary"
            >
              {t('Cancel')}
            </button>
            <button type="submit" className="button-primary">
              {t('Save')}
            </button>
        </div>
      </form>
    );
  }

  return (
    <TaskCard
      onClick={() => {
        // Don't toggle actions if currently dragging or just finished dragging
        if (!isDragging && !wasDragging) {
          setShowActions(prev => !prev);
        }
      }}
    >
      <RewardGradeSurface taskId={task.id} />
      <div className="flex min-w-0 items-center justify-between gap-2">
        <div 
          className="flex flex-1 min-w-0 items-center gap-2"
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
          <RewardGradeIncrementButton taskId={task.id} />
          <span
            className={`min-w-0 max-w-full flex-1 text-sm text-slate-950 ${showActions ? 'sr-only' : 'block truncate whitespace-nowrap'} ${task.status === 'done' ? 'line-through' : ''}`}
          >
            {task.title}
          </span>
        </div>
        <div className="flex flex-shrink-0 items-center gap-1">
          <WeekTaskMoveButton onClick={() => onMove(task.id)} />
          <TaskIconButton
            label={t('Mark as done')}
            tone="success"
            onClick={(e) => {
              e.stopPropagation();
              completeTask(dispatch, task, {
                plan: { week: null, day: getTodayString(), month: getTodayString().slice(0, 7), year: getTodayString().slice(0, 4) },
              });
            }}
          >
            <Check className="h-4 w-4" />
          </TaskIconButton>
        </div>
      </div>

      <div
        className={`overflow-hidden px-4 transition-all duration-200 ${
          showActions ? 'mt-2 max-h-96 opacity-100' : 'mt-0 max-h-0 opacity-0'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {showActions && (
          <div className="space-y-2">
            <p className="break-words text-sm leading-relaxed text-slate-950">{task.title}</p>
            <div className="mx-auto w-full max-w-sm">
              <RewardGradeSelector taskId={task.id} compact />
            </div>
            <div className="flex justify-center gap-1">
              <TaskIconButton label={t('Delete')} tone="danger" onClick={() => onDeleteConfirm(task.id)}>
                <X className="h-3.5 w-3.5" />
              </TaskIconButton>
              <TaskIconButton label={t('Edit task')} onClick={() => setIsEditing(true)}>
                <Pencil className="h-3.5 w-3.5" />
              </TaskIconButton>
            </div>
          </div>
        )}
      </div>
    </TaskCard>
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
      className={`${className} min-h-12 rounded-xl transition-colors ${isOver ? 'bg-brand-50 ring-2 ring-brand-100' : ''}`}
    >
      <SortableContext items={tasks.map(task => task.id)} strategy={verticalListSortingStrategy}>
        {children}
      </SortableContext>
    </div>
  );
};
