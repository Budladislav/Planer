export const generateId = (): string => {
  return Math.random().toString(36).substring(2, 9);
};

const pad2 = (value: number): string => value.toString().padStart(2, '0');

const parseLocalDate = (dateString: string): Date => {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateString);
  if (!match) return new Date(dateString);

  const [, year, month, day] = match;
  return new Date(Number(year), Number(month) - 1, Number(day), 12);
};

export const getDateString = (date: Date): string => {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
};

export const getTodayString = (): string => {
  return getDateString(new Date());
};

export const getWeekString = (dateString?: string): string => {
  const date = dateString ? parseLocalDate(dateString) : new Date();
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  return `${d.getUTCFullYear()}-W${weekNo.toString().padStart(2, '0')}`;
};

export const formatDateReadable = (dateStr: string): string => {
  const date = parseLocalDate(dateStr);
  return date.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
};

export const formatDateShort = (dateStr: string): string => {
  const date = parseLocalDate(dateStr);
  const day = date.getDate().toString().padStart(2, '0');
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const year = date.getFullYear();
  return `${day}.${month}.${year}`;
};

export const getWeekRange = (weekStr: string) => {
  // Simple parser for YYYY-Www display
  return `Week ${weekStr.split('-W')[1]}, ${weekStr.split('-W')[0]}`;
};

export const getISOWeeksInYear = (year: number): number => {
  return Number(getWeekString(`${year}-12-28`).split('-W')[1]);
};

export const isValidWeekString = (weekStr: string): boolean => {
  const match = /^(\d{4})-W(\d{2})$/.exec(weekStr);
  if (!match) return false;

  const year = Number(match[1]);
  const week = Number(match[2]);
  return year >= 2020 && year <= 2100 && week >= 1 && week <= getISOWeeksInYear(year);
};

export const getWeekDates = (weekStr: string): string[] => {
  if (!isValidWeekString(weekStr)) return [];

  const [yearStr, weekNumStr] = weekStr.split('-W');
  const year = Number(yearStr);
  const weekNum = Number(weekNumStr);
  const jan4 = new Date(Date.UTC(year, 0, 4));
  const jan4Day = jan4.getUTCDay() || 7;
  const firstMonday = new Date(jan4);
  firstMonday.setUTCDate(jan4.getUTCDate() - (jan4Day - 1));
  firstMonday.setUTCDate(firstMonday.getUTCDate() + (weekNum - 1) * 7);

  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(firstMonday);
    date.setUTCDate(firstMonday.getUTCDate() + index);
    return date.toISOString().slice(0, 10);
  });
};

export const shiftWeekString = (weekStr: string, delta: number): string => {
  if (!Number.isInteger(delta)) return weekStr;

  const dates = getWeekDates(weekStr);
  if (dates.length !== 7) return weekStr;

  const monday = new Date(`${dates[0]}T12:00:00Z`);
  monday.setUTCDate(monday.getUTCDate() + delta * 7);
  return getWeekString(monday.toISOString().slice(0, 10));
};

export const getWeekDateRange = (weekStr: string): { start: string; end: string } => {
  const dates = getWeekDates(weekStr);
  const formatDate = (date: string): string => {
    const [, month, day] = date.split('-');
    return `${day}.${month}`;
  };

  return {
    start: dates[0] ? formatDate(dates[0]) : '—',
    end: dates[6] ? formatDate(dates[6]) : '—',
  };
};

export const isTimeOverlap = (start1: string, end1: string, start2: string, end2: string): boolean => {
  return (start1 < end2 && end1 > start2);
};

export const formatTime = (seconds: number): string => {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  
  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${minutes}:${secs.toString().padStart(2, '0')}`;
};

// Event title format: "HH:MM Title"
export const parseEventTitle = (title: string): { time: string; plain: string } => {
  const m = title.match(/^(\d{2}:\d{2})\s+(.*)$/);
  if (m) return { time: m[1], plain: m[2] };
  return { time: '09:00', plain: title };
};

export const formatEventTitle = (time: string, plain: string): string => {
  return `${time} ${plain.trim()}`;
};
