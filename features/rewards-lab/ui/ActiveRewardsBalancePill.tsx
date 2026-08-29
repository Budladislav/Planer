import React from 'react';
import { Coins } from 'lucide-react';
import { getWalletBalance } from '../domain';
import { useRewardsLab } from './useRewardsLab';

export const ActiveRewardsBalancePill: React.FC = () => {
  const { runtime, snapshot } = useRewardsLab();
  if (!snapshot.enabled || !snapshot.state) return null;
  const balance = getWalletBalance(snapshot.state);

  return (
    <button
      type="button"
      onClick={() => runtime.openLab()}
      className="inline-flex items-center gap-1 rounded-full border border-violet-200 bg-violet-50 px-2 py-1 text-[11px] font-semibold text-violet-700 transition-colors hover:bg-violet-100"
      title="Open Rewards Lab"
      aria-label={`Open Rewards Lab. Balance: ${balance} ${snapshot.state.currencyName}`}
    >
      <Coins className="h-3.5 w-3.5" />
      <span>{balance}</span>
      <span className="max-w-20 truncate font-medium text-violet-500">{snapshot.state.currencyName}</span>
    </button>
  );
};
