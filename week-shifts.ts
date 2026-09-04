import { AppLanguage, WorkShift, WorkShiftSettings } from './types';
import { getWeekDates, getWeekString, isValidWeekString, shiftWeekString } from './utils';

const weekIndex = (week: string): number | null => {
  if (!isValidWeekString(week)) return null;
  const monday = getWeekDates(week)[0];
  return monday ? Math.floor(Date.parse(`${monday}T00:00:00Z`) / 604_800_000) : null;
};

export const getWorkShiftForWeek = (
  settings: WorkShiftSettings,
  week: string,
): WorkShift | null => {
  const override = settings.overrides[week];
  if (override === 1 || override === 2) return override;
  if (!settings.baseWeek || !settings.baseShift) return null;

  const baseIndex = weekIndex(settings.baseWeek);
  const targetIndex = weekIndex(week);
  if (baseIndex === null || targetIndex === null) return null;
  const distance = targetIndex - baseIndex;
  const alternates = ((distance % 2) + 2) % 2 === 1;
  return alternates ? (settings.baseShift === 1 ? 2 : 1) : settings.baseShift;
};

export const formatWorkShift = (shift: WorkShift | null, language: AppLanguage = 'en'): string => {
  if (shift === null) return '';
  return language === 'ru' ? `${shift}. смена` : `${shift}. shift`;
};

export const isFirstToSecondTransitionDay = (
  settings: WorkShiftSettings,
  date: string,
): boolean => {
  if (settings.transitionHighlight === 'off') return false;

  const day = new Date(`${date}T12:00:00`).getDay();
  const week = getWeekString(date);
  const previousWeek = shiftWeekString(week, -1);
  const nextWeek = shiftWeekString(week, 1);
  const transitionAtEndOfWeek = getWorkShiftForWeek(settings, week) === 1
    && getWorkShiftForWeek(settings, nextWeek) === 2;
  const transitionAtStartOfWeek = getWorkShiftForWeek(settings, previousWeek) === 1
    && getWorkShiftForWeek(settings, week) === 2;

  if (day === 6 || day === 0) return transitionAtEndOfWeek;
  if (settings.transitionHighlight === 'extended' && day === 5) return transitionAtEndOfWeek;
  if (settings.transitionHighlight === 'extended' && day === 1) return transitionAtStartOfWeek;
  return false;
};
