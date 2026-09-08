import React from 'react';
import { X, AlertCircle, CheckCircle, AlertTriangle } from 'lucide-react';
import { useI18n } from '../i18n';

type ModalType = 'info' | 'success' | 'error' | 'warning';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  message?: string;
  children?: React.ReactNode;
  type?: ModalType;
  wide?: boolean;
  hideFooter?: boolean;
}

const focusableSelector = [
  'button:not([disabled])',
  '[href]',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

const useAccessibleDialog = (isOpen: boolean, onClose: () => void) => {
  const dialogRef = React.useRef<HTMLDivElement>(null);
  const previousFocusRef = React.useRef<HTMLElement | null>(null);
  const onCloseRef = React.useRef(onClose);

  React.useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  React.useEffect(() => {
    if (!isOpen) return;
    previousFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const frame = window.requestAnimationFrame(() => {
      const firstFocusable = dialogRef.current?.querySelector<HTMLElement>(focusableSelector);
      (firstFocusable ?? dialogRef.current)?.focus();
    });

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onCloseRef.current();
        return;
      }
      if (event.key !== 'Tab' || !dialogRef.current) return;
      const focusable = Array.from(dialogRef.current.querySelectorAll<HTMLElement>(focusableSelector));
      if (focusable.length === 0) {
        event.preventDefault();
        dialogRef.current.focus();
        return;
      }
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      window.cancelAnimationFrame(frame);
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = previousOverflow;
      previousFocusRef.current?.focus();
    };
  }, [isOpen]);

  return dialogRef;
};

const iconConfig = {
  info: { icon: AlertCircle, color: 'text-brand-600', bg: 'bg-brand-50' },
  success: { icon: CheckCircle, color: 'text-emerald-700', bg: 'bg-emerald-50' },
  error: { icon: AlertCircle, color: 'text-red-700', bg: 'bg-red-50' },
  warning: { icon: AlertTriangle, color: 'text-amber-700', bg: 'bg-amber-50' },
};

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  message,
  children,
  type = 'info',
  wide = false,
  hideFooter = false,
}) => {
  const { t } = useI18n();
  const dialogRef = useAccessibleDialog(isOpen, onClose);
  const titleId = React.useId();
  if (!isOpen) return null;

  const config = iconConfig[type];
  const Icon = config.icon;

  return (
    <div className="sheet-backdrop z-50" onMouseDown={event => event.target === event.currentTarget && onClose()}>
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className={`w-full overflow-hidden rounded-t-3xl border border-line bg-white shadow-float sm:rounded-3xl ${wide ? 'sm:max-w-2xl' : 'sm:max-w-md'}`}
      >
        <div className="flex items-center justify-between gap-3 border-b border-line px-4 py-3.5">
          <div className="flex min-w-0 items-center gap-3">
            <span className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl ${config.bg}`}>
              <Icon className={`h-[18px] w-[18px] ${config.color}`} />
            </span>
            <h2 id={titleId} className="min-w-0 truncate font-semibold text-ink">{title}</h2>
          </div>
          <button type="button" onClick={onClose} className="icon-button-compact" title={t('Close')} aria-label={t('Close')}>
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="max-h-[72dvh] overflow-y-auto px-4 py-4">
          {children ?? <p className="whitespace-pre-line text-sm leading-relaxed text-slate-700">{message}</p>}
        </div>
        {!hideFooter && (
          <div className="flex justify-end border-t border-line bg-slate-50/70 px-4 py-3">
            <button type="button" onClick={onClose} className="button-subtle">OK</button>
          </div>
        )}
      </div>
    </div>
  );
};

interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'default';
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText,
  cancelText,
  variant = 'default',
}) => {
  const { t } = useI18n();
  const dialogRef = useAccessibleDialog(isOpen, onClose);
  const titleId = React.useId();
  if (!isOpen) return null;

  const handleConfirm = () => {
    onConfirm();
    onClose();
  };

  return (
    <div className="sheet-backdrop z-50" onMouseDown={event => event.target === event.currentTarget && onClose()}>
      <div
        ref={dialogRef}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className="w-full overflow-hidden rounded-t-3xl border border-line bg-white shadow-float sm:max-w-md sm:rounded-3xl"
      >
        <div className="flex items-center justify-between gap-3 border-b border-line px-4 py-3.5">
          <h2 id={titleId} className={`font-semibold ${variant === 'danger' ? 'text-red-900' : 'text-ink'}`}>{title}</h2>
          <button type="button" onClick={onClose} className="icon-button-compact" title={t('Close')} aria-label={t('Close')}>
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="px-4 py-4">
          <p className="whitespace-pre-line text-sm leading-relaxed text-slate-700">{message}</p>
        </div>
        <div className="flex justify-end gap-2 border-t border-line bg-slate-50/70 px-4 py-3">
          <button type="button" onClick={onClose} className="button-secondary">
            {cancelText ?? t('Cancel')}
          </button>
          <button type="button" onClick={handleConfirm} className={variant === 'danger' ? 'button-danger' : 'button-primary'}>
            {confirmText ?? t('Confirm')}
          </button>
        </div>
      </div>
    </div>
  );
};
