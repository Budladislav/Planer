import type { PrimaryNavigationView } from './types';

export const PRIMARY_NAVIGATION_VIEWS: readonly PrimaryNavigationView[] = [
  'today',
  'week',
  'month',
  'year',
  'inbox',
  'weekly-template',
  'goals',
  'events',
] as const;

export const DEFAULT_NAVIGATION_ITEMS: PrimaryNavigationView[] = ['events', 'week', 'today'];
export const DEFAULT_STARTUP_VIEW: PrimaryNavigationView = 'today';

export const normalizeStartupView = (value: unknown): PrimaryNavigationView => (
  typeof value === 'string' && PRIMARY_NAVIGATION_VIEWS.includes(value as PrimaryNavigationView)
    ? value as PrimaryNavigationView
    : DEFAULT_STARTUP_VIEW
);

export const normalizeNavigationItems = (value: unknown): PrimaryNavigationView[] => {
  if (!Array.isArray(value)) return [...DEFAULT_NAVIGATION_ITEMS];
  const allowed = new Set<PrimaryNavigationView>(PRIMARY_NAVIGATION_VIEWS);
  const seen = new Set<PrimaryNavigationView>();
  const items = value.flatMap((candidate): PrimaryNavigationView[] => {
    if (typeof candidate !== 'string' || !allowed.has(candidate as PrimaryNavigationView)) return [];
    const view = candidate as PrimaryNavigationView;
    if (seen.has(view)) return [];
    seen.add(view);
    return [view];
  });
  return items.length > 0 ? items : [...DEFAULT_NAVIGATION_ITEMS];
};

/** Total number of tabs that fit without scrolling, including Settings. */
export const getMobileNavigationCapacity = (width: number): number => {
  if (!Number.isFinite(width) || width <= 0) return 4;
  const horizontalPadding = 8;
  const gap = 2;
  const minimumItemWidth = 68;
  const totalItems = Math.floor((width - horizontalPadding + gap) / (minimumItemWidth + gap));
  return Math.max(3, Math.min(PRIMARY_NAVIGATION_VIEWS.length + 1, totalItems));
};

export const getImmediatelyVisibleNavigationItems = (
  items: readonly PrimaryNavigationView[],
  width: number,
): PrimaryNavigationView[] => items.slice(0, Math.max(0, getMobileNavigationCapacity(width) - 1));

export const shouldCenterMobileNavigation = (
  items: readonly PrimaryNavigationView[],
  width: number,
): boolean => items.length + 1 < getMobileNavigationCapacity(width);
