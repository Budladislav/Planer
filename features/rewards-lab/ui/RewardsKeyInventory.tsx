import { ArrowUp, KeyRound, Undo2 } from 'lucide-react';
import {
  KEY_UPGRADE_COST,
  REWARD_GRADES,
  RewardGrade,
  RewardsLabState,
  getAvailableKeyCounts,
  rewardGrades,
} from '../domain';
import { useI18n } from '../../../i18n';
import { gradeStyles, secondaryButton } from './RewardsLabPanel.shared';

interface RewardsKeyInventoryProps {
  state: RewardsLabState;
  onUpgrade: (grade: RewardGrade) => void;
  onUndoUpgrade: () => void;
}

export const RewardsKeyInventory = ({ state, onUpgrade, onUndoUpgrade }: RewardsKeyInventoryProps) => {
  const { t } = useI18n();
  const counts = getAvailableKeyCounts(state);
  const latestUpgrade = [...state.keyUpgrades].reverse().find(item => item.reversedAt === null);
  const canUndo = Boolean(latestUpgrade
    && state.keys.some(key => key.id === latestUpgrade.outputKeyId && key.status === 'available'));

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-3">
      <div className="flex flex-wrap items-center justify-between gap-2 px-1">
        <div>
          <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-800">
            <KeyRound className="h-4 w-4 text-indigo-600" /> {t('Reward keys')}
          </h2>
          <p className="mt-0.5 text-xs text-slate-500">{t('Five keys of one grade can be upgraded to the next grade.')}</p>
        </div>
        {latestUpgrade && (
          <button type="button" onClick={onUndoUpgrade} className={secondaryButton} disabled={!canUndo}>
            <Undo2 className="h-4 w-4" /> {t('Undo last upgrade')}
          </button>
        )}
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-5">
        {rewardGrades.map((grade, index) => {
          const canUpgrade = index < rewardGrades.length - 1 && counts[grade] >= KEY_UPGRADE_COST;
          return (
            <div key={grade} className={`rounded-lg border p-2 ${gradeStyles[grade].border}`}>
              <div className="flex items-center justify-between gap-2">
                <span className="flex items-center gap-1.5 text-xs font-medium text-slate-700">
                  <KeyRound className={`h-3.5 w-3.5 ${gradeStyles[grade].keyText}`} />
                  {t(REWARD_GRADES[grade].label)}
                </span>
                <strong className="tabular-nums text-slate-900">{counts[grade]}</strong>
              </div>
              {index < rewardGrades.length - 1 && (
                <button
                  type="button"
                  onClick={() => onUpgrade(grade)}
                  disabled={!canUpgrade}
                  className="mt-2 flex w-full items-center justify-center gap-1 rounded-md bg-slate-50 px-1.5 py-1 text-[11px] font-medium text-slate-600 hover:bg-slate-100 disabled:cursor-not-allowed disabled:text-slate-300"
                  title={t('Upgrade {current} of {needed}', { current: counts[grade], needed: KEY_UPGRADE_COST })}
                >
                  <ArrowUp className="h-3 w-3" /> {counts[grade]}/{KEY_UPGRADE_COST}
                </button>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
};
