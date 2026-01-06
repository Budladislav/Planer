import React, { useState, useMemo } from 'react';
import { useAppStore } from '../../store';
import { getTodayStats, getWeekStats, getMonthStats, getYearStats, getAllTimeStats, Stats, getDailyStatsForPeriod, getCurrentWeekDailyStats, getCurrentMonthWeeklyStats, getCurrentYearMonthlyStats, getAllTimeYearlyStats } from '../../utils/statistics';
import { formatTime } from '../../utils';
import { BarChart3, TrendingUp, Clock, CheckCircle, Circle } from 'lucide-react';
import { BarChart, BarChartData } from '../charts/BarChart';

type PeriodFilter = 'today' | 'week' | 'month' | 'year' | 'all';
type ChartType = 'tasks' | 'time';

export const StatisticsView: React.FC = () => {
  const { state } = useAppStore();
  const [periodFilter, setPeriodFilter] = useState<PeriodFilter>('today');
  const [chartType, setChartType] = useState<ChartType>('tasks');

  const stats: Stats = useMemo(() => {
    switch (periodFilter) {
      case 'today':
        return getTodayStats(state.tasks);
      case 'week':
        return getWeekStats(state.tasks);
      case 'month':
        return getMonthStats(state.tasks);
      case 'year':
        return getYearStats(state.tasks);
      case 'all':
        return getAllTimeStats(state.tasks);
      default:
        return getTodayStats(state.tasks);
    }
  }, [state.tasks, periodFilter]);

  // Chart data based on period and type
  const chartData: BarChartData[] = useMemo(() => {
    let data;
    const getValue = (item: { completedTasks: number; totalTimeSpent: number }) => 
      chartType === 'tasks' ? item.completedTasks : Math.round(item.totalTimeSpent / 60); // Convert to minutes
    
    switch (periodFilter) {
      case 'today':
        // For today, show last 7 days for context
        data = getDailyStatsForPeriod(state.tasks, 7);
        return data.map(d => ({
          label: new Date(d.date).toLocaleDateString('en-US', { weekday: 'short' }),
          value: getValue(d),
          color: '#10b981',
        }));
      
      case 'week':
        // Current week: Mon-Sun of current week
        data = getCurrentWeekDailyStats(state.tasks);
        return data.map(d => ({
          label: new Date(d.date).toLocaleDateString('en-US', { weekday: 'short' }),
          value: getValue(d),
          color: '#6366f1',
        }));
      
      case 'month':
        // Current month: show by weeks
        data = getCurrentMonthWeeklyStats(state.tasks);
        return data.map((d, i) => ({
          label: `W${i + 1}`,
          value: getValue(d),
          color: '#8b5cf6',
        }));
      
      case 'year':
        // Current year: by months
        data = getCurrentYearMonthlyStats(state.tasks);
        return data.map(d => {
          const month = d.date.split('-')[1];
          const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
          return {
            label: monthNames[parseInt(month, 10) - 1],
            value: getValue(d),
            color: '#ec4899',
          };
        });
      
      case 'all':
        // All time: by years
        data = getAllTimeYearlyStats(state.tasks);
        return data.map(d => ({
          label: d.date,
          value: getValue(d),
          color: '#f59e0b',
        }));
      
      default:
        return [];
    }
  }, [state.tasks, periodFilter, chartType]);

  const completionRate = stats.totalTasks > 0 
    ? Math.round((stats.completedTasks / stats.totalTasks) * 100) 
    : 0;

  const frogsRate = stats.frogsPlanned > 0
    ? Math.round((stats.frogsCompleted / stats.frogsPlanned) * 100)
    : 0;

  const StatCard: React.FC<{ title: string; value: string | number; icon: React.ReactNode; color?: string }> = ({ 
    title, 
    value, 
    icon,
    color = 'indigo'
  }) => {
    const colorClasses = {
      indigo: 'bg-indigo-50 text-indigo-700 border-indigo-200',
      green: 'bg-green-50 text-green-700 border-green-200',
      blue: 'bg-blue-50 text-blue-700 border-blue-200',
      purple: 'bg-purple-50 text-purple-700 border-purple-200',
    };

    return (
      <div className={`p-4 border rounded-lg ${colorClasses[color as keyof typeof colorClasses] || colorClasses.indigo}`}>
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold uppercase text-slate-600">{title}</span>
          {icon}
        </div>
        <div className="text-2xl font-bold">{value}</div>
      </div>
    );
  };

  return (
    <div className="max-w-3xl mx-auto">
      {/* Header */}
      <div className="text-center mb-6">
        <h2 className="text-3xl font-bold text-slate-900">Statistics</h2>
        <p className="text-slate-500 text-sm mt-1">Track your productivity</p>
      </div>

      {/* Period Filter */}
      <div className="mb-6">
        <div className="flex gap-2 overflow-x-auto pb-2">
          {(['today', 'week', 'month', 'year', 'all'] as PeriodFilter[]).map((period) => (
            <button
              key={period}
              onClick={() => setPeriodFilter(period)}
              className={`px-3 py-2 text-sm font-semibold rounded-lg border whitespace-nowrap transition-colors ${
                periodFilter === period
                  ? 'bg-indigo-600 text-white border-indigo-600'
                  : 'bg-white text-slate-600 border-slate-200 hover:border-indigo-300'
              }`}
            >
              {period === 'today' ? 'Today' :
               period === 'week' ? 'Week' :
               period === 'month' ? 'Month' :
               period === 'year' ? 'Year' :
               'All Time'}
            </button>
          ))}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        <StatCard
          title="Total Tasks"
          value={stats.totalTasks}
          icon={<Circle className="w-5 h-5" />}
          color="blue"
        />
        <StatCard
          title="Completed"
          value={stats.completedTasks}
          icon={<CheckCircle className="w-5 h-5" />}
          color="green"
        />
        <StatCard
          title="Time Spent"
          value={formatTime(stats.totalTimeSpent)}
          icon={<Clock className="w-5 h-5" />}
          color="purple"
        />
        <StatCard
          title="Completion Rate"
          value={`${completionRate}%`}
          icon={<TrendingUp className="w-5 h-5" />}
          color="indigo"
        />
      </div>

      {/* Frogs Section */}
      <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-2xl">🐸</span>
          <h3 className="text-lg font-bold text-green-900">Eat the Frog</h3>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <div className="text-xs text-green-700 font-semibold uppercase mb-1">Planned</div>
            <div className="text-2xl font-bold text-green-900">{stats.frogsPlanned}</div>
          </div>
          <div>
            <div className="text-xs text-green-700 font-semibold uppercase mb-1">Completed</div>
            <div className="text-2xl font-bold text-green-900">{stats.frogsCompleted}</div>
            {stats.frogsPlanned > 0 && (
              <div className="text-xs text-green-600 mt-1">{frogsRate}% completion</div>
            )}
          </div>
        </div>
      </div>

      {/* Additional Info */}
      <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg">
        <div className="text-sm text-slate-600 space-y-1">
          <div className="flex justify-between">
            <span>Tasks in progress:</span>
            <span className="font-semibold">{stats.todoTasks}</span>
          </div>
          {stats.totalTasks > 0 && (
            <div className="flex justify-between">
              <span>Average time per task:</span>
              <span className="font-semibold">
                {stats.completedTasks > 0 
                  ? formatTime(Math.round(stats.totalTimeSpent / stats.completedTasks))
                  : '—'}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Chart */}
      {chartData.length > 0 && (
        <div className="mt-4 p-3 bg-white border border-slate-200 rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-indigo-600" />
              {chartType === 'tasks' ? 'Completed Tasks' : 'Time Spent'}
            </h3>
            <div className="flex gap-1 text-xs">
              <button
                onClick={() => setChartType('tasks')}
                className={`px-2 py-1 rounded transition-colors ${
                  chartType === 'tasks'
                    ? 'bg-indigo-600 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                Tasks
              </button>
              <button
                onClick={() => setChartType('time')}
                className={`px-2 py-1 rounded transition-colors ${
                  chartType === 'time'
                    ? 'bg-indigo-600 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                Time
              </button>
            </div>
          </div>
          <BarChart 
            data={chartData} 
            height={150} 
            showValues={true}
            valueFormatter={chartType === 'time' ? (v) => `${v}m` : undefined}
          />
        </div>
      )}
    </div>
  );
};

