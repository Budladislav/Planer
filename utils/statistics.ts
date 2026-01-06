import { Task } from '../types';
import { getTodayString, getWeekString } from '../utils';

export interface Stats {
  totalTasks: number;
  completedTasks: number;
  todoTasks: number;
  totalTimeSpent: number; // in seconds
  frogsPlanned: number;
  frogsCompleted: number;
}

export interface PeriodStats extends Stats {
  period: string; // e.g., "2024-01-15", "2024-W03", "2024-01", "2024"
}

export interface DailyStats {
  date: string; // YYYY-MM-DD or week string
  completedTasks: number;
  totalTimeSpent: number;
  frogsCompleted: number;
}

/**
 * Get statistics for today
 */
export const getTodayStats = (tasks: Task[]): Stats => {
  const today = getTodayString();
  
  const todayTasks = tasks.filter(t => {
    // Tasks planned for today or completed today
    return (t.plan.day === today) || 
           (t.status === 'done' && t.updatedAt.startsWith(today));
  });

  const completed = todayTasks.filter(t => t.status === 'done');
  const frogs = todayTasks.filter(t => t.frog);
  const frogsCompleted = completed.filter(t => t.frog);

  return {
    totalTasks: todayTasks.length,
    completedTasks: completed.length,
    todoTasks: todayTasks.length - completed.length,
    totalTimeSpent: completed.reduce((sum, t) => sum + (t.timeSpent || 0), 0),
    frogsPlanned: frogs.length,
    frogsCompleted: frogsCompleted.length,
  };
};

/**
 * Get statistics for current week
 */
export const getWeekStats = (tasks: Task[]): Stats => {
  const currentWeek = getWeekString();
  const today = getTodayString();
  
  // Calculate week dates (Mon-Sun)
  const [yearStr, weekNumStr] = currentWeek.split('-W');
  const year = parseInt(yearStr, 10);
  const weekNum = parseInt(weekNumStr, 10);
  
  const jan4 = new Date(Date.UTC(year, 0, 4));
  const jan4Day = jan4.getUTCDay() || 7;
  const firstMonday = new Date(jan4);
  firstMonday.setUTCDate(jan4.getUTCDate() - (jan4Day - 1));
  
  const weekStart = new Date(firstMonday);
  weekStart.setUTCDate(firstMonday.getUTCDate() + (weekNum - 1) * 7);
  
  const weekDates: string[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(weekStart);
    d.setUTCDate(weekStart.getUTCDate() + i);
    weekDates.push(d.toISOString().split('T')[0]);
  }

  const weekTasks = tasks.filter(t => {
    // Tasks planned for this week or completed this week
    return (t.plan.week === currentWeek) ||
           (t.plan.day && weekDates.includes(t.plan.day)) ||
           (t.status === 'done' && weekDates.some(date => t.updatedAt.startsWith(date)));
  });

  const completed = weekTasks.filter(t => t.status === 'done');
  const frogs = weekTasks.filter(t => t.frog);
  const frogsCompleted = completed.filter(t => t.frog);

  return {
    totalTasks: weekTasks.length,
    completedTasks: completed.length,
    todoTasks: weekTasks.length - completed.length,
    totalTimeSpent: completed.reduce((sum, t) => sum + (t.timeSpent || 0), 0),
    frogsPlanned: frogs.length,
    frogsCompleted: frogsCompleted.length,
  };
};

/**
 * Get statistics for current month
 */
export const getMonthStats = (tasks: Task[]): Stats => {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const monthStr = `${year}-${String(month + 1).padStart(2, '0')}`;

  const monthTasks = tasks.filter(t => {
    // Tasks planned for this month or completed this month
    const planDate = t.plan.day ? new Date(t.plan.day) : null;
    const updatedDate = t.status === 'done' ? new Date(t.updatedAt) : null;
    
    const planInMonth = planDate && 
      planDate.getFullYear() === year && 
      planDate.getMonth() === month;
    
    const completedInMonth = updatedDate && 
      updatedDate.getFullYear() === year && 
      updatedDate.getMonth() === month;
    
    return planInMonth || completedInMonth;
  });

  const completed = monthTasks.filter(t => t.status === 'done');
  const frogs = monthTasks.filter(t => t.frog);
  const frogsCompleted = completed.filter(t => t.frog);

  return {
    totalTasks: monthTasks.length,
    completedTasks: completed.length,
    todoTasks: monthTasks.length - completed.length,
    totalTimeSpent: completed.reduce((sum, t) => sum + (t.timeSpent || 0), 0),
    frogsPlanned: frogs.length,
    frogsCompleted: frogsCompleted.length,
  };
};

/**
 * Get statistics for current year
 */
export const getYearStats = (tasks: Task[]): Stats => {
  const now = new Date();
  const year = now.getFullYear();

  const yearTasks = tasks.filter(t => {
    // Tasks planned for this year or completed this year
    const planDate = t.plan.day ? new Date(t.plan.day) : null;
    const updatedDate = t.status === 'done' ? new Date(t.updatedAt) : null;
    
    const planInYear = planDate && planDate.getFullYear() === year;
    const completedInYear = updatedDate && updatedDate.getFullYear() === year;
    
    return planInYear || completedInYear;
  });

  const completed = yearTasks.filter(t => t.status === 'done');
  const frogs = yearTasks.filter(t => t.frog);
  const frogsCompleted = completed.filter(t => t.frog);

  return {
    totalTasks: yearTasks.length,
    completedTasks: completed.length,
    todoTasks: yearTasks.length - completed.length,
    totalTimeSpent: completed.reduce((sum, t) => sum + (t.timeSpent || 0), 0),
    frogsPlanned: frogs.length,
    frogsCompleted: frogsCompleted.length,
  };
};

/**
 * Get statistics for all time
 */
export const getAllTimeStats = (tasks: Task[]): Stats => {
  const completed = tasks.filter(t => t.status === 'done');
  const frogs = tasks.filter(t => t.frog);
  const frogsCompleted = completed.filter(t => t.frog);

  return {
    totalTasks: tasks.length,
    completedTasks: completed.length,
    todoTasks: tasks.length - completed.length,
    totalTimeSpent: completed.reduce((sum, t) => sum + (t.timeSpent || 0), 0),
    frogsPlanned: frogs.length,
    frogsCompleted: frogsCompleted.length,
  };
};

/**
 * Get daily statistics for the last N days
 */
export const getDailyStatsForPeriod = (tasks: Task[], days: number): DailyStats[] => {
  const result: DailyStats[] = [];
  const today = new Date();
  
  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(today.getDate() - i);
    const dateStr = date.toISOString().split('T')[0];
    
    const dayTasks = tasks.filter(t => 
      t.status === 'done' && t.updatedAt.startsWith(dateStr)
    );
    
    const frogsCompleted = dayTasks.filter(t => t.frog).length;
    const totalTimeSpent = dayTasks.reduce((sum, t) => sum + (t.timeSpent || 0), 0);
    
    result.push({
      date: dateStr,
      completedTasks: dayTasks.length,
      totalTimeSpent,
      frogsCompleted,
    });
  }
  
  return result;
};

/**
 * Get stats for current week by days (Mon-Sun)
 */
export const getCurrentWeekDailyStats = (tasks: Task[]): DailyStats[] => {
  const currentWeek = getWeekString();
  const [yearStr, weekNumStr] = currentWeek.split('-W');
  const year = parseInt(yearStr, 10);
  const weekNum = parseInt(weekNumStr, 10);
  
  const jan4 = new Date(Date.UTC(year, 0, 4));
  const jan4Day = jan4.getUTCDay() || 7;
  const firstMonday = new Date(jan4);
  firstMonday.setUTCDate(jan4.getUTCDate() - (jan4Day - 1));
  
  const weekStart = new Date(firstMonday);
  weekStart.setUTCDate(firstMonday.getUTCDate() + (weekNum - 1) * 7);
  
  const result: DailyStats[] = [];
  
  for (let i = 0; i < 7; i++) {
    const date = new Date(weekStart);
    date.setUTCDate(weekStart.getUTCDate() + i);
    const dateStr = date.toISOString().split('T')[0];
    
    const dayTasks = tasks.filter(t => 
      t.status === 'done' && t.updatedAt.startsWith(dateStr)
    );
    
    const frogsCompleted = dayTasks.filter(t => t.frog).length;
    const totalTimeSpent = dayTasks.reduce((sum, t) => sum + (t.timeSpent || 0), 0);
    
    result.push({
      date: dateStr,
      completedTasks: dayTasks.length,
      totalTimeSpent,
      frogsCompleted,
    });
  }
  
  return result;
};

/**
 * Get stats for current month by weeks
 */
export const getCurrentMonthWeeklyStats = (tasks: Task[]): DailyStats[] => {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  
  // Get first and last day of month
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  
  const result: DailyStats[] = [];
  const weekMap = new Map<string, { tasks: Task[]; weekStart: Date }>();
  
  // Group tasks by week
  for (let d = new Date(firstDay); d <= lastDay; d.setDate(d.getDate() + 1)) {
    const dateStr = d.toISOString().split('T')[0];
    const weekStr = getWeekString(dateStr);
    
    if (!weekMap.has(weekStr)) {
      weekMap.set(weekStr, { tasks: [], weekStart: new Date(d) });
    }
    
    const dayTasks = tasks.filter(t => 
      t.status === 'done' && t.updatedAt.startsWith(dateStr)
    );
    
    weekMap.get(weekStr)!.tasks.push(...dayTasks);
  }
  
  // Convert to stats
  weekMap.forEach((value, key) => {
    const frogsCompleted = value.tasks.filter(t => t.frog).length;
    const totalTimeSpent = value.tasks.reduce((sum, t) => sum + (t.timeSpent || 0), 0);
    
    result.push({
      date: key,
      completedTasks: value.tasks.length,
      totalTimeSpent,
      frogsCompleted,
    });
  });
  
  return result.sort((a, b) => a.date.localeCompare(b.date));
};

/**
 * Get stats for current year by months
 */
export const getCurrentYearMonthlyStats = (tasks: Task[]): DailyStats[] => {
  const now = new Date();
  const year = now.getFullYear();
  const result: DailyStats[] = [];
  
  for (let month = 0; month <= now.getMonth(); month++) {
    const monthStr = `${year}-${String(month + 1).padStart(2, '0')}`;
    
    const monthTasks = tasks.filter(t => {
      if (t.status !== 'done') return false;
      const updatedDate = new Date(t.updatedAt);
      return updatedDate.getFullYear() === year && updatedDate.getMonth() === month;
    });
    
    const frogsCompleted = monthTasks.filter(t => t.frog).length;
    const totalTimeSpent = monthTasks.reduce((sum, t) => sum + (t.timeSpent || 0), 0);
    
    result.push({
      date: monthStr,
      completedTasks: monthTasks.length,
      totalTimeSpent,
      frogsCompleted,
    });
  }
  
  return result;
};

/**
 * Get stats for all time by years
 */
export const getAllTimeYearlyStats = (tasks: Task[]): DailyStats[] => {
  const result: DailyStats[] = [];
  const yearMap = new Map<string, Task[]>();
  
  // Group completed tasks by year
  tasks.filter(t => t.status === 'done').forEach(t => {
    const year = new Date(t.updatedAt).getFullYear().toString();
    if (!yearMap.has(year)) {
      yearMap.set(year, []);
    }
    yearMap.get(year)!.push(t);
  });
  
  // Convert to stats
  const sortedYears = Array.from(yearMap.keys()).sort();
  sortedYears.forEach(year => {
    const yearTasks = yearMap.get(year)!;
    const frogsCompleted = yearTasks.filter(t => t.frog).length;
    const totalTimeSpent = yearTasks.reduce((sum, t) => sum + (t.timeSpent || 0), 0);
    
    result.push({
      date: year,
      completedTasks: yearTasks.length,
      totalTimeSpent,
      frogsCompleted,
    });
  });
  
  return result;
};

/**
 * Get weekly statistics for the last N weeks
 */
export const getWeeklyStatsForPeriod = (tasks: Task[], weeks: number): DailyStats[] => {
  const result: DailyStats[] = [];
  const today = new Date();
  
  for (let i = weeks - 1; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(today.getDate() - (i * 7));
    const weekStr = getWeekString(date.toISOString().split('T')[0]);
    
    // Calculate week dates
    const [yearStr, weekNumStr] = weekStr.split('-W');
    const year = parseInt(yearStr, 10);
    const weekNum = parseInt(weekNumStr, 10);
    
    const jan4 = new Date(Date.UTC(year, 0, 4));
    const jan4Day = jan4.getUTCDay() || 7;
    const firstMonday = new Date(jan4);
    firstMonday.setUTCDate(jan4.getUTCDate() - (jan4Day - 1));
    
    const weekStart = new Date(firstMonday);
    weekStart.setUTCDate(firstMonday.getUTCDate() + (weekNum - 1) * 7);
    
    const weekDates: string[] = [];
    for (let j = 0; j < 7; j++) {
      const d = new Date(weekStart);
      d.setUTCDate(weekStart.getUTCDate() + j);
      weekDates.push(d.toISOString().split('T')[0]);
    }
    
    const weekTasks = tasks.filter(t => 
      t.status === 'done' && weekDates.some(d => t.updatedAt.startsWith(d))
    );
    
    const frogsCompleted = weekTasks.filter(t => t.frog).length;
    const totalTimeSpent = weekTasks.reduce((sum, t) => sum + (t.timeSpent || 0), 0);
    
    result.push({
      date: weekStr,
      completedTasks: weekTasks.length,
      totalTimeSpent,
      frogsCompleted,
    });
  }
  
  return result;
};
