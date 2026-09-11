import { BarChart3, Dice5, Gift, History, ShoppingBag, X } from 'lucide-react';
import {
  KeyboardEvent as ReactKeyboardEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from 'react';
import { getRewardsLabRuntime } from '../runtime';
import { useI18n } from '../../../i18n';
import { Confirmation } from './RewardsLabPanel.shared';
import { ConfirmationDialog } from './RewardsLabConfirmationDialog';
import { HistoryTab } from './RewardsLabHistoryTab';
import { RewardsTab } from './RewardsLabRewardsTab';
import { RewardsLabSummary } from './RewardsLabSummary';
import { PurchasesTab } from './RewardsLabPurchasesTab';
import { RulesTab } from './RewardsLabRulesTab';

type LabTab = 'rewards' | 'statistics' | 'history' | 'purchases' | 'rules';

interface NoticeProps {
  message: string | null;
  onDismiss: () => void;
}

const Notice = ({ message, onDismiss }: NoticeProps) => {
  const { t } = useI18n();
  if (!message) return null;
  return (
    <div
      className="mb-4 flex items-start justify-between gap-3 rounded-xl border border-brand-100 bg-brand-50 px-3 py-2 text-sm text-brand-700"
      role="status"
      aria-live="polite"
    >
      <span>{message}</span>
      <button
        type="button"
        onClick={onDismiss}
        className="rounded p-0.5 text-brand-600 hover:bg-brand-100"
        aria-label={t('Dismiss message')}
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
};

const tabs: Array<{ id: LabTab; label: string; icon: typeof Gift }> = [
  { id: 'rewards', label: 'Rewards', icon: Gift },
  { id: 'statistics', label: 'Statistics', icon: BarChart3 },
  { id: 'history', label: 'History', icon: History },
  { id: 'purchases', label: 'Purchases', icon: ShoppingBag },
  { id: 'rules', label: 'Rules', icon: Dice5 },
];

const RewardsLabPanel = () => {
  const { t } = useI18n();
  const runtime = useMemo(() => getRewardsLabRuntime(), []);
  const subscribe = useMemo(() => (listener: () => void) => runtime.subscribe(listener), [runtime]);
  const getSnapshot = useMemo(() => () => runtime.getSnapshot(), [runtime]);
  const snapshot = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  const [activeTab, setActiveTab] = useState<LabTab>('rewards');
  const [confirmation, setConfirmation] = useState<Confirmation | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const confirmationRef = useRef<Confirmation | null>(null);
  const confirmationTriggerRef = useRef<HTMLElement | null>(null);
  confirmationRef.current = confirmation;

  const openConfirmation = (nextConfirmation: Confirmation) => {
    confirmationTriggerRef.current = document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null;
    setConfirmation(nextConfirmation);
  };

  useEffect(() => {
    if (confirmation || !confirmationTriggerRef.current) return;
    const trigger = confirmationTriggerRef.current;
    confirmationTriggerRef.current = null;
    if (trigger.isConnected) trigger.focus();
    if (document.activeElement !== trigger) closeButtonRef.current?.focus();
  }, [confirmation]);

  useEffect(() => {
    if (!snapshot.isOpen) return undefined;
    const previouslyFocused = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    closeButtonRef.current?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        if (confirmationRef.current) setConfirmation(null);
        else runtime.closeLab();
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = originalOverflow;
      document.removeEventListener('keydown', onKeyDown);
      previouslyFocused?.focus();
    };
  }, [runtime, snapshot.isOpen]);

  if (!snapshot.isOpen || !snapshot.state) return null;
  const state = snapshot.state;

  const trapFocus = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (event.key !== 'Tab' || confirmation) return;
    const focusable = Array.from(panelRef.current?.querySelectorAll<HTMLElement>(
      'button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [href], [tabindex]:not([tabindex="-1"])',
    ) ?? []).filter((element) => element.offsetParent !== null);
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

  const runConfirmation = (actualCost?: number) => {
    if (!confirmation) return;
    if (confirmation.kind === 'redeem') {
      const outcome = runtime.redeem(confirmation.reward.id, actualCost);
      if (outcome === 'redeemed') setNotice(t('{title} redeemed.', { title: confirmation.reward.title }));
      else if (outcome === 'insufficient-balance') setNotice(t('The balance is no longer sufficient for that reward.'));
      else if (outcome === 'already-redeemed') setNotice(t('That one-time reward was already redeemed.'));
      else if (outcome === 'missing-key') setNotice(t('A matching reward key is required.'));
      else if (outcome === 'cooldown' || outcome === 'limit-reached') setNotice(t('This reward is still on cooldown or at its rolling limit.'));
      else setNotice(t('The reward could not be redeemed.'));
    } else if (confirmation.kind === 'redeem-purchase') {
      const outcome = runtime.redeemPurchase(confirmation.purchase.id, actualCost ?? confirmation.purchase.estimatedCost);
      if (outcome === 'redeemed') setNotice(t('{title} purchased.', { title: confirmation.purchase.title }));
      else if (outcome === 'missing-key') setNotice(t('A matching reward key is required.'));
      else setNotice(t('The purchase could not be completed.'));
    } else if (confirmation.kind === 'refund') {
      const outcome = runtime.refund(confirmation.transaction.id);
      setNotice(outcome === 'refunded' ? t('Redemption undone and spent resources restored.') : t('That redemption was already handled.'));
    } else if (confirmation.kind === 'archive') {
      if (runtime.archiveReward(confirmation.reward.id)) setNotice(t('{title} archived.', { title: confirmation.reward.title }));
    } else if (confirmation.kind === 'upgrade-key') {
      if (runtime.upgradeKeys(confirmation.fromGrade)) setNotice(t('Five keys were upgraded.'));
      else setNotice(t('The keys could not be upgraded.'));
    } else if (confirmation.kind === 'undo-key-upgrade') {
      const outcome = runtime.undoLatestKeyUpgrade();
      setNotice(outcome === 'reversed' ? t('The last key upgrade was undone.') : t('The upgraded key has already been used.'));
    } else if (confirmation.kind === 'disable') {
      runtime.disableKeepData();
    } else if (confirmation.kind === 'reset') {
      if (runtime.resetDataKeepingEnabled()) {
        setActiveTab('rewards');
        setNotice(t('Rewards reset. Planner tasks were not changed.'));
      }
    } else {
      runtime.disableAndErase();
    }
    setConfirmation(null);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/35 backdrop-blur-[2px] md:items-center md:p-4"
      onMouseDown={() => runtime.closeLab()}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="rewards-lab-title"
        className="flex h-[94dvh] w-full flex-col overflow-hidden rounded-t-3xl border border-line bg-canvas shadow-float md:h-auto md:max-h-[88vh] md:max-w-3xl md:rounded-3xl"
        onMouseDown={(event) => event.stopPropagation()}
        onKeyDown={trapFocus}
      >
        <header className="shrink-0 border-b border-line bg-white px-4 pt-4 sm:px-5">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-100 text-brand-700">
                  <Dice5 className="h-5 w-5" aria-hidden="true" />
                </div>
                <div className="min-w-0">
                  <h1 id="rewards-lab-title" className="truncate text-lg font-bold text-slate-900">{t('Rewards')}</h1>
                  <p className="text-xs text-slate-500">{t('Task grades, credits, keys and personal rewards')}</p>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                ref={closeButtonRef}
                type="button"
                onClick={() => runtime.closeLab()}
                className="icon-button"
                aria-label={t('Close Rewards')}
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          <div className="mt-4 flex gap-1 overflow-x-auto" role="tablist" aria-label={t('Rewards sections')}>
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const selected = tab.id === activeTab;
              return (
                <button
                  key={tab.id}
                  type="button"
                  role="tab"
                  id={`rewards-tab-${tab.id}`}
                  aria-selected={selected}
                  aria-controls={`rewards-panel-${tab.id}`}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-t-xl border-b-2 px-3 text-sm font-medium transition-colors ${selected ? 'border-brand-600 bg-brand-50 text-brand-700' : 'border-transparent text-slate-500 hover:bg-slate-50 hover:text-slate-800'}`}
                >
                  <Icon className="h-4 w-4" aria-hidden="true" />
                  {t(tab.label)}
                </button>
              );
            })}
          </div>
        </header>

        <main className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-5">
          {snapshot.lastError && (
            <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900" role="status">
              {t('Rewards recovered from a local storage problem. Your planner continued normally.')}
            </div>
          )}
          <Notice message={notice} onDismiss={() => setNotice(null)} />
          <div
            role="tabpanel"
            id={`rewards-panel-${activeTab}`}
            aria-labelledby={`rewards-tab-${activeTab}`}
          >
            {activeTab === 'rewards' && <RewardsTab state={state} onNotice={setNotice} onConfirm={openConfirmation} />}
            {activeTab === 'statistics' && <RewardsLabSummary state={state} onRefund={transaction => openConfirmation({ kind: 'refund', transaction })} onUpgrade={fromGrade => openConfirmation({ kind: 'upgrade-key', fromGrade })} onUndoUpgrade={() => openConfirmation({ kind: 'undo-key-upgrade' })} />}
            {activeTab === 'history' && <HistoryTab state={state} onConfirm={openConfirmation} />}
            {activeTab === 'purchases' && <PurchasesTab state={state} onNotice={setNotice} onConfirm={openConfirmation} />}
            {activeTab === 'rules' && <RulesTab state={state} onNotice={setNotice} onConfirm={openConfirmation} />}
          </div>
        </main>
      </div>

      {confirmation && (
        <ConfirmationDialog
          confirmation={confirmation}
          key={`${confirmation.kind}-${'reward' in confirmation ? confirmation.reward.id : 'purchase' in confirmation ? confirmation.purchase.id : 'fromGrade' in confirmation ? confirmation.fromGrade : ''}`}
          currencyName={state.currencyName}
          onCancel={() => setConfirmation(null)}
          onConfirm={runConfirmation}
        />
      )}
    </div>
  );
};

export default RewardsLabPanel;
