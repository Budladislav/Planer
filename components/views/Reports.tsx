import React, { useState } from 'react';
import { Download, FileText } from 'lucide-react';
import {
  buildProgressReport,
  getReportDateRange,
  ReportPeriod,
} from '../../completed-report';
import { useAppStore } from '../../store';
import { getTodayString, getWeekString } from '../../utils';

export const ReportsView: React.FC = () => {
  const { state } = useAppStore();
  const today = getTodayString();
  const [reportType, setReportType] = useState<ReportPeriod['type']>('week');
  const [reportWeek, setReportWeek] = useState(getWeekString());
  const [reportMonth, setReportMonth] = useState(today.slice(0, 7));
  const [customStart, setCustomStart] = useState(today);
  const [customEnd, setCustomEnd] = useState(today);

  const handleDownloadReport = () => {
    const period: ReportPeriod = reportType === 'week'
      ? { type: 'week', value: reportWeek }
      : reportType === 'month'
        ? { type: 'month', value: reportMonth }
        : { type: 'custom', start: customStart, end: customEnd };
    const range = getReportDateRange(period);
    if (!range) return;

    const report = buildProgressReport(state.tasks, state.captures, range);
    const blob = new Blob(['\uFEFF', report], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `monofocus_progress_${range.start}_${range.end}.txt`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-4 text-center">
        <h2 className="text-3xl font-bold text-slate-900">Progress Reports</h2>
        <p className="text-slate-500">Completed tasks and realized Inbox ideas in one structured TXT file.</p>
      </div>

      <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-center gap-2">
          <span className="mr-auto flex items-center gap-2 text-sm font-semibold text-slate-700">
            <FileText className="h-4 w-4 text-indigo-500" aria-hidden="true" />
            Report period
          </span>
          {(['week', 'month', 'custom'] as const).map(type => (
            <button
              key={type}
              type="button"
              onClick={() => setReportType(type)}
              className={`rounded px-2.5 py-1.5 text-xs font-semibold ${
                reportType === type
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {type === 'week' ? 'Week' : type === 'month' ? 'Month' : 'Custom'}
            </button>
          ))}
        </div>

        <div className="mt-4 flex flex-wrap items-end gap-3">
          {reportType === 'week' && (
            <label className="text-xs font-medium text-slate-500">
              Week
              <input
                type="week"
                value={reportWeek}
                onChange={event => setReportWeek(event.target.value)}
                className="mt-1 block rounded border border-slate-300 px-2 py-1.5 text-sm text-slate-800"
              />
            </label>
          )}
          {reportType === 'month' && (
            <label className="text-xs font-medium text-slate-500">
              Month
              <input
                type="month"
                value={reportMonth}
                onChange={event => setReportMonth(event.target.value)}
                className="mt-1 block rounded border border-slate-300 px-2 py-1.5 text-sm text-slate-800"
              />
            </label>
          )}
          {reportType === 'custom' && (
            <>
              <label className="text-xs font-medium text-slate-500">
                From
                <input
                  type="date"
                  value={customStart}
                  onChange={event => setCustomStart(event.target.value)}
                  className="mt-1 block rounded border border-slate-300 px-2 py-1.5 text-sm text-slate-800"
                />
              </label>
              <label className="text-xs font-medium text-slate-500">
                To
                <input
                  type="date"
                  value={customEnd}
                  onChange={event => setCustomEnd(event.target.value)}
                  className="mt-1 block rounded border border-slate-300 px-2 py-1.5 text-sm text-slate-800"
                />
              </label>
            </>
          )}
          <button
            type="button"
            onClick={handleDownloadReport}
            className="ml-auto flex items-center gap-2 rounded bg-indigo-600 px-3 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
          >
            <Download className="h-4 w-4" /> Download TXT
          </button>
        </div>

        <p className="mt-4 border-t border-slate-100 pt-3 text-xs leading-relaxed text-slate-500">
          The report keeps completed tasks and realized Inbox ideas in separate sections. Inbox entries include creation date, realization date, and elapsed days.
        </p>
      </section>
    </div>
  );
};
