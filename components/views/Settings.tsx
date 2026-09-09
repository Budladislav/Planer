import React, { useState } from 'react';
import {
  CalendarClock,
  ChevronLeft,
  ChevronRight,
  Database,
  Gift,
  History,
  Info,
  ListChecks,
  Palette,
  type LucideIcon,
} from 'lucide-react';
import { useI18n } from '../../i18n';
import { useAppStore } from '../../store';
import type { ViewState } from '../../types';
import { AboutSettings } from '../settings/AboutSettings';
import { CalendarSettings } from '../settings/CalendarSettings';
import { DataSettings } from '../settings/DataSettings';
import { HistorySettings } from '../settings/HistorySettings';
import { InterfaceSettings } from '../settings/InterfaceSettings';
import { PlanningSettings } from '../settings/PlanningSettings';
import { RewardsSettings } from '../settings/RewardsSettings';

export type SettingsSectionId = 'planning' | 'history' | 'calendar' | 'rewards' | 'interface' | 'data' | 'about';

interface SettingsSectionDefinition {
  id: SettingsSectionId;
  icon: LucideIcon;
  title: string;
  description: string;
}

export const SettingsView: React.FC = () => {
  const { dispatch } = useAppStore();
  const { t } = useI18n();
  const [activeSection, setActiveSection] = useState<SettingsSectionId | null>(null);

  const sections: SettingsSectionDefinition[] = [
    { id: 'planning', icon: ListChecks, title: t('Planning'), description: t('Planning horizons, wishes, goals and templates.') },
    { id: 'history', icon: History, title: t('History and reports'), description: t('Completed work and exportable progress.') },
    { id: 'calendar', icon: CalendarClock, title: t('Calendar and schedule'), description: t('Work shifts and calendar presentation.') },
    { id: 'rewards', icon: Gift, title: t('Rewards'), description: t('Optional task grades and personal rewards.') },
    { id: 'interface', icon: Palette, title: t('Interface'), description: t('Language and visual preferences.') },
    { id: 'data', icon: Database, title: t('Data and privacy'), description: t('Backup, restore and local data controls.') },
    { id: 'about', icon: Info, title: t('About Takt'), description: t('Version, changelog and application identity.') },
  ];
  const selectedId = activeSection ?? 'planning';
  const selected = sections.find(section => section.id === selectedId) ?? sections[0];
  const navigate = (view: ViewState) => dispatch({ type: 'SET_VIEW', payload: view });

  const content = (() => {
    switch (selectedId) {
      case 'planning': return <PlanningSettings navigate={navigate} />;
      case 'history': return <HistorySettings navigate={navigate} />;
      case 'calendar': return <CalendarSettings />;
      case 'rewards': return <RewardsSettings />;
      case 'interface': return <InterfaceSettings />;
      case 'data': return <DataSettings />;
      case 'about': return <AboutSettings />;
    }
  })();

  return (
    <div className="mx-auto max-w-5xl pb-8">
      <div className="grid items-start gap-5 lg:grid-cols-[280px_minmax(0,1fr)]">
        <nav className={`${activeSection ? 'hidden lg:block' : 'block'} surface-card overflow-hidden lg:sticky lg:top-1`} aria-label={t('Settings sections')}>
          <div className="divide-y divide-line">
            {sections.map(section => {
              const Icon = section.icon;
              const active = section.id === selectedId;
              return (
                <button
                  key={section.id}
                  type="button"
                  onClick={() => setActiveSection(section.id)}
                  className={`group flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors ${active ? 'lg:bg-brand-50' : 'hover:bg-slate-50'}`}
                  aria-current={activeSection && active ? 'page' : undefined}
                >
                  <span className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl ${active ? 'bg-brand-100 text-brand-700' : 'bg-slate-100 text-slate-500 group-hover:text-slate-700'}`}>
                    <Icon className="h-[18px] w-[18px]" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold text-slate-800">{section.title}</span>
                    <span className="mt-0.5 block text-xs leading-snug text-slate-500">{section.description}</span>
                  </span>
                  <ChevronRight className="h-4 w-4 flex-shrink-0 text-slate-300 lg:hidden" />
                  {active && <span className="hidden h-1.5 w-1.5 rounded-full bg-brand-500 lg:block" aria-hidden="true" />}
                </button>
              );
            })}
          </div>
        </nav>

        <section className={`${activeSection ? 'block' : 'hidden lg:block'} min-w-0`} data-settings-section={selectedId}>
          <div className="mb-3 flex items-center gap-2 lg:mb-4">
            <button
              type="button"
              className="icon-button-compact lg:hidden"
              onClick={() => setActiveSection(null)}
              aria-label={t('Back to settings sections')}
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <div className="min-w-0">
              <h2 className="font-semibold text-slate-800">{selected.title}</h2>
              <p className="text-xs text-slate-500">{selected.description}</p>
            </div>
          </div>
          {content}
        </section>
      </div>
    </div>
  );
};
