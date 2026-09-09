import React from 'react';
import { Languages } from 'lucide-react';
import { useI18n } from '../../i18n';
import { useAppStore } from '../../store';
import { SettingsCard } from './SettingsRows';

export const InterfaceSettings: React.FC = () => {
  const { dispatch } = useAppStore();
  const { language, t } = useI18n();
  return (
    <SettingsCard>
      <label className="settings-row cursor-pointer">
        <Languages className="h-5 w-5 flex-shrink-0 text-brand-500" />
        <div className="min-w-0 flex-1">
          <h3 className="font-semibold text-slate-800">{t('Language')}</h3>
          <p className="text-sm text-slate-500">{t('App language and generated report language.')}</p>
        </div>
        <select
          value={language}
          onChange={event => dispatch({ type: 'UPDATE_UI_PREFERENCES', payload: { language: event.target.value === 'en' ? 'en' : 'ru' } })}
          className="field-compact"
          aria-label={t('Language')}
        >
          <option value="ru">{t('Russian')}</option>
          <option value="en">{t('English')}</option>
        </select>
      </label>
    </SettingsCard>
  );
};
