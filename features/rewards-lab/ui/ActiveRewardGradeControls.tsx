import React, { useEffect } from 'react';
import { ChevronUp } from 'lucide-react';
import { getTaskGrade, isRewardClaimActive, REWARD_GRADES, RewardGrade } from '../domain';
import { useRewardsLab } from './useRewardsLab';
import { useI18n } from '../../../i18n';

const GRADE_STYLES: Record<RewardGrade, { dot: string; selected: string }> = {
  common: { dot: 'bg-[#94A3B8]', selected: 'ring-[#94A3B8]' },
  uncommon: { dot: 'bg-[#2FB47C]', selected: 'ring-[#2FB47C]' },
  rare: { dot: 'bg-[#3B82F6]', selected: 'ring-[#3B82F6]' },
  legendary: { dot: 'bg-[#E09A17]', selected: 'ring-[#E09A17]' },
  mythic: { dot: 'bg-[#E4515E]', selected: 'ring-[#E4515E]' },
};

const GRADE_SURFACES: Record<Exclude<RewardGrade, 'common'>, string> = {
  uncommon: 'border-l-[#2FB47C] bg-[#EAF8F2]/55',
  rare: 'border-l-[#3B82F6] bg-[#EEF4FF]/55',
  legendary: 'border-l-[#E09A17] bg-[#FFF6DD]/55',
  mythic: 'border-l-[#E4515E] bg-[#FDECEF]/55',
};

const GRADE_STEP_STYLES: Record<RewardGrade, string> = {
  common: 'border-[#94A3B8]/35 bg-[#F4F6F8] text-[#475569] hover:bg-slate-200/70',
  uncommon: 'border-[#2FB47C]/35 bg-[#EAF8F2] text-[#187A54] hover:bg-emerald-100',
  rare: 'border-[#3B82F6]/35 bg-[#EEF4FF] text-[#1D5FD1] hover:bg-blue-100',
  legendary: 'border-[#E09A17]/35 bg-[#FFF6DD] text-[#925E00] hover:bg-amber-100',
  mythic: 'border-[#E4515E]/35 bg-[#FDECEF] text-[#B52D3C] hover:bg-red-100',
};

const GRADE_META_STYLES: Record<RewardGrade, string> = {
  common: 'bg-[#F4F6F8] text-[#475569]',
  uncommon: 'bg-[#EAF8F2] text-[#187A54]',
  rare: 'bg-[#EEF4FF] text-[#1D5FD1]',
  legendary: 'bg-[#FFF6DD] text-[#925E00]',
  mythic: 'bg-[#FDECEF] text-[#B52D3C]',
};

const GRADES = Object.keys(REWARD_GRADES) as RewardGrade[];

const useTaskRewardGrade = (taskId: string, goalLinked: boolean) => {
  const { runtime, snapshot } = useRewardsLab();
  const claim = snapshot.state?.claims[taskId];
  const storedGrade = snapshot.state ? (claim?.grade ?? getTaskGrade(snapshot.state, taskId)) : 'common';
  const grade: RewardGrade = goalLinked && storedGrade === 'common' ? 'uncommon' : storedGrade;

  useEffect(() => {
    if (snapshot.enabled && snapshot.state && goalLinked && storedGrade === 'common') {
      runtime.ensureTaskMinimumGrade(taskId, 'uncommon');
    }
  }, [goalLinked, runtime, snapshot.enabled, snapshot.state, storedGrade, taskId]);

  return { runtime, snapshot, claim, grade, goalLinked };
};

export const ActiveRewardGradeMarker: React.FC<{ taskId: string; goalLinked?: boolean }> = ({ taskId, goalLinked = false }) => {
  const { t } = useI18n();
  const { snapshot, claim, grade } = useTaskRewardGrade(taskId, goalLinked);
  if (!snapshot.enabled || !snapshot.state) return null;
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

export const ActiveRewardGradeSurface: React.FC<{ taskId: string; goalLinked?: boolean }> = ({ taskId, goalLinked = false }) => {
  const { snapshot, grade } = useTaskRewardGrade(taskId, goalLinked);
  if (!snapshot.enabled || !snapshot.state) return null;
  if (grade === 'common') return null;
  return (
    <span
      className={`reward-grade-surface pointer-events-none absolute inset-0 rounded-[inherit] border-l-[3px] ${GRADE_SURFACES[grade]}`}
      aria-hidden="true"
    />
  );
};

export const ActiveRewardGradeIncrementButton: React.FC<{ taskId: string; goalLinked?: boolean }> = ({ taskId, goalLinked = false }) => {
  const { t } = useI18n();
  const { runtime, snapshot, claim, grade } = useTaskRewardGrade(taskId, goalLinked);
  if (!snapshot.enabled || !snapshot.state) return null;

  const nextGrade = GRADES[GRADES.indexOf(grade) + 1] ?? null;
  const locked = Boolean(claim && isRewardClaimActive(snapshot.state, taskId));
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
      className={`flex h-8 w-9 flex-shrink-0 items-center justify-center gap-0.5 rounded-lg border transition-colors disabled:cursor-not-allowed disabled:opacity-45 ${GRADE_STEP_STYLES[grade]}`}
      aria-label={label}
      title={locked ? t('Grade is locked while the task is completed.') : label}
    >
      <span className={`h-2.5 w-2.5 rotate-45 rounded-[2px] ${GRADE_STYLES[grade].dot}`} aria-hidden="true" />
      <ChevronUp className="h-3.5 w-3.5" aria-hidden="true" />
    </button>
  );
};

export const ActiveRewardCompletionMeta: React.FC<{ taskId: string }> = ({ taskId }) => {
  const { snapshot } = useRewardsLab();
  if (!snapshot.enabled || !snapshot.state) return null;
  const claim = snapshot.state.claims[taskId];
  if (!claim || !isRewardClaimActive(snapshot.state, taskId)) return null;

  return (
    <span className={`inline-flex flex-shrink-0 rounded-md px-1.5 py-0.5 text-[10px] font-semibold ${GRADE_META_STYLES[claim.grade]}`}>
      +{claim.amount} {snapshot.state.currencyName}
    </span>
  );
};

export const ActiveRewardGradeSelector: React.FC<{ taskId: string; compact?: boolean; goalLinked?: boolean }> = ({ taskId, compact = false, goalLinked = false }) => {
  const { t } = useI18n();
  const { runtime, snapshot, claim, grade } = useTaskRewardGrade(taskId, goalLinked);
  if (!snapshot.enabled || !snapshot.state) return null;

  const selectedMeta = REWARD_GRADES[grade];
  const locked = Boolean(claim && isRewardClaimActive(snapshot.state, taskId));
  const selectedRule = claim?.economyVersion === 1
    ? `×${selectedMeta.legacyMultiplier}`
    : `${selectedMeta.min}–${selectedMeta.max}`;

  return (
    <div
      className={`mx-auto flex w-full max-w-sm min-w-0 items-center gap-2 rounded-lg bg-slate-50/80 ${compact ? 'px-2 py-1' : 'px-2.5 py-1.5'}`}
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
              disabled={locked || (goalLinked && option === 'common')}
              onClick={event => {
                event.stopPropagation();
                runtime.setTaskGrade(taskId, option);
              }}
              className={`flex h-6 w-6 items-center justify-center rounded-full transition-transform hover:scale-110 disabled:cursor-not-allowed disabled:opacity-70 ${
                selected ? `ring-2 ring-offset-1 ${GRADE_STYLES[option].selected}` : ''
              }`}
              aria-label={t('{grade}, reward {min}–{max}', { grade: t(meta.label), min: meta.min, max: meta.max })}
              aria-pressed={selected}
              title={goalLinked && option === 'common'
                ? t('Tasks linked to a big goal cannot be Common.')
                : `${t(meta.label)} · ${claim?.economyVersion === 1 ? `×${meta.legacyMultiplier}` : `${meta.min}–${meta.max}`}${locked ? ` · ${t('locked while completed')}` : ''}`}
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
