import React from 'react';
import { CalendarDays, CalendarOff } from 'lucide-react';
import { useI18n } from '../../i18n';
import { replaceOptionalStartDate, toOptionalDateInputValue } from '../../optional-start-date';

export const StartDateModeButton: React.FC<{
  unknown: boolean;
  onChange: (unknown: boolean) => void;
}> = ({ unknown, onChange }) => {
  const { t } = useI18n();
  return (
    <button
      type="button"
      aria-pressed={unknown}
      aria-label={unknown ? t('Start date is not set') : t('Start date is today')}
      title={unknown ? t('Start date is not set') : t('Start date is today')}
      onClick={() => onChange(!unknown)}
      className={`inline-flex h-11 flex-shrink-0 items-center gap-1 rounded-xl border px-2 text-xs font-semibold transition-colors ${
        unknown
          ? 'border-brand-200 bg-brand-50 text-brand-700'
          : 'border-slate-200 bg-white text-slate-500 hover:bg-slate-50'
      }`}
    >
      {unknown ? <CalendarOff className="h-4 w-4" /> : <CalendarDays className="h-4 w-4" />}
      <span>{unknown ? t('No date') : t('Today')}</span>
    </button>
  );
};

export const OptionalStartDateField: React.FC<{
  value: string | null;
  label: string;
  ariaLabel: string;
  max: string;
  onChange: (value: string | null) => void;
}> = ({ value, label, ariaLabel, max, onChange }) => {
  const { t } = useI18n();
  return (
    <div className="flex flex-wrap items-center gap-1">
      <label className="flex items-center gap-1">
        <span>{value ? label : t('Start date not specified')}</span>
        <input
          type="date"
          value={toOptionalDateInputValue(value)}
          max={max}
          onChange={event => onChange(replaceOptionalStartDate(value, event.target.value))}
          aria-label={ariaLabel}
          className="rounded-lg border border-line bg-white px-1 py-0.5 text-[11px] text-slate-600 outline-none focus:border-brand-400"
        />
      </label>
      {value && (
        <button
          type="button"
          onClick={() => onChange(null)}
          className="rounded p-1 text-slate-400 transition-colors hover:bg-slate-100 hover:text-brand-700"
          title={t('Remove start date')}
          aria-label={t('Remove start date')}
        >
          <CalendarOff className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
};
