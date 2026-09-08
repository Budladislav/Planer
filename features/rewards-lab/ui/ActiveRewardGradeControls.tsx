import React from 'react';
import { ChevronUp } from 'lucide-react';
import { getTaskGrade, isRewardClaimActive, REWARD_GRADES, RewardGrade } from '../domain';
import { useRewardsLab } from './useRewardsLab';
import { useI18n } from '../../../i18n';

const GRADE_STYLES: Record<RewardGrade, { dot: string; selected: string }> = {
  common: { dot: 'bg-slate-300', selected: 'ring-slate-500' },
  uncommon: { dot: 'bg-emerald-500', selected: 'ring-emerald-600' },
  rare: { dot: 'bg-blue-500', selected: 'ring-blue-600' },
  legendary: { dot: 'bg-amber-400', selected: 'ring-amber-500' },
  mythic: { dot: 'bg-rose-500', selected: 'ring-rose-600' },
};

const GRADE_SURFACES: Record<Exclude<RewardGrade, 'common'>, string> = {
  uncommon: 'border-l-emerald-400',
  rare: 'border-l-blue-400',
  legendary: 'border-l-amber-400',
  mythic: 'border-l-rose-400',
};

const GRADE_STEP_STYLES: Record<RewardGrade, string> = {
  common: 'border-slate-200 bg-slate-50 text-slate-500 hover:bg-slate-100',
  uncommon: 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100',
  rare: 'border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100',
  legendary: 'border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100',
  mythic: 'border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100',
};

const GRADES = Object.keys(REWARD_GRADES) as RewardGrade[];

export const ActiveRewardGradeMarker: React.FC<{ taskId: string }> = ({ taskId }) => {
  const { t } = useI18n();
  const { snapshot } = useRewardsLab();
  if (!snapshot.enabled || !snapshot.state) return null;
  const claim = snapshot.state.claims[taskId];
  const grade = claim?.grade ?? getTaskGrade(snapshot.state, taskId);
  if (grade === 'common') return null;
  const meta = REWARD_GRADES[grade];
  const rule = claim?.economyVersion === 1
    ? `×${meta.legacyMultiplier}`
    : `${meta.min}–${meta.max}`;

  return (
    <span
      className={`h-2.5 w-2.5 flex-shrink-0 rotate-45 rounded-[2px] ${GRADE_STYLES[grade].dot}`}
      role="img"
      aria-label={t('{grade} reward grade, rule {rule}', { grade: t(meta.label), rule })}
      title={`${t(meta.label)} · ${rule}`}
    />
  );
};

export const ActiveRewardGradeSurface: React.FC<{ taskId: string }> = ({ taskId }) => {
  const { snapshot } = useRewardsLab();
  if (!snapshot.enabled || !snapshot.state) return null;
  const grade = snapshot.state.claims[taskId]?.grade ?? getTaskGrade(snapshot.state, taskId);
  if (grade === 'common') return null;
  return (
    <span
      className={`pointer-events-none absolute inset-0 rounded-[inherit] border-l-[3px] ${GRADE_SURFACES[grade]}`}
      aria-hidden="true"
    />
  );
};

export const ActiveRewardGradeIncrementButton: React.FC<{ taskId: string }> = ({ taskId }) => {
  const { t } = useI18n();
  const { runtime, snapshot } = useRewardsLab();
  if (!snapshot.enabled || !snapshot.state) return null;

  const claim = snapshot.state.claims[taskId];
  const grade = claim?.grade ?? getTaskGrade(snapshot.state, taskId);
  const nextGrade = GRADES[GRADES.indexOf(grade) + 1] ?? null;
  const locked = Boolean(claim && isRewardClaimActive(snapshot.state, taskId));
  const visualGrade = nextGrade ?? grade;
  const label = nextGrade
    ? t('Increase task grade: {from} to {to}', { from: t(REWARD_GRADES[grade].label), to: t(REWARD_GRADES[nextGrade].label) })
    : t('Maximum task grade: {grade}', { grade: t(REWARD_GRADES[grade].label) });

  return (
    <button
      type="button"
      disabled={locked || !nextGrade}
      onClick={event => {
        event.stopPropagation();
        if (nextGrade) runtime.setTaskGrade(taskId, nextGrade);
      }}
      onPointerDown={event => event.stopPropagation()}
      onMouseDown={event => event.stopPropagation()}
      onTouchStart={event => event.stopPropagation()}
      className={`flex h-8 w-9 flex-shrink-0 items-center justify-center gap-0.5 rounded-md border transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 disabled:cursor-not-allowed disabled:opacity-45 ${GRADE_STEP_STYLES[visualGrade]}`}
      aria-label={label}
      title={locked ? t('Grade is locked while the task is completed.') : label}
    >
      <span className={`h-2.5 w-2.5 rotate-45 rounded-[2px] ${GRADE_STYLES[visualGrade].dot}`} aria-hidden="true" />
      <ChevronUp className="h-3.5 w-3.5" aria-hidden="true" />
    </button>
  );
};

export const ActiveRewardGradeSelector: React.FC<{ taskId: string; compact?: boolean }> = ({ taskId, compact = false }) => {
  const { t } = useI18n();
  const { runtime, snapshot } = useRewardsLab();
  if (!snapshot.enabled || !snapshot.state) return null;

  const claim = snapshot.state.claims[taskId];
  const grade = claim?.grade ?? getTaskGrade(snapshot.state, taskId);
  const selectedMeta = REWARD_GRADES[grade];
  const locked = Boolean(claim && isRewardClaimActive(snapshot.state, taskId));
  const selectedRule = claim?.economyVersion === 1
    ? `×${selectedMeta.legacyMultiplier}`
    : `${selectedMeta.min}–${selectedMeta.max}`;

  return (
    <div
      className={`flex w-full min-w-0 items-center gap-2 rounded-md bg-slate-50 ${compact ? 'px-2 py-1' : 'px-2.5 py-1.5'}`}
      onClick={event => event.stopPropagation()}
      onPointerDown={event => event.stopPropagation()}
    >
      <span className="flex-shrink-0 text-[10px] font-semibold uppercase tracking-wide text-slate-400">{t('Grade')}</span>
      <div className="flex items-center gap-1" role="group" aria-label={t('Task reward grade')}>
        {GRADES.map(option => {
          const meta = REWARD_GRADES[option];
          const selected = option === grade;
          return (
            <button
              key={option}
              type="button"
              disabled={locked}
              onClick={event => {
                event.stopPropagation();
                runtime.setTaskGrade(taskId, option);
              }}
              className={`flex h-6 w-6 items-center justify-center rounded-full transition-transform hover:scale-110 disabled:cursor-not-allowed disabled:opacity-70 ${
                selected ? `ring-2 ring-offset-1 ${GRADE_STYLES[option].selected}` : ''
              }`}
              aria-label={t('{grade}, reward {min}–{max}', { grade: t(meta.label), min: meta.min, max: meta.max })}
              aria-pressed={selected}
              title={`${t(meta.label)} · ${claim?.economyVersion === 1 ? `×${meta.legacyMultiplier}` : `${meta.min}–${meta.max}`}${locked ? ` · ${t('locked while completed')}` : ''}`}
            >
              <span className={`h-3.5 w-3.5 rounded-full ${GRADE_STYLES[option].dot}`} />
            </button>
          );
        })}
      </div>
      <span className="min-w-0 flex-1 truncate text-right text-[11px] font-medium text-slate-600">
        {t(selectedMeta.label)} {selectedRule}{locked ? ` · ${t('locked')}` : claim ? ` · ${t('editable after Undo')}` : ''}
      </span>
    </div>
  );
};
