import React, { useState } from 'react';
import { BookOpenText, ExternalLink } from 'lucide-react';
import changelogUrl from '../../CHANGELOG.md?url';
import packageJson from '../../package.json';
import { useI18n } from '../../i18n';
import { parseReleaseHistory } from '../../release-history';
import { Modal } from '../Modal';
import { TaktMark } from '../ui/TaktMark';
import { SettingsCard } from './SettingsRows';

export const AboutSettings: React.FC = () => {
  const { language, t } = useI18n();
  const [showChangelog, setShowChangelog] = useState(false);
  const [releases, setReleases] = useState<ReturnType<typeof parseReleaseHistory> | null>(null);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);
  const [loadedLanguage, setLoadedLanguage] = useState<typeof language | null>(null);

  const openChangelog = () => {
    setShowChangelog(true);
    if ((releases && loadedLanguage === language) || loading) return;
    setReleases(null);
    setLoading(true);
    setFailed(false);
    const changelog = language === 'ru' ? import('../../CHANGELOG.md?raw') : import('../../CHANGELOG.en.md?raw');
    changelog
      .then(module => {
        setReleases(parseReleaseHistory(module.default));
        setLoadedLanguage(language);
      })
      .catch(() => setFailed(true))
      .finally(() => setLoading(false));
  };

  return (
    <>
      <div className="mb-3 flex items-center gap-3 rounded-2xl border border-line bg-white px-4 py-4 shadow-quiet">
        <span className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl bg-slate-950 text-white"><TaktMark className="h-9 w-9" /></span>
        <div className="min-w-0">
          <div className="text-lg font-bold tracking-tight text-slate-900">Takt</div>
          <p className="text-sm text-slate-500">{t('Local-first planner for year-to-day work.')}</p>
        </div>
      </div>

      <SettingsCard>
        <button type="button" onClick={openChangelog} className="settings-row">
          <BookOpenText className="h-5 w-5 flex-shrink-0 text-brand-500" />
          <div className="min-w-0 flex-1 text-left">
            <h3 className="font-semibold text-slate-800">Takt v{packageJson.version}</h3>
            <p className="text-sm text-slate-500">{t('Open version history and release notes.')}</p>
          </div>
          <ExternalLink className="h-4 w-4 text-slate-400" />
        </button>
        <a href={changelogUrl} className="settings-row" download="CHANGELOG.md">
          <BookOpenText className="h-5 w-5 flex-shrink-0 text-brand-500" />
          <div className="min-w-0 flex-1">
            <h3 className="font-semibold text-slate-800">CHANGELOG.md</h3>
            <p className="text-sm text-slate-500">{t('Download the full changelog file.')}</p>
          </div>
          <ExternalLink className="h-4 w-4 text-slate-400" />
        </a>
      </SettingsCard>

      <Modal isOpen={showChangelog} onClose={() => setShowChangelog(false)} title={t('Takt changelog')} wide>
        <div className="space-y-5">
          {loading && <p className="py-4 text-center text-sm text-slate-500">{t('Loading release history…')}</p>}
          {failed && <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">{t('Release history is not available offline yet. Open it once while connected and it will be cached.')}</p>}
          {releases?.map(release => (
            <section key={release.version}>
              <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                <h4 className="font-bold text-slate-800">v{release.version}</h4>
                <span className="text-xs text-slate-400">{release.date}</span>
              </div>
              {release.title && <p className="mt-0.5 text-sm font-semibold text-slate-600">{release.title}</p>}
              <div className="mt-2 space-y-2.5">
                {release.sections.map(section => (
                  <div key={section.title}>
                    <h5 className="text-xs font-bold uppercase tracking-wide text-slate-500">{section.title}</h5>
                    <ul className="mt-1 list-disc space-y-1 pl-5 text-sm text-slate-600">
                      {section.changes.map(change => <li key={change}>{change}</li>)}
                    </ul>
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>
      </Modal>
    </>
  );
};
