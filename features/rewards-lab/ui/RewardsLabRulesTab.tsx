import {
  ChevronDown,
  ChevronUp,
  Dice5,
  RotateCcw,
  Settings2,
  ShieldCheck,
  Trash2,
} from 'lucide-react';
import { FormEvent, useEffect, useMemo, useState } from 'react';
import {
  REWARD_GRADES,
  RewardGrade,
  RewardsLabState,
} from '../domain';
import { getRewardsLabRuntime } from '../runtime';
import { useI18n } from '../../../i18n';
import {
  Confirmation,
  dangerButton,
  fieldClass,
  formatDateTime,
  gradeStyles,
  secondaryButton,
} from './RewardsLabPanel.shared';

interface GradeRuleProps {
  grade: RewardGrade;
}

const GradeRule = ({ grade }: GradeRuleProps) => {
  const { t } = useI18n();
  const definition = REWARD_GRADES[grade];
  return (
    <li className="flex items-center justify-between gap-3 rounded-lg bg-white px-3 py-2 text-sm">
      <span className="flex items-center gap-2 font-medium text-slate-700">
        <span className={`h-2.5 w-2.5 rotate-45 rounded-[2px] ${gradeStyles[grade].dot}`} aria-hidden="true" />
        {t(definition.label)}
      </span>
      <span className={`rounded-full border px-2 py-0.5 text-xs font-semibold ${gradeStyles[grade].badge}`}>
        {definition.min}–{definition.max}
      </span>
    </li>
  );
};

interface RulesTabProps {
  state: RewardsLabState;
  onNotice: (message: string) => void;
  onConfirm: (confirmation: Confirmation) => void;
}

export const RulesTab = ({ state, onNotice, onConfirm }: RulesTabProps) => {
  const { locale, t } = useI18n();
  const runtime = useMemo(() => getRewardsLabRuntime(), []);
  const [currency, setCurrency] = useState(state.currencyName);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [adjustment, setAdjustment] = useState('');
  const [adjustmentReason, setAdjustmentReason] = useState('');
  const [adjustmentError, setAdjustmentError] = useState<string | null>(null);

  useEffect(() => setCurrency(state.currencyName), [state.currencyName]);

  const gradeCounts = Object.keys(REWARD_GRADES).reduce<Record<RewardGrade, number>>(
    (counts, grade) => ({ ...counts, [grade]: 0 }),
    { common: 0, uncommon: 0, rare: 0, legendary: 0, mythic: 0 },
  );
  Object.values(state.claims).forEach((claim) => {
    gradeCounts[claim.grade] += 1;
  });
  const earned = state.ledger
    .filter((item) => item.kind === 'earn')
    .reduce((total, item) => total + item.amount, 0);
  const spentNet = Math.abs(state.ledger
    .filter((item) => item.kind === 'spend' || item.kind === 'refund')
    .reduce((total, item) => total + item.amount, 0));

  const saveCurrency = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!currency.trim()) return;
    if (runtime.updateCurrency(currency)) onNotice(t('Currency name updated.'));
  };

  const submitAdjustment = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const amount = Number(adjustment);
    if (!Number.isInteger(amount) || amount === 0) {
      setAdjustmentError(t('Enter a non-zero whole number. Use a minus sign to subtract.'));
      return;
    }
    if (!adjustmentReason.trim()) {
      setAdjustmentError(t('Add a short reason so the history stays understandable.'));
      return;
    }
    if (!runtime.adjustBalance(amount, adjustmentReason)) {
      setAdjustmentError(t('The adjustment could not be saved.'));
      return;
    }
    setAdjustment('');
    setAdjustmentReason('');
    setAdjustmentError(null);
    onNotice(t('Balance adjustment recorded in history.'));
  };

  return (
    <div className="space-y-4">
      <section className="rounded-xl border border-amber-200 bg-amber-50 p-4">
        <div className="flex gap-3">
          <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" aria-hidden="true" />
          <div>
            <h2 className="font-semibold text-amber-950">{t('An isolated, device-local experiment')}</h2>
            <p className="mt-1 text-sm leading-relaxed text-amber-900/80">
              {t('Rewards Lab is stored separately from planner tasks. It is not included in planner backups or sync, and disabling it never changes your task data.')}
            </p>
          </div>
        </div>
      </section>

      <section className="rounded-xl border border-slate-200 bg-slate-50 p-4">
        <div className="flex items-start gap-3">
          <Dice5 className="mt-0.5 h-5 w-5 shrink-0 text-indigo-600" aria-hidden="true" />
          <div className="min-w-0 flex-1">
            <h2 className="font-semibold text-slate-900">{t('Fair-bag rewards')}</h2>
            <p className="mt-1 text-sm leading-relaxed text-slate-600">
              {t('Every cycle contains three 2s, three 3s, and three 4s in a shuffled bag. Each completed task draws one value, so short-term surprise stays fair over every nine draws. There are no zeroes, penalties, or weekly caps.')}
            </p>
            <ul className="mt-3 grid gap-2 sm:grid-cols-2">
              {(Object.keys(REWARD_GRADES) as RewardGrade[]).map((grade) => (
                <GradeRule key={grade} grade={grade} />
              ))}
            </ul>
            <p className="mt-3 text-xs text-slate-500">
              {t('Undoing a task reverses its reward. Completing it again restores the original result instead of rerolling.')}
            </p>
          </div>
        </div>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-4">
        <h2 className="font-semibold text-slate-900">{t('Pilot snapshot')}</h2>
        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
          <div className="rounded-lg bg-slate-50 p-3">
            <p className="text-xs text-slate-500">{t('Claims')}</p>
            <p className="mt-1 text-xl font-semibold text-slate-800">{Object.keys(state.claims).length}</p>
          </div>
          <div className="rounded-lg bg-slate-50 p-3">
            <p className="text-xs text-slate-500">{t('Earned')}</p>
            <p className="mt-1 text-xl font-semibold text-slate-800">{earned}</p>
          </div>
          <div className="rounded-lg bg-slate-50 p-3">
            <p className="text-xs text-slate-500">{t('Spent now')}</p>
            <p className="mt-1 text-xl font-semibold text-slate-800">{spentNet}</p>
          </div>
          <div className="rounded-lg bg-slate-50 p-3">
            <p className="text-xs text-slate-500">{t('Redemptions')}</p>
            <p className="mt-1 text-xl font-semibold text-slate-800">{state.metrics.redemptionCount}</p>
          </div>
        </div>
        {Object.keys(state.claims).length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2" aria-label={t('Completed task grade distribution')}>
            {(Object.keys(REWARD_GRADES) as RewardGrade[]).map((grade) => (
              <span key={grade} className={`rounded-full border px-2 py-1 text-xs ${gradeStyles[grade].badge}`}>
                {t(REWARD_GRADES[grade].label)}: {gradeCounts[grade]}
              </span>
            ))}
          </div>
        )}
        <p className="mt-3 text-xs text-slate-500">
          {t('Lab opened {count} times', { count: state.metrics.labOpenCount })}
          {state.metrics.lastOpenedAt ? ` · ${t('last {date}', { date: formatDateTime(state.metrics.lastOpenedAt, locale) })}` : ''}
        </p>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-4">
        <div className="flex items-center gap-2">
          <Settings2 className="h-5 w-5 text-slate-500" aria-hidden="true" />
          <h2 className="font-semibold text-slate-900">{t('Preferences')}</h2>
        </div>
        <form onSubmit={saveCurrency} className="mt-4 flex items-end gap-2">
          <label className="min-w-0 flex-1 text-sm font-medium text-slate-700">
            {t('Currency name')}
            <input
              value={currency}
              onChange={(event) => setCurrency(event.target.value)}
              className={`${fieldClass} mt-1`}
              maxLength={40}
              required
            />
          </label>
          <button type="submit" className={secondaryButton} disabled={!currency.trim() || currency.trim() === state.currencyName}>
            {t('Save')}
          </button>
        </form>
        <label className="mt-4 flex cursor-pointer items-center justify-between gap-4 rounded-lg bg-slate-50 px-3 py-3">
          <span>
            <span className="block text-sm font-medium text-slate-800">{t('Reward animation')}</span>
            <span className="block text-xs text-slate-500">{t('A brief result reveal after task completion.')}</span>
          </span>
          <input
            type="checkbox"
            checked={state.animationsEnabled}
            onChange={(event) => runtime.updateAnimations(event.target.checked)}
            className="h-5 w-5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
          />
        </label>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white">
        <button
          type="button"
          onClick={() => setAdvancedOpen((value) => !value)}
          className="flex w-full items-center justify-between rounded-xl px-4 py-3 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-indigo-500"
          aria-expanded={advancedOpen}
        >
          <span>
            <span className="block font-semibold text-slate-900">{t('Advanced')}</span>
            <span className="block text-xs text-slate-500">{t('Balance correction and experiment controls')}</span>
          </span>
          {advancedOpen ? <ChevronUp className="h-4 w-4 text-slate-500" /> : <ChevronDown className="h-4 w-4 text-slate-500" />}
        </button>
        {advancedOpen && (
          <div className="space-y-5 border-t border-slate-200 p-4">
            <form onSubmit={submitAdjustment}>
              <h3 className="text-sm font-semibold text-slate-800">{t('Manual balance adjustment')}</h3>
              <p className="mt-1 text-xs text-slate-500">{t('Every correction is recorded in wallet history.')}</p>
              <div className="mt-3 grid gap-3 sm:grid-cols-[8rem_minmax(0,1fr)_auto] sm:items-end">
                <label className="text-sm font-medium text-slate-700">
                  {t('Amount')}
                  <input
                    value={adjustment}
                    onChange={(event) => setAdjustment(event.target.value)}
                    className={`${fieldClass} mt-1`}
                    type="number"
                    step="1"
                    inputMode="numeric"
                    placeholder="+5 or -5"
                  />
                </label>
                <label className="text-sm font-medium text-slate-700">
                  {t('Reason')}
                  <input
                    value={adjustmentReason}
                    onChange={(event) => setAdjustmentReason(event.target.value)}
                    className={`${fieldClass} mt-1`}
                    maxLength={100}
                    placeholder={t('Why is this needed?')}
                  />
                </label>
                <button type="submit" className={secondaryButton}>{t('Record')}</button>
              </div>
              {adjustmentError && <p className="mt-2 text-sm text-red-700" role="alert">{adjustmentError}</p>}
            </form>

            <div className="border-t border-slate-200 pt-4">
              <h3 className="text-sm font-semibold text-slate-800">{t('Experiment controls')}</h3>
              <div className="mt-3 flex flex-wrap gap-2">
                <button type="button" onClick={() => onConfirm({ kind: 'disable' })} className={secondaryButton}>
                  {t('Disable, keep data')}
                </button>
                <button type="button" onClick={() => onConfirm({ kind: 'reset' })} className={dangerButton}>
                  <RotateCcw className="h-4 w-4" />
                  {t('Reset experiment')}
                </button>
                <button type="button" onClick={() => onConfirm({ kind: 'erase' })} className={dangerButton}>
                  <Trash2 className="h-4 w-4" />
                  {t('Disable & erase')}
                </button>
              </div>
            </div>
          </div>
        )}
      </section>
    </div>
  );
};
