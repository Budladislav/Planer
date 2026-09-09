import { describe, expect, it } from 'vitest';
import controlsSource from './features/rewards-lab/ui/ActiveRewardGradeControls.tsx?raw';

describe('quick task grade control', () => {
  it('uses only an upward arrow and hides the control at the mythic ceiling', () => {
    const incrementControl = controlsSource.slice(
      controlsSource.indexOf('export const ActiveRewardGradeIncrementButton'),
      controlsSource.indexOf('export const ActiveRewardCompletionMeta'),
    );

    expect(incrementControl).toContain('if (!nextGrade) return null;');
    expect(incrementControl).toContain('<ChevronUp className="h-3.5 w-3.5"');
    expect(incrementControl).not.toContain('rotate-45');
    expect(incrementControl).not.toContain('GRADE_STYLES[grade].dot');
  });
});
