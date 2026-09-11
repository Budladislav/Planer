import React from 'react';
import { CalendarDays, CalendarRange, CalendarClock, ChevronUp, KeyRound, RotateCcw, ShieldOff, Target } from 'lucide-react';
import { getTaskGrade, isRewardClaimActive, REWARD_GRADES, RewardGrade } from '../domain';
import { useRewardsLab } from './useRewardsLab';
import { useI18n } from '../../../i18n';
import { dismissPlanningImportance, getActivePlanningImportance, restorePlanningImportance } from '../../../planning-importance';
import { useAppStore } from '../../../store';
import type { PlanningImportanceSource, Task } from '../../../types';
import { getEffectiveTaskGrade, getTaskAutomaticGradeRule } from '../task-grade';

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
const gradeRank = (grade: RewardGrade): number => GRADES.indexOf(grade);

const useTaskRewardGrade = (taskId: string, minimumGrade: RewardGrade = 'common') => {
  const { runtime, snapshot } = useRewardsLab();
  const claim = snapshot.state?.claims[taskId];
  const manualGrade = snapshot.state ? getTaskGrade(snapshot.state, taskId) : 'common';
  const claimIsActive = Boolean(snapshot.state && claim && isRewardClaimActive(snapshot.state, taskId));
  const grade: RewardGrade = claimIsActive && claim
    ? claim.grade
    : getEffectiveTaskGrade(manualGrade, minimumGrade);
  return { runtime, snapshot, claim, grade, manualGrade, minimumGrade };
};

type TaskGradeProps = { task: Task };

export const ActiveRewardGradeMarker: React.FC<TaskGradeProps> = ({ task }) => {
  const { t } = useI18n();
  const minimumGrade = getTaskAutomaticGradeRule(task).minimumGrade;
  const { snapshot, claim, grade } = useTaskRewardGrade(task.id, minimumGrade);
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

export const ActiveRewardGradeSurface: React.FC<TaskGradeProps> = ({ task }) => {
  const minimumGrade = getTaskAutomaticGradeRule(task).minimumGrade;
  const { snapshot, grade } = useTaskRewardGrade(task.id, minimumGrade);
  if (!snapshot.enabled || !snapshot.state) return null;
  if (grade === 'common') return null;
  return (
    <span
      className={`reward-grade-surface pointer-events-none absolute inset-0 rounded-[inherit] border-l-[3px] ${GRADE_SURFACES[grade]}`}
      aria-hidden="true"
    />
  );
};

export const ActiveRewardGradeIncrementButton: React.FC<TaskGradeProps> = ({ task }) => {
  const { t } = useI18n();
  const minimumGrade = getTaskAutomaticGradeRule(task).minimumGrade;
  const { runtime, snapshot, claim, grade } = useTaskRewardGrade(task.id, minimumGrade);
  if (!snapshot.enabled || !snapshot.state) return null;

  const nextGrade = GRADES[GRADES.indexOf(grade) + 1] ?? null;
  const locked = Boolean(claim && isRewardClaimActive(snapshot.state, task.id));
  if (!nextGrade) return null;

  const label = t('Increase task grade: {from} to {to}', {
    from: t(REWARD_GRADES[grade].label),
    to: t(REWARD_GRADES[nextGrade].label),
  });

  return (
    <button
      type="button"
      disabled={locked}
      onClick={event => {
        event.stopPropagation();
        if (nextGrade) runtime.setTaskGrade(task.id, nextGrade);
      }}
      onPointerDown={event => event.stopPropagation()}
      onMouseDown={event => event.stopPropagation()}
      onTouchStart={event => event.stopPropagation()}
      className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg border transition-colors disabled:cursor-not-allowed disabled:opacity-45 ${GRADE_STEP_STYLES[grade]}`}
      aria-label={label}
      title={locked ? t('Grade is locked while the task is completed.') : label}
    >
      <ChevronUp className="h-3.5 w-3.5" aria-hidden="true" />
    </button>
  );
};

export const ActiveRewardCompletionMeta: React.FC<{ taskId: string }> = ({ taskId }) => {
  const { t } = useI18n();
  const { snapshot } = useRewardsLab();
  if (!snapshot.enabled || !snapshot.state) return null;
  const claim = snapshot.state.claims[taskId];
  if (!claim || !isRewardClaimActive(snapshot.state, taskId)) return null;
  const key = claim.economyVersion === 3 && claim.keyId
    ? snapshot.state.keys.find(item => item.id === claim.keyId) ?? null
    : null;

  return (
    <>
      {key && (
        <span
          className={`inline-flex flex-shrink-0 items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-semibold ${GRADE_META_STYLES[key.grade]}`}
          title={t('{grade} key', { grade: t(REWARD_GRADES[key.grade].label) })}
        >
          <KeyRound className="h-3 w-3" aria-hidden="true" />
          <span>{t(REWARD_GRADES[key.grade].label)}</span>
        </span>
      )}
      <span className={`inline-flex flex-shrink-0 rounded-md px-1.5 py-0.5 text-[10px] font-semibold ${GRADE_META_STYLES[claim.grade]}`}>
        +{claim.amount} {snapshot.state.currencyName}
      </span>
    </>
  );
};

export const ActiveRewardGradeSelector: React.FC<TaskGradeProps & { compact?: boolean }> = ({ task, compact = false }) => {
  const { t } = useI18n();
  const minimumGrade = getTaskAutomaticGradeRule(task).minimumGrade;
  const { runtime, snapshot, claim, grade } = useTaskRewardGrade(task.id, minimumGrade);
  if (!snapshot.enabled || !snapshot.state) return null;

  const selectedMeta = REWARD_GRADES[grade];
  const locked = Boolean(claim && isRewardClaimActive(snapshot.state, task.id));
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
        {GRADES.filter(option => gradeRank(option) >= gradeRank(minimumGrade)).map(option => {
          const meta = REWARD_GRADES[option];
          const selected = option === grade;
          return (
            <button
              key={option}
              type="button"
              disabled={locked}
              onClick={event => {
                event.stopPropagation();
                runtime.setTaskGrade(task.id, option);
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
      {minimumGrade !== 'common' && <span className="sr-only">{t('This task has an automatic minimum grade.')}</span>}
    </div>
  );
};

const PLANNING_ICONS = {
  week: CalendarRange,
  month: CalendarDays,
  year: CalendarClock,
} as const;

const planningLabel = (source: PlanningImportanceSource, t: ReturnType<typeof useI18n>['t']): string => ({
  week: t('Weekly planning'),
  month: t('Monthly planning'),
  year: t('Yearly planning'),
})[source];

export const ActiveRewardImportanceMarkers: React.FC<{ task: Task }> = ({ task }) => {
  const { snapshot } = useRewardsLab();
  const { t } = useI18n();
  if (!snapshot.enabled || !snapshot.state) return null;
  const planningSource = getActivePlanningImportance(task);
  const PlanningIcon = planningSource ? PLANNING_ICONS[planningSource] : null;

  return (
    <span className="relative z-[1] inline-flex flex-shrink-0 items-center gap-1">
      {PlanningIcon && planningSource && (
        <span className="inline-flex h-5 w-5 items-center justify-center rounded-md bg-slate-100 text-slate-500" title={planningLabel(planningSource, t)} aria-label={planningLabel(planningSource, t)}>
          <PlanningIcon className="h-3 w-3" aria-hidden="true" />
        </span>
      )}
      {task.goalId && (
        <span className="inline-flex h-5 w-5 items-center justify-center rounded-md bg-slate-100 text-slate-500" title={t('Linked to a long-term goal')} aria-label={t('Linked to a long-term goal')}>
          <Target className="h-3 w-3" aria-hidden="true" />
        </span>
      )}
    </span>
  );
};

export const ActiveRewardAutomaticMinimumControl: React.FC<{ task: Task }> = ({ task }) => {
  const { snapshot } = useRewardsLab();
  const { dispatch } = useAppStore();
  const { t } = useI18n();
  if (!snapshot.enabled || !snapshot.state) return null;

  const rule = getTaskAutomaticGradeRule(task);
  const planning = task.planningImportance;
  const reasonLabels = rule.reasons.map(reason => ({
    week: t('Weekly planning'),
    month: t('Monthly planning'),
    year: t('Yearly planning'),
    goal: t('Long-term goal'),
    event: t('Calendar event'),
  })[reason]);

  if (!planning && rule.minimumGrade === 'common') return null;

  const updatePlanningImportance = (next: Task['planningImportance']) => dispatch({
    type: 'UPDATE_TASK', payload: { id: task.id, planningImportance: next },
  });

  if (planning?.dismissed) {
    return (
      <div className="mx-auto flex w-full max-w-sm items-center gap-2 px-2 text-xs text-slate-500">
        <ShieldOff className="h-3.5 w-3.5 flex-shrink-0" aria-hidden="true" />
        <span className="min-w-0 flex-1">{t('{source} importance removed', { source: planningLabel(planning.source, t) })}</span>
        <button type="button" className="inline-flex flex-shrink-0 items-center gap-1 rounded-lg px-2 py-1 font-medium text-brand-700 hover:bg-brand-50" onClick={() => updatePlanningImportance(restorePlanningImportance(planning))}>
          <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />{t('Restore')}
        </button>
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-sm items-center gap-2 px-2 text-xs text-slate-500">
      <span className="min-w-0 flex-1">{t('Automatic minimum: {grade} · {reasons}', {
        grade: t(REWARD_GRADES[rule.minimumGrade].label),
        reasons: reasonLabels.join(', '),
      })}</span>
      {planning && (
        <button type="button" className="inline-flex flex-shrink-0 items-center gap-1 rounded-lg px-2 py-1 font-medium text-slate-600 hover:bg-slate-100" onClick={() => updatePlanningImportance(dismissPlanningImportance(planning))}>
          <ShieldOff className="h-3.5 w-3.5" aria-hidden="true" />{t('Remove')}
        </button>
      )}
    </div>
  );
};
