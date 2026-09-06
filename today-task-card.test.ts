import { describe, expect, it } from 'vitest';
import todayViewSource from './components/views/Today.tsx?raw';

describe('Today task card presentation', () => {
  it('does not apply an implicit highlight to the first task', () => {
    expect(todayViewSource).not.toContain('isFirst');
    expect(todayViewSource).not.toContain('border-indigo-300');
  });
});
