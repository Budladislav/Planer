import React, { useMemo, useState } from 'react';
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  closestCenter,
  type DragEndEvent,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { CalendarPlus2, Check, GripVertical, Pencil, Plus, X } from 'lucide-react';
import { useI18n } from '../../i18n';
import { useAppStore } from '../../store';
import type { WeeklyTemplateDayIndex, WeeklyTemplateTask } from '../../types';
import { generateId, getTodayString, getWeekDateRange, getWeekString, isValidWeekString } from '../../utils';
import {
  buildWeeklyTemplateApplication,
  getOrderedWeeklyTemplateTasks,
  getWeeklyTemplateRewardTaskId,
  getWeeklyTemplateTaskSlot,
  WEEKLY_TEMPLATE_POOL_SLOT,
  weeklyTemplateDaySlot,
} from '../../weekly-template';
import {
  RewardGradeIncrementButton,
  RewardGradeSelector,
  RewardGradeSurface,
} from '../../features/rewards-lab/ui/RewardGradeControls';
import { useRewardsLabGate } from '../../features/rewards-lab/ui/useRewardsLabGate';
import { ConfirmModal } from '../Modal';
import { EmptyState, TaskCard, TaskIconButton } from '../ui/Primitives';

const TemplateTaskCard: React.FC<{
  task: WeeklyTemplateTask;
  onRename: (id: string, title: string) => void;
  onDelete: (id: string) => void;
}> = ({ task, onRename, onDelete }) => {
  const { t } = useI18n();
  const [expanded, setExpanded] = useState(false);
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(task.title);
  const slot = getWeeklyTemplateTaskSlot(task);
  const rewardTaskId = getWeeklyTemplateRewardTaskId(task.id);
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: task.id,
    data: { slot },
  });

  const save = (event: React.FormEvent) => {
    event.preventDefault();
    if (!title.trim()) return;
    onRename(task.id, title.trim());
    setEditing(false);
  };

  if (editing) {
    return (
      <form ref={setNodeRef} onSubmit={save} className="task-editor">
        <input
          value={title}
          onChange={event => setTitle(event.target.value)}
          className="field w-full"
          aria-label={t('Title')}
          autoFocus
        />
        <div className="flex justify-end gap-2">
          <button type="button" className="button-secondary" onClick={() => { setEditing(false); setTitle(task.title); }}>{t('Cancel')}</button>
          <button type="submit" className="button-primary">{t('Save')}</button>
        </div>
      </form>
    );
  }

  return (
    <TaskCard
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.55 : 1 }}
      onClick={() => setExpanded(value => !value)}
      data-template-task-id={task.id}
    >
      <RewardGradeSurface taskId={rewardTaskId} />
      <div className="flex min-w-0 items-center gap-1.5">
        <button
          type="button"
          className="relative z-[1] flex h-8 w-6 flex-shrink-0 touch-none cursor-grab items-center justify-center text-slate-300 active:cursor-grabbing"
          aria-label={t('Drag task')}
          onClick={event => event.stopPropagation()}
          {...attributes}
          {...listeners}
        >
          <GripVertical className="h-4 w-4" />
        </button>
        <RewardGradeIncrementButton taskId={rewardTaskId} />
        <span className={`${expanded ? 'sr-only' : 'truncate'} min-w-0 flex-1 text-sm font-medium text-slate-950`} title={task.title}>
          {task.title}
        </span>
        <TaskIconButton
          label={t('Edit template task')}
          onClick={event => { event.stopPropagation(); setEditing(true); }}
        >
          <Pencil className="h-3.5 w-3.5" />
        </TaskIconButton>
        <TaskIconButton
          label={t('Delete template task')}
          tone="danger"
          onClick={event => { event.stopPropagation(); onDelete(task.id); }}
        >
          <X className="h-3.5 w-3.5" />
        </TaskIconButton>
      </div>
      <div className={`overflow-hidden px-4 transition-all duration-200 ${expanded ? 'mt-2 max-h-96 opacity-100' : 'max-h-0 opacity-0'}`} onClick={event => event.stopPropagation()}>
        {expanded && (
          <div className="space-y-2">
            <p className="break-words text-sm leading-relaxed text-slate-950">{task.title}</p>
            <div className="mx-auto w-full max-w-sm">
              <RewardGradeSelector taskId={rewardTaskId} compact />
            </div>
          </div>
        )}
      </div>
    </TaskCard>
  );
};

const TemplateSlot: React.FC<{
  title: string;
  slot: string;
  tasks: WeeklyTemplateTask[];
  prominent?: boolean;
  onAdd: (title: string) => void;
  onRename: (id: string, title: string) => void;
  onDelete: (id: string) => void;
}> = ({ title, slot, tasks, prominent = false, onAdd, onRename, onDelete }) => {
  const { t } = useI18n();
  const [adding, setAdding] = useState(false);
  const [titleDraft, setTitleDraft] = useState('');

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!titleDraft.trim()) return;
    onAdd(titleDraft.trim());
    setTitleDraft('');
    setAdding(false);
  };

  return (
    <section className={`${prominent ? 'section-card border-dashed border-brand-200 bg-brand-50/35' : 'surface-card'} overflow-hidden`} data-template-slot={slot}>
      <div className="flex min-h-11 items-center justify-between gap-2 px-3 py-2">
        <h2 className="min-w-0 text-sm font-semibold text-slate-700">{title}</h2>
        <TaskIconButton label={t('Add template task')} tone="primary" onClick={() => setAdding(value => !value)}>
          <Plus className="h-4 w-4" />
        </TaskIconButton>
      </div>
      {adding && (
        <form onSubmit={submit} className="flex gap-2 border-t border-slate-100 px-3 py-2.5">
          <input
            value={titleDraft}
            onChange={event => setTitleDraft(event.target.value)}
            className="field min-w-0 flex-1"
            placeholder={t('Template task title…')}
            autoFocus
          />
          <button type="submit" className="button-primary px-3" aria-label={t('Add template task')}>
            <Check className="h-4 w-4" />
          </button>
        </form>
      )}
      <SortableContext items={tasks.map(task => task.id)} strategy={verticalListSortingStrategy}>
        <div className="space-y-2 border-t border-slate-100 p-2.5">
          {tasks.length === 0 ? (
            <EmptyState className="py-3 text-xs">{t('No template tasks in this block.')}</EmptyState>
          ) : tasks.map(task => (
            <TemplateTaskCard key={task.id} task={task} onRename={onRename} onDelete={onDelete} />
          ))}
        </div>
      </SortableContext>
    </section>
  );
};

export const WeeklyTemplateView: React.FC = () => {
  const { state, dispatch } = useAppStore();
  const gate = useRewardsLabGate();
  const { locale, t } = useI18n();
  const currentWeek = getWeekString(getTodayString());
  const [applyOpen, setApplyOpen] = useState(false);
  const [targetWeek, setTargetWeek] = useState(currentWeek);
  const [summary, setSummary] = useState<{ added: number; skipped: number } | null>(null);
  const [deleteTaskId, setDeleteTaskId] = useState<string | null>(null);
  const days = useMemo(() => Array.from({ length: 7 }, (_, index) => ({
    index: index as WeeklyTemplateDayIndex,
    title: new Date(2024, 0, 1 + index).toLocaleDateString(locale, { weekday: 'long' }),
  })), [locale]);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const tasksForSlot = (slot: string) => getOrderedWeeklyTemplateTasks(state.weeklyTemplate, slot);

  const addTask = (dayIndex: WeeklyTemplateDayIndex | null, title: string) => {
    const now = new Date().toISOString();
    dispatch({
      type: 'ADD_WEEKLY_TEMPLATE_TASK',
      payload: { id: generateId(), title, dayIndex, createdAt: now, updatedAt: now },
    });
    setSummary(null);
  };

  const handleDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return;
    const sourceSlot = active.data.current?.slot as string | undefined;
    const targetSlot = over.data.current?.slot as string | undefined;
    if (!sourceSlot || sourceSlot !== targetSlot) return;
    const order = tasksForSlot(sourceSlot).map(task => task.id);
    const oldIndex = order.indexOf(String(active.id));
    const newIndex = order.indexOf(String(over.id));
    if (oldIndex < 0 || newIndex < 0) return;
    dispatch({ type: 'UPDATE_WEEKLY_TEMPLATE_ORDER', payload: { slot: sourceSlot, order: arrayMove(order, oldIndex, newIndex) } });
  };

  const copyGrades = async (items: ReturnType<typeof buildWeeklyTemplateApplication>['items']) => {
    if (!gate.enabled || items.length === 0) return;
    try {
      const [{ getRewardsLabRuntime }, { getTaskGrade }] = await Promise.all([
        import('../../features/rewards-lab/runtime'),
        import('../../features/rewards-lab/domain'),
      ]);
      const runtime = getRewardsLabRuntime();
      const rewardsState = runtime.getSnapshot().state;
      if (!rewardsState) return;
      items.forEach(item => {
        const grade = getTaskGrade(rewardsState, getWeeklyTemplateRewardTaskId(item.templateTaskId));
        runtime.setTaskGrade(item.task.id, grade);
      });
    } catch (error) {
      console.error('Failed to copy weekly template grades', error);
    }
  };

  const applyTemplate = async () => {
    if (!isValidWeekString(targetWeek) || targetWeek < currentWeek) return;
    const result = buildWeeklyTemplateApplication({
      template: state.weeklyTemplate,
      targetWeek,
      existingTasks: state.tasks,
      now: new Date().toISOString(),
      createId: generateId,
    });
    if (result.items.length > 0) {
      dispatch({ type: 'APPLY_WEEKLY_TEMPLATE', payload: { week: targetWeek, items: result.items } });
      await copyGrades(result.items);
    }
    setSummary({ added: result.items.length, skipped: result.skipped });
    setApplyOpen(false);
  };

  const range = getWeekDateRange(targetWeek);
  const targetIsValid = isValidWeekString(targetWeek) && targetWeek >= currentWeek;

  return (
    <div className="page-container max-w-3xl">
      <div className="mb-3 rounded-2xl border border-brand-200 bg-gradient-to-br from-brand-50 to-white px-4 py-3 shadow-sm">
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-brand-600 text-white">
            <CalendarPlus2 className="h-5 w-5" />
          </span>
          <div className="min-w-0 flex-1">
            <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-brand-600">{t('Template mode')}</div>
            <p className="mt-0.5 text-sm text-slate-600">{t('This is not a real week. Changes affect only future additions.')}</p>
          </div>
        </div>
      </div>

      {summary && (
        <div className="mb-3 rounded-xl border border-emerald-100 bg-emerald-50 px-3 py-2 text-center text-sm font-medium text-emerald-800" role="status">
          {t('Added: {added} • Already existed: {skipped}', summary)}
        </div>
      )}

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <div className="space-y-2.5 pb-24 lg:pb-5">
          <TemplateSlot
            title={t('Week template pool')}
            slot={WEEKLY_TEMPLATE_POOL_SLOT}
            tasks={tasksForSlot(WEEKLY_TEMPLATE_POOL_SLOT)}
            prominent
            onAdd={title => addTask(null, title)}
            onRename={(id, title) => dispatch({ type: 'UPDATE_WEEKLY_TEMPLATE_TASK', payload: { id, title } })}
            onDelete={setDeleteTaskId}
          />
          {days.map(day => {
            const slot = weeklyTemplateDaySlot(day.index);
            return (
              <TemplateSlot
                key={slot}
                title={day.title}
                slot={slot}
                tasks={tasksForSlot(slot)}
                onAdd={title => addTask(day.index, title)}
                onRename={(id, title) => dispatch({ type: 'UPDATE_WEEKLY_TEMPLATE_TASK', payload: { id, title } })}
                onDelete={setDeleteTaskId}
              />
            );
          })}
        </div>
      </DndContext>

      <div className="sticky-composer fixed bottom-[72px] left-0 right-0 z-20 lg:static lg:mt-1">
        <div className="mx-auto flex max-w-3xl justify-end">
          <button
            type="button"
            className="button-primary w-full sm:w-auto"
            disabled={state.weeklyTemplate.tasks.length === 0}
            onClick={() => { setTargetWeek(currentWeek); setApplyOpen(true); }}
          >
            <CalendarPlus2 className="h-4 w-4" />
            {t('Apply to week')}
          </button>
        </div>
      </div>

      {applyOpen && (
        <div className="sheet-backdrop" onClick={() => setApplyOpen(false)}>
          <div className="sheet-panel sm:w-[420px]" onClick={event => event.stopPropagation()} role="dialog" aria-modal="true" aria-label={t('Apply to week')}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="font-semibold text-slate-800">{t('Apply to week')}</h2>
                <p className="mt-0.5 text-xs text-slate-500">{t('Choose a current or future week.')}</p>
              </div>
              <button type="button" className="text-sm text-slate-400" onClick={() => setApplyOpen(false)}>{t('Close')}</button>
            </div>
            <label className="block">
              <span className="mb-1 block text-xs font-bold uppercase text-slate-500">{t('Target week')}</span>
              <input
                type="week"
                min={currentWeek}
                value={targetWeek}
                onChange={event => setTargetWeek(event.target.value)}
                className="field w-full"
              />
            </label>
            <div className="rounded-xl bg-slate-50 px-3 py-2 text-center text-sm text-slate-600">
              {targetIsValid ? `${range.start} – ${range.end}` : t('Past weeks cannot be selected.')}
            </div>
            <div className="flex gap-2">
              <button type="button" className="button-secondary flex-1" onClick={() => setApplyOpen(false)}>{t('Cancel')}</button>
              <button type="button" className="button-primary flex-1" disabled={!targetIsValid} onClick={() => void applyTemplate()}>{t('Apply template')}</button>
            </div>
          </div>
        </div>
      )}

      {state.weeklyTemplate.tasks.length === 0 && !applyOpen && (
        <span className="sr-only">{t('The template is empty.')}</span>
      )}

      <ConfirmModal
        isOpen={deleteTaskId !== null}
        onClose={() => setDeleteTaskId(null)}
        onConfirm={() => {
          if (deleteTaskId) dispatch({ type: 'DELETE_WEEKLY_TEMPLATE_TASK', payload: deleteTaskId });
          setDeleteTaskId(null);
        }}
        title={t('Delete template task')}
        message={t('Delete this template task? Existing planner tasks will stay unchanged.')}
        variant="danger"
        confirmText={t('Delete')}
      />
    </div>
  );
};
