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
import { Gift, GripVertical, LayoutGrid, List, Plus } from 'lucide-react';
import { ReactNode, useMemo, useState } from 'react';
import { RewardDefinition, RewardDefinitionInput, RewardsLabState } from '../domain';
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

export const RewardsTab = ({ state, onNotice, onConfirm }: RewardsTabProps) => {
  const { t } = useI18n();
  const runtime = useMemo(() => getRewardsLabRuntime(), []);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<RewardDefinition | null>(null);
  const activeRewards = state.rewards.filter(reward => reward.active)
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
    const oldIndex = activeRewards.findIndex(reward => reward.id === active.id);
    const newIndex = activeRewards.findIndex(reward => reward.id === over.id);
    if (oldIndex < 0 || newIndex < 0) return;
    const ids = arrayMove(activeRewards, oldIndex, newIndex).map(reward => reward.id);
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
        <RewardForm key={editing?.id ?? 'new-reward'} reward={editing} onCancel={() => { setFormOpen(false); setEditing(null); }} onSubmit={saveReward} />
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

      {activeRewards.length === 0 && !formOpen ? (
        <div className="empty-state py-8">
          <Gift className="mx-auto h-8 w-8 text-slate-300" />
          <p className="mt-3 font-medium text-slate-700">{t('No rewards yet')}</p>
          <button type="button" onClick={() => { setEditing(null); setFormOpen(true); }} className={`${primaryButton} mt-4`}><Plus className="h-4 w-4" />{t('Create first reward')}</button>
        </div>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={activeRewards.map(reward => reward.id)} strategy={rectSortingStrategy}>
            <div className={state.rewardCatalogView === 'compact' ? 'grid grid-cols-2 gap-2 sm:grid-cols-3' : 'grid gap-3 sm:grid-cols-2'}>
              {activeRewards.map(renderReward)}
            </div>
          </SortableContext>
        </DndContext>
      )}

      <ArchivedRewards rewards={archivedRewards} state={state} onDelete={reward => onConfirm({ kind: 'delete-reward', reward })} onRestore={reward => {
        const restored = runtime.updateReward(reward.id, { ...reward, active: true });
        if (restored) onNotice(t('{title} restored.', { title: reward.title }));
      }} />
    </div>
  );
};
