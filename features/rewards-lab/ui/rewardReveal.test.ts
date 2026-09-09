import { describe, expect, it } from 'vitest';
import {
  classifyCreditReveal,
  classifyKeyReveal,
  getRewardRevealIntensity,
} from './rewardReveal';

describe('reward reveal presentation', () => {
  it('keeps a minimum credit result quiet and marks the exact maximum', () => {
    expect(classifyCreditReveal('rare', 5)).toEqual({ tier: 'minimum', intensity: 0, maximum: false });
    expect(classifyCreditReveal('rare', 6)).toEqual({ tier: 'good', intensity: 1, maximum: false });
    expect(classifyCreditReveal('rare', 7)).toEqual({ tier: 'high', intensity: 2, maximum: false });
    expect(classifyCreditReveal('rare', 8)).toEqual({ tier: 'maximum', intensity: 3, maximum: true });
  });

  it('makes maximum results more expressive for higher task grades', () => {
    expect(classifyCreditReveal('common', 2).intensity).toBe(2);
    expect(classifyCreditReveal('uncommon', 4).intensity).toBe(2);
    expect(classifyCreditReveal('legendary', 15).intensity).toBe(3);
    expect(classifyCreditReveal('mythic', 30).intensity).toBe(4);
  });

  it('classifies a key by its exact chance for the completed task grade', () => {
    expect(classifyKeyReveal('common', 'common')).toEqual({ tier: 'standard', intensity: 1, probability: 0.20 });
    expect(classifyKeyReveal('common', 'uncommon')).toEqual({ tier: 'lucky', intensity: 2, probability: 0.08 });
    expect(classifyKeyReveal('common', 'rare')).toEqual({ tier: 'rare', intensity: 3, probability: 0.02 });
    expect(classifyKeyReveal('common', 'legendary')).toEqual({ tier: 'exceptional', intensity: 4, probability: 0.003 });
    expect(classifyKeyReveal('common', 'mythic')).toEqual({ tier: 'extraordinary', intensity: 4, probability: 0.0005 });
  });

  it('labels protected randomness as a guarantee instead of luck', () => {
    expect(classifyKeyReveal('common', 'common', true)).toEqual({
      tier: 'guaranteed', intensity: 1, probability: null,
    });
  });

  it('keeps a restored result calm even when its original drop was rare', () => {
    const credit = classifyCreditReveal('mythic', 30);
    const key = classifyKeyReveal('common', 'mythic');
    expect(getRewardRevealIntensity(credit, key, true)).toBe(0);
    expect(getRewardRevealIntensity(credit, key, false)).toBe(4);
  });
});

