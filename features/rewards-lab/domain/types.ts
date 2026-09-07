export const REWARDS_LAB_SCHEMA_VERSION = 3 as const;
export const REWARDS_ECONOMY_VERSION = 3 as const;
export const REWARDS_ECONOMY_V3_RELEASED_AT = '2026-09-07T00:00:00.000Z';

export const REWARD_GRADES = {
  common: { label: 'Common', min: 1, max: 2, color: 'gray', legacyMultiplier: 1 },
  uncommon: { label: 'Uncommon', min: 3, max: 4, color: 'green', legacyMultiplier: 1.5 },
  rare: { label: 'Rare', min: 5, max: 8, color: 'blue', legacyMultiplier: 2 },
  legendary: { label: 'Legendary', min: 9, max: 15, color: 'gold', legacyMultiplier: 3 },
  mythic: { label: 'Mythic', min: 16, max: 30, color: 'red', legacyMultiplier: 5 },
} as const;

export type RewardGrade = keyof typeof REWARD_GRADES;
export type RewardRoll = 2 | 3 | 4;
export type RewardLuckSlot = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;
export type RewardsEconomyVersion = 1 | 2 | typeof REWARDS_ECONOMY_VERSION;

export interface FairBagState {
  remaining: RewardLuckSlot[];
  cycle: number;
}

export interface KeyDropState {
  dryStreak: number;
}

interface RewardClaimBase {
  id: string;
  taskId: string;
  taskTitle: string;
  completedAt: string;
  grade: RewardGrade;
  amount: number;
  createdAt: string;
}

export interface LegacyRewardClaim extends RewardClaimBase {
  economyVersion: 1;
  multiplier: number;
  roll: RewardRoll;
}

export interface RewardClaimV2 extends RewardClaimBase {
  economyVersion: 2;
  luckSlot: RewardLuckSlot;
}

export interface RewardClaimV3 extends RewardClaimBase {
  economyVersion: typeof REWARDS_ECONOMY_VERSION;
  luckSlot: RewardLuckSlot;
  keyId: string | null;
}

export type RewardClaim = LegacyRewardClaim | RewardClaimV2 | RewardClaimV3;

export interface RewardGradeCorrection {
  id: string;
  claimId: string;
  taskId: string;
  fromGrade: RewardGrade;
  toGrade: RewardGrade;
  previousAmount: number;
  amount: number;
  economyVersion: RewardsEconomyVersion;
  occurredAt: string;
}

export type RewardKeyStatus = 'available' | 'suspended' | 'spent' | 'upgraded' | 'reversed';

export interface RewardKey {
  id: string;
  grade: RewardGrade;
  status: RewardKeyStatus;
  createdAt: string;
  sourceClaimId?: string;
  sourceTaskId?: string;
  sourceUpgradeId?: string;
  consumedByTransactionId?: string;
  consumedByUpgradeId?: string;
}

export interface RewardKeyUpgrade {
  id: string;
  fromGrade: RewardGrade;
  toGrade: RewardGrade;
  inputKeyIds: string[];
  outputKeyId: string;
  occurredAt: string;
  reversedAt: string | null;
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
  purchaseId?: string;
  keyId?: string;
  relatedTransactionId?: string;
  economyVersion?: RewardsEconomyVersion;
}

export interface RewardLimitSettings {
  cooldownDays: number;
  limitCount: number | null;
  limitWindowDays: number | null;
  limitGroup: string;
}

export interface RewardDefinition extends RewardLimitSettings {
  id: string;
  title: string;
  cost: number;
  variableCost: boolean;
  grade: RewardGrade;
  note: string;
  active: boolean;
  repeatable: boolean;
  starterTemplateId?: string;
  createdAt: string;
  updatedAt: string;
}

export type PurchaseStatus = 'considering' | 'wanted' | 'ready' | 'purchased' | 'rejected';

export interface PurchasePriceEntry {
  amount: number;
  recordedAt: string;
}

export interface PurchaseItem extends RewardLimitSettings {
  id: string;
  title: string;
  url: string;
  note: string;
  estimatedCost: number;
  priceMin: number | null;
  priceMax: number | null;
  grade: RewardGrade;
  status: PurchaseStatus;
  priceHistory: PurchasePriceEntry[];
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
  economyVersion: typeof REWARDS_ECONOMY_VERSION;
  economyActivatedAt: string;
  currencyName: string;
  animationsEnabled: boolean;
  taskGrades: Record<string, Exclude<RewardGrade, 'common'>>;
  fairBag: FairBagState;
  keyDropState: KeyDropState;
  claims: Record<string, RewardClaim>;
  gradeCorrections: RewardGradeCorrection[];
  ledger: WalletTransaction[];
  keys: RewardKey[];
  keyUpgrades: RewardKeyUpgrade[];
  rewards: RewardDefinition[];
  purchases: PurchaseItem[];
  starterCatalogInstalled: boolean;
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
  economyVersion: REWARDS_ECONOMY_VERSION,
  economyActivatedAt: REWARDS_ECONOMY_V3_RELEASED_AT,
  currencyName: 'Креды',
  animationsEnabled: true,
  taskGrades: {},
  fairBag: { remaining: [], cycle: 0 },
  keyDropState: { dryStreak: 0 },
  claims: {},
  gradeCorrections: [],
  ledger: [],
  keys: [],
  keyUpgrades: [],
  rewards: [],
  purchases: [],
  starterCatalogInstalled: false,
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
