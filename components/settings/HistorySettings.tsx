import React from 'react';
import { CheckSquare, FileText } from 'lucide-react';
import { useI18n } from '../../i18n';
import type { ViewState } from '../../types';
import { SettingsCard, SettingsLinkRow } from './SettingsRows';

export const HistorySettings: React.FC<{ navigate: (view: ViewState) => void }> = ({ navigate }) => {
  const { t } = useI18n();
  return (
    <SettingsCard>
      <SettingsLinkRow icon={CheckSquare} title={t('Completed Tasks')} description={t('Browse and manage task history.')} onClick={() => navigate('done')} />
      <SettingsLinkRow icon={FileText} title={t('Progress Reports')} description={t('Export completed tasks, realized wishes and long-term goals.')} onClick={() => navigate('reports')} />
    </SettingsCard>
  );
};
