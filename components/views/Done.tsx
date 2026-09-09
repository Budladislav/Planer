import React, { useState } from 'react';
import { useAppStore } from '../../store';
import { Task } from '../../types';
import { generateId, getDateString, getTodayString } from '../../utils';
import { Calendar, Plus, ChevronDown, ChevronRight, Pencil, RotateCcw, X } from 'lucide-react';
import { ConfirmModal } from '../Modal';
import { deleteTask, reopenTask } from '../../task-lifecycle';
import { useI18n } from '../../i18n';
import { EmptyState, TaskCard, TaskIconButton } from '../ui/Primitives';
import { RewardCompletionMeta, RewardGradeMarker, RewardGradeSurface } from '../../features/rewards-lab/ui/RewardGradeControls';

export const DoneView: React.FC = () => {
  const { state, dispatch } = useAppStore();
  const { locale, t } = useI18n();
  const [deleteConfirm, setDeleteConfirm] = useState<{ isOpen: boolean; taskId: string | null }>({
    isOpen: false,
    taskId: null,
  });
  const [quickAdd, setQuickAdd] = useState('');
  const todayStr = getTodayString();
  
  // State for expanded dates - default: today is expanded
  const [expandedDates, setExpandedDates] = useState<Set<string>>(() => {
    return new Set([todayStr]);
  });

  // The completion timestamp is independent of the day on which a task was planned.
  const doneTasks = state.tasks
    .filter(t => t.status === 'done')
    .sort((a, b) => Date.parse(b.completedAt ?? b.updatedAt) - Date.parse(a.completedAt ?? a.updatedAt));

  // Group by date
  const tasksByDate = doneTasks.reduce((acc, task) => {
    const date = getDateString(new Date(task.completedAt ?? task.updatedAt));
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
        plan: { day: getTodayString(), week: null, month: getTodayString().slice(0, 7), year: getTodayString().slice(0, 4) },
        projectId: null,
        eventId: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        completedAt: new Date().toISOString(),
      },
    });
    setQuickAdd('');
  };

  const handleUndo = (id: string) => {
    const task = state.tasks.find(candidate => candidate.id === id);
    if (task) reopenTask(dispatch, task);
  };

  const handleDelete = (id: string) => {
    setDeleteConfirm({ isOpen: true, taskId: id });
  };

  const handleDeleteConfirm = () => {
    if (deleteConfirm.taskId) {
      const task = state.tasks.find(candidate => candidate.id === deleteConfirm.taskId);
      if (task) deleteTask(dispatch, task);
      setDeleteConfirm({ isOpen: false, taskId: null });
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
    const weekday = date.toLocaleDateString(locale, { weekday: 'long' });
    const month = date.toLocaleDateString(locale, { month: 'short' });
    const day = date.getDate();
    const year = date.getFullYear();
    return `${weekday}, ${month} ${day}, ${year}`;
  };

  const TaskItem: React.FC<{ task: Task }> = ({ task }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [editTitle, setEditTitle] = useState(task.title);

    // Only allow "Undone" for tasks completed today
    const completedDate = getDateString(new Date(task.completedAt ?? task.updatedAt));
    const canUndo = completedDate === todayStr;

    const handleSaveEdit = (e: React.FormEvent) => {
      e.preventDefault();
      if (!editTitle.trim()) return;
      
      dispatch({
        type: 'UPDATE_TASK',
        payload: {
          id: task.id,
          title: editTitle.trim(),
        },
      });
      setIsEditing(false);
    };

    const handleCancelEdit = () => {
      setIsEditing(false);
      setEditTitle(task.title);
    };

    if (isEditing) {
      return (
        <form onSubmit={handleSaveEdit} className="task-editor">
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">{t('Title')}</label>
            <input
              type="text"
              required
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              className="field w-full"
              autoFocus
            />
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
      <TaskCard>
        <RewardGradeSurface taskId={task.id} />
        <div className="flex min-w-0 items-start gap-2">
          <RewardGradeMarker taskId={task.id} />
          <span className="min-w-0 flex-1 break-words text-sm leading-relaxed text-slate-950 line-through">
            {task.title}
          </span>
        </div>
        <div className="mt-2 flex items-center justify-between gap-2">
          <RewardCompletionMeta taskId={task.id} />
          <div className="ml-auto flex flex-shrink-0 items-center gap-1">
          <TaskIconButton
            label={t('Delete')}
            tone="danger"
            onClick={(e) => {
              e.stopPropagation();
              handleDelete(task.id);
            }}
          >
            <X className="h-3.5 w-3.5" />
          </TaskIconButton>
          <TaskIconButton
            label={t('Edit task')}
            onClick={(e) => {
              e.stopPropagation();
              setIsEditing(true);
            }}
          >
            <Pencil className="h-3.5 w-3.5" />
          </TaskIconButton>
          {canUndo && (
            <TaskIconButton label={t('Mark as todo')} tone="primary" onClick={() => handleUndo(task.id)}>
              <RotateCcw className="h-3.5 w-3.5" />
            </TaskIconButton>
          )}
          </div>
        </div>
      </TaskCard>
    );
  };

  return (
    <>
    <div className="page-container">
      {/* Tasks List - with bottom padding for fixed form */}
      <div className="flex min-h-[60vh] flex-col space-y-4 pb-20 lg:pb-4">
        {doneTasks.length === 0 ? (
          <div className="flex-1 flex items-center justify-center">
            <EmptyState className="py-12">
              <p className="text-slate-400 font-medium">{t('No completed tasks yet')}</p>
            </EmptyState>
          </div>
        ) : (
          <div className="space-y-4">
            {Object.entries(tasksByDate)
              .sort((a, b) => b[0].localeCompare(a[0])) // Most recent first
              .map(([date, tasks]) => {
                const isExpanded = expandedDates.has(date);
                return (
                  <div key={date} className="surface-card shadow-none">
                    <button
                      onClick={() => toggleDate(date)}
                      className="disclosure-button px-3 py-2"
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
                              {t('Tasks: {count}', { count: tasks.length })}
                            </span>
                          </div>
                        </div>
                      </div>
                    </button>
                    {isExpanded && (
                      <div className="px-3 pb-3 space-y-2 bg-slate-50/50">
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
      <form onSubmit={handleQuickAdd} className="sticky-composer fixed bottom-[72px] left-0 right-0 z-20 lg:hidden">
        <div className="max-w-3xl mx-auto flex items-center gap-3">
          <input 
            type="text" 
            value={quickAdd}
            onChange={e => setQuickAdd(e.target.value)}
            placeholder={t('Add a completed task...')}
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
      <form onSubmit={handleQuickAdd} className="hidden lg:flex items-center gap-3">
        <input 
          type="text" 
          value={quickAdd}
          onChange={e => setQuickAdd(e.target.value)}
          placeholder={t('Add a completed task...')}
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
    </div>

    <ConfirmModal
      isOpen={deleteConfirm.isOpen}
      onClose={() => setDeleteConfirm({ isOpen: false, taskId: null })}
      onConfirm={handleDeleteConfirm}
      title={t('Delete Task')}
      message={t('Delete this task permanently?')}
      variant="danger"
      confirmText={t('Delete')}
    />
    </>
  );
};
