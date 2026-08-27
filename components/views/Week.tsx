import React, { useEffect, useMemo, useState } from 'react';
import { useAppStore } from '../../store';
import { Task } from '../../types';
import { getWeekString, getWeekRange, generateId, getTodayString, getWeekDateRange, formatTime, isValidWeekString, shiftWeekString } from '../../utils';
import { CheckCircle2, ChevronDown, ChevronLeft, ChevronRight, Plus, RotateCcw } from 'lucide-react';
import { ConfirmModal } from '../Modal';
import { planTaskForWeek } from '../../task-planning';
import { getMonthForWeek, getTaskPlanningMonth } from '../../month-planning';
import { partitionWeekDays } from '../../week-days';
import { WeekMetaBadges, WeekNotesEditor } from '../WeekNotes';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  useDroppable,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

const weekBucketContainer = (week: string): string => `week-bucket:${week}`;
const weekDayContainer = (day: string): string => `week-day:${day}`;

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
            className="w-full p-2 border border-slate-300 rounded-lg focus:border-indigo-500 outline-none resize-none overflow-hidden min-h-[2.5rem]"
            rows={1}
            autoFocus
          />
        </div>
        <div>
          <label className="block text-xs font-bold text-slate-500 uppercase mb-1 mt-2">Week</label>
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
              placeholder="Year"
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
              placeholder="Week"
            />
          </div>
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
      className="px-3 py-2 bg-white border border-slate-200 rounded-lg shadow-sm w-full max-w-full overflow-hidden text-sm"
      onClick={() => {
        // Don't toggle actions if currently dragging or just finished dragging
        if (!isDragging && !wasDragging) {
          setShowActions(prev => !prev);
        }
      }}
    >
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
          title="Move"
        >
          Move
        </button>
      </div>

      <div
        className={`flex items-center justify-between px-4 gap-3 transition-all duration-200 ${
          showActions ? 'mt-2 opacity-100 max-h-40' : 'mt-0 opacity-0 max-h-0 overflow-hidden'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDeleteConfirm(task.id);
          }}
          className="px-3 py-1.5 text-xs font-semibold text-red-700 bg-red-50 rounded hover:bg-red-100"
          title="Delete"
        >
          Delete
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            setIsEditing(true);
          }}
          className="px-3 py-1.5 text-xs font-semibold text-slate-600 bg-slate-100 rounded hover:bg-slate-200"
          title="Edit"
        >
          Edit
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            dispatch({
              type: 'UPDATE_TASK',
              payload: {
                id: task.id,
                status: 'done',
                plan: { week: null, day: getTodayString(), month: getTodayString().slice(0, 7) },
              },
            });
          }}
          className="px-3 py-1.5 text-xs font-semibold text-green-700 bg-green-50 rounded hover:bg-green-100"
          title="Mark Done"
        >
          Done
        </button>
      </div>
    </div>
  );
};

// Sortable wrapper for DayTaskItem
const SortableDayTaskItem: React.FC<DayTaskItemProps> = (props) => {
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
            className="w-full p-2 border border-slate-300 rounded-lg focus:border-indigo-500 outline-none resize-none overflow-hidden min-h-[2.5rem]"
            rows={1}
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
              placeholder="Year"
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
              placeholder="Week"
            />
          </div>
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
      className="px-3 py-2 bg-white border border-slate-200 rounded-lg shadow-sm w-full max-w-full overflow-hidden text-sm"
      onClick={() => {
        // Don't toggle actions if currently dragging or just finished dragging
        if (!isDragging && !wasDragging) {
          setShowActions(prev => !prev);
        }
      }}
    >
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
          title="Move"
        >
          Move
        </button>
      </div>

      <div
        className={`flex items-center justify-between px-4 gap-3 transition-all duration-200 ${
          showActions ? 'mt-2 opacity-100 max-h-40' : 'mt-0 opacity-0 max-h-0 overflow-hidden'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDeleteConfirm(task.id);
          }}
          className="px-3 py-1.5 text-xs font-semibold text-red-700 bg-red-50 rounded hover:bg-red-100"
          title="Delete"
        >
          Delete
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            setIsEditing(true);
          }}
          className="px-3 py-1.5 text-xs font-semibold text-slate-600 bg-slate-100 rounded hover:bg-slate-200"
          title="Edit"
        >
          Edit
        </button>
        <button
          onClick={() => {
            dispatch({
              type: 'UPDATE_TASK',
              payload: {
                id: task.id,
                status: 'done',
                plan: { week: null, day: getTodayString(), month: getTodayString().slice(0, 7) }, // Move to today when completed
              },
            });
          }}
          className="px-3 py-1.5 text-xs font-semibold text-green-700 bg-green-50 rounded hover:bg-green-100"
          title="Mark Done"
        >
          Done
        </button>
      </div>
    </div>
  );
};

// Sortable wrapper for BucketTaskItem
const SortableBucketTaskItem: React.FC<BucketTaskItemProps> = (props) => {
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

const WeekTaskDropZone: React.FC<{
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

export const WeekView: React.FC = () => {
  const { state, dispatch } = useAppStore();
  const [currentWeek, setCurrentWeek] = useState(getWeekString());
  const [quickAdd, setQuickAdd] = useState('');
  const [notesEditorWeek, setNotesEditorWeek] = useState<string | null>(null);
  const [pastDaysExpanded, setPastDaysExpanded] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<{ isOpen: boolean; taskId: string | null }>({
    isOpen: false,
    taskId: null,
  });

  // Only show TODO tasks in week bucket (completed tasks live in Done view)
  // Apply saved order for week bucket (desktop only)
  const weekTasks = useMemo(() => {
    const weekTasksRaw = state.tasks.filter(
      t => t.plan.week === currentWeek && !t.plan.day && t.status === 'todo'
    );
    
    const savedOrder = state.taskOrderByWeekBucket[currentWeek];
    if (!savedOrder || savedOrder.length === 0) {
      return weekTasksRaw;
    }
    // Create a map for quick lookup
    const taskMap = new Map(weekTasksRaw.map(t => [t.id, t]));
    // Build ordered array, preserving saved order and appending any new tasks
    const ordered: Task[] = [];
    const usedIds = new Set<string>();
    for (const id of savedOrder) {
      const task = taskMap.get(id);
      if (task) {
        ordered.push(task);
        usedIds.add(id);
      }
    }
    // Append any tasks not in saved order
    for (const task of weekTasksRaw) {
      if (!usedIds.has(task.id)) {
        ordered.push(task);
      }
    }
    return ordered;
  }, [state.tasks, state.taskOrderByWeekBucket, currentWeek]);

  const todayStr = getTodayString();
  const thisWeek = getWeekString();

  // Calculate dates for Mon-Sun of current week using UTC to avoid TZ drift
  const weekDays = useMemo(() => {
    const [yearStr, weekNumStr] = currentWeek.split('-W');
    const year = parseInt(yearStr, 10);
    const weekNum = parseInt(weekNumStr, 10);

    // ISO: week 1 is the week with Jan 4th, Monday is day 1
    const jan4 = new Date(Date.UTC(year, 0, 4));
    const jan4Day = jan4.getUTCDay() || 7; // Sunday -> 7
    const firstMonday = new Date(jan4);
    firstMonday.setUTCDate(jan4.getUTCDate() - (jan4Day - 1));

    const weekStart = new Date(firstMonday);
    weekStart.setUTCDate(firstMonday.getUTCDate() + (weekNum - 1) * 7);

    const days = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(weekStart);
      d.setUTCDate(weekStart.getUTCDate() + i);
      const iso = d.toISOString().split('T')[0]; // YYYY-MM-DD (UTC)
      const dd = d.getUTCDate().toString().padStart(2, '0');
      const mm = (d.getUTCMonth() + 1).toString().padStart(2, '0');
      const yyyy = d.getUTCFullYear();
      const label = `${dd}.${mm}.${yyyy}`;
      const weekday = d.toLocaleDateString('en-US', { weekday: 'short', timeZone: 'UTC' });
      days.push({ label, date: iso, weekday });
    }
    return days;
  }, [currentWeek]);

  const { pastDays, currentAndFutureDays } = useMemo(
    () => partitionWeekDays(weekDays, todayStr),
    [todayStr, weekDays],
  );

  // All tasks for current week (both assigned to days and in bucket)
  const allWeekTasks = useMemo(() => {
    const weekDates = weekDays.map(d => d.date);
    return state.tasks.filter(t => 
      (t.plan.week === currentWeek && !t.plan.day) || // Tasks in bucket
      (t.plan.day && weekDates.includes(t.plan.day)) // Tasks assigned to days of this week
    );
  }, [state.tasks, currentWeek, weekDays]);

  const todoWeekTasks = allWeekTasks.filter(t => t.status === 'todo');
  const doneWeekTasks = allWeekTasks.filter(t => t.status === 'done');

  // When a day in the current week moves into the past, move its remaining TODO tasks to week bucket
  useEffect(() => {
    // Only apply for the current calendar week
    if (currentWeek !== thisWeek) return;
    weekDays.forEach(day => {
      if (day.date < todayStr) {
        const staleTasks = state.tasks.filter(
          t => t.status === 'todo' && t.plan.day === day.date
        );
        staleTasks.forEach(task => {
          dispatch({
            type: 'UPDATE_TASK',
            payload: {
              id: task.id,
              plan: {
                week: currentWeek,
                day: null,
                month: getTaskPlanningMonth(task) ?? getMonthForWeek(currentWeek),
              },
            },
          });
        });
        // Clear any saved order for this past day
        if (state.taskOrderByDay[day.date]) {
          dispatch({
            type: 'UPDATE_TASK_ORDER',
            payload: { day: day.date, order: [] },
          });
        }
      }
    });
  }, [currentWeek, thisWeek, todayStr, weekDays, state.tasks, state.taskOrderByDay, dispatch]);

  const [moveTaskId, setMoveTaskId] = useState<string | null>(null); // touch-friendly move
  const [quickAddDay, setQuickAddDay] = useState<string | null>(null); // день для быстрого добавления задачи
  const [quickAddTitle, setQuickAddTitle] = useState(''); // заголовок для быстрого добавления

  // Простая эвристика для touch, используется только для отображения подсказок/модалки Move
  const [isTouch, setIsTouch] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia?.('(pointer: coarse)');
    const hasTouchPoints = (navigator as any)?.maxTouchPoints > 0;
    const hasTouchEvent = typeof window !== 'undefined' && 'ontouchstart' in window;
    setIsTouch(!!(mq?.matches || hasTouchPoints || hasTouchEvent));
  }, []);

  // DnD sensors for desktop and mobile
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 250,
        tolerance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Tasks grouped by day for current week
  // Show only TODO tasks assigned to each day (plan.day === day.date)
  const dayTasks = useMemo(() => {
    const map: Record<string, Task[]> = {};
    weekDays.forEach((day) => {
      const tasks = state.tasks.filter(
        (t) => t.plan.day === day.date && t.status === 'todo'
      );
      // Apply saved order if available
      const savedOrder = state.taskOrderByDay[day.date];
      if (savedOrder && savedOrder.length > 0) {
        const taskMap = new Map(tasks.map(t => [t.id, t]));
        const orderedTasks: typeof tasks = [];
        // Add tasks in saved order
        savedOrder.forEach(id => {
          const task = taskMap.get(id);
          if (task) {
            orderedTasks.push(task);
            taskMap.delete(id);
          }
        });
        // Add any remaining tasks (new ones not in saved order)
        taskMap.forEach(task => orderedTasks.push(task));
        map[day.date] = orderedTasks;
      } else {
        map[day.date] = tasks;
      }
    });
    return map;
  }, [state.tasks, weekDays, state.taskOrderByDay]);

  const completedDayTasks = useMemo(() => {
    const map: Record<string, Task[]> = {};
    weekDays.forEach(day => {
      map[day.date] = state.tasks
        .filter(task => task.plan.day === day.date && task.status === 'done')
        .sort((a, b) => (b.completedAt ?? b.updatedAt).localeCompare(a.completedAt ?? a.updatedAt));
    });
    return map;
  }, [state.tasks, weekDays]);

  const containerForTask = (taskId: string): string | null => {
    const task = state.tasks.find(item => item.id === taskId);
    if (!task) return null;
    return task.plan.day
      ? weekDayContainer(task.plan.day)
      : task.plan.week === currentWeek
        ? weekBucketContainer(currentWeek)
        : null;
  };

  const tasksForContainer = (containerId: string): Task[] => {
    if (containerId === weekBucketContainer(currentWeek)) return weekTasks;
    if (containerId.startsWith('week-day:')) return dayTasks[containerId.slice('week-day:'.length)] ?? [];
    return [];
  };

  const handleWeekDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over) return;
    const activeId = String(active.id);
    const overId = String(over.id);
    const sourceContainer = containerForTask(activeId);
    const targetContainer = overId.startsWith('week-bucket:') || overId.startsWith('week-day:')
      ? overId
      : containerForTask(overId);
    if (!sourceContainer || !targetContainer) return;

    if (sourceContainer === targetContainer) {
      const tasks = tasksForContainer(sourceContainer);
      const oldIndex = tasks.findIndex(task => task.id === activeId);
      const newIndex = tasks.findIndex(task => task.id === overId);
      if (oldIndex === -1 || newIndex === -1 || oldIndex === newIndex) return;
      const order = arrayMove(tasks, oldIndex, newIndex).map(task => task.id);
      if (sourceContainer.startsWith('week-day:')) {
        dispatch({ type: 'UPDATE_TASK_ORDER', payload: { day: sourceContainer.slice('week-day:'.length), order } });
      } else {
        dispatch({ type: 'UPDATE_TASK_ORDER_WEEK_BUCKET', payload: { week: currentWeek, order } });
      }
      return;
    }

    const task = state.tasks.find(item => item.id === activeId);
    if (!task) return;
    const planningMonth = getTaskPlanningMonth(task) ?? getMonthForWeek(currentWeek);
    if (targetContainer.startsWith('week-day:')) {
      const day = targetContainer.slice('week-day:'.length);
      dispatch({
        type: 'UPDATE_TASK',
        payload: { id: activeId, plan: { day, week: currentWeek, month: planningMonth ?? day.slice(0, 7) } },
      });
      const targetOrder = (dayTasks[day] ?? []).map(item => item.id).filter(id => id !== activeId);
      dispatch({ type: 'UPDATE_TASK_ORDER', payload: { day, order: [...targetOrder, activeId] } });
    } else {
      dispatch({
        type: 'UPDATE_TASK',
        payload: { id: activeId, plan: { day: null, week: currentWeek, month: planningMonth } },
      });
      const targetOrder = weekTasks.map(item => item.id).filter(id => id !== activeId);
      dispatch({ type: 'UPDATE_TASK_ORDER_WEEK_BUCKET', payload: { week: currentWeek, order: [...targetOrder, activeId] } });
    }
  };

  // Navigate freely between past and future weeks.
  const changeWeek = (delta: number) => {
    setPastDaysExpanded(false);
    setCurrentWeek(week => shiftWeekString(week, delta));
  };

  const moveTask = (id: string, day: string | null) => {
    const task = state.tasks.find(item => item.id === id);
    if (!task) return;
    const planningMonth = getTaskPlanningMonth(task) ?? getMonthForWeek(currentWeek);
    dispatch({
      type: 'UPDATE_TASK',
      payload: {
        id,
        plan: day
          ? { day, week: getWeekString(day), month: planningMonth ?? day.slice(0, 7) }
          : { week: currentWeek, day: null, month: planningMonth },
      },
    });
    // If moving to a day, update the order (add to end)
    if (day) {
      const currentOrder = state.taskOrderByDay[day] || [];
      if (!currentOrder.includes(id)) {
        dispatch({
          type: 'UPDATE_TASK_ORDER',
          payload: { day, order: [...currentOrder, id] },
        });
      }
      // Remove from week bucket order if present
      const bucketOrder = state.taskOrderByWeekBucket[currentWeek] || [];
      if (bucketOrder.includes(id)) {
        const newBucketOrder = bucketOrder.filter(taskId => taskId !== id);
        dispatch({
          type: 'UPDATE_TASK_ORDER_WEEK_BUCKET',
          payload: { week: currentWeek, order: newBucketOrder },
        });
      }
    } else {
      const bucketOrder = (state.taskOrderByWeekBucket[currentWeek] || []).filter(taskId => taskId !== id);
      dispatch({
        type: 'UPDATE_TASK_ORDER_WEEK_BUCKET',
        payload: { week: currentWeek, order: [...bucketOrder, id] },
      });
    }
    setMoveTaskId(null);
  };

  const handleQuickAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (quickAdd.trim()) {
      const newTaskId = generateId();
      dispatch({
        type: 'ADD_TASK',
        payload: {
          id: newTaskId,
          title: quickAdd.trim(),
          status: 'todo',
          plan: { week: currentWeek, day: null, month: getMonthForWeek(currentWeek) },
          projectId: null,
          eventId: null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          completedAt: null,
        }
      });
      // Add to end of week bucket order
      const currentOrder = state.taskOrderByWeekBucket[currentWeek] || [];
      dispatch({
        type: 'UPDATE_TASK_ORDER_WEEK_BUCKET',
        payload: { week: currentWeek, order: [...currentOrder, newTaskId] },
      });
      setQuickAdd('');
    }
  };

  const handleQuickAddToDay = (day: string, title: string) => {
    if (!title.trim()) return;
    
    const newTaskId = generateId();
    const dayWeek = getWeekString(day);
    
    // Создаём задачу для конкретного дня
    dispatch({
      type: 'ADD_TASK',
      payload: {
        id: newTaskId,
        title: title.trim(),
        status: 'todo',
        plan: { day, week: dayWeek, month: day.slice(0, 7) },
        projectId: null,
        eventId: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        completedAt: null,
      }
    });
    
    // Добавляем задачу в конец порядка дня
    const currentOrder = state.taskOrderByDay[day] || [];
    dispatch({
      type: 'UPDATE_TASK_ORDER',
      payload: { day, order: [...currentOrder, newTaskId] },
    });
    
    setQuickAddDay(null);
  };

  const handleDeleteConfirm = (id: string) => {
    setDeleteConfirm({ isOpen: true, taskId: id });
  };

  const handleDelete = (id: string) => {
    // Remove from task order if present in any day
    const dayKeys = Object.keys(state.taskOrderByDay);
    dayKeys.forEach(day => {
      const order = state.taskOrderByDay[day] || [];
      if (order.includes(id)) {
        const newOrder = order.filter(taskId => taskId !== id);
        dispatch({
          type: 'UPDATE_TASK_ORDER',
          payload: { day, order: newOrder },
        });
      }
    });
    // Remove from week bucket order if present
    const weekKeys = Object.keys(state.taskOrderByWeekBucket);
    weekKeys.forEach(week => {
      const order = state.taskOrderByWeekBucket[week] || [];
      if (order.includes(id)) {
        const newOrder = order.filter(taskId => taskId !== id);
        dispatch({
          type: 'UPDATE_TASK_ORDER_WEEK_BUCKET',
          payload: { week, order: newOrder },
        });
      }
    });
    dispatch({ type: 'DELETE_TASK', payload: id });
  };

  const weekDateRange = getWeekDateRange(currentWeek);

  const renderDay = (day: (typeof weekDays)[number], isPast: boolean) => {
    const tasks = dayTasks[day.date] ?? [];
    const completedTasks = isPast ? (completedDayTasks[day.date] ?? []) : [];
    const taskCount = tasks.length + completedTasks.length;
    const canPlanDay = !(currentWeek === thisWeek && isPast);

    const content = (
      <>
        {canPlanDay && tasks.length === 0 && completedTasks.length === 0 && (
          <div className="text-sm italic text-slate-400">Drag a task here from the week list or another day</div>
        )}
        {tasks.map(task => (
          <SortableDayTaskItem
            key={task.id}
            task={task}
            todayStr={todayStr}
            dispatch={dispatch}
            onMove={id => setMoveTaskId(id)}
            onDeleteConfirm={handleDeleteConfirm}
          />
        ))}
        {completedTasks.map(task => {
          const completedAt = task.completedAt ?? task.updatedAt;
          const completedTime = completedAt
            ? new Date(completedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            : null;
          return (
            <div key={task.id} className="flex min-w-0 items-center gap-2 rounded-lg border border-green-100 bg-green-50/60 px-3 py-2 text-sm">
              <CheckCircle2 className="h-4 w-4 flex-shrink-0 text-green-600" />
              <span className="min-w-0 flex-1 truncate text-slate-500 line-through" title={task.title}>{task.title}</span>
              {(task.timeSpent ?? 0) > 0 && (
                <span className="flex-shrink-0 text-xs text-slate-400">{formatTime(task.timeSpent ?? 0)}</span>
              )}
              {completedTime && <span className="flex-shrink-0 text-xs text-slate-400">{completedTime}</span>}
              <button
                type="button"
                onClick={() => dispatch({ type: 'UPDATE_TASK', payload: { id: task.id, status: 'todo' } })}
                className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded text-slate-400 hover:bg-white hover:text-indigo-600"
                title="Return task to work"
                aria-label={`Return ${task.title} to work`}
              >
                <RotateCcw className="h-3.5 w-3.5" />
              </button>
            </div>
          );
        })}
        {!canPlanDay && completedTasks.length === 0 && (
          <div className="text-sm italic text-slate-400">No completed tasks</div>
        )}
      </>
    );

    return (
      <div key={day.date} className={`rounded-lg border bg-white transition-colors ${isPast ? 'border-slate-200/80' : 'border-slate-200'}`}>
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex flex-1 items-center justify-between text-left">
            <div className="flex items-center gap-2">
              <span className={`font-semibold ${isPast ? 'text-slate-500' : 'text-slate-800'}`}>{day.weekday}</span>
              <span className="text-xs text-slate-500">{day.label}</span>
            </div>
            <div className="flex items-center gap-2">
              {canPlanDay && (
                <button onClick={() => setQuickAddDay(day.date)} className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded text-indigo-600 hover:bg-indigo-50" title="Add task to this day">
                  <Plus className="h-4 w-4" />
                </button>
              )}
              <span className="text-sm text-slate-500">{taskCount === 0 ? 'No tasks' : taskCount}</span>
            </div>
          </div>
        </div>
        {canPlanDay ? (
          <WeekTaskDropZone
            id={weekDayContainer(day.date)}
            tasks={tasks}
            className="space-y-2 border-t border-slate-100 px-4 pb-4 pt-4"
          >
            {content}
          </WeekTaskDropZone>
        ) : (
          <div className="space-y-2 border-t border-slate-100 px-4 pb-4 pt-4">{content}</div>
        )}
      </div>
    );
  };

  return (
    <div className="max-w-3xl mx-auto">
      {/* Header - Centered */}
      <div className="mb-3 px-12 text-center lg:px-0">
        <h2 className="hidden text-3xl font-bold text-slate-900 lg:block">Weekly Plan</h2>
        <WeekMetaBadges
          week={currentWeek}
          onEdit={() => setNotesEditorWeek(currentWeek)}
          className="mt-1 justify-center"
        />
        <p className="text-slate-400 text-sm mt-1">
          {todoWeekTasks.length} left • {doneWeekTasks.length} done
          {(() => {
            const totalTime = doneWeekTasks.reduce((sum, task) => sum + (task.timeSpent || 0), 0);
            return totalTime > 0 ? (
              <span className="text-indigo-600 font-medium">
                {' • '}
                {formatTime(totalTime)}
              </span>
            ) : null;
          })()}
        </p>
      </div>

      {/* Content - with bottom padding for fixed forms */}
      <div className="pb-32 lg:pb-16 min-h-[60vh] flex flex-col">
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleWeekDragEnd}>
          <WeekTaskDropZone
            id={weekBucketContainer(currentWeek)}
            tasks={weekTasks}
            className="flex-1 space-y-2 rounded-lg border border-dashed border-slate-200 p-2"
          >
            <div className="text-center text-sm font-semibold text-slate-600">Week tasks (no date)</div>
            {weekTasks.length === 0 ? (
              <div className="text-sm italic text-slate-400">No tasks in week bucket. Drag a task here from a specific day.</div>
            ) : (
              <div className="grid gap-2">
                {weekTasks.map(task => (
                  <SortableBucketTaskItem
                    key={task.id}
                    task={task}
                    currentWeek={currentWeek}
                    dispatch={dispatch}
                    onMove={id => setMoveTaskId(id)}
                    onDeleteConfirm={handleDeleteConfirm}
                  />
                ))}
              </div>
            )}
            {isTouch && weekTasks.length > 0 && (
              <div className="text-xs text-slate-400">Long-press and drag, or use Move as an alternative.</div>
            )}
          </WeekTaskDropZone>

          <div className="mt-3 space-y-2">
            {pastDays.length > 0 && (
              <div className="rounded-lg border border-slate-200 bg-slate-50/70 p-1.5">
                <button
                  type="button"
                  aria-expanded={pastDaysExpanded}
                  onClick={() => setPastDaysExpanded(value => !value)}
                  className="flex w-full items-center justify-between rounded-md px-2 py-1.5 text-left text-sm font-semibold text-slate-500 hover:bg-white hover:text-slate-700"
                >
                  <span>Past days ({pastDays.length})</span>
                  <ChevronDown className={`h-4 w-4 transition-transform ${pastDaysExpanded ? 'rotate-180' : ''}`} />
                </button>
                {pastDaysExpanded && (
                  <div className="mt-1.5 space-y-2">
                    {pastDays.map(day => renderDay(day, true))}
                  </div>
                )}
              </div>
            )}
            {currentAndFutureDays.map(day => renderDay(day, false))}
          </div>
        </DndContext>
      </div>

      {/* Move remains available as an alternative to drag and drop. */}
      {moveTaskId && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-end sm:items-center sm:justify-center z-40" onClick={() => setMoveTaskId(null)}>
          <div
            className="w-full sm:w-[420px] bg-white rounded-t-2xl sm:rounded-2xl shadow-xl p-4 space-y-3"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <div className="font-semibold text-slate-800">Where to move task?</div>
              <button onClick={() => setMoveTaskId(null)} className="text-slate-400 hover:text-slate-600 text-sm">Close</button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => moveTask(moveTaskId, null)}
                className="p-3 border border-slate-200 rounded-lg hover:border-indigo-200 text-left"
              >
                Week bucket (no date)
              </button>
              {weekDays
                .filter(day => currentWeek !== thisWeek || day.date >= todayStr)
                .map((day) => (
                <button
                  key={day.date}
                  onClick={() => moveTask(moveTaskId, day.date)}
                  className={`p-3 border rounded-lg text-left ${
                    day.date === todayStr
                      ? 'border-indigo-200 bg-indigo-50/50 hover:bg-indigo-50'
                      : 'border-slate-200 hover:border-indigo-200'
                  }`}
                >
                  {day.weekday} {day.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Quick Add to Day Modal */}
      {quickAddDay && (() => {
        const selectedDay = weekDays.find(d => d.date === quickAddDay);
        
        return (
          <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-end sm:items-center sm:justify-center z-40" onClick={() => {
            setQuickAddDay(null);
            setQuickAddTitle('');
          }}>
            <div
              className="w-full sm:w-[420px] bg-white rounded-t-2xl sm:rounded-2xl shadow-xl p-4 space-y-3"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between">
                <div className="font-semibold text-slate-800">
                  Add task to {selectedDay?.weekday} {selectedDay?.label}
                </div>
                <button onClick={() => {
                  setQuickAddDay(null);
                  setQuickAddTitle('');
                }} className="text-slate-400 hover:text-slate-600 text-sm">Close</button>
              </div>
              <form onSubmit={(e) => {
                e.preventDefault();
                handleQuickAddToDay(quickAddDay, quickAddTitle);
                setQuickAddTitle('');
                setQuickAddDay(null);
              }} className="space-y-3">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Title</label>
                  <input
                    type="text"
                    required
                    value={quickAddTitle}
                    onChange={(e) => setQuickAddTitle(e.target.value)}
                    className="w-full p-2 border border-slate-300 rounded-lg focus:border-indigo-500 outline-none"
                    autoFocus
                    placeholder="Task title..."
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setQuickAddDay(null);
                      setQuickAddTitle('');
                    }}
                    className="flex-1 px-3 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-3 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                  >
                    Add
                  </button>
                </div>
              </form>
            </div>
          </div>
        );
      })()}

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

      <WeekNotesEditor week={notesEditorWeek} onClose={() => setNotesEditorWeek(null)} />

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
