import React from 'react';
import { Flag, SquareArrowOutUpRight } from 'lucide-react';
import { useI18n } from '../../i18n';
import { useAppStore } from '../../store';
import type { Task } from '../../types';
import { TaskIconButton } from '../ui/Primitives';

export const TaskGoalLinkControl: React.FC<{ task: Task }> = ({ task }) => {
  const { state, dispatch } = useAppStore();
  const { t } = useI18n();
  const linkedGoal = task.goalId ? state.goals.find(goal => goal.id === task.goalId) : null;
  const availableGoals = state.goals.filter(goal => goal.status === 'active' || goal.id === linkedGoal?.id);

  return (
    <div className="mx-auto flex w-full max-w-sm items-center gap-2 rounded-xl border border-slate-100 bg-slate-50/80 p-1.5" data-task-goal-link>
      <Flag className={`h-4 w-4 flex-shrink-0 ${linkedGoal ? 'text-brand-600' : 'text-slate-400'}`} aria-hidden="true" />
      <label className="min-w-0 flex-1">
        <span className="sr-only">{t('Linked goal')}</span>
        <select
          value={linkedGoal?.id ?? ''}
          onChange={event => dispatch({
            type: 'UPDATE_TASK',
            payload: { id: task.id, goalId: event.target.value || null },
          })}
          className="field-compact w-full min-w-0 bg-white text-xs"
          aria-label={t('Linked goal for {title}', { title: task.title })}
        >
          <option value="">{state.goals.some(goal => goal.status === 'active') ? t('No linked goal') : t('No active goals')}</option>
          {availableGoals.map(goal => (
            <option key={goal.id} value={goal.id}>
              {goal.title}{goal.status !== 'active' ? ` · ${t(goal.status === 'completed' ? 'Completed' : 'Archived')}` : ''}
            </option>
          ))}
        </select>
      </label>
      {linkedGoal && (
        <TaskIconButton
          label={t('Open linked goal')}
          tone="primary"
          onClick={() => dispatch({ type: 'OPEN_GOAL', payload: linkedGoal.id })}
        >
          <SquareArrowOutUpRight className="h-3.5 w-3.5" />
        </TaskIconButton>
      )}
    </div>
  );
};
