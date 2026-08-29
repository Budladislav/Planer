import React from 'react';
import { getTaskGrade, REWARD_GRADES, RewardGrade } from '../domain';
import { useRewardsLab } from './useRewardsLab';

const GRADE_STYLES: Record<RewardGrade, { dot: string; selected: string }> = {
  common: { dot: 'bg-slate-300', selected: 'ring-slate-500' },
  uncommon: { dot: 'bg-emerald-500', selected: 'ring-emerald-600' },
  rare: { dot: 'bg-blue-500', selected: 'ring-blue-600' },
  legendary: { dot: 'bg-amber-400', selected: 'ring-amber-500' },
  mythic: { dot: 'bg-rose-500', selected: 'ring-rose-600' },
};

const GRADES = Object.keys(REWARD_GRADES) as RewardGrade[];

export const ActiveRewardGradeMarker: React.FC<{ taskId: string }> = ({ taskId }) => {
  const { snapshot } = useRewardsLab();
  if (!snapshot.enabled || !snapshot.state) return null;
  const grade = snapshot.state.claims[taskId]?.grade ?? getTaskGrade(snapshot.state, taskId);
  if (grade === 'common') return null;
  const meta = REWARD_GRADES[grade];

  return (
    <span
      className={`h-2.5 w-2.5 flex-shrink-0 rotate-45 rounded-[2px] ${GRADE_STYLES[grade].dot}`}
      role="img"
      aria-label={`${meta.label} reward grade, multiplier ${meta.multiplier}`}
      title={`${meta.label} · ×${meta.multiplier}`}
    />
  );
};

export const ActiveRewardGradeSelector: React.FC<{ taskId: string; compact?: boolean }> = ({ taskId, compact = false }) => {
  const { runtime, snapshot } = useRewardsLab();
  if (!snapshot.enabled || !snapshot.state) return null;

  const claim = snapshot.state.claims[taskId];
  const grade = claim?.grade ?? getTaskGrade(snapshot.state, taskId);
  const selectedMeta = REWARD_GRADES[grade];

  return (
    <div
      className={`flex w-full min-w-0 items-center gap-2 rounded-md bg-slate-50 ${compact ? 'px-2 py-1' : 'px-2.5 py-1.5'}`}
      onClick={event => event.stopPropagation()}
      onPointerDown={event => event.stopPropagation()}
    >
      <span className="flex-shrink-0 text-[10px] font-semibold uppercase tracking-wide text-slate-400">Grade</span>
      <div className="flex items-center gap-1" role="group" aria-label="Task reward grade">
        {GRADES.map(option => {
          const meta = REWARD_GRADES[option];
          const selected = option === grade;
          return (
            <button
              key={option}
              type="button"
              disabled={Boolean(claim)}
              onClick={event => {
                event.stopPropagation();
                runtime.setTaskGrade(taskId, option);
              }}
              className={`flex h-6 w-6 items-center justify-center rounded-full transition-transform hover:scale-110 disabled:cursor-not-allowed disabled:opacity-70 ${
                selected ? `ring-2 ring-offset-1 ${GRADE_STYLES[option].selected}` : ''
              }`}
              aria-label={`${meta.label}, reward multiplier ${meta.multiplier}`}
              aria-pressed={selected}
              title={`${meta.label} · ×${meta.multiplier}${claim ? ' · locked after first completion' : ''}`}
            >
              <span className={`h-3.5 w-3.5 rounded-full ${GRADE_STYLES[option].dot}`} />
            </button>
          );
        })}
      </div>
      <span className="min-w-0 flex-1 truncate text-right text-[11px] font-medium text-slate-600">
        {selectedMeta.label} ×{selectedMeta.multiplier}{claim ? ' · locked' : ''}
      </span>
    </div>
  );
};
