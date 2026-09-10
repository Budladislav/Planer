import { describe, expect, it } from 'vitest';
import {
  DEFAULT_NAVIGATION_ITEMS,
  getImmediatelyVisibleNavigationItems,
  getMobileNavigationCapacity,
  normalizeNavigationItems,
} from './navigation';

describe('adaptive navigation', () => {
  it('normalizes configured items without duplicates and restores a safe default', () => {
    expect(normalizeNavigationItems(['month', 'today', 'month', 'unknown'])).toEqual(['month', 'today']);
    expect(normalizeNavigationItems([])).toEqual(DEFAULT_NAVIGATION_ITEMS);
  });

  it('fits more fixed-width tabs as the viewport grows', () => {
    expect(getMobileNavigationCapacity(320)).toBe(4);
    expect(getMobileNavigationCapacity(360)).toBe(5);
    expect(getMobileNavigationCapacity(768)).toBe(9);
  });

  it('uses the configured order for the immediately visible segment', () => {
    expect(getImmediatelyVisibleNavigationItems(['year', 'month', 'week', 'today', 'events'], 360))
      .toEqual(['year', 'month', 'week', 'today']);
  });
});
