import React, { Suspense, lazy, useEffect } from 'react';
import { Dice5, KeyRound, Sparkles } from 'lucide-react';
import { REWARD_GRADES, RewardGrade } from '../domain';
import { rewardsLabGate } from '../gate';
import { useRewardsLab } from './useRewardsLab';
import { useI18n } from '../../../i18n';
import { gradeStyles } from './rewardGradeStyles';
import {
  KeyRevealTier,
  classifyCreditReveal,
  classifyKeyReveal,
  getRewardRevealIntensity,
} from './rewardReveal';

const RewardsLabPanel = lazy(() => import('./RewardsLabPanel'));

const REVEAL_THEMES: Record<RewardGrade, { rgb: string; surface: string; icon: string; amount: string }> = {
  common: { rgb: '100 116 139', surface: 'border-slate-300 bg-slate-50', icon: 'bg-slate-200 text-slate-700', amount: 'text-slate-700' },
  uncommon: { rgb: '47 180 124', surface: 'border-emerald-300 bg-emerald-50/90', icon: 'bg-emerald-100 text-emerald-700', amount: 'text-emerald-700' },
  rare: { rgb: '59 130 246', surface: 'border-blue-300 bg-blue-50/90', icon: 'bg-blue-100 text-blue-700', amount: 'text-blue-700' },
  legendary: { rgb: '224 154 23', surface: 'border-amber-300 bg-amber-50/90', icon: 'bg-amber-100 text-amber-700', amount: 'text-amber-700' },
  mythic: { rgb: '228 81 94', surface: 'border-rose-300 bg-rose-50/90', icon: 'bg-rose-100 text-rose-700', amount: 'text-rose-700' },
};

const KEY_REVEAL_LABELS: Record<KeyRevealTier, string> = {
  standard: 'Key drop',
  lucky: 'Lucky drop',
  rare: 'Rare drop',
  exceptional: 'Exceptional drop',
  extraordinary: 'Extraordinary drop',
  guaranteed: 'Guaranteed key',
};

const RewardsLabActiveHost: React.FC = () => {
  const { runtime, snapshot } = useRewardsLab();
  const { locale, t } = useI18n();

  useEffect(() => {
    rewardsLabGate.refresh();
  }, [snapshot.flagEnabled]);

  useEffect(() => {
    if (!snapshot.toast) return undefined;
    const timeout = window.setTimeout(() => runtime.dismissToast(), 4200);
    return () => window.clearTimeout(timeout);
  }, [runtime, snapshot.toast]);

  const toast = snapshot.toast;
  const grade = toast ? REWARD_GRADES[toast.grade] : null;
  const creditReveal = toast ? classifyCreditReveal(toast.grade, toast.amount) : null;
  const keyReveal = toast?.keyGrade && toast.kind === 'earned'
    ? classifyKeyReveal(toast.grade, toast.keyGrade, toast.keyDropWasProtected)
    : null;
  const revealIntensity = toast && creditReveal
    ? getRewardRevealIntensity(creditReveal, keyReveal, toast.kind === 'restored')
    : 0;
  const revealGrade = toast?.keyGrade && keyReveal && keyReveal.intensity >= (creditReveal?.intensity ?? 0)
    ? toast.keyGrade
    : toast?.grade ?? 'common';
  const revealTheme = REVEAL_THEMES[revealGrade];
  const animationsDisabled = snapshot.state?.animationsEnabled === false;
  const keyChance = keyReveal?.probability === null || keyReveal?.probability === undefined
    ? null
    : new Intl.NumberFormat(locale, {
        style: 'percent',
        maximumFractionDigits: 2,
        minimumFractionDigits: keyReveal.probability < 0.01 ? 2 : 0,
      }).format(keyReveal.probability);
  const toastTitle = toast?.kind === 'restored' ? t('Reward restored') : t('Task reward');
  const toastDescription = toast && grade
    ? toast.kind === 'restored'
      ? `${t(grade.label)} · ${t('original result restored')}`
      : toast.economyVersion === 1
        ? `${toast.roll} × ${t(grade.label)} ${toast.multiplier} = +${toast.amount} ${toast.currencyName}`
        : `${t(grade.label)} · ${grade.min}–${grade.max} · +${toast.amount} ${toast.currencyName}`
    : '';

  return (
    <>
      {toast && grade && (
        <button
          type="button"
          onClick={() => runtime.openLab()}
          className={`rewards-toast-enter rewards-reveal rewards-reveal-level-${revealIntensity} fixed bottom-20 left-1/2 z-[70] w-[calc(100%-2rem)] max-w-sm -translate-x-1/2 overflow-hidden rounded-2xl border px-4 py-3 text-left shadow-float lg:bottom-6 ${revealIntensity === 0 ? 'border-brand-100 bg-white' : revealTheme.surface} ${animationsDisabled || toast.kind === 'restored' ? 'rewards-toast-static' : ''}`}
          style={{ '--reward-reveal-color': revealTheme.rgb } as React.CSSProperties}
          aria-label={`${toastTitle}. ${toastDescription}. ${t('Open Rewards Lab')}.`}
        >
          <span className="reward-reveal-content flex items-start gap-3">
            <span className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl ${revealIntensity === 0 ? 'bg-brand-100 text-brand-700' : revealTheme.icon}`}>
              {revealIntensity >= 3 ? <Sparkles className="h-5 w-5" /> : <Dice5 className="h-5 w-5" />}
            </span>
            <span className="min-w-0 flex-1">
              <span className="flex flex-wrap items-center gap-1.5 text-sm font-semibold text-slate-900">
                {toastTitle}
                {toast.kind === 'earned' && creditReveal?.maximum && (
                  <span className={`rounded-full border px-1.5 py-0.5 text-[9px] font-black tracking-[0.14em] ${gradeStyles[toast.grade].badge}`}>MAX</span>
                )}
              </span>
              <span className="mt-0.5 block text-xs text-slate-600">
                {toastDescription}
              </span>
              {toast.keyGrade && toast.kind === 'earned' && keyReveal && (
                <span className={`mt-1 flex flex-wrap items-center gap-x-1 gap-y-0.5 text-xs font-semibold ${gradeStyles[toast.keyGrade].keyText}`}>
                  <KeyRound className="h-3 w-3" />
                  <span>{t('{grade} key', { grade: t(REWARD_GRADES[toast.keyGrade].label) })}</span>
                  <span aria-hidden="true">·</span>
                  <span>{t(KEY_REVEAL_LABELS[keyReveal.tier])}</span>
                  {keyChance && <span className="font-medium opacity-80">· {t('chance {chance}', { chance: keyChance })}</span>}
                </span>
              )}
            </span>
            <span className={`flex-shrink-0 text-sm font-black tabular-nums ${revealIntensity === 0 ? 'text-brand-700' : revealTheme.amount}`}>+{toast.amount}</span>
          </span>
        </button>
      )}

      {toast && grade && (
        <span className="sr-only" role="status" aria-live="polite" aria-atomic="true">
          {toastTitle}. {toastDescription}. {t('Balance increased by {amount} {currency}.', { amount: toast.amount, currency: toast.currencyName })}
        </span>
      )}

      {snapshot.isOpen && snapshot.enabled && (
        <Suspense fallback={(
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4" role="status">
            <div className="rounded-xl bg-white px-4 py-3 text-sm font-medium text-slate-600 shadow-xl">{t('Opening Rewards Lab…')}</div>
          </div>
        )}>
          <RewardsLabPanel />
        </Suspense>
      )}
    </>
  );
};

export default RewardsLabActiveHost;
