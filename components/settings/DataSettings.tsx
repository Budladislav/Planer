import React, { useRef, useState } from 'react';
import { Download, ShieldCheck, Trash2, Upload } from 'lucide-react';
import { useI18n } from '../../i18n';
import { useAppStore } from '../../store';
import { getDateString } from '../../utils';
import { ConfirmModal, Modal } from '../Modal';
import { SettingsCard } from './SettingsRows';

type Notice = { isOpen: boolean; title: string; message: string; type: 'success' | 'error' };

export const DataSettings: React.FC = () => {
  const { state, dispatch } = useAppStore();
  const { t } = useI18n();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [exportStatus, setExportStatus] = useState<'idle' | 'started'>('idle');
  const [notice, setNotice] = useState<Notice>({ isOpen: false, title: '', message: '', type: 'success' });
  const [resetOpen, setResetOpen] = useState(false);

  const showError = (title: string, message: string) => setNotice({ isOpen: true, title, message, type: 'error' });

  const handleExport = () => {
    try {
      const now = new Date();
      const filename = `takt_backup_${getDateString(now)}_${now.toTimeString().split(' ')[0].replace(/:/g, '-')}.json`;
      const url = URL.createObjectURL(new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' }));
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      setExportStatus('started');
      setNotice({
        isOpen: true,
        title: t('Export Successful'),
        message: t('Backup exported successfully!\n\nFilename: {filename}\n\nCheck your Downloads folder.', { filename }),
        type: 'success',
      });
      setTimeout(() => {
        link.remove();
        URL.revokeObjectURL(url);
      }, 100);
    } catch (error) {
      console.error('Export error:', error);
      showError(t('Export Failed'), t('Failed to export data. Please try again.'));
    }
  };

  const handleImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = loaded => {
      try {
        const parsed = JSON.parse(loaded.target?.result as string);
        if (!parsed || typeof parsed !== 'object') {
          showError(t('Invalid File'), t('Invalid file format: expected a JSON object.'));
          return;
        }
        if (!Array.isArray(parsed.tasks)) {
          showError(t('Invalid File'), t("Invalid file format: 'tasks' must be an array."));
          return;
        }
        if (!Array.isArray(parsed.captures)) {
          showError(t('Invalid File'), t("Invalid file format: 'captures' must be an array."));
          return;
        }
        if (parsed.events !== undefined && !Array.isArray(parsed.events)) {
          showError(t('Invalid File'), t("Invalid file format: 'events' must be an array if present."));
          return;
        }
        dispatch({ type: 'IMPORT_DATA', payload: parsed });
        setNotice({ isOpen: true, title: t('Import Successful'), message: t('Data imported successfully!'), type: 'success' });
      } catch (error) {
        console.error('Import error:', error);
        showError(t('Import Failed'), t('Error parsing JSON file. Please check that the file is a valid JSON backup.'));
      } finally {
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    };
    reader.onerror = () => showError(t('Import Failed'), t('Error reading file. Please try again.'));
    reader.readAsText(file);
  };

  return (
    <>
      <div className="mb-3 flex items-start gap-2 rounded-xl border border-brand-100 bg-brand-50/60 px-3 py-2.5 text-xs leading-relaxed text-brand-900">
        <ShieldCheck className="mt-0.5 h-4 w-4 flex-shrink-0" />
        <p>{t('Planner data stays in this browser until you export or reset it.')}</p>
      </div>
      <SettingsCard>
        <div className="flex flex-col items-stretch gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0 flex-1">
            <h3 className="font-semibold text-slate-800">{t('Export Data')}</h3>
            <p className="text-sm text-slate-500">{t('Download a JSON backup of your planner.')}</p>
            <p className="mt-1 min-h-4 text-xs font-medium text-brand-600" aria-live="polite">{exportStatus === 'started' && t('Download started. Check your browser downloads.')}</p>
          </div>
          <button type="button" onClick={handleExport} className="button-secondary self-end sm:self-auto"><Download className="h-4 w-4" />{t('Export')}</button>
        </div>

        <div className="flex flex-col items-stretch gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0 flex-1">
            <h3 className="font-semibold text-slate-800">{t('Import Data')}</h3>
            <p className="text-sm text-slate-500">{t('Restore from a backup file.')}</p>
          </div>
          <input type="file" accept=".json" ref={fileInputRef} className="hidden" onChange={handleImport} />
          <button type="button" onClick={() => fileInputRef.current?.click()} className="button-secondary self-end sm:self-auto"><Upload className="h-4 w-4" />{t('Import')}</button>
        </div>

        <div className="flex flex-col items-stretch gap-3 bg-red-50/70 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0 flex-1">
            <h3 className="font-semibold text-red-900">{t('Danger Zone')}</h3>
            <p className="text-sm text-red-700">{t('Delete planner tasks, events, goals and settings. Rewards Lab stays unchanged.')}</p>
          </div>
          <button type="button" onClick={() => setResetOpen(true)} className="button-danger self-end border border-red-200 bg-white sm:self-auto"><Trash2 className="h-4 w-4" />{t('Reset planner')}</button>
        </div>
      </SettingsCard>

      <Modal isOpen={notice.isOpen} onClose={() => setNotice(current => ({ ...current, isOpen: false }))} title={notice.title} message={notice.message} type={notice.type} />
      <ConfirmModal
        isOpen={resetOpen}
        onClose={() => setResetOpen(false)}
        onConfirm={() => dispatch({ type: 'RESET_DATA' })}
        title={t('Reset planner data')}
        message={t('ARE YOU SURE? This will permanently delete planner tasks, events, goals and settings. Rewards Lab data is stored separately and will not be changed.')}
        variant="danger"
        confirmText={t('Reset planner')}
      />
    </>
  );
};
