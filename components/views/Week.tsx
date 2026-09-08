import React, { useEffect, useMemo, useState } from 'react';
import { useAppStore } from '../../store';
import { Task } from '../../types';
import { getWeekString, getWeekRange, generateId, getTodayString, getWeekDateRange, shiftWeekString } from '../../utils';
import { CheckCircle2, ChevronDown, ChevronLeft, ChevronRight, Plus, RotateCcw } from 'lucide-react';
import { ConfirmModal } from '../Modal';
import { getMonthForWeek, getTaskPlanningMonth } from '../../month-planning';
import { partitionWeekDays } from '../../week-days';
import { WeekMetaBadges, WeekNotesEditor } from '../WeekNotes';
import { DayMetaBadges, DayNotesEditor } from '../DayNotes';
import { deleteTask, reopenTask } from '../../task-lifecycle';
import { useI18n } from '../../i18n';
import { PageHeader } from '../ui/Primitives';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  sortableKeyboardCoordinates,
} from '@dnd-kit/sortable';
import {
  SortableBucketTaskItem,
  SortableDayTaskItem,
  WeekTaskDropZone,
} from '../week/WeekTaskItems';
import { weekBucketContainer, weekDayContainer } from '../week/weekTaskContainers';

export const WeekView: React.FC = () => {
  const { state, dispatch } = useAppStore();
  const { language, locale, t } = useI18n();
  const [currentWeek, setCurrentWeek] = useState(getWeekString());
  const [quickAdd, setQuickAdd] = useState('');
  const [notesEditorWeek, setNotesEditorWeek] = useState<string | null>(null);
  const [notesEditorDate, setNotesEditorDate] = useState<string | null>(null);
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
      const weekday = d.toLocaleDateString(locale, { weekday: 'short', timeZone: 'UTC' });
      days.push({ label, date: iso, weekday });
    }
    return days;
  }, [currentWeek, locale]);

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
        // Clear a populated saved order once. An empty array is still truthy,
        // so dispatching for it on every render would create an update loop.
        if (state.taskOrderByDay[day.date]?.length) {
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
    const task = state.tasks.find(candidate => candidate.id === id);
    if (task) deleteTask(dispatch, task);
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
          <div className="text-sm italic text-slate-400">{t('Drag a task here from the week list or another day')}</div>
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
            <div key={task.id} className="flex min-w-0 items-center gap-2 rounded-xl border border-emerald-100 bg-emerald-50/60 px-3 py-2 text-sm">
              <CheckCircle2 className="h-4 w-4 flex-shrink-0 text-emerald-600" />
              <span className="min-w-0 flex-1 truncate text-slate-500 line-through" title={task.title}>{task.title}</span>
              {completedTime && <span className="flex-shrink-0 text-xs text-slate-400">{completedTime}</span>}
              <button
                type="button"
                onClick={() => reopenTask(dispatch, task)}
                className="icon-button-compact h-7 w-7 text-slate-400 hover:text-brand-600"
                title={t('Return task to work')}
                aria-label={t('Return {title} to work', { title: task.title })}
              >
                <RotateCcw className="h-3.5 w-3.5" />
              </button>
            </div>
          );
        })}
        {!canPlanDay && completedTasks.length === 0 && (
          <div className="text-sm italic text-slate-400">{t('No completed tasks')}</div>
        )}
      </>
    );

    return (
      <div key={day.date} className={`surface-card transition-colors ${isPast ? 'opacity-90' : ''}`}>
        <div className="flex items-start justify-between gap-3 px-4 py-3">
          <div className="flex min-w-0 flex-1 items-start justify-between gap-3 text-left">
            <div className="min-w-0 flex-1">
              <div className="flex min-w-0 items-center gap-2 overflow-hidden">
                <span className={`font-semibold ${isPast ? 'text-slate-500' : 'text-slate-800'}`}>{day.weekday}</span>
                <span className="flex-shrink-0 text-xs text-slate-500">{day.label}</span>
                <DayMetaBadges
                  date={day.date}
                  onEdit={() => setNotesEditorDate(day.date)}
                  maxNotes={1}
                  compact
                  className="min-w-0 flex-1 flex-nowrap overflow-hidden"
                />
              </div>
            </div>
            <div className="flex items-center gap-2">
              {canPlanDay && (
                <button onClick={() => setQuickAddDay(day.date)} className="icon-button-compact h-7 w-7 text-brand-600 hover:bg-brand-50" title={t('Add task to this day')}>
                  <Plus className="h-4 w-4" />
                </button>
              )}
              <span className="text-sm text-slate-500">{taskCount === 0 ? t('No tasks') : taskCount}</span>
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
    <div className="page-container">
      {/* Header - Centered */}
      <PageHeader title={t('Week')} className="px-12 lg:px-0">
        <WeekMetaBadges
          week={currentWeek}
          onEdit={() => setNotesEditorWeek(currentWeek)}
          className="mt-1 justify-center"
        />
        <p className="mt-1 text-sm text-muted">
          {t('{todo} left • {done} done', { todo: todoWeekTasks.length, done: doneWeekTasks.length })}
        </p>
      </PageHeader>

      {/* Content - with bottom padding for fixed forms */}
      <div className="pb-48 lg:pb-16 min-h-[60vh] flex flex-col">
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleWeekDragEnd}>
          <WeekTaskDropZone
            id={weekBucketContainer(currentWeek)}
            tasks={weekTasks}
            className="section-card flex-1 space-y-2 border-dashed"
          >
            <div className="text-center text-sm font-semibold text-slate-600">{t('Week tasks (no date)')}</div>
            {weekTasks.length === 0 ? (
              <div className="text-sm italic text-slate-400">{t('No tasks in week bucket. Drag a task here from a specific day.')}</div>
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
              <div className="text-xs text-slate-400">{t('Long-press and drag, or use Move as an alternative.')}</div>
            )}
          </WeekTaskDropZone>

          <div className="mt-3 space-y-2">
            {pastDays.length > 0 && (
              <div className="surface-card bg-slate-50/60 p-1.5 shadow-none">
                <button
                  type="button"
                  aria-expanded={pastDaysExpanded}
                  onClick={() => setPastDaysExpanded(value => !value)}
                  className="disclosure-button py-2 text-slate-500"
                >
                  <span>{t('Past days ({count})', { count: pastDays.length })}</span>
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
        <div className="sheet-backdrop" onClick={() => setMoveTaskId(null)}>
          <div
            className="sheet-panel sm:w-[420px]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <div className="font-semibold text-slate-800">{t('Where to move task?')}</div>
              <button onClick={() => setMoveTaskId(null)} className="text-slate-400 hover:text-slate-600 text-sm">{t('Close')}</button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => moveTask(moveTaskId, null)}
                className="button-secondary h-auto justify-start p-3 text-left"
              >
                {t('Week bucket (no date)')}
              </button>
              {weekDays
                .filter(day => currentWeek !== thisWeek || day.date >= todayStr)
                .map((day) => (
                <button
                  key={day.date}
                  onClick={() => moveTask(moveTaskId, day.date)}
                  className={`button-secondary h-auto justify-start p-3 text-left ${
                    day.date === todayStr
                      ? 'border-brand-100 bg-brand-50 hover:bg-brand-50'
                      : ''
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
          <div className="sheet-backdrop" onClick={() => {
            setQuickAddDay(null);
            setQuickAddTitle('');
          }}>
            <div
              className="sheet-panel sm:w-[420px]"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between">
                <div className="font-semibold text-slate-800">
                  {t('Add task to {day} {date}', { day: selectedDay?.weekday ?? '', date: selectedDay?.label ?? '' })}
                </div>
                <button onClick={() => {
                  setQuickAddDay(null);
                  setQuickAddTitle('');
                }} className="text-slate-400 hover:text-slate-600 text-sm">{t('Close')}</button>
              </div>
              <form onSubmit={(e) => {
                e.preventDefault();
                handleQuickAddToDay(quickAddDay, quickAddTitle);
                setQuickAddTitle('');
                setQuickAddDay(null);
              }} className="space-y-3">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">{t('Title')}</label>
                  <input
                    type="text"
                    required
                    value={quickAddTitle}
                    onChange={(e) => setQuickAddTitle(e.target.value)}
                    className="field w-full"
                    autoFocus
                    placeholder={t('Task title...')}
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setQuickAddDay(null);
                      setQuickAddTitle('');
                    }}
                    className="button-secondary flex-1"
                  >
                    {t('Cancel')}
                  </button>
                  <button
                    type="submit"
                    className="button-primary flex-1"
                  >
                    {t('Add')}
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
        title={t('Delete Task')}
        message={t('Delete this task permanently?')}
        variant="danger"
        confirmText={t('Delete')}
      />

      <WeekNotesEditor week={notesEditorWeek} onClose={() => setNotesEditorWeek(null)} />
      <DayNotesEditor date={notesEditorDate} onClose={() => setNotesEditorDate(null)} />

      {/* Week Selector - Fixed at bottom (mobile) */}
      <div className="sticky-composer fixed bottom-[137px] left-0 right-0 z-10 p-2.5 lg:hidden">
        <div className="max-w-3xl mx-auto w-full">
          <div className="period-switcher mb-0">
            <button 
              onClick={() => changeWeek(-1)} 
              className="icon-button"
            >
              <ChevronLeft className="w-5 h-5 text-slate-600" />
            </button>
            <div className="flex-1 text-center px-4">
              <div className="font-mono font-medium text-slate-700 text-sm">
                {getWeekRange(currentWeek, language)}
              </div>
              <div className="text-xs text-slate-500 mt-1">
                {weekDateRange.start} - {weekDateRange.end}
              </div>
            </div>
            <button 
              onClick={() => changeWeek(1)} 
              className="icon-button"
            >
              <ChevronRight className="w-5 h-5 text-slate-600" />
            </button>
          </div>
        </div>
      </div>

      {/* Add Form - Fixed at bottom (mobile) */}
      <form onSubmit={handleQuickAdd} className="sticky-composer fixed bottom-[72px] left-0 right-0 z-20 lg:hidden">
        <div className="max-w-3xl mx-auto flex items-center gap-3">
          <input 
            type="text" 
            value={quickAdd}
            onChange={e => setQuickAdd(e.target.value)}
            placeholder={t('Add task to {week}...', { week: getWeekRange(currentWeek, language) })}
            className="field min-w-0 flex-1"
          />
          <button 
            type="submit" 
            className="composer-submit"
            title={t('Add task')}
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
          placeholder={t('Add task to {week}...', { week: getWeekRange(currentWeek, language) })}
          className="field min-w-0 flex-1"
        />
        <button 
          type="submit" 
          className="composer-submit"
          title={t('Add task')}
        >
          <Plus className="w-6 h-6" />
        </button>
      </form>

      {/* Week Selector - Desktop */}
      <div className="hidden lg:block w-full">
        <div className="period-switcher mb-0 p-2">
          <button 
            onClick={() => changeWeek(-1)} 
            className="icon-button"
          >
            <ChevronLeft className="w-5 h-5 text-slate-600" />
          </button>
          <div className="flex-1 text-center px-4">
            <div className="font-mono font-medium text-slate-700">
              {getWeekRange(currentWeek, language)}
            </div>
            <div className="text-sm text-slate-500 mt-1">
              {weekDateRange.start} - {weekDateRange.end}
            </div>
          </div>
          <button 
            onClick={() => changeWeek(1)} 
            className="icon-button"
          >
            <ChevronRight className="w-5 h-5 text-slate-600" />
          </button>
        </div>
      </div>
    </div>
  );
};
