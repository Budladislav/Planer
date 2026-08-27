import React, { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { useAppStore } from '../../store';
import { WorkShift } from '../../types';
import { getWeekString, isValidWeekString } from '../../utils';
import { formatWorkShift, getWorkShiftForWeek } from '../../week-shifts';

export const WorkShiftSettingsPanel: React.FC = () => {
  const { state, dispatch } = useAppStore();
  const settings = state.workShiftSettings;
  const currentWeek = getWeekString();
  const [baseWeek, setBaseWeek] = useState(settings.baseWeek ?? currentWeek);
  const [baseShift, setBaseShift] = useState<WorkShift>(settings.baseShift ?? 1);
  const [overrideWeek, setOverrideWeek] = useState(currentWeek);
  const [overrideShift, setOverrideShift] = useState<WorkShift>(1);

  const saveBase = () => {
    if (!isValidWeekString(baseWeek)) return;
    dispatch({
      type: 'UPDATE_WORK_SHIFT_SETTINGS',
      payload: { ...settings, baseWeek, baseShift },
    });
  };

  const addOverride = () => {
    if (!isValidWeekString(overrideWeek)) return;
    dispatch({
      type: 'UPDATE_WORK_SHIFT_SETTINGS',
      payload: {
        ...settings,
        overrides: { ...settings.overrides, [overrideWeek]: overrideShift },
      },
    });
  };

  const removeOverride = (week: string) => {
    const overrides = { ...settings.overrides };
    delete overrides[week];
    dispatch({
      type: 'UPDATE_WORK_SHIFT_SETTINGS',
      payload: { ...settings, overrides },
    });
  };

  const currentShift = getWorkShiftForWeek(settings, currentWeek);

  return (
    <div className="min-w-0">
      <p className="text-sm text-slate-500">
        {currentShift
          ? `Current week: ${formatWorkShift(currentShift)}. Shifts alternate automatically from the base week.`
          : 'Choose a base week and shift to start the alternating schedule.'}
      </p>

      <div className="mt-3 grid gap-2 sm:grid-cols-[1fr_auto_auto] sm:items-end">
        <label className="text-xs font-medium text-slate-500">
          Base week
          <input
            type="week"
            value={baseWeek}
            onChange={event => setBaseWeek(event.target.value)}
            className="mt-1 w-full rounded border border-slate-300 px-2 py-2 text-sm text-slate-800"
          />
        </label>
        <label className="text-xs font-medium text-slate-500">
          Base shift
          <select
            value={baseShift}
            onChange={event => setBaseShift(Number(event.target.value) as WorkShift)}
            className="mt-1 w-full rounded border border-slate-300 px-2 py-2 text-sm text-slate-800"
          >
            <option value={1}>First</option>
            <option value={2}>Second</option>
          </select>
        </label>
        <button
          type="button"
          onClick={saveBase}
          className="rounded bg-indigo-600 px-3 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
        >
          Save
        </button>
      </div>

      <div className="mt-4 border-t border-slate-100 pt-3">
        <div className="text-xs font-bold uppercase text-slate-500">Exceptions</div>
        <div className="mt-2 grid gap-2 sm:grid-cols-[1fr_auto_auto] sm:items-end">
          <input
            type="week"
            aria-label="Exception week"
            value={overrideWeek}
            onChange={event => setOverrideWeek(event.target.value)}
            className="rounded border border-slate-300 px-2 py-2 text-sm text-slate-800"
          />
          <select
            aria-label="Exception shift"
            value={overrideShift}
            onChange={event => setOverrideShift(Number(event.target.value) as WorkShift)}
            className="rounded border border-slate-300 px-2 py-2 text-sm text-slate-800"
          >
            <option value={1}>First</option>
            <option value={2}>Second</option>
          </select>
          <button
            type="button"
            onClick={addOverride}
            className="flex items-center justify-center gap-1 rounded border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            <Plus className="h-4 w-4" /> Add
          </button>
        </div>

        {Object.keys(settings.overrides).length > 0 && (
          <div className="mt-2 space-y-1">
            {Object.entries(settings.overrides)
              .sort(([a], [b]) => a.localeCompare(b))
              .map(([week, shift]) => (
                <div key={week} className="flex items-center justify-between rounded bg-slate-50 px-2 py-1.5 text-sm">
                  <span className="text-slate-600">{week} · {formatWorkShift(shift)}</span>
                  <button
                    type="button"
                    onClick={() => removeOverride(week)}
                    className="rounded p-1 text-slate-400 hover:bg-red-50 hover:text-red-600"
                    title="Remove exception"
                    aria-label={`Remove ${week} exception`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
          </div>
        )}
      </div>
    </div>
  );
};
