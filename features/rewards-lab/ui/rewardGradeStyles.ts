import type { RewardGrade } from '../domain';

export const gradeStyles: Record<RewardGrade, { dot: string; badge: string; border: string; keyText: string }> = {
  common: { dot: 'bg-slate-400', badge: 'border-slate-200 bg-slate-50 text-slate-700', border: 'border-slate-300', keyText: 'text-slate-500' },
  uncommon: { dot: 'bg-emerald-500', badge: 'border-emerald-200 bg-emerald-50 text-emerald-800', border: 'border-emerald-300', keyText: 'text-emerald-600' },
  rare: { dot: 'bg-blue-500', badge: 'border-blue-200 bg-blue-50 text-blue-800', border: 'border-blue-300', keyText: 'text-blue-600' },
  legendary: { dot: 'bg-amber-400', badge: 'border-amber-200 bg-amber-50 text-amber-900', border: 'border-amber-300', keyText: 'text-amber-500' },
  mythic: { dot: 'bg-red-500', badge: 'border-red-200 bg-red-50 text-red-800', border: 'border-red-300', keyText: 'text-red-600' },
};
