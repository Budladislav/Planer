import React, { useRef, useState } from 'react';
import { useAppStore } from '../../store';
import { Download, Upload, Trash2 } from 'lucide-react';
import { Modal, ConfirmModal } from '../Modal';

export const SettingsView: React.FC = () => {
  const { state, dispatch } = useAppStore();
  const fileInputRef = useRef<HTMLInputElement>(null);
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
      const dateStr = now.toISOString().split('T')[0]; // YYYY-MM-DD
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
      
      // Show success notification
      setModal({
        isOpen: true,
        title: 'Export Successful',
        message: `Backup exported successfully!\n\nFilename: ${filename}\n\nCheck your Downloads folder.`,
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
        title: 'Export Failed',
        message: 'Failed to export data. Please try again.',
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
               title: 'Invalid File',
               message: "Invalid file format: expected a JSON object.",
               type: 'error',
             });
             return;
           }
           // Check that it has at least tasks and captures arrays (events are optional but should be array if present)
           if (!Array.isArray(parsed.tasks)) {
             setModal({
               isOpen: true,
               title: 'Invalid File',
               message: "Invalid file format: 'tasks' must be an array.",
               type: 'error',
             });
             return;
           }
           if (!Array.isArray(parsed.captures)) {
             setModal({
               isOpen: true,
               title: 'Invalid File',
               message: "Invalid file format: 'captures' must be an array.",
               type: 'error',
             });
             return;
           }
           if (parsed.events !== undefined && !Array.isArray(parsed.events)) {
             setModal({
               isOpen: true,
               title: 'Invalid File',
               message: "Invalid file format: 'events' must be an array if present.",
               type: 'error',
             });
             return;
           }
           // Import with migration applied in store
           dispatch({ type: 'IMPORT_DATA', payload: parsed });
           setModal({
             isOpen: true,
             title: 'Import Successful',
             message: "Data imported successfully!",
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
             title: 'Import Failed',
             message: "Error parsing JSON file. Please check that the file is a valid JSON backup.",
             type: 'error',
           });
        }
     };
     reader.onerror = () => {
       setModal({
         isOpen: true,
         title: 'Import Failed',
         message: "Error reading file. Please try again.",
         type: 'error',
       });
     };
     reader.readAsText(file);
  };

  const handleReset = () => {
    setConfirmModal({
      isOpen: true,
      title: 'Reset All Data',
      message: "ARE YOU SURE? This will wipe all data permanently.",
      onConfirm: () => {
        dispatch({ type: 'RESET_DATA' });
      },
    });
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="text-center">
        <h2 className="text-3xl font-bold text-slate-900">Settings</h2>
      </div>

      <div className="bg-white rounded-lg border border-slate-200 divide-y divide-slate-100">
         <div className="p-6 flex items-center justify-between">
            <div>
               <h3 className="font-semibold text-slate-800">Export Data</h3>
               <p className="text-sm text-slate-500">Download a JSON backup of your planner.</p>
            </div>
            <button onClick={handleExport} className="flex items-center gap-2 px-4 py-2 border border-slate-300 rounded hover:bg-slate-50">
               <Download className="w-4 h-4" /> Export
            </button>
         </div>

         <div className="p-6 flex items-center justify-between">
            <div>
               <h3 className="font-semibold text-slate-800">Import Data</h3>
               <p className="text-sm text-slate-500">Restore from a backup file.</p>
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
                  <Upload className="w-4 h-4" /> Import
               </button>
            </div>
         </div>

         <div className="p-6 flex items-center justify-between bg-red-50">
            <div>
               <h3 className="font-semibold text-red-900">Danger Zone</h3>
               <p className="text-sm text-red-700">Delete all tasks, events, and settings.</p>
            </div>
            <button onClick={handleReset} className="flex items-center gap-2 px-4 py-2 bg-white border border-red-200 text-red-600 rounded hover:bg-red-100">
               <Trash2 className="w-4 h-4" /> Reset All
            </button>
         </div>
      </div>
      
      <div className="text-center text-xs text-slate-400 mt-6">
         MonoFocus v2.0 • Data stored locally in browser
      </div>

      <Modal
        isOpen={modal.isOpen}
        onClose={() => setModal({ ...modal, isOpen: false })}
        title={modal.title}
        message={modal.message}
        type={modal.type}
      />

      <ConfirmModal
        isOpen={confirmModal.isOpen}
        onClose={() => setConfirmModal({ ...confirmModal, isOpen: false })}
        onConfirm={confirmModal.onConfirm}
        title={confirmModal.title}
        message={confirmModal.message}
        variant="danger"
        confirmText="Reset All"
      />
    </div>
  );
};