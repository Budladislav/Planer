import { Dice5, Gift, History, X } from 'lucide-react';
import {
  KeyboardEvent as ReactKeyboardEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from 'react';
import {
  getWalletBalance,
} from '../domain';
import { getRewardsLabRuntime } from '../runtime';
import { useI18n } from '../../../i18n';
import { Confirmation } from './RewardsLabPanel.shared';
import { ConfirmationDialog } from './RewardsLabConfirmationDialog';
import { HistoryTab } from './RewardsLabHistoryTab';
import { RewardsTab } from './RewardsLabRewardsTab';
import { RulesTab } from './RewardsLabRulesTab';

type LabTab = 'rewards' | 'history' | 'rules';

interface NoticeProps {
  message: string | null;
  onDismiss: () => void;
}

const Notice = ({ message, onDismiss }: NoticeProps) => {
  const { t } = useI18n();
  if (!message) return null;
  return (
    <div
      className="mb-4 flex items-start justify-between gap-3 rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-2 text-sm text-indigo-900"
      role="status"
      aria-live="polite"
    >
      <span>{message}</span>
      <button
        type="button"
        onClick={onDismiss}
        className="rounded p-0.5 text-indigo-600 hover:bg-indigo-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
        aria-label={t('Dismiss message')}
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
};

const tabs: Array<{ id: LabTab; label: string; icon: typeof Gift }> = [
  { id: 'rewards', label: 'Rewards', icon: Gift },
  { id: 'history', label: 'History', icon: History },
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
  const balance = getWalletBalance(state);

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

  const runConfirmation = () => {
    if (!confirmation) return;
    if (confirmation.kind === 'redeem') {
      const outcome = runtime.redeem(confirmation.reward.id);
      if (outcome === 'redeemed') setNotice(t('{title} redeemed.', { title: confirmation.reward.title }));
      else if (outcome === 'insufficient-balance') setNotice(t('The balance is no longer sufficient for that reward.'));
      else if (outcome === 'already-redeemed') setNotice(t('That one-time reward was already redeemed.'));
      else setNotice(t('The reward could not be redeemed.'));
    } else if (confirmation.kind === 'refund') {
      const outcome = runtime.refund(confirmation.transaction.id);
      setNotice(outcome === 'refunded' ? t('Redemption undone and balance restored.') : t('That redemption was already handled.'));
    } else if (confirmation.kind === 'archive') {
      if (runtime.archiveReward(confirmation.reward.id)) setNotice(t('{title} archived.', { title: confirmation.reward.title }));
    } else if (confirmation.kind === 'disable') {
      runtime.disableKeepData();
    } else if (confirmation.kind === 'reset') {
      if (runtime.resetDataKeepingEnabled()) {
        setActiveTab('rewards');
        setNotice(t('Rewards Lab reset. Planner tasks were not changed.'));
      }
    } else {
      runtime.disableAndErase();
    }
    setConfirmation(null);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/35 backdrop-blur-sm md:items-center md:p-4"
      onMouseDown={() => runtime.closeLab()}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="rewards-lab-title"
        className="flex h-[94dvh] w-full flex-col overflow-hidden rounded-t-2xl bg-slate-50 shadow-2xl md:h-auto md:max-h-[88vh] md:max-w-3xl md:rounded-2xl"
        onMouseDown={(event) => event.stopPropagation()}
        onKeyDown={trapFocus}
      >
        <header className="shrink-0 border-b border-slate-200 bg-white px-4 pt-4 sm:px-5">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-indigo-100 text-indigo-700">
                  <Dice5 className="h-5 w-5" aria-hidden="true" />
                </div>
                <div className="min-w-0">
                  <h1 id="rewards-lab-title" className="truncate text-lg font-bold text-slate-900">{t('Rewards Lab')}</h1>
                  <p className="text-xs text-slate-500">{t('Optional gamification experiment')}</p>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="hidden max-w-48 truncate rounded-full bg-indigo-50 px-3 py-1.5 text-sm font-semibold text-indigo-800 sm:block" aria-label={t('Balance: {balance} {currency}', { balance, currency: state.currencyName === 'points' ? t('points') : state.currencyName })}>
                {balance} {state.currencyName}
              </div>
              <button
                ref={closeButtonRef}
                type="button"
                onClick={() => runtime.closeLab()}
                className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                aria-label={t('Close Rewards Lab')}
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-3 gap-1" role="tablist" aria-label={t('Rewards Lab sections')}>
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
                  className={`flex min-h-11 items-center justify-center gap-2 rounded-t-lg border-b-2 px-2 text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-indigo-500 ${selected ? 'border-indigo-600 bg-indigo-50/60 text-indigo-700' : 'border-transparent text-slate-500 hover:bg-slate-50 hover:text-slate-800'}`}
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
              {t('Rewards Lab recovered from a local storage problem. Your planner continued normally.')}
            </div>
          )}
          <Notice message={notice} onDismiss={() => setNotice(null)} />
          <div
            role="tabpanel"
            id={`rewards-panel-${activeTab}`}
            aria-labelledby={`rewards-tab-${activeTab}`}
          >
            {activeTab === 'rewards' && <RewardsTab state={state} onNotice={setNotice} onConfirm={openConfirmation} />}
            {activeTab === 'history' && <HistoryTab state={state} onConfirm={openConfirmation} />}
            {activeTab === 'rules' && <RulesTab state={state} onNotice={setNotice} onConfirm={openConfirmation} />}
          </div>
        </main>
      </div>

      {confirmation && (
        <ConfirmationDialog
          confirmation={confirmation}
          currencyName={state.currencyName}
          onCancel={() => setConfirmation(null)}
          onConfirm={runConfirmation}
        />
      )}
    </div>
  );
};

export default RewardsLabPanel;
