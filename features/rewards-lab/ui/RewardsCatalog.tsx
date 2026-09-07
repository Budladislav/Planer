import { Archive, Gift, Pencil, RotateCcw, Save, X } from 'lucide-react';
import { FormEvent, useState } from 'react';
import {
  REWARD_GRADES,
  RewardDefinition,
  RewardDefinitionInput,
  RewardGrade,
  RewardsLabState,
  getRedemptionAvailability,
  rewardGrades,
} from '../domain';
import { useI18n } from '../../../i18n';
import {
  fieldClass,
  gradeStyles,
  isOneTimeRewardUsed,
  primaryButton,
  secondaryButton,
} from './RewardsLabPanel.shared';

interface RewardFormProps {
  reward: RewardDefinition | null;
  onCancel: () => void;
  onSubmit: (input: RewardDefinitionInput) => boolean;
}

export const RewardForm = ({ reward, onCancel, onSubmit }: RewardFormProps) => {
  const { t } = useI18n();
  const [title, setTitle] = useState(reward?.title ?? '');
  const [cost, setCost] = useState(reward?.cost.toString() ?? '');
  const [note, setNote] = useState(reward?.note ?? '');
  const [grade, setGrade] = useState<RewardGrade>(reward?.grade ?? 'common');
  const [variableCost, setVariableCost] = useState(reward?.variableCost ?? false);
  const [repeatable, setRepeatable] = useState(reward?.repeatable ?? true);
  const [cooldownDays, setCooldownDays] = useState(reward?.cooldownDays.toString() ?? '0');
  const [limitCount, setLimitCount] = useState(reward?.limitCount?.toString() ?? '');
  const [limitWindowDays, setLimitWindowDays] = useState(reward?.limitWindowDays?.toString() ?? '');
  const [limitGroup, setLimitGroup] = useState(reward?.limitGroup ?? '');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const numericCost = Number(cost);
    const cooldown = Number(cooldownDays || 0);
    const count = limitCount ? Number(limitCount) : null;
    const windowDays = limitWindowDays ? Number(limitWindowDays) : null;
    if (!title.trim() || !Number.isInteger(numericCost) || numericCost <= 0
      || !Number.isInteger(cooldown) || cooldown < 0
      || (count !== null && (!Number.isInteger(count) || count <= 0))
      || (count !== null && (windowDays === null || !Number.isInteger(windowDays) || windowDays <= 0))) {
      setError(t('Check the title, price and limit values.'));
      return;
    }
    const saved = onSubmit({
      title, cost: numericCost, note, grade, variableCost, repeatable,
      cooldownDays: cooldown, limitCount: count, limitWindowDays: count ? windowDays : null,
      limitGroup, active: reward?.active ?? true,
    });
    if (!saved) setError(t('The reward could not be saved. Your planner data is unaffected.'));
  };

  return (
    <form onSubmit={handleSubmit} className="rounded-xl border border-indigo-200 bg-indigo-50/60 p-4">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h3 className="font-semibold text-slate-900">{reward ? t('Edit reward') : t('New reward')}</h3>
        <button type="button" onClick={onCancel} className="rounded-lg p-1.5 text-slate-500 hover:bg-white" aria-label={t('Close reward form')}><X className="h-4 w-4" /></button>
      </div>
      <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_8rem_9rem]">
        <label className="text-sm font-medium text-slate-700">{t('Title')}<input value={title} onChange={event => setTitle(event.target.value)} className={`${fieldClass} mt-1`} maxLength={100} autoFocus required /></label>
        <label className="text-sm font-medium text-slate-700">{t('Cost')}<input value={cost} onChange={event => setCost(event.target.value)} className={`${fieldClass} mt-1`} type="number" min="1" step="1" required /></label>
        <label className="text-sm font-medium text-slate-700">{t('Key grade')}<select value={grade} onChange={event => setGrade(event.target.value as RewardGrade)} className={`${fieldClass} mt-1`}>{rewardGrades.map(item => <option key={item} value={item}>{t(REWARD_GRADES[item].label)}</option>)}</select></label>
      </div>
      <div className="mt-3 grid gap-3 sm:grid-cols-3">
        <label className="text-sm font-medium text-slate-700">{t('Cooldown, days')}<input value={cooldownDays} onChange={event => setCooldownDays(event.target.value)} className={`${fieldClass} mt-1`} type="number" min="0" step="1" /></label>
        <label className="text-sm font-medium text-slate-700">{t('Limit, times')}<input value={limitCount} onChange={event => setLimitCount(event.target.value)} className={`${fieldClass} mt-1`} type="number" min="1" step="1" placeholder={t('No limit')} /></label>
        <label className="text-sm font-medium text-slate-700">{t('Rolling period, days')}<input value={limitWindowDays} onChange={event => setLimitWindowDays(event.target.value)} className={`${fieldClass} mt-1`} type="number" min="1" step="1" disabled={!limitCount} /></label>
      </div>
      <label className="mt-3 block text-sm font-medium text-slate-700">{t('Shared limit group')} <span className="font-normal text-slate-400">{t('(optional)')}</span><input value={limitGroup} onChange={event => setLimitGroup(event.target.value)} className={`${fieldClass} mt-1`} maxLength={60} placeholder={t('For example: games')} /></label>
      <label className="mt-3 block text-sm font-medium text-slate-700">{t('Note')} <span className="font-normal text-slate-400">{t('(optional)')}</span><textarea value={note} onChange={event => setNote(event.target.value)} className={`${fieldClass} mt-1 min-h-16 resize-y`} maxLength={300} /></label>
      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        <label className="flex cursor-pointer items-start gap-3 rounded-lg bg-white/70 px-3 py-2 text-sm text-slate-700"><input type="checkbox" checked={variableCost} onChange={event => setVariableCost(event.target.checked)} className="mt-0.5 h-4 w-4 rounded" /><span><span className="block font-medium">{t('Enter actual price when redeeming')}</span><span className="text-xs text-slate-500">{t('The catalog price is used as an estimate.')}</span></span></label>
        <label className="flex cursor-pointer items-start gap-3 rounded-lg bg-white/70 px-3 py-2 text-sm text-slate-700"><input type="checkbox" checked={repeatable} onChange={event => setRepeatable(event.target.checked)} className="mt-0.5 h-4 w-4 rounded" /><span><span className="block font-medium">{t('Repeatable reward')}</span><span className="text-xs text-slate-500">{repeatable ? t('Can be redeemed whenever all conditions allow.') : t('Can be redeemed once unless that redemption is undone.')}</span></span></label>
      </div>
      {error && <p className="mt-3 text-sm text-red-700" role="alert">{error}</p>}
      <div className="mt-4 flex justify-end gap-2"><button type="button" onClick={onCancel} className={secondaryButton}>{t('Cancel')}</button><button type="submit" className={primaryButton}><Save className="h-4 w-4" />{reward ? t('Save changes') : t('Add reward')}</button></div>
    </form>
  );
};

const availabilityLabel = (outcome: ReturnType<typeof getRedemptionAvailability>, t: (key: string, params?: Record<string, string | number>) => string, locale: string) => {
  if (outcome.outcome === 'insufficient-balance') return t('Need {count} more', { count: outcome.missingAmount ?? 0 });
  if (outcome.outcome === 'missing-key') return t('No matching key');
  if (outcome.outcome === 'already-redeemed') return t('Redeemed');
  if ((outcome.outcome === 'cooldown' || outcome.outcome === 'limit-reached') && outcome.nextAvailableAt) {
    return t('Available {date}', { date: new Date(outcome.nextAvailableAt).toLocaleDateString(locale) });
  }
  return t('Redeem');
};

export const RewardCard = ({ reward, state, onEdit, onArchive, onRedeem }: {
  reward: RewardDefinition;
  state: RewardsLabState;
  onEdit: (reward: RewardDefinition) => void;
  onArchive: (reward: RewardDefinition) => void;
  onRedeem: (reward: RewardDefinition) => void;
}) => {
  const { locale, t } = useI18n();
  const used = isOneTimeRewardUsed(reward, state);
  const availability = getRedemptionAvailability(state, {
    ...reward, kind: 'reward', cost: reward.variableCost ? 1 : reward.cost, active: reward.active,
  }, new Date());
  const available = availability.outcome === 'available' && !used;
  const currency = state.currencyName === 'points' ? t('points') : state.currencyName;
  return (
    <article className={`rounded-xl border bg-white p-4 shadow-sm ${gradeStyles[reward.grade].border}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2"><h3 className="break-words font-semibold text-slate-900">{reward.title}</h3><span className={`rounded-full border px-2 py-0.5 text-[11px] font-medium ${gradeStyles[reward.grade].badge}`}>{t(REWARD_GRADES[reward.grade].label)} · {t('key')}</span></div>
          {reward.note && <p className="mt-1 break-words text-sm text-slate-600">{reward.note}</p>}
          <div className="mt-2 flex flex-wrap gap-1 text-[11px] text-slate-500">
            {reward.variableCost && <span className="rounded bg-slate-100 px-1.5 py-0.5">{t('Actual price on redemption')}</span>}
            {reward.cooldownDays > 0 && <span className="rounded bg-slate-100 px-1.5 py-0.5">{t('{count} day cooldown', { count: reward.cooldownDays })}</span>}
            {reward.limitCount && reward.limitWindowDays && <span className="rounded bg-slate-100 px-1.5 py-0.5">{reward.limitCount}/{reward.limitWindowDays} {t('days')}</span>}
          </div>
        </div>
        <div className="shrink-0 text-right"><p className="text-xl font-bold text-indigo-700">{reward.variableCost ? `≈${reward.cost}` : reward.cost}</p><p className="max-w-24 truncate text-xs text-slate-500">{currency}</p></div>
      </div>
      <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-3">
        <div className="flex gap-1"><button type="button" onClick={() => onEdit(reward)} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100" aria-label={t('Edit {title}', { title: reward.title })}><Pencil className="h-4 w-4" /></button><button type="button" onClick={() => onArchive(reward)} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100" aria-label={t('Archive {title}', { title: reward.title })}><Archive className="h-4 w-4" /></button></div>
        <button type="button" onClick={() => onRedeem(reward)} className={primaryButton} disabled={!available}><Gift className="h-4 w-4" />{availabilityLabel(used ? { outcome: 'already-redeemed' } : availability, t, locale)}</button>
      </div>
    </article>
  );
};

export const ArchivedRewards = ({ rewards, state, onRestore }: { rewards: RewardDefinition[]; state: RewardsLabState; onRestore: (reward: RewardDefinition) => void }) => {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  if (rewards.length === 0) return null;
  return (
    <section className="border-t border-slate-200 pt-4">
      <button type="button" onClick={() => setOpen(value => !value)} className="flex w-full items-center justify-between rounded-lg px-2 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100" aria-expanded={open}>{t('Archived rewards ({count})', { count: rewards.length })}<span>{open ? '−' : '+'}</span></button>
      {open && <div className="mt-2 space-y-2">{rewards.map(reward => <div key={reward.id} className="flex items-start justify-between gap-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-3"><div><p className="text-sm font-medium text-slate-700">{reward.title}</p><p className="text-xs text-slate-500">{reward.cost} {state.currencyName}</p></div><button type="button" onClick={() => onRestore(reward)} className={secondaryButton}><RotateCcw className="h-4 w-4" />{t('Restore')}</button></div>)}</div>}
    </section>
  );
};
