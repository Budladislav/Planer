import React, { useMemo } from 'react';
import { ArrowRightLeft } from 'lucide-react';
import { useI18n } from '../../i18n';
import { getTodayString, getWeekDates, getWeekString, shiftWeekString } from '../../utils';
import { TaskIconButton } from '../ui/Primitives';

type WeekTaskMoveButtonProps = {
  onClick: () => void;
};

export const WeekTaskMoveButton: React.FC<WeekTaskMoveButtonProps> = ({ onClick }) => {
  const { t } = useI18n();

  return (
    <TaskIconButton
      label={t('Move')}
      tone="primary"
      onClick={(event) => {
        event.stopPropagation();
        event.preventDefault();
        onClick();
      }}
      onTouchStart={(event) => event.stopPropagation()}
    >
      <ArrowRightLeft className="h-3.5 w-3.5" />
    </TaskIconButton>
  );
};

type WeekTaskMoveSheetProps = {
  week: string;
  onMove: (target: WeekTaskMoveTarget) => void;
  onClose: () => void;
};

export type WeekTaskMoveTarget =
  | { type: 'week'; week: string }
  | { type: 'day'; day: string };

export const WeekTaskMoveSheet: React.FC<WeekTaskMoveSheetProps> = ({ week, onMove, onClose }) => {
  const { locale, t } = useI18n();
  const today = getTodayString();
  const currentWeek = getWeekString(today);
  const nextWeek = shiftWeekString(week, 1);
  const canMoveToNextWeek = nextWeek >= currentWeek;
  const canMoveToWeekPool = week >= currentWeek;
  const days = useMemo(
    () => getWeekDates(week).map((date) => {
      const value = new Date(`${date}T12:00:00Z`);
      return {
        date,
        label: `${date.slice(8, 10)}.${date.slice(5, 7)}.${date.slice(0, 4)}`,
        weekday: value.toLocaleDateString(locale, { weekday: 'short', timeZone: 'UTC' }),
      };
    }),
    [locale, week],
  );

  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet-panel sm:w-[420px]" onClick={(event) => event.stopPropagation()}>
        <div className="flex items-center justify-between">
          <div className="font-semibold text-slate-800">{t('Where to move task?')}</div>
          <button type="button" onClick={onClose} className="text-sm text-slate-400 hover:text-slate-600">
            {t('Close')}
          </button>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {canMoveToNextWeek && (
            <button
              type="button"
              onClick={() => onMove({ type: 'week', week: nextWeek })}
              className="button-secondary h-auto justify-start p-3 text-left"
            >
              <span className="flex flex-col items-start">
                <span>{t('Next week')}</span>
                <span className="text-[10px] font-normal text-slate-400">{nextWeek}</span>
              </span>
            </button>
          )}
          {canMoveToWeekPool && (
            <button
              type="button"
              onClick={() => onMove({ type: 'week', week })}
              className="button-secondary h-auto justify-start p-3 text-left"
            >
              {t('Week bucket (no date)')}
            </button>
          )}
          {days
            .filter((day) => day.date >= today)
            .map((day) => (
              <button
                type="button"
                key={day.date}
                onClick={() => onMove({ type: 'day', day: day.date })}
                className="button-secondary h-auto justify-start p-3 text-left"
              >
                <span className="flex flex-col items-start">
                  <span>{day.weekday} {day.label}</span>
                  {day.date === today && <span className="text-[10px] font-normal text-brand-600">{t('Today')}</span>}
                </span>
              </button>
            ))}
        </div>
      </div>
    </div>
  );
};
