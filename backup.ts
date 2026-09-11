import type { RewardsBackupPayload } from './features/rewards-lab/storage';
import type { AppState } from './types';

export const TAKT_BACKUP_FORMAT = 'takt-backup' as const;
export const TAKT_BACKUP_VERSION = 1 as const;

export interface TaktBackup {
  format: typeof TAKT_BACKUP_FORMAT;
  backupVersion: typeof TAKT_BACKUP_VERSION;
  exportedAt: string;
  planner: AppState;
  rewards: RewardsBackupPayload;
}

export interface ParsedTaktBackup {
  planner: unknown;
  rewards: unknown | null;
  legacy: boolean;
}

const isRecord = (value: unknown): value is Record<string, unknown> => (
  typeof value === 'object' && value !== null && !Array.isArray(value)
);

export const createTaktBackup = (
  planner: AppState,
  rewards: RewardsBackupPayload,
  exportedAt = new Date().toISOString(),
): TaktBackup => ({
  format: TAKT_BACKUP_FORMAT,
  backupVersion: TAKT_BACKUP_VERSION,
  exportedAt,
  planner,
  rewards,
});

export const parseTaktBackup = (value: unknown): ParsedTaktBackup | null => {
  if (!isRecord(value)) return null;

  if (Object.prototype.hasOwnProperty.call(value, 'format')) {
    if (value.format !== TAKT_BACKUP_FORMAT || value.backupVersion !== TAKT_BACKUP_VERSION
      || typeof value.exportedAt !== 'string' || !isRecord(value.planner)
      || !isRecord(value.rewards)) return null;
    return { planner: value.planner, rewards: value.rewards, legacy: false };
  }

  // Backups made before 6.0 contained the planner state at the root.
  return { planner: value, rewards: null, legacy: true };
};
