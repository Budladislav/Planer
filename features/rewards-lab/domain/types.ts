export const REWARDS_LAB_SCHEMA_VERSION = 1 as const;
export const REWARDS_ECONOMY_VERSION = 1 as const;

export const REWARD_GRADES = {
  common: { label: 'Common', multiplier: 1, color: 'gray' },
  uncommon: { label: 'Uncommon', multiplier: 1.5, color: 'green' },
  rare: { label: 'Rare', multiplier: 2, color: 'blue' },
  legendary: { label: 'Legendary', multiplier: 3, color: 'gold' },
  mythic: { label: 'Mythic', multiplier: 5, color: 'red' },
} as const;

export type RewardGrade = keyof typeof REWARD_GRADES;
export type RewardRoll = 2 | 3 | 4;

export interface FairBagState {
  remaining: RewardRoll[];
  cycle: number;
}

export interface RewardClaim {
  id: string;
  taskId: string;
  taskTitle: string;
  completedAt: string;
  grade: RewardGrade;
  multiplier: number;
  roll: RewardRoll;
  amount: number;
  economyVersion: typeof REWARDS_ECONOMY_VERSION;
  createdAt: string;
}

export type WalletTransactionKind =
  | 'earn'
  | 'reverse'
  | 'restore'
  | 'spend'
  | 'refund'
  | 'adjustment';

export interface WalletTransaction {
  id: string;
  kind: WalletTransactionKind;
  amount: number;
  occurredAt: string;
  label: string;
  taskId?: string;
  claimId?: string;
  rewardId?: string;
  relatedTransactionId?: string;
}

export interface RewardDefinition {
  id: string;
  title: string;
  cost: number;
  note: string;
  active: boolean;
  repeatable: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface RewardsLabMetrics {
  labOpenCount: number;
  redemptionCount: number;
  lastOpenedAt: string | null;
  lastRedeemedAt: string | null;
}

export interface RewardsLabState {
  schemaVersion: typeof REWARDS_LAB_SCHEMA_VERSION;
  currencyName: string;
  animationsEnabled: boolean;
  taskGrades: Record<string, Exclude<RewardGrade, 'common'>>;
  fairBag: FairBagState;
  claims: Record<string, RewardClaim>;
  ledger: WalletTransaction[];
  rewards: RewardDefinition[];
  metrics: RewardsLabMetrics;
}

export interface ExperimentFlags {
  rewardsLab: boolean;
}

export interface EconomyRuntime {
  now?: () => string;
  createId?: () => string;
  random?: () => number;
}

export const createDefaultRewardsLabState = (): RewardsLabState => ({
  schemaVersion: REWARDS_LAB_SCHEMA_VERSION,
  currencyName: 'Tokens',
  animationsEnabled: true,
  taskGrades: {},
  fairBag: { remaining: [], cycle: 0 },
  claims: {},
  ledger: [],
  rewards: [],
  metrics: {
    labOpenCount: 0,
    redemptionCount: 0,
    lastOpenedAt: null,
    lastRedeemedAt: null,
  },
});

export const DEFAULT_EXPERIMENT_FLAGS: ExperimentFlags = {
  rewardsLab: false,
};
