import type { RewardGrade } from '../domain';

export const gradeStyles: Record<RewardGrade, { dot: string; badge: string; border: string; keyText: string }> = {
  common: { dot: 'bg-[#94A3B8]', badge: 'border-[#94A3B8]/35 bg-[#F4F6F8] text-[#475569]', border: 'border-[#94A3B8]/60', keyText: 'text-[#475569]' },
  uncommon: { dot: 'bg-[#2FB47C]', badge: 'border-[#2FB47C]/35 bg-[#EAF8F2] text-[#187A54]', border: 'border-[#2FB47C]/60', keyText: 'text-[#187A54]' },
  rare: { dot: 'bg-[#3B82F6]', badge: 'border-[#3B82F6]/35 bg-[#EEF4FF] text-[#1D5FD1]', border: 'border-[#3B82F6]/60', keyText: 'text-[#1D5FD1]' },
  legendary: { dot: 'bg-[#E09A17]', badge: 'border-[#E09A17]/35 bg-[#FFF6DD] text-[#925E00]', border: 'border-[#E09A17]/60', keyText: 'text-[#925E00]' },
  mythic: { dot: 'bg-[#E4515E]', badge: 'border-[#E4515E]/35 bg-[#FDECEF] text-[#B52D3C]', border: 'border-[#E4515E]/60', keyText: 'text-[#B52D3C]' },
};
