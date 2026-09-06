import { KeyboardEvent as ReactKeyboardEvent, useRef } from 'react';
import { useI18n } from '../../../i18n';
import {
  Confirmation,
  buttonBase,
  primaryButton,
  secondaryButton,
} from './RewardsLabPanel.shared';

interface ConfirmationDialogProps {
  confirmation: Confirmation;
  currencyName: string;
  onCancel: () => void;
  onConfirm: () => void;
}

export const ConfirmationDialog = ({ confirmation, currencyName, onCancel, onConfirm }: ConfirmationDialogProps) => {
  const { t } = useI18n();
  const dialogRef = useRef<HTMLDivElement>(null);
  const destructive = confirmation.kind === 'reset' || confirmation.kind === 'erase';
  const displayCurrency = currencyName === 'points' ? t('points') : currencyName;
  let title = '';
  let message = '';
  let confirmLabel = t('Confirm');

  if (confirmation.kind === 'redeem') {
    title = t('Redeem {title}?', { title: confirmation.reward.title });
    message = t('{amount} {currency} will be deducted from your balance.', { amount: confirmation.reward.cost, currency: displayCurrency });
    confirmLabel = t('Redeem');
  } else if (confirmation.kind === 'refund') {
    title = t('Undo this redemption?');
    message = t('{amount} {currency} will be returned to your balance.', { amount: Math.abs(confirmation.transaction.amount), currency: displayCurrency });
    confirmLabel = t('Undo redemption');
  } else if (confirmation.kind === 'archive') {
    title = t('Archive {title}?', { title: confirmation.reward.title });
    message = t('It will leave the active catalog, but its wallet history will remain. You can restore it later.');
    confirmLabel = t('Archive');
  } else if (confirmation.kind === 'disable') {
    title = t('Disable Rewards Lab?');
    message = t('The experiment will disappear from the planner, but all grades, rewards, and wallet history will stay on this device.');
    confirmLabel = t('Disable, keep data');
  } else if (confirmation.kind === 'reset') {
    title = t('Reset the experiment?');
    message = t('This permanently clears task grades, wallet history, claims, rewards, and settings. Rewards Lab will stay enabled. Planner tasks are not affected.');
    confirmLabel = t('Reset Rewards Lab');
  } else {
    title = t('Disable and erase Rewards Lab?');
    message = t('This permanently removes all experimental data from this device and turns the feature off. Planner tasks are not affected.');
    confirmLabel = t('Disable & erase');
  }

  const trapDialogFocus = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (event.key !== 'Tab') return;
    const focusable = Array.from(dialogRef.current?.querySelectorAll<HTMLButtonElement>('button:not([disabled])') ?? []);
    if (focusable.length === 0) return;
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

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4"
      onMouseDown={(event) => {
        event.stopPropagation();
        onCancel();
      }}
    >
      <div
        ref={dialogRef}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="rewards-confirm-title"
        aria-describedby="rewards-confirm-description"
        className="w-full max-w-md overflow-hidden rounded-xl bg-white shadow-2xl"
        onMouseDown={(event) => event.stopPropagation()}
        onKeyDown={trapDialogFocus}
      >
        <div className={`${destructive ? 'bg-red-50' : 'bg-slate-50'} px-4 py-3`}>
          <h2 id="rewards-confirm-title" className={`font-semibold ${destructive ? 'text-red-900' : 'text-slate-900'}`}>{title}</h2>
        </div>
        <p id="rewards-confirm-description" className="px-4 py-4 text-sm leading-relaxed text-slate-700">{message}</p>
        <div className="flex justify-end gap-2 bg-slate-50 px-4 py-3">
          <button type="button" onClick={onCancel} className={secondaryButton} autoFocus>{t('Cancel')}</button>
          <button type="button" onClick={onConfirm} className={destructive ? `${buttonBase} bg-red-600 text-white hover:bg-red-700` : primaryButton}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};

