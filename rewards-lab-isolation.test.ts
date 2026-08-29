import { describe, expect, it } from 'vitest';
import { migrateAppState } from './state';
import { INITIAL_STATE } from './types';

describe('Rewards Lab planner isolation', () => {
  it('drops experimental root and task fields from imported planner data', () => {
    const imported = {
      ...INITIAL_STATE,
      rewardsLab: { balance: 999, grade: 'mythic' },
      tasks: [{
        id: 'task-1',
        title: 'Planner task',
        status: 'todo',
        plan: { day: '2099-01-01', week: '2099-W01', month: '2099-01' },
        projectId: null,
        eventId: null,
        createdAt: '2026-08-28T10:00:00.000Z',
        updatedAt: '2026-08-28T10:00:00.000Z',
        completedAt: null,
        rewardGrade: 'mythic',
      }],
    };

    const migrated = migrateAppState(imported);
    const serializedBackup = JSON.stringify(migrated);

    expect(migrated).not.toHaveProperty('rewardsLab');
    expect(migrated.tasks[0]).not.toHaveProperty('rewardGrade');
    expect(serializedBackup).not.toContain('rewardsLab');
    expect(serializedBackup).not.toContain('rewardGrade');
  });
});
