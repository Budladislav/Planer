import React, { useState } from 'react';
import { useAppStore } from '../../store';
import { Capture } from '../../types';
import { getTodayString } from '../../utils';
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
import { EmptyState } from '../ui/Primitives';
import { OptionalStartDateField, StartDateModeButton } from '../ui/OptionalStartDate';
import { replaceOptionalStartDate, toOptionalDateInputValue } from '../../optional-start-date';

export const InboxView: React.FC = () => {
  const { state, dispatch } = useAppStore();
  const { t } = useI18n();
  const [captureInput, setCaptureInput] = useState('');
  const [startDateUnknown, setStartDateUnknown] = useState(false);
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
      dispatch({
        type: 'ADD_CAPTURE',
        payload: { text: captureInput.trim(), startDateKnown: !startDateUnknown },
      });
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
      <article key={item.id} className="task-card py-3">
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
                className="field-compact w-full font-medium"
              />
            ) : (
              <p className="break-words text-sm font-medium text-slate-700">{item.text}</p>
            )}
            <div className="mt-1 text-[11px] text-slate-400">
              <OptionalStartDateField
                value={item.startedAt}
                label={t('Wanted since')}
                ariaLabel={t('Start date for {title}', { title: item.text })}
                max={getTodayString()}
                onChange={startedAt => dispatch({
                  type: 'UPDATE_CAPTURE_STARTED_AT', payload: { id: item.id, startedAt },
                })}
              />
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
    <div className="page-container">
      {/* Content - with bottom padding for fixed form */}
      <div className="pb-20 lg:pb-4 space-y-4 min-h-[60vh] flex flex-col">
        {completedCaptures.length > 0 && (
          <section className="surface-card">
            <button
              type="button"
              onClick={() => setCompletedExpanded(value => !value)}
              aria-expanded={completedExpanded}
              className="disclosure-button py-3"
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
                            className="field-compact w-full font-medium"
                          />
                        ) : (
                          <p className="break-words text-sm font-medium text-slate-700">{item.text}</p>
                        )}
                        <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] leading-relaxed text-slate-400">
                          <OptionalStartDateField
                            value={item.startedAt}
                            label={t('Wanted since')}
                            ariaLabel={t('Start date for {title}', { title: item.text })}
                            max={toOptionalDateInputValue(item.completedAt)}
                            onChange={startedAt => dispatch({
                              type: 'UPDATE_CAPTURE_STARTED_AT', payload: { id: item.id, startedAt },
                            })}
                          />
                          <label className="flex items-center gap-1">
                            <span>{t('Realized')}</span>
                            <input
                              type="date"
                              value={toOptionalDateInputValue(item.completedAt)}
                              min={toOptionalDateInputValue(item.startedAt)}
                              max={getTodayString()}
                              onChange={event => {
                                const completedAt = replaceOptionalStartDate(item.completedAt, event.target.value);
                                if (completedAt) {
                                  dispatch({
                                    type: 'UPDATE_CAPTURE_COMPLETED_AT',
                                    payload: { id: item.id, completedAt },
                                  });
                                }
                              }}
                              aria-label={t('Realized date for {title}', { title: item.text })}
                              className="rounded-lg border border-line bg-white px-1 py-0.5 text-[11px] text-slate-600 outline-none"
                            />
                          </label>
                          {item.startedAt && (
                            <span className="basis-full font-medium text-emerald-600">
                              {formatElapsed(item.startedAt, item.completedAt!)}
                            </span>
                          )}
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
          <EmptyState>
            <Inbox className="w-12 h-12 mx-auto text-slate-300 mb-2" />
            <p className="text-slate-400 font-medium">{t('No ideas waiting to be processed')}</p>
          </EmptyState>
        ) : (
          <div className="flex-1 space-y-3">
            {newCaptures.map(renderActiveWish)}
          </div>
        )}
      </div>

      {/* Add Form - Fixed at bottom */}
      <form onSubmit={handleCapture} className="sticky-composer fixed bottom-[72px] left-0 right-0 z-20 lg:hidden">
        <div className="max-w-3xl mx-auto flex items-center gap-2">
          <input
            type="text"
            value={captureInput}
            onChange={(e) => setCaptureInput(e.target.value)}
            placeholder={t("What's on your mind?")}
            className="field min-w-0 flex-1"
          />
          <StartDateModeButton unknown={startDateUnknown} onChange={setStartDateUnknown} />
          <button 
            type="submit"
            className="composer-submit"
            title={t('Add wish')}
          >
            <Plus className="w-6 h-6" />
          </button>
        </div>
      </form>

      {/* Add Form - Desktop */}
      <form onSubmit={handleCapture} className="hidden lg:flex items-center gap-2">
        <input
          type="text"
          value={captureInput}
          onChange={(e) => setCaptureInput(e.target.value)}
          placeholder={t("What's on your mind?")}
          className="field min-w-0 flex-1"
        />
        <StartDateModeButton unknown={startDateUnknown} onChange={setStartDateUnknown} />
        <button 
          type="submit"
          className="composer-submit"
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
