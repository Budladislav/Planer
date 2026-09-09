import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import hostSource from './features/rewards-lab/ui/RewardsLabActiveHost.tsx?raw';

const stylesSource = readFileSync(new URL('./index.css', import.meta.url), 'utf8');

describe('reward reveal UI', () => {
  it('shows maximum credits, exact key chance and protected randomness honestly', () => {
    expect(hostSource).toContain("creditReveal?.maximum");
    expect(hostSource).toContain('>MAX</span>');
    expect(hostSource.indexOf('+{toast.amount}')).toBeLessThan(hostSource.indexOf('>MAX</span>'));
    expect(hostSource).toContain('classifyKeyReveal(toast.grade, toast.keyGrade, toast.keyDropWasProtected)');
    expect(hostSource).toContain("t('chance {chance}'");
    expect(hostSource).toContain("guaranteed: 'Guaranteed key'");
    expect(hostSource).toContain('standard: null');
    expect(hostSource).not.toContain("standard: 'Key drop'");
  });

  it('suppresses celebration for restored results and disabled animation', () => {
    expect(hostSource).toContain("toast.kind === 'restored'");
    expect(hostSource).toContain("animationsDisabled || toast.kind === 'restored'");
    expect(stylesSource).toContain('.rewards-toast-static::before');
    expect(stylesSource).toContain('@media (prefers-reduced-motion: reduce)');
    expect(stylesSource).toContain('animation: none !important');
  });
});
