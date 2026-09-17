import { ExternalLink, Pencil, Plus, Save, ShoppingBag, X } from 'lucide-react';
import { FormEvent, useMemo, useState } from 'react';
import {
  PurchaseItem,
  PurchaseItemInput,
  PurchaseStatus,
  REWARD_GRADES,
  RewardDurationUnit,
  RewardGrade,
  RewardsLabState,
  getRedemptionAvailability,
  rewardGrades,
} from '../domain';
import { getRewardsLabRuntime } from '../runtime';
import { useI18n } from '../../../i18n';
import { Confirmation, fieldClass, gradeStyles, primaryButton, secondaryButton } from './RewardsLabPanel.shared';

const editableStatuses: PurchaseStatus[] = ['considering', 'wanted', 'ready', 'rejected'];
const statusLabels: Record<PurchaseStatus, string> = {
  considering: 'Considering', wanted: 'Want to buy', ready: 'Ready to buy',
  purchased: 'Purchased', rejected: 'Rejected',
};

const PurchaseForm = ({ purchase, onCancel, onSubmit }: {
  purchase: PurchaseItem | null;
  onCancel: () => void;
  onSubmit: (input: PurchaseItemInput) => boolean;
}) => {
  const { t } = useI18n();
  const [title, setTitle] = useState(purchase?.title ?? '');
  const [estimatedCost, setEstimatedCost] = useState(purchase?.estimatedCost.toString() ?? '');
  const [priceMin, setPriceMin] = useState(purchase?.priceMin?.toString() ?? '');
  const [priceMax, setPriceMax] = useState(purchase?.priceMax?.toString() ?? '');
  const [grade, setGrade] = useState<RewardGrade>(purchase?.grade ?? 'rare');
  const [status, setStatus] = useState<PurchaseStatus>(purchase?.status ?? 'considering');
  const [url, setUrl] = useState(purchase?.url ?? '');
  const [note, setNote] = useState(purchase?.note ?? '');
  const [cooldownValue, setCooldownValue] = useState(purchase?.cooldownValue.toString() ?? '0');
  const [cooldownUnit, setCooldownUnit] = useState<RewardDurationUnit>(purchase?.cooldownUnit ?? 'days');
  const [limitCount, setLimitCount] = useState(purchase?.limitCount?.toString() ?? '');
  const [limitWindowValue, setLimitWindowValue] = useState(purchase?.limitWindowValue?.toString() ?? '');
  const [limitWindowUnit, setLimitWindowUnit] = useState<RewardDurationUnit>(purchase?.limitWindowUnit ?? 'days');
  const [error, setError] = useState<string | null>(null);

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const estimate = Number(estimatedCost);
    const minimum = priceMin ? Number(priceMin) : null;
    const maximum = priceMax ? Number(priceMax) : null;
    const cooldown = Number(cooldownValue || 0);
    const count = limitCount ? Number(limitCount) : null;
    const windowValue = limitWindowValue ? Number(limitWindowValue) : null;
    if (!title.trim() || !Number.isInteger(estimate) || estimate <= 0
      || (minimum !== null && (!Number.isInteger(minimum) || minimum <= 0))
      || (maximum !== null && (!Number.isInteger(maximum) || maximum <= 0))
      || (minimum !== null && maximum !== null && minimum > maximum)
      || !Number.isInteger(cooldown) || cooldown < 0
      || (count !== null && (!Number.isInteger(count) || count <= 0 || !windowValue || !Number.isInteger(windowValue)))) {
      setError(t('Check the title, price and limit values.'));
      return;
    }
    const saved = onSubmit({
      title, estimatedCost: estimate, priceMin: minimum, priceMax: maximum,
      grade, status: purchase?.status === 'purchased' ? 'purchased' : status,
      url, note, cooldownValue: cooldown, cooldownUnit, limitCount: count,
      limitWindowValue: count ? windowValue : null, limitWindowUnit,
    });
    if (!saved) setError(t('The purchase could not be saved.'));
  };

  return (
    <form onSubmit={submit} className="rounded-2xl border border-brand-100 bg-brand-50/70 p-4">
      <div className="flex items-center justify-between gap-3"><h2 className="font-semibold text-slate-900">{purchase ? t('Edit purchase') : t('New purchase')}</h2><button type="button" onClick={onCancel} className="rounded-lg p-1.5 text-slate-500 hover:bg-white"><X className="h-4 w-4" /></button></div>
      <div className="mt-4 grid gap-3 sm:grid-cols-[minmax(0,1fr)_8rem_9rem]">
        <label className="text-sm font-medium text-slate-700">{t('Title')}<input value={title} onChange={event => setTitle(event.target.value)} className={`${fieldClass} mt-1`} maxLength={100} autoFocus /></label>
        <label className="text-sm font-medium text-slate-700">{t('Estimated price')}<input value={estimatedCost} onChange={event => setEstimatedCost(event.target.value)} className={`${fieldClass} mt-1`} type="number" min="1" /></label>
        <label className="text-sm font-medium text-slate-700">{t('Key grade')}<select value={grade} onChange={event => setGrade(event.target.value as RewardGrade)} className={`${fieldClass} mt-1`}>{rewardGrades.map(item => <option key={item} value={item}>{t(REWARD_GRADES[item].label)}</option>)}</select></label>
      </div>
      <div className="mt-3 grid gap-3 sm:grid-cols-3">
        <label className="text-sm font-medium text-slate-700">{t('Price from')}<input value={priceMin} onChange={event => setPriceMin(event.target.value)} className={`${fieldClass} mt-1`} type="number" min="1" /></label>
        <label className="text-sm font-medium text-slate-700">{t('Price to')}<input value={priceMax} onChange={event => setPriceMax(event.target.value)} className={`${fieldClass} mt-1`} type="number" min="1" /></label>
        <label className="text-sm font-medium text-slate-700">{t('Status')}<select value={status} onChange={event => setStatus(event.target.value as PurchaseStatus)} className={`${fieldClass} mt-1`} disabled={purchase?.status === 'purchased'}>{editableStatuses.map(item => <option key={item} value={item}>{t(statusLabels[item])}</option>)}</select></label>
      </div>
      <label className="mt-3 block text-sm font-medium text-slate-700">{t('Link')} <span className="font-normal text-slate-400">{t('(optional)')}</span><input value={url} onChange={event => setUrl(event.target.value)} className={`${fieldClass} mt-1`} type="url" maxLength={500} /></label>
      <label className="mt-3 block text-sm font-medium text-slate-700">{t('Note')} <span className="font-normal text-slate-400">{t('(optional)')}</span><textarea value={note} onChange={event => setNote(event.target.value)} className={`${fieldClass} mt-1 min-h-16 resize-y`} maxLength={500} /></label>
      <div className="mt-3 grid gap-3 sm:grid-cols-3">
        <label className="text-sm font-medium text-slate-700">{t('Cooldown')}<span className="mt-1 flex gap-1"><input value={cooldownValue} onChange={event => setCooldownValue(event.target.value)} className={`${fieldClass} min-w-0 basis-0 flex-1`} type="number" min="0" /><select value={cooldownUnit} onChange={event => setCooldownUnit(event.target.value as RewardDurationUnit)} className={`${fieldClass} w-[4.5rem] flex-none px-2`}><option value="hours">{t('hours')}</option><option value="days">{t('days')}</option></select></span></label>
        <label className="text-sm font-medium text-slate-700">{t('Limit, times')}<input value={limitCount} onChange={event => setLimitCount(event.target.value)} className={`${fieldClass} mt-1`} type="number" min="1" placeholder={t('No limit')} /></label>
        <label className="text-sm font-medium text-slate-700">{t('Rolling period')}<span className="mt-1 flex gap-1"><input value={limitWindowValue} onChange={event => setLimitWindowValue(event.target.value)} className={`${fieldClass} min-w-0 basis-0 flex-1`} type="number" min="1" disabled={!limitCount} /><select value={limitWindowUnit} onChange={event => setLimitWindowUnit(event.target.value as RewardDurationUnit)} className={`${fieldClass} w-[4.5rem] flex-none px-2`} disabled={!limitCount}><option value="hours">{t('hours')}</option><option value="days">{t('days')}</option></select></span></label>
      </div>
      {error && <p className="mt-3 text-sm text-red-700">{error}</p>}
      <div className="mt-4 flex justify-end gap-2"><button type="button" onClick={onCancel} className={secondaryButton}>{t('Cancel')}</button><button type="submit" className={primaryButton}><Save className="h-4 w-4" />{t('Save')}</button></div>
    </form>
  );
};

const PurchaseCard = ({ purchase, state, onEdit, onRedeem }: { purchase: PurchaseItem; state: RewardsLabState; onEdit: () => void; onRedeem: () => void }) => {
  const { locale, t } = useI18n();
  const availability = getRedemptionAvailability(state, {
    ...purchase, cost: 1, repeatable: false,
    active: purchase.status !== 'purchased' && purchase.status !== 'rejected', kind: 'purchase',
  }, new Date());
  const blocked = ['inactive', 'already-redeemed', 'insufficient-balance', 'missing-key', 'cooldown', 'limit-reached'].includes(availability.outcome);
  return (
    <article className={`rounded-2xl border bg-white p-4 shadow-quiet ${gradeStyles[purchase.grade].border}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><h3 className="break-words font-semibold text-slate-900">{purchase.title}</h3><span className={`rounded-full border px-2 py-0.5 text-[11px] font-medium ${gradeStyles[purchase.grade].badge}`}>{t(REWARD_GRADES[purchase.grade].label)} · {t('key')}</span></div><p className="mt-1 text-xs text-slate-500">{t(statusLabels[purchase.status])} · {t('Added {date}', { date: new Date(purchase.createdAt).toLocaleDateString(locale) })}</p>{purchase.note && <p className="mt-2 text-sm text-slate-600">{purchase.note}</p>}</div>
        <div className="shrink-0 text-right"><p className="text-xl font-bold text-brand-700">≈{purchase.estimatedCost}</p><p className="text-xs text-slate-500">{state.currencyName}</p>{purchase.priceMin && purchase.priceMax && <p className="text-[11px] text-slate-400">{purchase.priceMin}–{purchase.priceMax}</p>}</div>
      </div>
      <div className="mt-4 flex items-center justify-between gap-2 border-t border-slate-100 pt-3"><div className="flex items-center gap-1"><button type="button" onClick={onEdit} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"><Pencil className="h-4 w-4" /></button>{purchase.url && <a href={purchase.url} target="_blank" rel="noreferrer" className="rounded-lg p-2 text-slate-500 hover:bg-slate-100" title={t('Open link')}><ExternalLink className="h-4 w-4" /></a>}</div><button type="button" onClick={onRedeem} disabled={blocked} className={primaryButton}><ShoppingBag className="h-4 w-4" />{purchase.status === 'purchased' ? t('Purchased') : availability.outcome === 'missing-key' ? t('No matching key') : t('Buy')}</button></div>
    </article>
  );
};

export const PurchasesTab = ({ state, onNotice, onConfirm }: { state: RewardsLabState; onNotice: (message: string) => void; onConfirm: (confirmation: Confirmation) => void }) => {
  const { t } = useI18n();
  const runtime = useMemo(() => getRewardsLabRuntime(), []);
  const [editing, setEditing] = useState<PurchaseItem | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const save = (input: PurchaseItemInput) => {
    const result = editing ? runtime.updatePurchase(editing.id, input) : runtime.addPurchase(input);
    if (!result) return false;
    setEditing(null); setFormOpen(false); onNotice(t('Purchase saved.')); return true;
  };
  const sorted = [...state.purchases].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  return (
    <div className="space-y-4">
      {formOpen ? <PurchaseForm key={editing?.id ?? 'new-purchase'} purchase={editing} onCancel={() => { setEditing(null); setFormOpen(false); }} onSubmit={save} /> : <div className="flex items-center justify-between gap-3"><div><h2 className="font-semibold text-slate-900">{t('Optional purchases')}</h2><p className="text-xs text-slate-500">{t('A separate wishlist inside Rewards.')}</p></div><button type="button" onClick={() => { setEditing(null); setFormOpen(true); }} className={secondaryButton}><Plus className="h-4 w-4" />{t('Add purchase')}</button></div>}
      {sorted.length === 0 && !formOpen ? <div className="empty-state py-10"><ShoppingBag className="mx-auto h-8 w-8 text-slate-300" /><p className="mt-3 font-medium text-slate-700">{t('No optional purchases yet')}</p></div> : <div className="grid gap-3 sm:grid-cols-2">{sorted.map(purchase => <PurchaseCard key={purchase.id} purchase={purchase} state={state} onEdit={() => { setEditing(purchase); setFormOpen(true); }} onRedeem={() => onConfirm({ kind: 'redeem-purchase', purchase })} />)}</div>}
    </div>
  );
};
