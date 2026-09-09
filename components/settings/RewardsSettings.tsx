import React from 'react';
import { RewardsLabSettingsRow } from '../../features/rewards-lab/ui/RewardsLabSettingsRow';
import { SettingsCard } from './SettingsRows';

export const RewardsSettings: React.FC = () => (
  <SettingsCard>
    <RewardsLabSettingsRow />
  </SettingsCard>
);
