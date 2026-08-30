import { getMonthWeeks, isValidMonthString } from './month-planning';
import { getWeekDates } from './utils';

export interface EventCalendarDay {
  date: string;
  dayOfMonth: number;
  isInMonth: boolean;
}

export interface EventCalendarWeek {
  week: string;
  days: EventCalendarDay[];
}

/**
 * Builds complete Monday-to-Sunday rows for a calendar month.
 * Dates from adjacent months stay in the grid so UI consumers can keep each row aligned.
 */
export const buildEventCalendarMonth = (month: string): EventCalendarWeek[] => {
  if (!isValidMonthString(month)) return [];

  return getMonthWeeks(month).map(week => ({
    week,
    days: getWeekDates(week).map(date => ({
      date,
      dayOfMonth: Number(date.slice(8, 10)),
      isInMonth: date.startsWith(`${month}-`),
    })),
  }));
};

export const partitionEventCalendarWeeks = (
  weeks: EventCalendarWeek[],
  currentWeek: string,
): { pastWeeks: EventCalendarWeek[]; currentAndFutureWeeks: EventCalendarWeek[] } => ({
  pastWeeks: weeks.filter(({ week }) => week < currentWeek),
  currentAndFutureWeeks: weeks.filter(({ week }) => week >= currentWeek),
});
