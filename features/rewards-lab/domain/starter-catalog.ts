import { EconomyRuntime, RewardDefinition, RewardsLabState } from './types';
import { RewardDefinitionInput, addRewardDefinition } from './economy';

export const STARTER_REWARD_TEMPLATES: readonly RewardDefinitionInput[] = [
  { starterTemplateId: 'song', title: 'Одна выбранная песня', cost: 2, grade: 'common', limitCount: 3, limitWindowDays: 1 },
  { starterTemplateId: 'clip', title: 'Один музыкальный клип', cost: 5, grade: 'common', limitCount: 2, limitWindowDays: 1 },
  { starterTemplateId: 'sweet', title: 'Шоколад или конфета', cost: 5, grade: 'common' },
  { starterTemplateId: 'game-30', title: 'Игра — 30 минут', cost: 6, grade: 'common', limitCount: 3, limitWindowDays: 7, limitGroup: 'games' },

  { starterTemplateId: 'game-60', title: 'Игра — 60 минут', cost: 11, grade: 'uncommon', limitCount: 3, limitWindowDays: 7, limitGroup: 'games' },
  { starterTemplateId: 'car-music', title: 'Музыка в машине до конца дня', cost: 20, grade: 'uncommon', cooldownDays: 1, limitCount: 3, limitWindowDays: 7, limitGroup: 'car-music' },
  { starterTemplateId: 'premium-small', title: 'Премиальная версия небольшой покупки', cost: 5, variableCost: true, grade: 'uncommon' },
  { starterTemplateId: 'cosmetic-ritual', title: 'Дополнительный косметический ритуал', cost: 5, variableCost: true, grade: 'uncommon' },

  { starterTemplateId: 'game-120', title: 'Игра — 120 минут', cost: 18, grade: 'rare', limitCount: 3, limitWindowDays: 7, limitGroup: 'games' },
  { starterTemplateId: 'cafe', title: 'Кафе', cost: 10, variableCost: true, grade: 'rare', cooldownDays: 3, limitCount: 4, limitWindowDays: 30, limitGroup: 'cafe' },
  { starterTemplateId: 'cinema', title: 'Кинотеатр', cost: 15, variableCost: true, grade: 'rare', cooldownDays: 7, limitCount: 2, limitWindowDays: 30, limitGroup: 'cinema' },
  { starterTemplateId: 'manicure', title: 'Маникюр в салоне', cost: 30, variableCost: true, grade: 'rare', cooldownDays: 21, limitCount: 2, limitWindowDays: 60, limitGroup: 'manicure' },
  { starterTemplateId: 'paid-event', title: 'Платное развлекательное мероприятие', cost: 30, variableCost: true, grade: 'rare' },
  { starterTemplateId: 'small-hobby', title: 'Небольшая покупка для хобби', cost: 30, variableCost: true, grade: 'rare' },

  { starterTemplateId: 'notable-event', title: 'Значимое платное мероприятие', cost: 60, variableCost: true, grade: 'legendary' },
  { starterTemplateId: 'premium-entertainment', title: 'Более дорогой формат развлечения', cost: 75, variableCost: true, grade: 'legendary' },
  { starterTemplateId: 'hobby-upgrade', title: 'Существенный апгрейд для хобби', cost: 100, variableCost: true, grade: 'legendary' },
  { starterTemplateId: 'medium-purchase', title: 'Необязательная покупка среднего размера', cost: 100, variableCost: true, grade: 'legendary', cooldownDays: 30, limitCount: 1, limitWindowDays: 60, limitGroup: 'large-purchases' },
  { starterTemplateId: 'premium-upgrade', title: 'Премиальная версия заметной покупки', cost: 50, variableCost: true, grade: 'legendary' },

  { starterTemplateId: 'electronics', title: 'Ноутбук или электроника', cost: 800, variableCost: true, grade: 'mythic', cooldownDays: 60, limitCount: 1, limitWindowDays: 60, limitGroup: 'large-purchases' },
  { starterTemplateId: 'large-purchase', title: 'Крупная необязательная покупка', cost: 500, variableCost: true, grade: 'mythic', cooldownDays: 60, limitCount: 1, limitWindowDays: 60, limitGroup: 'large-purchases' },
  { starterTemplateId: 'major-hobby', title: 'Большой апгрейд для хобби', cost: 300, variableCost: true, grade: 'mythic', cooldownDays: 30, limitCount: 1, limitWindowDays: 60, limitGroup: 'large-purchases' },
] as const;

const normalizedTitle = (value: string): string => value.trim().toLocaleLowerCase('ru-RU');

export const installStarterCatalog = (
  state: RewardsLabState,
  runtime: EconomyRuntime = {},
): { state: RewardsLabState; added: RewardDefinition[] } => {
  const templateIds = new Set(state.rewards.flatMap(item => item.starterTemplateId ? [item.starterTemplateId] : []));
  const titles = new Set(state.rewards.map(item => normalizedTitle(item.title)));
  let nextState = state;
  const added: RewardDefinition[] = [];

  STARTER_REWARD_TEMPLATES.forEach(template => {
    if ((template.starterTemplateId && templateIds.has(template.starterTemplateId))
      || titles.has(normalizedTitle(template.title))) return;
    const result = addRewardDefinition(nextState, template, runtime);
    nextState = result.state;
    added.push(result.reward);
  });

  return {
    state: { ...nextState, starterCatalogInstalled: true },
    added,
  };
};
