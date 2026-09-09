import React, { useState } from 'react';
import { BriefcaseBusiness, CalendarRange, ChevronDown } from 'lucide-react';
import { useI18n } from '../../i18n';
import { useAppStore } from '../../store';
import { SettingsCard } from './SettingsRows';
import { WorkShiftSettingsPanel } from './WorkShiftSettings';

export const CalendarSettings: React.FC = () => {
  const { state, dispatch } = useAppStore();
  const { t } = useI18n();
  const [showWorkShifts, setShowWorkShifts] = useState(false);

  return (
    <SettingsCard>
      <div>
        <button
          type="button"
          aria-expanded={showWorkShifts}
          onClick={() => setShowWorkShifts(value => !value)}
          className="settings-row"
        >
          <BriefcaseBusiness className="h-5 w-5 flex-shrink-0 text-brand-500" />
          <div className="min-w-0 flex-1">
            <h3 className="font-semibold text-slate-800">{t('Work Shifts')}</h3>
            <p className="text-sm text-slate-500">{t('Alternating weekly schedule and exceptions.')}</p>
          </div>
          <ChevronDown className={`h-5 w-5 text-slate-400 transition-transform ${showWorkShifts ? 'rotate-180' : ''}`} />
        </button>
        {showWorkShifts && (
          <div className="border-t border-slate-100 px-4 pb-4 pt-3 sm:px-6 sm:pb-6">
            <WorkShiftSettingsPanel />
          </div>
        )}
      </div>

      <label className="settings-row cursor-pointer">
        <CalendarRange className="h-5 w-5 flex-shrink-0 text-brand-500" />
        <div className="min-w-0 flex-1">
          <h3 className="font-semibold text-slate-800">{t('Day note highlighting')}</h3>
          <p className="text-sm text-slate-500">{t('Subtly tint calendar days that contain notes.')}</p>
        </div>
        <input
          type="checkbox"
          checked={state.uiPreferences.calendarNoteHighlight}
          onChange={event => dispatch({ type: 'UPDATE_UI_PREFERENCES', payload: { calendarNoteHighlight: event.target.checked } })}
          className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
        />
      </label>
    </SettingsCard>
  );
};
