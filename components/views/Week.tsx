import React, { useEffect, useMemo, useState } from 'react';
import { useAppStore } from '../../store';
import { Task } from '../../types';
import { getWeekString, getWeekRange, generateId, getTodayString, getWeekDateRange, formatTime } from '../../utils';
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import { ConfirmModal } from '../Modal';

type DayTaskItemProps = {
  task: Task;
  todayStr: string;
  dispatch: ReturnType<typeof useAppStore>['dispatch'];
  onMove: (id: string) => void;
  onDeleteConfirm: (id: string) => void;
};

const DayTaskItem: React.FC<DayTaskItemProps> = ({ task, todayStr, dispatch, onMove, onDeleteConfirm }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(task.title);
  const [editFrog, setEditFrog] = useState(task.frog);
  const [editWeek, setEditWeek] = useState<string>(() => task.plan.week || getWeekString(task.plan.day || todayStr));
  const [showActions, setShowActions] = useState(false);
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editTitle.trim()) return;
    // Validate week format before saving (if provided)
    let nextPlanWeek: string | null = task.plan.week ?? null;
    if (editWeek) {
      const [yearStr, weekStr] = editWeek.split('-W');
      const weekNum = parseInt(weekStr || '', 10);
      if (!yearStr || !weekStr || isNaN(weekNum) || weekNum < 1 || weekNum > 52) {
        // Invalid week, don't save
        return;
      }
      nextPlanWeek = editWeek;
    }

    dispatch({
      type: 'UPDATE_TASK',
      payload: {
        id: task.id,
        title: editTitle.trim(),
        frog: editFrog,
        plan: {
          day: task.plan.day,
          week: nextPlanWeek,
        },
      },
    });
    setIsEditing(false);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditTitle(task.title);
    setEditFrog(task.frog);
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
              max="52"
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
                if (num > 52) num = 52;
                const week = String(num).padStart(2, '0');
                setEditWeek(`${year}-W${week}`);
              }}
              className="w-16 p-2 border border-slate-300 rounded-lg focus:border-indigo-500 outline-none"
              placeholder="Week"
            />
          </div>
        </div>
        <div className="flex items-center justify-between gap-2">
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={editFrog}
              onChange={(e) => setEditFrog(e.target.checked)}
              className="w-4 h-4 text-indigo-600 rounded"
            />
            <span className="text-lg">🐸</span>
          </label>
          <div className="flex gap-2">
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
        </div>
      </form>
    );
  }

  return (
    <div
      className="p-3 bg-white border border-slate-200 rounded-lg shadow-sm w-full max-w-full overflow-hidden text-sm"
      onClick={() => setShowActions(prev => !prev)}
    >
      <div className={`flex justify-between gap-2 ${showActions ? 'items-start' : 'items-center'}`}>
        <div className={`flex gap-2 flex-1 min-w-0 ${showActions ? 'items-start' : 'items-center'}`}>
          {task.frog && <span className={`flex-shrink-0 ${showActions ? 'mt-0.5' : ''}`}>🐸</span>}
          <span
            className={`text-sm ${showActions ? 'break-all' : 'truncate'} ${
              task.status === 'done' ? 'line-through text-slate-400' : 'text-slate-700'
            }`}
          >
            {task.title}
          </span>
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onMove(task.id);
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
          showActions ? 'mt-3 opacity-100 max-h-40' : 'mt-0 opacity-0 max-h-0 overflow-hidden'
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
                plan: { week: null, day: getTodayString() },
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

type BucketTaskItemProps = {
  task: Task;
  currentWeek: string;
  dispatch: ReturnType<typeof useAppStore>['dispatch'];
  onMove: (id: string) => void;
};

const BucketTaskItem: React.FC<BucketTaskItemProps> = ({ task, currentWeek, dispatch, onMove, onDeleteConfirm }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(task.title);
  const [editFrog, setEditFrog] = useState(task.frog);
  const [editWeek, setEditWeek] = useState(task.plan.week || currentWeek);
  const [showActions, setShowActions] = useState(false);
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editTitle.trim()) return;
    // Validate week format before saving
    const [yearStr, weekStr] = editWeek.split('-W');
    const weekNum = parseInt(weekStr || '', 10);
    if (!yearStr || !weekStr || isNaN(weekNum) || weekNum < 1 || weekNum > 52) {
      // Invalid week, don't save
      return;
    }

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
              max="52"
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
                if (num > 52) num = 52;
                const week = String(num).padStart(2, '0');
                setEditWeek(`${year}-W${week}`);
              }}
              className="w-16 p-2 border border-slate-300 rounded-lg focus:border-indigo-500 outline-none"
              placeholder="Week"
            />
          </div>
        </div>
        <div className="flex items-center justify-between gap-2">
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={editFrog}
              onChange={(e) => setEditFrog(e.target.checked)}
              className="w-4 h-4 text-indigo-600 rounded"
            />
            <span className="text-lg">🐸</span>
          </label>
          <div className="flex gap-2">
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
        </div>
      </form>
    );
  }

  return (
    <div
      className="p-3 bg-white border border-slate-200 rounded-lg shadow-sm w-full max-w-full overflow-hidden text-sm"
      onClick={() => setShowActions(prev => !prev)}
    >
      <div className={`flex justify-between gap-2 ${showActions ? 'items-start' : 'items-center'}`}>
        <div className={`flex gap-2 flex-1 min-w-0 ${showActions ? 'items-start' : 'items-center'}`}>
          {task.frog && <span className={`flex-shrink-0 ${showActions ? 'mt-0.5' : ''}`}>🐸</span>}
          <span
            className={`text-sm ${showActions ? 'break-all' : 'truncate'} ${
              task.status === 'done' ? 'line-through text-slate-400' : 'text-slate-700'
            }`}
          >
            {task.title}
          </span>
        </div>
        <button
          onClick={(e) => { e.stopPropagation(); onMove(task.id); }}
          className={`px-3 py-1.5 text-xs font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded flex-shrink-0 ${
            showActions ? 'mt-0' : ''
          }`}
          title="Move"
        >
          Move
        </button>
      </div>

      <div
        className={`flex items-center justify-between px-4 gap-3 transition-all duration-200 ${
          showActions ? 'mt-3 opacity-100 max-h-40' : 'mt-0 opacity-0 max-h-0 overflow-hidden'
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
                plan: { week: null, day: getTodayString() }, // Move to today when completed
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

export const WeekView: React.FC = () => {
  const { state, dispatch } = useAppStore();
  const [currentWeek, setCurrentWeek] = useState(getWeekString());
  const [quickAdd, setQuickAdd] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState<{ isOpen: boolean; taskId: string | null }>({
    isOpen: false,
    taskId: null,
  });

  // Only show TODO tasks in week bucket (completed tasks live in Done view)
  const weekTasks = state.tasks.filter(
    t => t.plan.week === currentWeek && !t.plan.day && t.status === 'todo'
  ); // Tasks in bucket, not assigned to day yet

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
              plan: { week: currentWeek, day: null },
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

  // UI state (days всегда раскрыты, без сворачивания)
  const [moveTaskId, setMoveTaskId] = useState<string | null>(null); // touch-friendly move
  const [quickAddDay, setQuickAddDay] = useState<string | null>(null); // день для быстрого добавления задачи
  const [quickAddTitle, setQuickAddTitle] = useState(''); // заголовок для быстрого добавления
  const [quickAddFrog, setQuickAddFrog] = useState(false); // лягушка для быстрого добавления

  // Простая эвристика для touch, используется только для отображения подсказок/модалки Move
  const [isTouch, setIsTouch] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia?.('(pointer: coarse)');
    const hasTouchPoints = (navigator as any)?.maxTouchPoints > 0;
    const hasTouchEvent = typeof window !== 'undefined' && 'ontouchstart' in window;
    setIsTouch(!!(mq?.matches || hasTouchPoints || hasTouchEvent));
  }, []);

  // Tasks grouped by day for current week
  // Show only TODO tasks assigned to each day (plan.day === day.date)
  const dayTasks = useMemo(() => {
    const map: Record<string, typeof state.tasks> = {};
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

  // Helper to change week (disallow navigating to past weeks)
  const changeWeek = (delta: number) => {
    const [yearStr, weekStr] = currentWeek.split('-W');
    let year = parseInt(yearStr, 10);
    let week = parseInt(weekStr, 10) + delta;

    if (week > 52) { year++; week = 1; }
    if (week < 1) { year--; week = 52; }

    const nextWeekStr = `${year}-W${week.toString().padStart(2, '0')}`;
    if (nextWeekStr < thisWeek) {
      setCurrentWeek(thisWeek);
    } else {
      setCurrentWeek(nextWeekStr);
    }
  };

  const moveToWeekBucket = (id: string) => {
    dispatch({
      type: 'UPDATE_TASK',
      payload: {
        id,
        plan: { week: currentWeek, day: null },
      },
    });
  };

  const moveTask = (id: string, day: string | null) => {
    dispatch({
      type: 'UPDATE_TASK',
      payload: {
        id,
        plan: day ? { day, week: null } : { week: currentWeek, day: null },
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
    }
    setMoveTaskId(null);
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

  const handleQuickAddToDay = (day: string, title: string, frog: boolean) => {
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
        plan: { day, week: dayWeek },
        frog,
        projectId: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
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
    dispatch({ type: 'DELETE_TASK', payload: id });
  };

  const weekDateRange = getWeekDateRange(currentWeek);

  return (
    <div className="max-w-3xl mx-auto">
      {/* Header - Centered */}
      <div className="text-center mb-3">
        <h2 className="text-3xl font-bold text-slate-900">Weekly Plan</h2>
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
        <div className="flex-1 space-y-2 rounded-lg border border-slate-200 border-dashed p-2">
          <div className="text-sm font-semibold text-slate-600 text-center">Week tasks (no date)</div>
          {weekTasks.length === 0 ? (
            <div className="text-sm text-slate-400 italic">
              No tasks in week bucket. Drag a task here from a specific day.
            </div>
          ) : (
            <div className="grid gap-3">
              {weekTasks.map(task => (
                <BucketTaskItem
                  key={task.id}
                  task={task}
                  currentWeek={currentWeek}
                  dispatch={dispatch}
                  onMove={(id) => setMoveTaskId(id)}
                  onDeleteConfirm={handleDeleteConfirm}
                />
              ))}
            </div>
          )}
          {isTouch && weekTasks.length > 0 && (
            <div className="text-xs text-slate-400">
              On mobile: use Move button on task to move to a day.
            </div>
          )}
        </div>
        {/* Days list with tasks */}
        <div className="mt-3 space-y-2">
          {weekDays.map((day) => {
            // In the current week, hide days that are already in the past
            if (currentWeek === thisWeek && day.date < todayStr) {
              return null;
            }
            const tasks = dayTasks[day.date] || [];
            const tasksCount = tasks.length;
            return (
              <div
                key={day.date}
                className="rounded-lg border border-slate-200 transition-colors bg-white"
              >
                <div className="flex items-center justify-between px-4 py-3">
                  <div className="flex-1 flex items-center justify-between text-left">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-slate-800">{day.weekday}</span>
                      <span className="text-xs text-slate-500">{day.label}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setQuickAddDay(day.date)}
                        className="w-6 h-6 flex items-center justify-center text-indigo-600 hover:bg-indigo-50 rounded transition-colors flex-shrink-0"
                        title="Add task to this day"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                      <span className="text-sm text-slate-500">{tasksCount === 0 ? 'No tasks' : `${tasksCount}`}</span>
                    </div>
                  </div>
                </div>
                <div className="px-4 pb-4 pt-4 border-t border-slate-100 space-y-2">
                    {tasksCount === 0 && (
                      <div className="text-sm text-slate-400 italic">
                        Drag a task here from week list or another day
                      </div>
                    )}
                    {tasks.map((t) => (
                      <DayTaskItem
                        key={t.id}
                        task={t}
                        todayStr={todayStr}
                        dispatch={dispatch}
                        onMove={(id) => setMoveTaskId(id)}
                        onDeleteConfirm={handleDeleteConfirm}
                      />
                    ))}
                  </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Move modal for touch devices */}
      {isTouch && moveTaskId && (
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
              {weekDays.map((day) => (
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
            setQuickAddFrog(false);
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
                  setQuickAddFrog(false);
                }} className="text-slate-400 hover:text-slate-600 text-sm">Close</button>
              </div>
              <form onSubmit={(e) => {
                e.preventDefault();
                handleQuickAddToDay(quickAddDay, quickAddTitle, quickAddFrog);
                setQuickAddTitle('');
                setQuickAddFrog(false);
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
                <div className="flex justify-center">
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={quickAddFrog}
                      onChange={(e) => setQuickAddFrog(e.target.checked)}
                      className="w-4 h-4 text-indigo-600 rounded"
                    />
                    <span className="text-sm text-slate-700">Eat the Frog? 🐸</span>
                  </label>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setQuickAddDay(null);
                      setQuickAddTitle('');
                      setQuickAddFrog(false);
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