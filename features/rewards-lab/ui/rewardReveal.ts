import {
  KEY_DROP_PROBABILITIES,
  REWARD_GRADES,
  RewardGrade,
} from '../domain';

export type CreditRevealTier = 'minimum' | 'good' | 'high' | 'maximum';
export type KeyRevealTier = 'standard' | 'lucky' | 'rare' | 'exceptional' | 'extraordinary' | 'guaranteed';

export interface CreditReveal {
  tier: CreditRevealTier;
  intensity: 0 | 1 | 2 | 3 | 4;
  maximum: boolean;
}

export interface KeyReveal {
  tier: KeyRevealTier;
  intensity: 1 | 2 | 3 | 4;
  probability: number | null;
}

const gradeRanks: Record<RewardGrade, number> = {
  common: 0,
  uncommon: 1,
  rare: 2,
  legendary: 3,
  mythic: 4,
};

export const classifyCreditReveal = (grade: RewardGrade, amount: number): CreditReveal => {
  const rule = REWARD_GRADES[grade];
  if (amount <= rule.min || rule.max <= rule.min) {
    return { tier: 'minimum', intensity: 0, maximum: false };
  }

  if (amount >= rule.max) {
    const intensity = Math.min(4, 2 + Math.floor(gradeRanks[grade] / 2)) as 2 | 3 | 4;
    return { tier: 'maximum', intensity, maximum: true };
  }

  const position = (amount - rule.min) / (rule.max - rule.min);
  return position < 0.5
    ? { tier: 'good', intensity: 1, maximum: false }
    : { tier: 'high', intensity: 2, maximum: false };
};

export const classifyKeyReveal = (
  taskGrade: RewardGrade,
  keyGrade: RewardGrade,
  protectedDrop = false,
): KeyReveal => {
  if (protectedDrop) {
    return { tier: 'guaranteed', intensity: 1, probability: null };
  }

  const probability = KEY_DROP_PROBABILITIES[taskGrade][keyGrade];
  if (probability >= 0.10) return { tier: 'standard', intensity: 1, probability };
  if (probability >= 0.03) return { tier: 'lucky', intensity: 2, probability };
  if (probability >= 0.01) return { tier: 'rare', intensity: 3, probability };
  if (probability >= 0.001) return { tier: 'exceptional', intensity: 4, probability };
  return { tier: 'extraordinary', intensity: 4, probability };
};

export const getRewardRevealIntensity = (
  credit: CreditReveal,
  key: KeyReveal | null,
  restored: boolean,
): 0 | 1 | 2 | 3 | 4 => {
  if (restored) return 0;
  return Math.max(credit.intensity, key?.intensity ?? 0) as 0 | 1 | 2 | 3 | 4;
};

