import React, { useRef, useState } from 'react';
import { useAppStore } from '../../store';
import { BriefcaseBusiness, CalendarRange, CheckSquare, ChevronDown, ChevronRight, Download, FileText, Flag, Inbox, Languages, Upload, Trash2 } from 'lucide-react';
import { Modal, ConfirmModal } from '../Modal';
import packageJson from '../../package.json';
import { parseReleaseHistory } from '../../release-history';
import { getDateString } from '../../utils';
import { WorkShiftSettingsPanel } from '../settings/WorkShiftSettings';
import { RewardsLabSettingsRow } from '../../features/rewards-lab/ui/RewardsLabSettingsRow';
import { useI18n } from '../../i18n';

export const SettingsView: React.FC = () => {
  const { state, dispatch } = useAppStore();
  const { language, t } = useI18n();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showChangelog, setShowChangelog] = useState(false);
  const [releases, setReleases] = useState<ReturnType<typeof parseReleaseHistory> | null>(null);
  const [releaseHistoryLoading, setReleaseHistoryLoading] = useState(false);
  const [releaseHistoryError, setReleaseHistoryError] = useState(false);
  const [releaseLanguage, setReleaseLanguage] = useState<typeof language | null>(null);
  const [exportStatus, setExportStatus] = useState<'idle' | 'started'>('idle');
  const [showWorkShifts, setShowWorkShifts] = useState(false);
  const [modal, setModal] = useState<{ isOpen: boolean; title: string; message: string; type?: 'info' | 'success' | 'error' | 'warning' }>({
    isOpen: false,
    title: '',
    message: '',
    type: 'info',
  });
  const [confirmModal, setConfirmModal] = useState<{ isOpen: boolean; title: string; message: string; onConfirm: () => void }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
  });

  const handleExport = () => {
    try {
      // Generate filename with date and time: monofocus_backup_2024-01-15_14-30.json
      const now = new Date();
      const dateStr = getDateString(now); // local YYYY-MM-DD
      const timeStr = now.toTimeString().split(' ')[0].replace(/:/g, '-'); // HH-MM-SS
      const filename = `monofocus_backup_${dateStr}_${timeStr}.json`;
      
      // Use Blob instead of data: URL - works better on mobile browsers
      const jsonString = JSON.stringify(state, null, 2);
      const blob = new Blob([jsonString], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      
      const downloadAnchorNode = document.createElement('a');
      downloadAnchorNode.setAttribute("href", url);
      downloadAnchorNode.setAttribute("download", filename);
      document.body.appendChild(downloadAnchorNode);
      downloadAnchorNode.click();
      setExportStatus('started');
      
      // Show success notification
      setModal({
        isOpen: true,
        title: t('Export Successful'),
        message: t('Backup exported successfully!\n\nFilename: {filename}\n\nCheck your Downloads folder.', { filename }),
        type: 'success',
      });
      
      // Cleanup
      setTimeout(() => {
        document.body.removeChild(downloadAnchorNode);
        URL.revokeObjectURL(url);
      }, 100);
    } catch (error) {
      console.error('Export error:', error);
      setModal({
        isOpen: true,
        title: t('Export Failed'),
        message: t('Failed to export data. Please try again.'),
        type: 'error',
      });
    }
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
     const file = e.target.files?.[0];
     if (!file) return;
     const reader = new FileReader();
     reader.onload = (evt) => {
        try {
           const parsed = JSON.parse(evt.target?.result as string);
           // Validate that it's an object with at least the basic structure
           if (!parsed || typeof parsed !== 'object') {
             setModal({
               isOpen: true,
               title: t('Invalid File'),
               message: t('Invalid file format: expected a JSON object.'),
               type: 'error',
             });
             return;
           }
           // Check that it has at least tasks and captures arrays (events are optional but should be array if present)
           if (!Array.isArray(parsed.tasks)) {
             setModal({
               isOpen: true,
               title: t('Invalid File'),
               message: t("Invalid file format: 'tasks' must be an array."),
               type: 'error',
             });
             return;
           }
           if (!Array.isArray(parsed.captures)) {
             setModal({
               isOpen: true,
               title: t('Invalid File'),
               message: t("Invalid file format: 'captures' must be an array."),
               type: 'error',
             });
             return;
           }
           if (parsed.events !== undefined && !Array.isArray(parsed.events)) {
             setModal({
               isOpen: true,
               title: t('Invalid File'),
               message: t("Invalid file format: 'events' must be an array if present."),
               type: 'error',
             });
             return;
           }
           // Import with migration applied in store
           dispatch({ type: 'IMPORT_DATA', payload: parsed });
           setModal({
             isOpen: true,
             title: t('Import Successful'),
             message: t('Data imported successfully!'),
             type: 'success',
           });
           // Reset file input to allow re-importing the same file
           if (fileInputRef.current) {
             fileInputRef.current.value = '';
           }
        } catch (err) {
           console.error("Import error:", err);
           setModal({
             isOpen: true,
             title: t('Import Failed'),
             message: t('Error parsing JSON file. Please check that the file is a valid JSON backup.'),
             type: 'error',
           });
        }
     };
     reader.onerror = () => {
       setModal({
         isOpen: true,
         title: t('Import Failed'),
         message: t('Error reading file. Please try again.'),
         type: 'error',
       });
     };
     reader.readAsText(file);
  };

  const handleReset = () => {
    setConfirmModal({
      isOpen: true,
      title: t('Reset planner data'),
      message: t('ARE YOU SURE? This will permanently delete planner tasks, events, goals and settings. Rewards Lab data is stored separately and will not be changed.'),
      onConfirm: () => {
        dispatch({ type: 'RESET_DATA' });
      },
    });
  };

  const openChangelog = () => {
    setShowChangelog(true);
    if ((releases && releaseLanguage === language) || releaseHistoryLoading) return;
    setReleases(null);
    setReleaseHistoryLoading(true);
    setReleaseHistoryError(false);
    const changelog = language === 'ru' ? import('../../CHANGELOG.md?raw') : import('../../CHANGELOG.en.md?raw');
    changelog
      .then(module => {
        setReleases(parseReleaseHistory(module.default));
        setReleaseLanguage(language);
      })
      .catch(() => setReleaseHistoryError(true))
      .finally(() => setReleaseHistoryLoading(false));
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="text-center">
        <h2 className="text-3xl font-bold text-slate-900">{t('Settings')}</h2>
      </div>

      <div className="bg-white rounded-lg border border-slate-200 divide-y divide-slate-100">
         <button
           type="button"
           onClick={() => dispatch({ type: 'SET_VIEW', payload: 'inbox' })}
           className="flex w-full items-center gap-3 p-4 text-left hover:bg-slate-50"
         >
           <Inbox className="h-5 w-5 text-purple-500" />
           <div className="flex-1">
             <h3 className="font-semibold text-slate-800">{t('I wish')}</h3>
             <p className="text-sm text-slate-500">{t('Open your wishes and ideas.')}</p>
           </div>
           <ChevronRight className="h-5 w-5 text-slate-400" />
         </button>

         <button
           type="button"
           onClick={() => dispatch({ type: 'SET_VIEW', payload: 'done' })}
           className="flex w-full items-center gap-3 p-4 text-left hover:bg-slate-50"
         >
           <CheckSquare className="h-5 w-5 text-green-500" />
           <div className="flex-1">
             <h3 className="font-semibold text-slate-800">{t('Completed Tasks')}</h3>
             <p className="text-sm text-slate-500">{t('Browse and manage task history.')}</p>
           </div>
           <ChevronRight className="h-5 w-5 text-slate-400" />
         </button>

         <button
           type="button"
           onClick={() => dispatch({ type: 'SET_VIEW', payload: 'goals' })}
           className="flex w-full items-center gap-3 p-4 text-left hover:bg-slate-50"
         >
           <Flag className="h-5 w-5 text-violet-500" />
           <div className="flex-1">
             <div className="flex flex-wrap items-center gap-2">
               <h3 className="font-semibold text-slate-800">{t('Long-term goals')}</h3>
               <span className="rounded-full bg-violet-100 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-violet-700">{t('Experimental')}</span>
             </div>
             <p className="text-sm text-slate-500">{t('Track ambitious outcomes, context and next steps.')}</p>
           </div>
           <ChevronRight className="h-5 w-5 text-slate-400" />
         </button>

         <button
           type="button"
           onClick={() => dispatch({ type: 'SET_VIEW', payload: 'reports' })}
           className="flex w-full items-center gap-3 p-4 text-left hover:bg-slate-50"
         >
           <FileText className="h-5 w-5 text-indigo-500" />
           <div className="flex-1">
             <h3 className="font-semibold text-slate-800">{t('Progress Reports')}</h3>
             <p className="text-sm text-slate-500">{t('Export completed tasks, realized wishes and long-term goals.')}</p>
           </div>
           <ChevronRight className="h-5 w-5 text-slate-400" />
         </button>

         <div>
           <button
             type="button"
             aria-expanded={showWorkShifts}
             onClick={() => setShowWorkShifts(value => !value)}
             className="flex w-full items-center gap-3 p-4 text-left hover:bg-slate-50"
           >
             <BriefcaseBusiness className="h-5 w-5 text-indigo-500" />
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

         <label className="flex cursor-pointer items-center gap-3 p-4 hover:bg-slate-50">
           <CalendarRange className="h-5 w-5 flex-shrink-0 text-sky-500" />
           <div className="min-w-0 flex-1">
             <h3 className="font-semibold text-slate-800">{t('Day note highlighting')}</h3>
             <p className="text-sm text-slate-500">{t('Subtly tint calendar days that contain notes.')}</p>
           </div>
           <input
             type="checkbox"
             checked={state.uiPreferences.calendarNoteHighlight}
             onChange={event => dispatch({
               type: 'UPDATE_UI_PREFERENCES',
               payload: { calendarNoteHighlight: event.target.checked },
             })}
             className="h-4 w-4 rounded border-slate-300 text-sky-600 focus:ring-sky-500"
           />
         </label>

         <label className="flex cursor-pointer items-center gap-3 p-4 hover:bg-slate-50">
           <Languages className="h-5 w-5 flex-shrink-0 text-indigo-500" />
           <div className="min-w-0 flex-1">
             <h3 className="font-semibold text-slate-800">{t('Language')}</h3>
             <p className="text-sm text-slate-500">{t('App language and generated report language.')}</p>
           </div>
           <select
             value={language}
             onChange={event => dispatch({
               type: 'UPDATE_UI_PREFERENCES',
               payload: { language: event.target.value === 'en' ? 'en' : 'ru' },
             })}
             className="rounded border border-slate-300 bg-white px-2 py-1.5 text-sm text-slate-700"
             aria-label={t('Language')}
           >
             <option value="ru">{t('Russian')}</option>
             <option value="en">{t('English')}</option>
           </select>
         </label>

         <RewardsLabSettingsRow />

         <div className="p-6 flex items-center justify-between">
            <div>
               <h3 className="font-semibold text-slate-800">{t('Export Data')}</h3>
               <p className="text-sm text-slate-500">{t('Download a JSON backup of your planner.')}</p>
               <p className="mt-1 min-h-4 text-xs font-medium text-indigo-600" aria-live="polite">
                 {exportStatus === 'started' && t('Download started. Check your browser downloads.')}
               </p>
            </div>
            <button onClick={handleExport} className="flex items-center gap-2 px-4 py-2 border border-slate-300 rounded hover:bg-slate-50">
               <Download className="w-4 h-4" /> {t('Export')}
            </button>
         </div>

         <div className="p-6 flex items-center justify-between">
            <div>
               <h3 className="font-semibold text-slate-800">{t('Import Data')}</h3>
               <p className="text-sm text-slate-500">{t('Restore from a backup file.')}</p>
            </div>
            <div>
               <input 
                 type="file" 
                 accept=".json" 
                 ref={fileInputRef} 
                 className="hidden" 
                 onChange={handleImport} 
               />
               <button onClick={() => fileInputRef.current?.click()} className="flex items-center gap-2 px-4 py-2 border border-slate-300 rounded hover:bg-slate-50">
                  <Upload className="w-4 h-4" /> {t('Import')}
               </button>
            </div>
         </div>

         <div className="p-6 flex items-center justify-between bg-red-50">
            <div>
               <h3 className="font-semibold text-red-900">{t('Danger Zone')}</h3>
               <p className="text-sm text-red-700">{t('Delete planner tasks, events, goals and settings. Rewards Lab stays unchanged.')}</p>
            </div>
            <button onClick={handleReset} className="flex items-center gap-2 px-4 py-2 bg-white border border-red-200 text-red-600 rounded hover:bg-red-100">
               <Trash2 className="w-4 h-4" /> {t('Reset planner')}
            </button>
         </div>
      </div>
      
      <button
        type="button"
        onClick={openChangelog}
        className="mx-auto block text-center text-xs text-slate-400 underline-offset-4 hover:text-indigo-600 hover:underline"
      >
         MonoFocus v{packageJson.version} • {t('Data stored locally in browser')}
      </button>

      <Modal
        isOpen={modal.isOpen}
        onClose={() => setModal({ ...modal, isOpen: false })}
        title={modal.title}
        message={modal.message}
        type={modal.type}
      />

      <Modal
        isOpen={showChangelog}
        onClose={() => setShowChangelog(false)}
        title={t('MonoFocus changelog')}
        wide
      >
        <div className="space-y-5">
          {releaseHistoryLoading && (
            <p className="py-4 text-center text-sm text-slate-500">{t('Loading release history…')}</p>
          )}
          {releaseHistoryError && (
            <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
              {t('Release history is not available offline yet. Open it once while connected and it will be cached.')}
            </p>
          )}
          {releases?.map(release => (
            <section key={release.version}>
              <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                <h4 className="font-bold text-slate-800">v{release.version}</h4>
                <span className="text-xs text-slate-400">{release.date}</span>
              </div>
              {release.title && (
                <p className="mt-0.5 text-sm font-semibold text-slate-600">{release.title}</p>
              )}
              <div className="mt-2 space-y-2.5">
                {release.sections.map(section => (
                  <div key={section.title}>
                    <h5 className="text-xs font-bold uppercase tracking-wide text-slate-500">
                      {section.title}
                    </h5>
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

      <ConfirmModal
        isOpen={confirmModal.isOpen}
        onClose={() => setConfirmModal({ ...confirmModal, isOpen: false })}
        onConfirm={confirmModal.onConfirm}
        title={confirmModal.title}
        message={confirmModal.message}
        variant="danger"
        confirmText={t('Reset planner')}
      />
    </div>
  );
};
