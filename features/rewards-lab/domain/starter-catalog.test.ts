import { describe, expect, it } from 'vitest';
import { addRewardDefinition, createDefaultRewardsLabState, installStarterCatalog } from '.';

const runtime = () => {
  let id = 0;
  return {
    now: () => '2026-09-07T00:00:00.000Z',
    createId: () => `id-${++id}`,
  };
};

describe('starter reward catalog', () => {
  it('creates the agreed editable skeleton with grades and limits', () => {
    const installed = installStarterCatalog(createDefaultRewardsLabState(), runtime());
    expect(installed.added).toHaveLength(22);
    expect(installed.state.starterCatalogInstalled).toBe(true);
    expect(installed.state.rewards.find(item => item.starterTemplateId === 'song')).toMatchObject({
      title: 'Одна выбранная песня', cost: 2, grade: 'common', limitCount: 3, limitWindowDays: 1,
    });
    expect(installed.state.rewards.find(item => item.starterTemplateId === 'cinema')).toMatchObject({
      variableCost: true, grade: 'rare', cooldownDays: 7, limitCount: 2, limitWindowDays: 30,
    });
  });

  it('does not duplicate templates or same-title user rewards', () => {
    const custom = addRewardDefinition(createDefaultRewardsLabState(), {
      title: 'Кинотеатр', cost: 12, grade: 'rare',
    }, runtime()).state;
    const first = installStarterCatalog(custom, runtime());
    expect(first.added).toHaveLength(21);
    expect(first.state.rewards.filter(item => item.title === 'Кинотеатр')).toHaveLength(1);
    expect(installStarterCatalog(first.state, runtime()).added).toHaveLength(0);
  });
});
