import { describe, expect, it } from 'vitest';
import layoutSource from './components/Layout.tsx?raw';
import primitivesSource from './components/ui/Primitives.tsx?raw';

const viewSources = import.meta.glob('./components/views/*.tsx', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>;

describe('compact planner hierarchy', () => {
  it('does not repeat navigation labels as page headers', () => {
    expect(primitivesSource).not.toContain('PageHeader');
    Object.values(viewSources).forEach(source => {
      expect(source).not.toContain('<PageHeader');
      expect(source).not.toContain('<h1');
    });
  });

  it('places Calendar before Month in the primary navigation', () => {
    const calendar = layoutSource.indexOf("{ view: 'events'");
    const month = layoutSource.indexOf("{ view: 'month'");
    expect(calendar).toBeGreaterThan(-1);
    expect(calendar).toBeLessThan(month);
  });
});
