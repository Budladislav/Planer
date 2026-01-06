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

