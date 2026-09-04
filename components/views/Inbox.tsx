import React, { useState } from 'react';
import { useAppStore } from '../../store';
import { Capture } from '../../types';
import { getDateString, getTodayString } from '../../utils';
import {
  Check,
  ChevronDown,
  Inbox,
  Pencil,
  Plus,
  RotateCcw,
  Trash2,
} from 'lucide-react';
import { ConfirmModal } from '../Modal';
import { useI18n } from '../../i18n';

const toDateInputValue = (timestamp: string): string => {
  const date = new Date(timestamp);
  return Number.isNaN(date.getTime()) ? '' : getDateString(date);
};

const replaceLocalDate = (timestamp: string, dateString: string): string | null => {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateString);
  if (!match) return null;

  const original = new Date(timestamp);
  const hours = Number.isNaN(original.getTime()) ? 12 : original.getHours();
  const minutes = Number.isNaN(original.getTime()) ? 0 : original.getMinutes();
  const seconds = Number.isNaN(original.getTime()) ? 0 : original.getSeconds();
  const milliseconds = Number.isNaN(original.getTime()) ? 0 : original.getMilliseconds();
  const updated = new Date(
    Number(match[1]),
    Number(match[2]) - 1,
    Number(match[3]),
    hours,
    minutes,
    seconds,
    milliseconds,
  );
  return Number.isNaN(updated.getTime()) ? null : updated.toISOString();
};

export const InboxView: React.FC = () => {
  const { state, dispatch } = useAppStore();
  const { t } = useI18n();
  const [captureInput, setCaptureInput] = useState('');
  const [completedExpanded, setCompletedExpanded] = useState(false);
  const [editingCaptureId, setEditingCaptureId] = useState<string | null>(null);
  const [editingCaptureText, setEditingCaptureText] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState<{ isOpen: boolean; captureId: string | null }>({
    isOpen: false,
    captureId: null,
  });

  // Filter new captures
  const newCaptures = state.captures.filter(c => c.status === 'new');
  const completedCaptures = state.captures
    .filter(c => c.status === 'completed' && c.completedAt)
    .sort((a, b) => Date.parse(b.completedAt!) - Date.parse(a.completedAt!));

  const formatElapsed = (createdAt: string, completedAt: string) => {
    const elapsedMs = Date.parse(completedAt) - Date.parse(createdAt);
    if (!Number.isFinite(elapsedMs) || elapsedMs < 0) return t('Period unavailable');

    const days = Math.floor(elapsedMs / 86_400_000);
    if (days === 0) return t('Realized the same day');
    return t('Realized after {days} days', { days });
  };

  const handleCapture = (e: React.FormEvent) => {
    e.preventDefault();
    if (captureInput.trim()) {
      dispatch({ type: 'ADD_CAPTURE', payload: captureInput.trim() });
      setCaptureInput('');
    }
  };

  const startEditingCapture = (item: Capture) => {
    setEditingCaptureId(item.id);
    setEditingCaptureText(item.text);
  };

  const saveCaptureTitle = (item: Capture) => {
    const text = editingCaptureText.trim();
    if (text && text !== item.text) {
      dispatch({ type: 'UPDATE_CAPTURE', payload: { id: item.id, text } });
    }
    if (text) {
      setEditingCaptureId(null);
      setEditingCaptureText('');
    }
  };

  const renderActiveWish = (item: Capture) => {
    const isEditing = editingCaptureId === item.id;

    return (
      <article key={item.id} className="rounded-lg border border-slate-200 bg-white px-3 py-3 shadow-sm">
        <div className="flex items-start gap-2">
          <div className="min-w-0 flex-1">
            {isEditing ? (
              <input
                type="text"
                autoFocus
                value={editingCaptureText}
                onChange={event => setEditingCaptureText(event.target.value)}
                onKeyDown={event => {
                  if (event.key === 'Enter') saveCaptureTitle(item);
                  if (event.key === 'Escape') setEditingCaptureId(null);
                }}
                aria-label={`${t('Edit title')}: ${item.text}`}
                className="w-full rounded border border-indigo-300 px-2 py-1 text-sm font-medium text-slate-700 outline-none focus:ring-2 focus:ring-indigo-200"
              />
            ) : (
              <p className="break-words text-sm font-medium text-slate-700">{item.text}</p>
            )}
            <label className="mt-1 flex flex-wrap items-center gap-1 text-[11px] text-slate-400">
              <span>{t('Created')}</span>
              <input
                type="date"
                value={toDateInputValue(item.createdAt)}
                max={getTodayString()}
                onChange={event => {
                  const createdAt = replaceLocalDate(item.createdAt, event.target.value);
                  if (createdAt) dispatch({ type: 'UPDATE_CAPTURE_CREATED_AT', payload: { id: item.id, createdAt } });
                }}
                aria-label={t('Creation date for {title}', { title: item.text })}
                className="rounded border border-slate-200 bg-white px-1 py-0.5 text-[11px] text-slate-600 outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-300"
              />
            </label>
          </div>
          <button
            type="button"
            onClick={() => isEditing ? saveCaptureTitle(item) : startEditingCapture(item)}
            disabled={isEditing && !editingCaptureText.trim()}
            className="flex-shrink-0 p-1.5 text-slate-400 transition-colors hover:text-indigo-600 disabled:cursor-not-allowed disabled:opacity-40"
            title={isEditing ? t('Save title') : t('Edit title')}
            aria-label={`${isEditing ? t('Save title') : t('Edit title')}: ${item.text}`}
          >
            {isEditing ? <Check className="h-4 w-4" /> : <Pencil className="h-4 w-4" />}
          </button>
          <button
            type="button"
            onClick={() => {
              dispatch({ type: 'COMPLETE_CAPTURE', payload: item.id });
              setCompletedExpanded(true);
            }}
            className="flex-shrink-0 p-1.5 text-slate-400 transition-colors hover:text-emerald-600"
            title={t('Mark as realized')}
            aria-label={t('Mark {title} as realized', { title: item.text })}
          >
            <Check className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => setDeleteConfirm({ isOpen: true, captureId: item.id })}
            className="flex-shrink-0 p-1.5 text-slate-400 transition-colors hover:text-red-500"
            title={t('Delete permanently')}
            aria-label={t('Delete {title}', { title: item.text })}
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </article>
    );
  };

  return (
    <div className="max-w-3xl mx-auto">
      {/* Header - Centered */}
      <div className="text-center mb-3">
        <h2 className="text-3xl font-bold text-slate-900">{t('I wish')}</h2>
        <p className="text-slate-500">{t('Capture everything. Process later.')}</p>
      </div>

      {/* Content - with bottom padding for fixed form */}
      <div className="pb-20 lg:pb-4 space-y-4 min-h-[60vh] flex flex-col">
        {completedCaptures.length > 0 && (
          <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <button
              type="button"
              onClick={() => setCompletedExpanded(value => !value)}
              aria-expanded={completedExpanded}
              className="flex w-full items-center justify-between gap-3 px-3 py-3 text-left hover:bg-slate-50"
            >
              <span className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                <Check className="h-4 w-4 text-emerald-600" aria-hidden="true" />
                {t('Realized ({count})', { count: completedCaptures.length })}
              </span>
              <ChevronDown
                className={`h-4 w-4 text-slate-400 transition-transform ${completedExpanded ? 'rotate-180' : ''}`}
                aria-hidden="true"
              />
            </button>

            {completedExpanded && (
              <div className="divide-y divide-slate-100 border-t border-slate-100">
                {completedCaptures.map(item => {
                  const isEditing = editingCaptureId === item.id;
                  return (
                  <article key={item.id} className="px-3 py-3">
                    <div className="flex items-start gap-2">
                      <div className="min-w-0 flex-1">
                        {isEditing ? (
                          <input
                            type="text"
                            autoFocus
                            value={editingCaptureText}
                            onChange={event => setEditingCaptureText(event.target.value)}
                            onKeyDown={event => {
                              if (event.key === 'Enter') saveCaptureTitle(item);
                              if (event.key === 'Escape') setEditingCaptureId(null);
                            }}
                            aria-label={`${t('Edit title')}: ${item.text}`}
                            className="w-full rounded border border-indigo-300 px-2 py-1 text-sm font-medium text-slate-700 outline-none focus:ring-2 focus:ring-indigo-200"
                          />
                        ) : (
                          <p className="break-words text-sm font-medium text-slate-700">{item.text}</p>
                        )}
                        <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] leading-relaxed text-slate-400">
                          <label className="flex items-center gap-1">
                            <span>{t('Created')}</span>
                            <input
                              type="date"
                              value={toDateInputValue(item.createdAt)}
                              max={toDateInputValue(item.completedAt!)}
                              onChange={event => {
                                const createdAt = replaceLocalDate(item.createdAt, event.target.value);
                                if (createdAt) {
                                  dispatch({
                                    type: 'UPDATE_CAPTURE_CREATED_AT',
                                    payload: { id: item.id, createdAt },
                                  });
                                }
                              }}
                              aria-label={t('Creation date for {title}', { title: item.text })}
                              className="rounded border border-slate-200 bg-white px-1 py-0.5 text-[11px] text-slate-600 outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-300"
                            />
                          </label>
                          <label className="flex items-center gap-1">
                            <span>{t('Realized')}</span>
                            <input
                              type="date"
                              value={toDateInputValue(item.completedAt!)}
                              min={toDateInputValue(item.createdAt)}
                              max={getTodayString()}
                              onChange={event => {
                                const completedAt = replaceLocalDate(item.completedAt!, event.target.value);
                                if (completedAt) {
                                  dispatch({
                                    type: 'UPDATE_CAPTURE_COMPLETED_AT',
                                    payload: { id: item.id, completedAt },
                                  });
                                }
                              }}
                              aria-label={t('Realized date for {title}', { title: item.text })}
                              className="rounded border border-slate-200 bg-white px-1 py-0.5 text-[11px] text-slate-600 outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-300"
                            />
                          </label>
                          <span className="basis-full font-medium text-emerald-600">
                            {formatElapsed(item.createdAt, item.completedAt!)}
                          </span>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => isEditing ? saveCaptureTitle(item) : startEditingCapture(item)}
                        disabled={isEditing && !editingCaptureText.trim()}
                        className="flex-shrink-0 p-1.5 text-slate-400 transition-colors hover:text-indigo-600 disabled:cursor-not-allowed disabled:opacity-40"
                        title={isEditing ? t('Save title') : t('Edit title')}
                        aria-label={`${isEditing ? t('Save title') : t('Edit title')}: ${item.text}`}
                      >
                        {isEditing ? <Check className="h-4 w-4" /> : <Pencil className="h-4 w-4" />}
                      </button>
                      <button
                        type="button"
                        onClick={() => dispatch({ type: 'REOPEN_CAPTURE', payload: item.id })}
                        className="flex-shrink-0 p-1.5 text-slate-400 transition-colors hover:text-indigo-600"
                        title={t('Return to I wish')}
                        aria-label={t('Return {title} to I wish', { title: item.text })}
                      >
                        <RotateCcw className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeleteConfirm({ isOpen: true, captureId: item.id })}
                        className="flex-shrink-0 p-1.5 text-slate-400 transition-colors hover:text-red-500"
                        title={t('Delete permanently')}
                        aria-label={t('Delete {title}', { title: item.text })}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </article>
                  );
                })}
              </div>
            )}
          </section>
        )}

        {newCaptures.length === 0 ? (
          <div className="text-center py-8 border-2 border-dashed border-slate-200 rounded-xl w-full">
            <Inbox className="w-12 h-12 mx-auto text-slate-300 mb-2" />
            <p className="text-slate-400 font-medium">{t('No ideas waiting to be processed')}</p>
          </div>
        ) : (
          <div className="flex-1 space-y-3">
            {newCaptures.map(renderActiveWish)}
          </div>
        )}
      </div>

      {/* Add Form - Fixed at bottom */}
      <form onSubmit={handleCapture} className="lg:hidden fixed bottom-16 left-0 right-0 p-4 bg-slate-50 border-t border-slate-200 z-20">
        <div className="max-w-3xl mx-auto flex items-center gap-3">
          <input
            type="text"
            value={captureInput}
            onChange={(e) => setCaptureInput(e.target.value)}
            placeholder={t("What's on your mind?")}
            className="flex-1 p-3 border border-slate-300 rounded-lg focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-shadow bg-white"
          />
          <button 
            type="submit"
            className="w-12 h-12 bg-slate-900 text-white rounded-full shadow-lg hover:bg-slate-800 hover:shadow-xl hover:scale-110 transition-all flex items-center justify-center flex-shrink-0"
            title={t('Add wish')}
          >
            <Plus className="w-6 h-6" />
          </button>
        </div>
      </form>

      {/* Add Form - Desktop */}
      <form onSubmit={handleCapture} className="hidden lg:flex items-center gap-3">
        <input
          type="text"
          value={captureInput}
          onChange={(e) => setCaptureInput(e.target.value)}
          placeholder={t("What's on your mind?")}
          className="flex-1 p-3 border border-slate-300 rounded-lg focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-shadow"
        />
        <button 
          type="submit"
          className="w-12 h-12 bg-slate-900 text-white rounded-full shadow-lg hover:bg-slate-800 hover:shadow-xl hover:scale-110 transition-all flex items-center justify-center flex-shrink-0"
          title={t('Add wish')}
        >
          <Plus className="w-6 h-6" />
        </button>
      </form>

      <ConfirmModal
        isOpen={deleteConfirm.isOpen}
        onClose={() => setDeleteConfirm({ isOpen: false, captureId: null })}
        onConfirm={() => {
          if (deleteConfirm.captureId) {
            dispatch({ type: 'DELETE_CAPTURE', payload: deleteConfirm.captureId });
            setDeleteConfirm({ isOpen: false, captureId: null });
          }
        }}
        title={t('Delete wish')}
        message={t('Delete this wish permanently?')}
        variant="danger"
        confirmText={t('Delete')}
      />
    </div>
  );
};
