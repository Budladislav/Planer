import { WorkShift, WorkShiftSettings } from './types';
import { getWeekDates, isValidWeekString } from './utils';

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

export const formatWorkShift = (shift: WorkShift | null): string => {
  return shift === null ? 'Shift not set' : `${shift === 1 ? 'First' : 'Second'} shift`;
};
