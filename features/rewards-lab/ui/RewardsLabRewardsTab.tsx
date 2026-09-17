import {
  DndContext,
  DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  closestCenter,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  rectSortingStrategy,
  sortableKeyboardCoordinates,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { ArrowDown, ArrowUp, Check, Gift, GripVertical, LayoutGrid, List, Pencil, Plus, Tags, Trash2, X } from 'lucide-react';
import { ReactNode, useMemo, useState } from 'react';
import { RewardDefinition, RewardDefinitionInput, RewardGroup, RewardsLabState } from '../domain';
import { getRewardsLabRuntime } from '../runtime';
import { useI18n } from '../../../i18n';
import { ArchivedRewards, CompactRewardCard, RewardCard, RewardForm } from './RewardsCatalog';
import { RewardsCatalogBalance } from './RewardsCatalogBalance';
import { Confirmation, primaryButton, secondaryButton } from './RewardsLabPanel.shared';

interface RewardsTabProps {
  state: RewardsLabState;
  onNotice: (message: string) => void;
  onConfirm: (confirmation: Confirmation) => void;
}

const SortableReward = ({ id, children }: { id: string; children: (handle: ReactNode) => ReactNode }) => {
  const { t } = useI18n();
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  const handle = (
    <button
      type="button"
      className="touch-none rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400"
      aria-label={t('Move reward')}
      {...attributes}
      {...listeners}
    >
      <GripVertical className="h-4 w-4" aria-hidden="true" />
    </button>
  );
  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={isDragging ? 'relative z-10 opacity-70' : ''}
    >
      {children(handle)}
    </div>
  );
};

const RewardSectionHeading = ({ title }: { title: string }) => (
  <div className="flex items-center gap-3 py-1" aria-label={title}>
    <span className="h-px flex-1 bg-slate-200" />
    <span className="max-w-[70%] truncate text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400">{title}</span>
    <span className="h-px flex-1 bg-slate-200" />
  </div>
);

const RewardGroupsManager = ({ groups, onNotice }: { groups: RewardGroup[]; onNotice: (message: string) => void }) => {
  const { t } = useI18n();
  const runtime = useMemo(() => getRewardsLabRuntime(), []);
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState('');
  const orderedGroups = [...groups].sort((left, right) => left.displayOrder - right.displayOrder || left.createdAt.localeCompare(right.createdAt));

  const add = () => {
    if (!draft.trim()) return;
    const created = runtime.addRewardGroup(draft);
    if (created) {
      setDraft('');
      onNotice(t('Reward section added.'));
    } else onNotice(t('Reward section could not be saved. Use a unique name.'));
  };

  const save = (groupId: string) => {
    if (!editingTitle.trim()) return;
    const updated = runtime.updateRewardGroup(groupId, editingTitle);
    if (updated) {
      setEditingId(null);
      onNotice(t('Reward section updated.'));
    } else onNotice(t('Reward section could not be saved. Use a unique name.'));
  };

  const move = (index: number, delta: number) => {
    const target = index + delta;
    if (target < 0 || target >= orderedGroups.length) return;
    const ids = arrayMove(orderedGroups, index, target).map(group => group.id);
    if (!runtime.reorderRewardGroups(ids)) onNotice(t('Reward section order could not be saved.'));
  };

  return (
    <section className="rounded-xl border border-line bg-white/70">
      <button type="button" onClick={() => setOpen(value => !value)} className="flex w-full items-center justify-between gap-2 px-3 py-2 text-sm font-medium text-slate-600" aria-expanded={open}>
        <span className="flex items-center gap-2"><Tags className="h-4 w-4" />{t('Reward sections')}</span>
        <span className="text-xs text-slate-400">{groups.length}</span>
      </button>
      {open && (
        <div className="space-y-2 border-t border-slate-100 p-3">
          <div className="flex gap-2">
            <input value={draft} onChange={event => setDraft(event.target.value)} onKeyDown={event => { if (event.key === 'Enter') add(); }} className="field min-w-0 flex-1" maxLength={60} placeholder={t('New section name')} />
            <button type="button" onClick={add} disabled={!draft.trim()} className="button-secondary px-3 disabled:opacity-40"><Plus className="h-4 w-4" /><span className="sr-only">{t('Add reward section')}</span></button>
          </div>
          {orderedGroups.length === 0 ? (
            <p className="py-2 text-center text-xs text-slate-400">{t('No reward sections yet.')}</p>
          ) : orderedGroups.map((group, index) => (
            <div key={group.id} className="flex items-center gap-1 rounded-lg bg-slate-50 px-2 py-1.5">
              {editingId === group.id ? (
                <input autoFocus value={editingTitle} onChange={event => setEditingTitle(event.target.value)} onKeyDown={event => { if (event.key === 'Enter') save(group.id); if (event.key === 'Escape') setEditingId(null); }} className="field min-w-0 flex-1 py-1" maxLength={60} />
              ) : <span className="min-w-0 flex-1 truncate text-sm text-slate-700">{group.title}</span>}
              <button type="button" onClick={() => move(index, -1)} disabled={index === 0} className="rounded p-1.5 text-slate-400 hover:bg-white disabled:opacity-25" aria-label={t('Move section up')}><ArrowUp className="h-3.5 w-3.5" /></button>
              <button type="button" onClick={() => move(index, 1)} disabled={index === orderedGroups.length - 1} className="rounded p-1.5 text-slate-400 hover:bg-white disabled:opacity-25" aria-label={t('Move section down')}><ArrowDown className="h-3.5 w-3.5" /></button>
              {editingId === group.id ? <>
                <button type="button" onClick={() => save(group.id)} className="rounded p-1.5 text-emerald-600 hover:bg-white" aria-label={t('Save')}><Check className="h-3.5 w-3.5" /></button>
                <button type="button" onClick={() => setEditingId(null)} className="rounded p-1.5 text-slate-400 hover:bg-white" aria-label={t('Cancel')}><X className="h-3.5 w-3.5" /></button>
              </> : <button type="button" onClick={() => { setEditingId(group.id); setEditingTitle(group.title); }} className="rounded p-1.5 text-slate-400 hover:bg-white" aria-label={t('Edit reward section')}><Pencil className="h-3.5 w-3.5" /></button>}
              <button type="button" onClick={() => { if (runtime.deleteRewardGroup(group.id)) onNotice(t('Reward section removed. Its rewards are now ungrouped.')); }} className="rounded p-1.5 text-red-500 hover:bg-red-50" aria-label={t('Delete reward section')}><Trash2 className="h-3.5 w-3.5" /></button>
            </div>
          ))}
        </div>
      )}
    </section>
  );
};

export const RewardsTab = ({ state, onNotice, onConfirm }: RewardsTabProps) => {
  const { t } = useI18n();
  const runtime = useMemo(() => getRewardsLabRuntime(), []);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<RewardDefinition | null>(null);
  const activeRewards = state.rewards.filter(reward => reward.active)
    .sort((left, right) => left.displayOrder - right.displayOrder || left.createdAt.localeCompare(right.createdAt));
  const orderedGroups = [...state.rewardGroups]
    .sort((left, right) => left.displayOrder - right.displayOrder || left.createdAt.localeCompare(right.createdAt));
  const archivedRewards = state.rewards.filter(reward => !reward.active)
    .sort((left, right) => left.displayOrder - right.displayOrder || left.createdAt.localeCompare(right.createdAt));
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 220, tolerance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const saveReward = (input: RewardDefinitionInput): boolean => {
    const saved = editing ? runtime.updateReward(editing.id, input) : runtime.addReward(input);
    if (!saved) return false;
    setFormOpen(false);
    setEditing(null);
    onNotice(editing ? t('Reward updated.') : t('Reward added to your catalog.'));
    return true;
  };

  const handleDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return;
    const sourceReward = activeRewards.find(reward => reward.id === active.id);
    const targetReward = activeRewards.find(reward => reward.id === over.id);
    if (!sourceReward || !targetReward || sourceReward.groupId !== targetReward.groupId) return;
    const sectionRewards = activeRewards.filter(reward => reward.groupId === sourceReward.groupId);
    const oldIndex = sectionRewards.findIndex(reward => reward.id === active.id);
    const newIndex = sectionRewards.findIndex(reward => reward.id === over.id);
    if (oldIndex < 0 || newIndex < 0) return;
    const reorderedSection = arrayMove(sectionRewards, oldIndex, newIndex);
    const sectionOrder = new Map(reorderedSection.map((reward, index) => [reward.id, index]));
    const groupOrder = new Map(orderedGroups.map((group, index) => [group.id, index]));
    const ids = [...activeRewards].sort((left, right) => {
      if (left.groupId === right.groupId) return (sectionOrder.get(left.id) ?? left.displayOrder) - (sectionOrder.get(right.id) ?? right.displayOrder);
      if (left.groupId === null) return 1;
      if (right.groupId === null) return -1;
      return (groupOrder.get(left.groupId) ?? Number.MAX_SAFE_INTEGER) - (groupOrder.get(right.groupId) ?? Number.MAX_SAFE_INTEGER);
    }).map(reward => reward.id);
    if (!runtime.reorderRewards(ids)) onNotice(t('Reward order could not be saved.'));
  };

  const renderReward = (reward: RewardDefinition) => (
    <SortableReward key={reward.id} id={reward.id}>
      {dragHandle => state.rewardCatalogView === 'compact'
        ? <CompactRewardCard reward={reward} state={state} dragHandle={dragHandle} onRedeem={item => onConfirm({ kind: 'redeem', reward: item })} />
        : <RewardCard reward={reward} state={state} dragHandle={dragHandle} onEdit={item => { setEditing(item); setFormOpen(true); }} onArchive={item => onConfirm({ kind: 'archive', reward: item })} onDelete={item => onConfirm({ kind: 'delete-reward', reward: item })} onRedeem={item => onConfirm({ kind: 'redeem', reward: item })} />}
    </SortableReward>
  );

  return (
    <div className="space-y-3">
      <RewardsCatalogBalance state={state} />

      {formOpen ? (
        <RewardForm key={editing?.id ?? 'new-reward'} reward={editing} groups={orderedGroups} onCancel={() => { setFormOpen(false); setEditing(null); }} onSubmit={saveReward} />
      ) : (
        <div className="flex items-center justify-between gap-2">
          <h2 className="font-semibold text-slate-900">{t('Your rewards')}</h2>
          <div className="flex items-center gap-1">
            <div className="flex rounded-xl bg-slate-100 p-1" role="group" aria-label={t('Reward catalog view')}>
              <button type="button" onClick={() => runtime.updateRewardCatalogView('detailed')} className={`rounded-lg p-1.5 ${state.rewardCatalogView === 'detailed' ? 'bg-white text-brand-700 shadow-sm' : 'text-slate-500'}`} aria-label={t('Detailed view')} aria-pressed={state.rewardCatalogView === 'detailed'}><List className="h-4 w-4" /></button>
              <button type="button" onClick={() => runtime.updateRewardCatalogView('compact')} className={`rounded-lg p-1.5 ${state.rewardCatalogView === 'compact' ? 'bg-white text-brand-700 shadow-sm' : 'text-slate-500'}`} aria-label={t('Compact view')} aria-pressed={state.rewardCatalogView === 'compact'}><LayoutGrid className="h-4 w-4" /></button>
            </div>
            <button type="button" onClick={() => { setEditing(null); setFormOpen(true); }} className={secondaryButton}><Plus className="h-4 w-4" /><span className="hidden sm:inline">{t('Add reward')}</span></button>
          </div>
        </div>
      )}

      {!formOpen && <RewardGroupsManager groups={orderedGroups} onNotice={onNotice} />}

      {activeRewards.length === 0 && !formOpen ? (
        <div className="empty-state py-8">
          <Gift className="mx-auto h-8 w-8 text-slate-300" />
          <p className="mt-3 font-medium text-slate-700">{t('No rewards yet')}</p>
          <button type="button" onClick={() => { setEditing(null); setFormOpen(true); }} className={`${primaryButton} mt-4`}><Plus className="h-4 w-4" />{t('Create first reward')}</button>
        </div>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <div className="space-y-3">
            {orderedGroups.map(group => {
              const rewards = activeRewards.filter(reward => reward.groupId === group.id);
              return (
                <section key={group.id} className="space-y-2">
                  <RewardSectionHeading title={group.title} />
                  {rewards.length === 0 ? <p className="py-2 text-center text-xs text-slate-400">{t('No rewards in this section.')}</p> : (
                    <SortableContext items={rewards.map(reward => reward.id)} strategy={rectSortingStrategy}>
                      <div className={state.rewardCatalogView === 'compact' ? 'grid grid-cols-2 gap-2 sm:grid-cols-3' : 'grid gap-3 sm:grid-cols-2'}>{rewards.map(renderReward)}</div>
                    </SortableContext>
                  )}
                </section>
              );
            })}
            {(() => {
              const rewards = activeRewards.filter(reward => reward.groupId === null);
              if (rewards.length === 0) return null;
              return (
                <section className="space-y-2">
                  {orderedGroups.length > 0 && <RewardSectionHeading title={t('No section')} />}
                  <SortableContext items={rewards.map(reward => reward.id)} strategy={rectSortingStrategy}>
                    <div className={state.rewardCatalogView === 'compact' ? 'grid grid-cols-2 gap-2 sm:grid-cols-3' : 'grid gap-3 sm:grid-cols-2'}>{rewards.map(renderReward)}</div>
                  </SortableContext>
                </section>
              );
            })()}
          </div>
        </DndContext>
      )}

      <ArchivedRewards rewards={archivedRewards} state={state} onDelete={reward => onConfirm({ kind: 'delete-reward', reward })} onRestore={reward => {
        const restored = runtime.updateReward(reward.id, { ...reward, active: true });
        if (restored) onNotice(t('{title} restored.', { title: reward.title }));
      }} />
    </div>
  );
};
