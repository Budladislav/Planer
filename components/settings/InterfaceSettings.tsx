import React from 'react';
import { ArrowDown, ArrowUp, ChevronDown, Eye, EyeOff, Languages, Menu, PanelTopOpen, Settings, Smartphone } from 'lucide-react';
import { useI18n } from '../../i18n';
import { useAppStore } from '../../store';
import { SettingsCard } from './SettingsRows';
import { getMobileNavigationCapacity, PRIMARY_NAVIGATION_VIEWS } from '../../navigation';
import type { PrimaryNavigationView } from '../../types';

export const InterfaceSettings: React.FC = () => {
  const { state, dispatch } = useAppStore();
  const { language, t } = useI18n();
  const [viewportWidth, setViewportWidth] = React.useState(() => typeof window === 'undefined' ? 360 : window.innerWidth);

  React.useEffect(() => {
    const update = () => setViewportWidth(window.innerWidth);
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  const labels: Record<PrimaryNavigationView, string> = {
    today: t('Today'),
    week: t('Week'),
    month: t('Month'),
    year: t('Year'),
    inbox: t('I wish'),
    'weekly-template': t('Plans'),
    goals: t('Long-term goals'),
    events: t('Calendar'),
  };
  const selected = state.uiPreferences.navigationItems;
  const disabled = PRIMARY_NAVIGATION_VIEWS.filter(view => !selected.includes(view));
  const visibleCount = Math.max(0, getMobileNavigationCapacity(viewportWidth) - 1);
  const immediatelyVisible = selected.slice(0, visibleCount);
  const scrollable = selected.slice(visibleCount);

  const saveNavigation = (navigationItems: PrimaryNavigationView[]) => dispatch({
    type: 'UPDATE_UI_PREFERENCES', payload: { navigationItems },
  });

  const toggleNavigation = (view: PrimaryNavigationView) => {
    if (selected.includes(view)) {
      if (selected.length === 1) return;
      saveNavigation(selected.filter(item => item !== view));
    } else {
      saveNavigation([...selected, view]);
    }
  };

  const moveNavigation = (view: PrimaryNavigationView, delta: -1 | 1) => {
    const index = selected.indexOf(view);
    const target = index + delta;
    if (index < 0 || target < 0 || target >= selected.length) return;
    const next = [...selected];
    [next[index], next[target]] = [next[target], next[index]];
    saveNavigation(next);
  };

  return (
    <div className="space-y-4">
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

      <SettingsCard>
        <label className="settings-row cursor-pointer">
          <PanelTopOpen className="h-5 w-5 flex-shrink-0 text-brand-500" />
          <div className="min-w-0 flex-1">
            <h3 className="font-semibold text-slate-800">{t('Start page')}</h3>
            <p className="text-sm text-slate-500">{t('This section opens whenever Takt starts, even if it is hidden from the main menu.')}</p>
          </div>
          <select
            value={state.uiPreferences.startupView}
            onChange={event => dispatch({
              type: 'UPDATE_UI_PREFERENCES',
              payload: { startupView: event.target.value as PrimaryNavigationView },
            })}
            className="field-compact"
            aria-label={t('Start page')}
          >
            {PRIMARY_NAVIGATION_VIEWS.map(view => <option key={view} value={view}>{labels[view]}</option>)}
          </select>
        </label>
      </SettingsCard>

      <SettingsCard>
        <button
          type="button"
          className="disclosure-button text-left"
          onClick={() => dispatch({
            type: 'UPDATE_UI_PREFERENCES',
            payload: { mainMenuExpanded: !state.uiPreferences.mainMenuExpanded },
          })}
          aria-expanded={state.uiPreferences.mainMenuExpanded}
        >
          <Menu className="h-5 w-5 flex-shrink-0 text-brand-500" />
          <div className="min-w-0 flex-1">
            <h3 className="font-semibold text-slate-800">{t('Main menu')}</h3>
            <p className="text-sm text-slate-500">{t('Choose sections and arrange them by priority.')}</p>
          </div>
          <ChevronDown className={`h-4 w-4 flex-shrink-0 text-slate-500 transition-transform ${state.uiPreferences.mainMenuExpanded ? 'rotate-180' : ''}`} />
        </button>

        {state.uiPreferences.mainMenuExpanded && (
          <div className="border-t border-line">
            {[...selected, ...disabled].map(view => {
              const enabled = selected.includes(view);
              const index = selected.indexOf(view);
              return (
                <div key={view} className={`settings-row ${enabled ? '' : 'bg-slate-50/60'}`}>
                  <button
                    type="button"
                    onClick={() => toggleNavigation(view)}
                    disabled={enabled && selected.length === 1}
                    className={`icon-button-compact ${enabled ? 'text-brand-600' : 'text-slate-400'} disabled:cursor-not-allowed disabled:opacity-40`}
                    aria-label={enabled ? t('Hide {section}', { section: labels[view] }) : t('Show {section}', { section: labels[view] })}
                    title={enabled ? t('Hide from main menu') : t('Show in main menu')}
                  >
                    {enabled ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                  </button>
                  <span className={`min-w-0 flex-1 font-semibold ${enabled ? 'text-slate-800' : 'text-slate-400'}`}>{labels[view]}</span>
                  {enabled && (
                    <span className="flex items-center gap-1">
                      <button type="button" disabled={index === 0} onClick={() => moveNavigation(view, -1)} className="icon-button-compact disabled:opacity-25" aria-label={t('Move {section} left', { section: labels[view] })}><ArrowUp className="h-4 w-4" /></button>
                      <button type="button" disabled={index === selected.length - 1} onClick={() => moveNavigation(view, 1)} className="icon-button-compact disabled:opacity-25" aria-label={t('Move {section} right', { section: labels[view] })}><ArrowDown className="h-4 w-4" /></button>
                    </span>
                  )}
                </div>
              );
            })}

            <div className="p-4">
              <div className="mb-3 flex items-start gap-3">
                <Smartphone className="mt-0.5 h-5 w-5 flex-shrink-0 text-brand-500" />
                <div>
                  <h3 className="font-semibold text-slate-800">{t('Preview for this screen')}</h3>
                  <p className="text-sm text-slate-500">
                    {t('{visible} sections visible immediately • {scrollable} available by swipe', {
                      visible: immediatelyVisible.length + 1,
                      scrollable: scrollable.length,
                    })}
                  </p>
                </div>
              </div>
              <div className="overflow-hidden rounded-xl border border-line bg-white p-2">
                <div className="flex gap-1.5 overflow-x-auto mobile-nav-scroll">
                  <span className="inline-flex flex-none items-center gap-1 rounded-lg bg-brand-50 px-2 py-2 text-xs font-semibold text-brand-700"><Settings className="h-3.5 w-3.5" />{t('Settings')}</span>
                  {immediatelyVisible.map(view => <span key={view} className="inline-flex flex-none rounded-lg bg-slate-100 px-2 py-2 text-xs font-semibold text-slate-700">{labels[view]}</span>)}
                  {scrollable.length > 0 && <span className="mx-0.5 w-px flex-none bg-brand-200" aria-hidden="true" />}
                  {scrollable.map(view => <span key={view} className="inline-flex flex-none rounded-lg border border-dashed border-slate-300 px-2 py-2 text-xs font-semibold text-slate-500">{labels[view]}</span>)}
                </div>
                {scrollable.length > 0 && <p className="mt-2 text-[11px] text-slate-400">{t('Items after the divider are reached by swiping the menu.')}</p>}
              </div>
            </div>
          </div>
        )}
      </SettingsCard>
    </div>
  );
};
