import React, { useRef } from 'react';
import { useAppStore } from '../../store';
import { Download, Upload, Trash2 } from 'lucide-react';

export const SettingsView: React.FC = () => {
  const { state, dispatch } = useAppStore();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleExport = () => {
    // Generate filename with date and time: monofocus_backup_2024-01-15_14-30.json
    const now = new Date();
    const dateStr = now.toISOString().split('T')[0]; // YYYY-MM-DD
    const timeStr = now.toTimeString().split(' ')[0].replace(/:/g, '-'); // HH-MM-SS
    const filename = `monofocus_backup_${dateStr}_${timeStr}.json`;
    
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(state));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", filename);
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
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
             alert("Invalid file format: expected a JSON object.");
             return;
           }
           // Check that it has at least tasks and captures arrays (events are optional but should be array if present)
           if (!Array.isArray(parsed.tasks)) {
             alert("Invalid file format: 'tasks' must be an array.");
             return;
           }
           if (!Array.isArray(parsed.captures)) {
             alert("Invalid file format: 'captures' must be an array.");
             return;
           }
           if (parsed.events !== undefined && !Array.isArray(parsed.events)) {
             alert("Invalid file format: 'events' must be an array if present.");
             return;
           }
           // Import with migration applied in store
           dispatch({ type: 'IMPORT_DATA', payload: parsed });
           alert("Data imported successfully!");
           // Reset file input to allow re-importing the same file
           if (fileInputRef.current) {
             fileInputRef.current.value = '';
           }
        } catch (err) {
           console.error("Import error:", err);
           alert("Error parsing JSON file. Please check that the file is a valid JSON backup.");
        }
     };
     reader.onerror = () => {
       alert("Error reading file. Please try again.");
     };
     reader.readAsText(file);
  };

  const handleReset = () => {
    if (window.confirm("ARE YOU SURE? This will wipe all data permanently.")) {
       dispatch({ type: 'RESET_DATA' });
    }
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
         MonoFocus v1.5.6 • Data stored locally in browser
      </div>
    </div>
  );
};