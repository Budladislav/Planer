export const generateId = (): string => {
  return Math.random().toString(36).substring(2, 9);
};

export const getTodayString = (): string => {
  const d = new Date();
  return d.toISOString().split('T')[0];
};

export const getWeekString = (dateString?: string): string => {
  const date = dateString ? new Date(dateString) : new Date();
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  return `${d.getUTCFullYear()}-W${weekNo.toString().padStart(2, '0')}`;
};

export const formatDateReadable = (dateStr: string): string => {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
};

export const formatDateShort = (dateStr: string): string => {
  const date = new Date(dateStr);
  const day = date.getDate().toString().padStart(2, '0');
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const year = date.getFullYear();
  return `${day}.${month}.${year}`;
};

export const getWeekRange = (weekStr: string) => {
  // Simple parser for YYYY-Www display
  return `Week ${weekStr.split('-W')[1]}, ${weekStr.split('-W')[0]}`;
};

export const getWeekDateRange = (weekStr: string): { start: string; end: string } => {
  // Parse YYYY-Www format
  const [yearStr, weekNumStr] = weekStr.split('-W');
  const year = parseInt(yearStr);
  const weekNum = parseInt(weekNumStr);
  
  // Calculate the first day of the ISO week (Monday)
  // ISO week 1 is the week containing the first Thursday of the year
  const jan4 = new Date(year, 0, 4);
  const jan4Day = jan4.getDay() || 7; // Convert Sunday (0) to 7
  const daysToMonday = jan4Day - 1; // Days to subtract to get to Monday
  const firstMonday = new Date(jan4);
  firstMonday.setDate(jan4.getDate() - daysToMonday);
  
  // Calculate the start date of the requested week
  const weekStart = new Date(firstMonday);
  weekStart.setDate(firstMonday.getDate() + (weekNum - 1) * 7);
  
  // Calculate the end date (Sunday)
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);
  
  // Format as DD.MM
  const formatDate = (date: Date): string => {
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    return `${day}.${month}`;
  };
  
  return {
    start: formatDate(weekStart),
    end: formatDate(weekEnd),
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