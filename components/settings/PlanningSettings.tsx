import React from 'react';
import { CalendarDays, CalendarRange, CopyPlus, Flag, Inbox } from 'lucide-react';
import { useI18n } from '../../i18n';
import type { ViewState } from '../../types';
import { SettingsCard, SettingsLinkRow } from './SettingsRows';

export const PlanningSettings: React.FC<{ navigate: (view: ViewState) => void }> = ({ navigate }) => {
  const { t } = useI18n();
  return (
    <SettingsCard>
      <SettingsLinkRow icon={Inbox} title={t('I wish')} description={t('Open your wishes and ideas.')} onClick={() => navigate('inbox')} />
      <SettingsLinkRow icon={CalendarDays} title={t('Month')} description={t('Open the month planning horizon.')} onClick={() => navigate('month')} />
      <SettingsLinkRow icon={CalendarRange} title={t('Year')} description={t('Open the year planning horizon.')} onClick={() => navigate('year')} />
      <SettingsLinkRow icon={CopyPlus} title={t('Weekly template')} description={t('Build a reusable week skeleton and add it to a selected week.')} onClick={() => navigate('weekly-template')} />
      <SettingsLinkRow
        icon={Flag}
        title={t('Long-term goals')}
        description={t('Track ambitious outcomes, context and next steps.')}
        onClick={() => navigate('goals')}
      />
    </SettingsCard>
  );
};
