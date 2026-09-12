import React, { useState } from 'react';
import { Download, FileText } from 'lucide-react';
import {
  buildProgressReport,
  getReportDateRange,
  ReportPeriod,
} from '../../completed-report';
import { useAppStore } from '../../store';
import { getTodayString, getWeekString } from '../../utils';
import { useI18n } from '../../i18n';
import { useRewardsLabGate } from '../../features/rewards-lab/ui/useRewardsLabGate';

export const ReportsView: React.FC = () => {
  const { state } = useAppStore();
  const { t } = useI18n();
  const rewardsGate = useRewardsLabGate();
  const today = getTodayString();
  const [reportType, setReportType] = useState<ReportPeriod['type']>('week');
  const [reportWeek, setReportWeek] = useState(getWeekString());
  const [reportMonth, setReportMonth] = useState(today.slice(0, 7));
  const [customStart, setCustomStart] = useState(today);
  const [customEnd, setCustomEnd] = useState(today);
  const [downloadStatus, setDownloadStatus] = useState<'idle' | 'preparing' | 'started' | 'failed'>('idle');
  const [includeRewards, setIncludeRewards] = useState(false);

  const handleDownloadReport = async () => {
    const period: ReportPeriod = reportType === 'week'
      ? { type: 'week', value: reportWeek }
      : reportType === 'month'
        ? { type: 'month', value: reportMonth }
        : { type: 'custom', start: customStart, end: customEnd };
    const range = getReportDateRange(period);
    if (!range) return;

    setDownloadStatus('preparing');
    let rewards = null;
    if (includeRewards && rewardsGate.enabled) {
      try {
        const [{ getRewardsLabRuntime }, { buildRewardsReportData }] = await Promise.all([
          import('../../features/rewards-lab/runtime'),
          import('../../features/rewards-lab/report'),
        ]);
        const rewardsState = getRewardsLabRuntime().getSnapshot().state;
        if (!rewardsState) throw new Error('Rewards state is unavailable.');
        rewards = buildRewardsReportData(rewardsState, range);
      } catch {
        setDownloadStatus('failed');
        return;
      }
    }
    const report = buildProgressReport(
      state.tasks,
      state.captures,
      state.goals,
      range,
      state.uiPreferences.language,
      new Date(),
      rewards,
    );
    const blob = new Blob(['\uFEFF', report], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `takt_progress_${range.start}_${range.end}.txt`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    setDownloadStatus('started');
    window.setTimeout(() => URL.revokeObjectURL(url), 100);
  };

  return (
    <div className="page-container">
      <section className="section-card p-4">
        <div className="flex flex-wrap items-center gap-2">
          <span className="mr-auto flex items-center gap-2 text-sm font-semibold text-slate-700">
            <FileText className="h-4 w-4 text-brand-500" aria-hidden="true" />
            {t('Report period')}
          </span>
          {(['week', 'month', 'custom'] as const).map(type => (
            <button
              key={type}
              type="button"
              onClick={() => setReportType(type)}
              className={`rounded px-2.5 py-1.5 text-xs font-semibold ${
                reportType === type
                  ? 'bg-brand-600 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {type === 'week' ? t('Week') : type === 'month' ? t('Month') : t('Custom')}
            </button>
          ))}
        </div>

        <label className={`mt-4 flex items-start gap-3 rounded-xl border px-3 py-2.5 ${rewardsGate.enabled ? 'cursor-pointer border-brand-100 bg-brand-50/50' : 'border-slate-200 bg-slate-50 opacity-65'}`}>
          <input
            type="checkbox"
            checked={includeRewards}
            onChange={event => setIncludeRewards(event.target.checked)}
            disabled={!rewardsGate.enabled}
            className="mt-0.5 h-4 w-4 rounded"
          />
          <span>
            <span className="block text-sm font-semibold text-slate-700">{t('Include Rewards data')}</span>
            <span className="block text-xs leading-relaxed text-slate-500">
              {rewardsGate.enabled
                ? t('Add task credits, found keys, redeemed rewards and purchases for the selected period.')
                : t('Enable Rewards to include its data in the report.')}
            </span>
          </span>
        </label>

        <div className="mt-4 flex flex-wrap items-end gap-3">
          {reportType === 'week' && (
            <label className="text-xs font-medium text-slate-500">
              {t('Week')}
              <input
                type="week"
                value={reportWeek}
                onChange={event => setReportWeek(event.target.value)}
                className="field-compact mt-1 block"
              />
            </label>
          )}
          {reportType === 'month' && (
            <label className="text-xs font-medium text-slate-500">
              {t('Month')}
              <input
                type="month"
                value={reportMonth}
                onChange={event => setReportMonth(event.target.value)}
                className="field-compact mt-1 block"
              />
            </label>
          )}
          {reportType === 'custom' && (
            <>
              <label className="text-xs font-medium text-slate-500">
                {t('From')}
                <input
                  type="date"
                  value={customStart}
                  onChange={event => setCustomStart(event.target.value)}
                  className="field-compact mt-1 block"
                />
              </label>
              <label className="text-xs font-medium text-slate-500">
                {t('To')}
                <input
                  type="date"
                  value={customEnd}
                  onChange={event => setCustomEnd(event.target.value)}
                  className="field-compact mt-1 block"
                />
              </label>
            </>
          )}
          <button
            type="button"
            onClick={() => void handleDownloadReport()}
            disabled={downloadStatus === 'preparing'}
            className="button-primary ml-auto"
          >
            <Download className="h-4 w-4" /> {t('Download TXT')}
          </button>
        </div>

        <p className="mt-2 min-h-5 text-right text-xs font-medium text-brand-600" aria-live="polite">
          {downloadStatus === 'preparing' && t('Preparing the report…')}
          {downloadStatus === 'started' && t('Download started. Check your browser downloads.')}
          {downloadStatus === 'failed' && t('Rewards data is unavailable. The report was not downloaded.')}
        </p>

        <p className="mt-4 border-t border-slate-100 pt-3 text-xs leading-relaxed text-slate-500">
          {t('The report keeps tasks, realized wishes and long-term goals in separate sections. Start dates and elapsed time are included only when the start is known.')}
        </p>
      </section>
    </div>
  );
};
