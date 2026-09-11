import { describe, expect, it } from 'vitest';
import { createTaktBackup, parseTaktBackup } from './backup';
import { createDefaultRewardsLabState } from './features/rewards-lab/domain';
import { INITIAL_STATE } from './types';

describe('Takt backup container', () => {
  const rewards = {
    schemaVersion: 1 as const,
    enabled: false,
    state: createDefaultRewardsLabState(),
    legacyLabArchive: null,
  };

  it('wraps planner and rewards data in an explicit versioned container', () => {
    const backup = createTaktBackup(INITIAL_STATE, rewards, '2026-09-11T08:00:00.000Z');

    expect(backup).toMatchObject({
      format: 'takt-backup',
      backupVersion: 1,
      exportedAt: '2026-09-11T08:00:00.000Z',
      planner: INITIAL_STATE,
      rewards,
    });
    expect(parseTaktBackup(backup)).toEqual({ planner: INITIAL_STATE, rewards, legacy: false });
  });

  it('keeps pre-6.0 planner-only backups importable', () => {
    expect(parseTaktBackup(INITIAL_STATE)).toEqual({ planner: INITIAL_STATE, rewards: null, legacy: true });
  });

  it('rejects unsupported container versions instead of guessing', () => {
    expect(parseTaktBackup({ format: 'takt-backup', backupVersion: 99, planner: {}, rewards: {} })).toBeNull();
  });
});
