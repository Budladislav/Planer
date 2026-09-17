import { describe, expect, it } from 'vitest';
import {
  DEFAULT_NAVIGATION_ITEMS,
  getImmediatelyVisibleNavigationItems,
  getMobileNavigationCapacity,
  normalizeNavigationItems,
  normalizeStartupView,
  resetHorizontalNavigationScroll,
  shouldCenterMobileNavigation,
} from './navigation';
import layoutSource from './components/Layout.tsx?raw';

describe('adaptive navigation', () => {
  it('normalizes configured items without duplicates and restores a safe default', () => {
    expect(normalizeNavigationItems(['month', 'today', 'month', 'unknown'])).toEqual(['month', 'today']);
    expect(normalizeNavigationItems([])).toEqual(DEFAULT_NAVIGATION_ITEMS);
  });

  it('fits more fixed-width tabs as the viewport grows', () => {
    expect(getMobileNavigationCapacity(320)).toBe(4);
    expect(getMobileNavigationCapacity(360)).toBe(5);
    expect(getMobileNavigationCapacity(768)).toBe(10);
  });

  it('uses the configured order for the immediately visible segment', () => {
    expect(getImmediatelyVisibleNavigationItems(['year', 'month', 'week', 'today', 'events'], 360))
      .toEqual(['year', 'month', 'week', 'today']);
  });

  it('centers a short mobile menu but keeps a full or scrollable menu aligned for overflow', () => {
    expect(shouldCenterMobileNavigation(['today', 'week'], 360)).toBe(true);
    expect(shouldCenterMobileNavigation(['today', 'week', 'month', 'year'], 360)).toBe(false);
    expect(shouldCenterMobileNavigation(['today', 'week', 'month', 'year', 'events'], 360)).toBe(false);
  });

  it('accepts every configurable section as a start page and falls back to Today', () => {
    expect(normalizeStartupView('goals')).toBe('goals');
    expect(normalizeStartupView('weekly-template')).toBe('weekly-template');
    expect(normalizeStartupView('rewards')).toBe('rewards');
    expect(normalizeStartupView('settings')).toBe('today');
    expect(normalizeStartupView(null)).toBe('today');
  });

  it('clips the scrollable mobile tabs behind a separate fixed Settings slot', () => {
    expect(layoutSource).toContain('className="relative z-20 flex-none overflow-hidden bg-white"');
    expect(layoutSource).toContain('relative z-0 overflow-hidden');
    expect(layoutSource).toContain('mobile-nav-scroll');
  });

  it('resets a restored nested scroll position to the configured first item', () => {
    const scrollContainer = { scrollLeft: 212 };

    resetHorizontalNavigationScroll(scrollContainer);

    expect(scrollContainer.scrollLeft).toBe(0);
    expect(layoutSource).toContain('React.useLayoutEffect');
    expect(layoutSource).toContain('[navigationConfigurationKey, updateScrollEdges]');
  });
});
