import { FormEvent, KeyboardEvent as ReactKeyboardEvent, useRef, useState } from 'react';
import { REWARD_GRADES } from '../domain';
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
  onConfirm: (actualCost?: number) => void;
}

export const ConfirmationDialog = ({ confirmation, currencyName, onCancel, onConfirm }: ConfirmationDialogProps) => {
  const { t } = useI18n();
  const dialogRef = useRef<HTMLFormElement>(null);
  const destructive = confirmation.kind === 'reset' || confirmation.kind === 'erase';
  const variableCost = confirmation.kind === 'redeem'
    && confirmation.reward.paymentMode !== 'key'
    && confirmation.reward.variableCost;
  const purchaseCost = confirmation.kind === 'redeem-purchase';
  const initialCost = confirmation.kind === 'redeem'
    ? confirmation.reward.cost
    : confirmation.kind === 'redeem-purchase' ? confirmation.purchase.estimatedCost : 0;
  const [actualCost, setActualCost] = useState(initialCost.toString());
  const displayCurrency = currencyName === 'points' ? t('points') : currencyName;
  let title = '';
  let message = '';
  let confirmLabel = t('Confirm');

  if (confirmation.kind === 'redeem') {
    title = t('Redeem {title}?', { title: confirmation.reward.title });
    if (confirmation.reward.paymentMode === 'key') {
      message = t('One {grade} key will be deducted.', { grade: t(REWARD_GRADES[confirmation.reward.grade].label) });
    } else if (confirmation.reward.paymentMode === 'credits') {
      message = confirmation.reward.variableCost
        ? t('Enter the actual price. The same number of credits will be deducted.')
        : t('{amount} {currency} will be deducted.', { amount: confirmation.reward.cost, currency: displayCurrency });
    } else {
      message = confirmation.reward.variableCost
        ? t('Enter the actual price. The same number of credits and one {grade} key will be deducted.', { grade: t(REWARD_GRADES[confirmation.reward.grade].label) })
        : t('{amount} {currency} and one {grade} key will be deducted.', { amount: confirmation.reward.cost, currency: displayCurrency, grade: t(REWARD_GRADES[confirmation.reward.grade].label) });
    }
    confirmLabel = t('Redeem');
  } else if (confirmation.kind === 'redeem-purchase') {
    title = t('Buy {title}?', { title: confirmation.purchase.title });
    message = t('Enter the actual price. The same number of credits and one {grade} key will be deducted.', { grade: t(REWARD_GRADES[confirmation.purchase.grade].label) });
    confirmLabel = t('Buy');
  } else if (confirmation.kind === 'refund') {
    title = t('Undo this redemption?');
    if (confirmation.transaction.amount === 0 && confirmation.transaction.keyId) {
      message = t('The spent key will be returned.');
    } else if (confirmation.transaction.keyId) {
      message = t('{amount} {currency} and the spent key will be returned.', { amount: Math.abs(confirmation.transaction.amount), currency: displayCurrency });
    } else {
      message = t('{amount} {currency} will be returned to your balance.', { amount: Math.abs(confirmation.transaction.amount), currency: displayCurrency });
    }
    confirmLabel = t('Undo redemption');
  } else if (confirmation.kind === 'archive') {
    title = t('Archive {title}?', { title: confirmation.reward.title });
    message = t('It will leave the active catalog, but its wallet history will remain. You can restore it later.');
    confirmLabel = t('Archive');
  } else if (confirmation.kind === 'upgrade-key') {
    const from = REWARD_GRADES[confirmation.fromGrade];
    const grades = Object.keys(REWARD_GRADES) as Array<keyof typeof REWARD_GRADES>;
    const to = REWARD_GRADES[grades[grades.indexOf(confirmation.fromGrade) + 1]];
    title = t('Upgrade reward keys?');
    message = t('Five {from} keys will become one {to} key. This cannot be exchanged downward.', { from: t(from.label), to: t(to.label) });
    confirmLabel = t('Upgrade');
  } else if (confirmation.kind === 'undo-key-upgrade') {
    title = t('Undo the last key upgrade?');
    message = t('The upgraded key will be removed and the five source keys returned.');
    confirmLabel = t('Undo upgrade');
  } else if (confirmation.kind === 'disable') {
    title = t('Disable Rewards?');
    message = t('Rewards will disappear from the planner, but all grades, keys, rewards, purchases, and wallet history will stay on this device and in future backups.');
    confirmLabel = t('Disable, keep data');
  } else if (confirmation.kind === 'reset') {
    title = t('Reset Rewards?');
    message = t('This permanently clears official task grades, wallet history, claims, keys, rewards, purchases, and settings. Rewards will stay enabled. Planner tasks and the previous lab archive are not affected.');
    confirmLabel = t('Reset Rewards');
  } else {
    title = t('Disable and erase Rewards?');
    message = t('This permanently removes all official Rewards data from this device and turns the feature off. Planner tasks and the previous lab archive are not affected.');
    confirmLabel = t('Disable & erase');
  }

  const trapDialogFocus = (event: ReactKeyboardEvent<HTMLFormElement>) => {
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

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (variableCost || purchaseCost) {
      const value = Number(actualCost);
      if (!Number.isInteger(value) || value <= 0) return;
      onConfirm(value);
      return;
    }
    onConfirm();
  };

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-[2px]"
      onMouseDown={(event) => {
        event.stopPropagation();
        onCancel();
      }}
    >
      <form
        ref={dialogRef}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="rewards-confirm-title"
        aria-describedby="rewards-confirm-description"
        className="w-full max-w-md overflow-hidden rounded-xl bg-white shadow-2xl"
        onMouseDown={(event) => event.stopPropagation()}
        onKeyDown={trapDialogFocus}
        onSubmit={submit}
      >
        <div className={`${destructive ? 'bg-red-50' : 'bg-slate-50'} px-4 py-3`}>
          <h2 id="rewards-confirm-title" className={`font-semibold ${destructive ? 'text-red-900' : 'text-slate-900'}`}>{title}</h2>
        </div>
        <div className="px-4 py-4">
          <p id="rewards-confirm-description" className="text-sm leading-relaxed text-slate-700">{message}</p>
          {(variableCost || purchaseCost) && (
            <label className="mt-3 block text-sm font-medium text-slate-700">
              {t('Actual price')}
              <input value={actualCost} onChange={event => setActualCost(event.target.value)} type="number" min="1" step="1" autoFocus className="field mt-1 w-full" />
            </label>
          )}
        </div>
        <div className="flex justify-end gap-2 bg-slate-50 px-4 py-3">
          <button type="button" onClick={onCancel} className={secondaryButton} autoFocus={!variableCost && !purchaseCost}>{t('Cancel')}</button>
          <button type="submit" className={destructive ? `${buttonBase} bg-red-600 text-white hover:bg-red-700` : primaryButton}>
            {confirmLabel}
          </button>
        </div>
      </form>
    </div>
  );
};
