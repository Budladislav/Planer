import React, { useState } from 'react';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { ArrowRightLeft, Check, Pencil, X } from 'lucide-react';
import { RewardGradeIncrementButton, RewardGradeSelector, RewardGradeSurface } from '../../features/rewards-lab/ui/RewardGradeControls';
import { useI18n } from '../../i18n';
import { Task } from '../../types';
import { formatDateShort } from '../../utils';
import { TaskCard, TaskIconButton } from '../ui/Primitives';
import { TaskGoalLinkControl } from '../tasks/TaskGoalLinkControl';

type PeriodTaskCardProps = {
  task: Task;
  containerId: string;
  onMove: (taskId: string) => void;
  onEdit: (task: Task) => void;
  onComplete: (taskId: string) => void;
  onDelete: (taskId: string) => void;
};

export const PeriodTaskCard: React.FC<PeriodTaskCardProps> = ({ task, containerId, onMove, onEdit, onComplete, onDelete }) => {
  const { t } = useI18n();
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: task.id,
    data: { containerId },
  });
  const [showActions, setShowActions] = useState(false);

  return (
    <TaskCard
      ref={setNodeRef}
      data-task-id={task.id}
      style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.45 : 1 }}
      className="px-2"
      onClick={() => setShowActions(value => !value)}
    >
      <RewardGradeSurface taskId={task.id} />
      <div className="flex min-w-0 items-center gap-2">
        <div
          {...attributes}
          {...listeners}
          className="flex min-w-0 flex-1 cursor-grab touch-none items-center gap-2 active:cursor-grabbing"
          title={t('Drag task')}
        >
          <RewardGradeIncrementButton taskId={task.id} />
          <span className={`min-w-0 flex-1 text-slate-950 ${showActions ? 'sr-only' : 'truncate'}`}>{task.title}</span>
          {task.plan.day && (
            <span className="flex-shrink-0 rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-500">
              {formatDateShort(task.plan.day).slice(0, 5)}
            </span>
          )}
        </div>
        <div className="flex flex-shrink-0 items-center gap-1">
          <TaskIconButton label={t('Move')} tone="primary" onClick={event => { event.stopPropagation(); onMove(task.id); }}>
            <ArrowRightLeft className="h-3.5 w-3.5" />
          </TaskIconButton>
          <TaskIconButton label={t('Mark as done')} tone="success" onClick={event => { event.stopPropagation(); onComplete(task.id); }}>
            <Check className="h-4 w-4" />
          </TaskIconButton>
        </div>
      </div>
      <div
        className={`overflow-hidden px-2 transition-all ${showActions ? 'mt-2 max-h-96 opacity-100' : 'max-h-0 opacity-0'}`}
        onClick={event => event.stopPropagation()}
      >
        {showActions && (
          <div className="space-y-2">
            <p className="break-words text-sm leading-relaxed text-slate-950">{task.title}</p>
            <div className="mx-auto w-full max-w-sm"><RewardGradeSelector taskId={task.id} compact /></div>
            <TaskGoalLinkControl task={task} />
            <div className="flex justify-center gap-1">
              <TaskIconButton label={t('Delete')} tone="danger" onClick={() => onDelete(task.id)}><X className="h-3.5 w-3.5" /></TaskIconButton>
              <TaskIconButton label={t('Edit task')} onClick={() => onEdit(task)}><Pencil className="h-3.5 w-3.5" /></TaskIconButton>
            </div>
          </div>
        )}
      </div>
    </TaskCard>
  );
};

type PeriodTaskContainerProps = {
  id: string;
  tasks: Task[];
  children: React.ReactNode;
  emptyText: string;
};

export const PeriodTaskContainer: React.FC<PeriodTaskContainerProps> = ({ id, tasks, children, emptyText }) => {
  const { setNodeRef, isOver } = useDroppable({ id, data: { containerId: id } });
  return (
    <div
      ref={setNodeRef}
      data-container-id={id}
      className={`min-h-14 space-y-2 rounded-xl p-2 transition-colors ${isOver ? 'bg-brand-50 ring-2 ring-brand-100' : 'bg-slate-50/70'}`}
    >
      <SortableContext items={tasks.map(task => task.id)} strategy={verticalListSortingStrategy}>{children}</SortableContext>
      {tasks.length === 0 && <div className="py-2 text-center text-xs italic text-slate-400">{emptyText}</div>}
    </div>
  );
};
