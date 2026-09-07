import {
  DEFAULT_EXPERIMENT_FLAGS,
  ExperimentFlags,
  FairBagState,
  PurchaseItem,
  PurchaseStatus,
  REWARD_GRADES,
  REWARDS_ECONOMY_VERSION,
  REWARDS_LAB_SCHEMA_VERSION,
  RewardClaim,
  RewardDefinition,
  RewardGrade,
  RewardGradeCorrection,
  RewardKey,
  RewardKeyStatus,
  RewardKeyUpgrade,
  RewardLuckSlot,
  RewardRoll,
  RewardsEconomyVersion,
  RewardsLabMetrics,
  RewardsLabState,
  WalletTransaction,
  WalletTransactionKind,
  createDefaultRewardsLabState,
  getV2RewardAmount,
  installStarterCatalog,
} from '../domain';
import { REWARDS_LAB_EXPERIMENT_FLAGS_KEY } from '../contracts';
import { clearRewardsLabLifecycleOutbox } from '../outbox';

export const EXPERIMENT_FLAGS_STORAGE_KEY = REWARDS_LAB_EXPERIMENT_FLAGS_KEY;
export const REWARDS_LAB_STORAGE_KEY = 'monofocus:rewards-lab:v1';

export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

const isRecord = (value: unknown): value is Record<string, unknown> => (
  typeof value === 'object' && value !== null && !Array.isArray(value)
);
const nonEmptyString = (value: unknown): value is string => typeof value === 'string' && value.trim().length > 0;
const optionalString = (value: unknown): value is string | undefined => value === undefined || typeof value === 'string';
const nullableString = (value: unknown): value is string | null => value === null || typeof value === 'string';
const optionalPositiveInteger = (value: unknown): value is number | null | undefined => (
  value === undefined || value === null || (Number.isInteger(value) && Number(value) > 0)
);
const isRewardGrade = (value: unknown): value is RewardGrade => typeof value === 'string' && Object.hasOwn(REWARD_GRADES, value);
const isRewardRoll = (value: unknown): value is RewardRoll => value === 2 || value === 3 || value === 4;
const isRewardLuckSlot = (value: unknown): value is RewardLuckSlot => Number.isInteger(value) && Number(value) >= 0 && Number(value) <= 8;
const isEconomyVersion = (value: unknown): value is RewardsEconomyVersion => value === 1 || value === 2 || value === 3;

const safeParse = (serialized: string | null): unknown => {
  if (serialized === null) return null;
  try { return JSON.parse(serialized) as unknown; } catch { return null; }
};
const safeRead = (storage: StorageLike, key: string): unknown => {
  try { return safeParse(storage.getItem(key)); } catch { return null; }
};

export const loadExperimentFlags = (storage: StorageLike): ExperimentFlags => {
  const raw = safeRead(storage, EXPERIMENT_FLAGS_STORAGE_KEY);
  if (!isRecord(raw)) return { ...DEFAULT_EXPERIMENT_FLAGS };
  return { rewardsLab: raw.rewardsLab === true };
};

export const saveExperimentFlags = (storage: StorageLike, flags: ExperimentFlags): boolean => {
  try { storage.setItem(EXPERIMENT_FLAGS_STORAGE_KEY, JSON.stringify(flags)); return true; } catch { return false; }
};

export const setRewardsLabEnabled = (storage: StorageLike, enabled: boolean): boolean => (
  saveExperimentFlags(storage, { ...loadExperimentFlags(storage), rewardsLab: enabled })
);

const sanitizeTaskGrades = (value: unknown): RewardsLabState['taskGrades'] => {
  if (!isRecord(value)) return {};
  return Object.fromEntries(Object.entries(value).filter(
    ([taskId, grade]) => taskId.length > 0 && isRewardGrade(grade) && grade !== 'common',
  )) as RewardsLabState['taskGrades'];
};

const sanitizeFairBag = (value: unknown): FairBagState => {
  if (!isRecord(value) || !Array.isArray(value.remaining)) return { remaining: [], cycle: 0 };
  const remaining = value.remaining.filter(isRewardLuckSlot);
  const valid = remaining.length === value.remaining.length && remaining.length <= 9 && new Set(remaining).size === remaining.length;
  const cycle = Number.isInteger(value.cycle) && Number(value.cycle) >= 0 ? Number(value.cycle) : 0;
  return { remaining: valid ? remaining : [], cycle };
};

const sanitizeClaim = (value: unknown): RewardClaim | null => {
  if (!isRecord(value) || !nonEmptyString(value.id) || !nonEmptyString(value.taskId)
    || typeof value.taskTitle !== 'string' || !nonEmptyString(value.completedAt)
    || !isRewardGrade(value.grade) || !isEconomyVersion(value.economyVersion)
    || !nonEmptyString(value.createdAt)) return null;
  const base = {
    id: value.id, taskId: value.taskId, taskTitle: value.taskTitle,
    completedAt: value.completedAt, grade: value.grade, createdAt: value.createdAt,
  };
  if (value.economyVersion === 1) {
    if (!isRewardRoll(value.roll)) return null;
    const multiplier = REWARD_GRADES[value.grade].legacyMultiplier;
    const amount = Math.round(value.roll * multiplier);
    if (value.amount !== amount) return null;
    return { ...base, multiplier, roll: value.roll, amount, economyVersion: 1 };
  }
  if (!isRewardLuckSlot(value.luckSlot)) return null;
  const amount = getV2RewardAmount(value.grade, value.luckSlot);
  if (value.amount !== amount) return null;
  if (value.economyVersion === 2) return { ...base, luckSlot: value.luckSlot, amount, economyVersion: 2 };
  if (value.keyId !== null && !nonEmptyString(value.keyId)) return null;
  return { ...base, luckSlot: value.luckSlot, amount, economyVersion: 3, keyId: value.keyId };
};

const sanitizeClaims = (value: unknown): RewardsLabState['claims'] => {
  if (!isRecord(value)) return {};
  const claims: RewardsLabState['claims'] = {};
  const ids = new Set<string>();
  Object.entries(value).forEach(([taskId, rawClaim]) => {
    const claim = sanitizeClaim(rawClaim);
    if (!claim || claim.taskId !== taskId || ids.has(claim.id)) return;
    claims[taskId] = claim;
    ids.add(claim.id);
  });
  return claims;
};

const sanitizeGradeCorrection = (value: unknown): RewardGradeCorrection | null => {
  if (!isRecord(value) || !nonEmptyString(value.id) || !nonEmptyString(value.claimId)
    || !nonEmptyString(value.taskId) || !isRewardGrade(value.fromGrade) || !isRewardGrade(value.toGrade)
    || !Number.isInteger(value.previousAmount) || Number(value.previousAmount) <= 0
    || !Number.isInteger(value.amount) || Number(value.amount) <= 0
    || !isEconomyVersion(value.economyVersion) || !nonEmptyString(value.occurredAt)) return null;
  return {
    id: value.id, claimId: value.claimId, taskId: value.taskId,
    fromGrade: value.fromGrade, toGrade: value.toGrade,
    previousAmount: Number(value.previousAmount), amount: Number(value.amount),
    economyVersion: value.economyVersion, occurredAt: value.occurredAt,
  };
};

const sanitizeGradeCorrections = (value: unknown, claims: RewardsLabState['claims']): RewardGradeCorrection[] => {
  if (!Array.isArray(value)) return [];
  const claimIds = new Set(Object.values(claims).map(claim => claim.id));
  const ids = new Set<string>();
  return value.flatMap(raw => {
    const item = sanitizeGradeCorrection(raw);
    if (!item || ids.has(item.id) || !claimIds.has(item.claimId)) return [];
    const claim = claims[item.taskId];
    if (!claim || claim.id !== item.claimId || claim.economyVersion !== item.economyVersion) return [];
    ids.add(item.id);
    return [item];
  });
};

const TRANSACTION_KINDS = new Set<WalletTransactionKind>(['earn', 'reverse', 'restore', 'spend', 'refund', 'adjustment']);
const sanitizeTransaction = (value: unknown): WalletTransaction | null => {
  if (!isRecord(value) || !nonEmptyString(value.id) || typeof value.kind !== 'string'
    || !TRANSACTION_KINDS.has(value.kind as WalletTransactionKind)
    || !Number.isInteger(value.amount) || Number(value.amount) === 0
    || !nonEmptyString(value.occurredAt) || typeof value.label !== 'string'
    || !optionalString(value.taskId) || !optionalString(value.claimId)
    || !optionalString(value.rewardId) || !optionalString(value.purchaseId)
    || !optionalString(value.keyId) || !optionalString(value.relatedTransactionId)
    || (value.economyVersion !== undefined && !isEconomyVersion(value.economyVersion))) return null;
  return {
    id: value.id, kind: value.kind as WalletTransactionKind, amount: Number(value.amount),
    occurredAt: value.occurredAt, label: value.label,
    ...(value.taskId === undefined ? {} : { taskId: value.taskId }),
    ...(value.claimId === undefined ? {} : { claimId: value.claimId }),
    ...(value.rewardId === undefined ? {} : { rewardId: value.rewardId }),
    ...(value.purchaseId === undefined ? {} : { purchaseId: value.purchaseId }),
    ...(value.keyId === undefined ? {} : { keyId: value.keyId }),
    ...(value.relatedTransactionId === undefined ? {} : { relatedTransactionId: value.relatedTransactionId }),
    ...(value.economyVersion === undefined ? {} : { economyVersion: value.economyVersion }),
  };
};

const sanitizeLedger = (value: unknown): WalletTransaction[] => {
  if (!Array.isArray(value)) return [];
  const ids = new Set<string>();
  return value.flatMap(raw => {
    const item = sanitizeTransaction(raw);
    if (!item || ids.has(item.id)) return [];
    ids.add(item.id);
    return [item];
  });
};

const limitSettings = (value: Record<string, unknown>) => ({
  cooldownDays: Number.isInteger(value.cooldownDays) && Number(value.cooldownDays) >= 0 ? Number(value.cooldownDays) : 0,
  limitCount: optionalPositiveInteger(value.limitCount) ? value.limitCount ?? null : null,
  limitWindowDays: optionalPositiveInteger(value.limitWindowDays) ? value.limitWindowDays ?? null : null,
  limitGroup: typeof value.limitGroup === 'string' ? value.limitGroup.trim().slice(0, 60) : '',
});

const sanitizeReward = (value: unknown): RewardDefinition | null => {
  if (!isRecord(value) || !nonEmptyString(value.id) || !nonEmptyString(value.title)
    || !Number.isInteger(value.cost) || Number(value.cost) <= 0
    || typeof value.note !== 'string' || typeof value.active !== 'boolean'
    || typeof value.repeatable !== 'boolean' || !nonEmptyString(value.createdAt)
    || !nonEmptyString(value.updatedAt)) return null;
  return {
    id: value.id, title: value.title, cost: Number(value.cost), note: value.note,
    active: value.active, repeatable: value.repeatable,
    variableCost: typeof value.variableCost === 'boolean' ? value.variableCost : false,
    grade: isRewardGrade(value.grade) ? value.grade : 'common',
    ...limitSettings(value),
    ...(nonEmptyString(value.starterTemplateId) ? { starterTemplateId: value.starterTemplateId } : {}),
    createdAt: value.createdAt, updatedAt: value.updatedAt,
  };
};

const sanitizeRewards = (value: unknown): RewardDefinition[] => {
  if (!Array.isArray(value)) return [];
  const ids = new Set<string>();
  return value.flatMap(raw => {
    const item = sanitizeReward(raw);
    if (!item || ids.has(item.id)) return [];
    ids.add(item.id);
    return [item];
  });
};

const KEY_STATUSES = new Set<RewardKeyStatus>(['available', 'suspended', 'spent', 'upgraded', 'reversed']);
const sanitizeKey = (value: unknown): RewardKey | null => {
  if (!isRecord(value) || !nonEmptyString(value.id) || !isRewardGrade(value.grade)
    || typeof value.status !== 'string' || !KEY_STATUSES.has(value.status as RewardKeyStatus)
    || !nonEmptyString(value.createdAt) || !optionalString(value.sourceClaimId)
    || !optionalString(value.sourceTaskId) || !optionalString(value.sourceUpgradeId)
    || !optionalString(value.consumedByTransactionId) || !optionalString(value.consumedByUpgradeId)) return null;
  return {
    id: value.id, grade: value.grade, status: value.status as RewardKeyStatus, createdAt: value.createdAt,
    ...(value.sourceClaimId ? { sourceClaimId: value.sourceClaimId } : {}),
    ...(value.sourceTaskId ? { sourceTaskId: value.sourceTaskId } : {}),
    ...(value.sourceUpgradeId ? { sourceUpgradeId: value.sourceUpgradeId } : {}),
    ...(value.consumedByTransactionId ? { consumedByTransactionId: value.consumedByTransactionId } : {}),
    ...(value.consumedByUpgradeId ? { consumedByUpgradeId: value.consumedByUpgradeId } : {}),
  };
};

const sanitizeKeys = (value: unknown): RewardKey[] => {
  if (!Array.isArray(value)) return [];
  const ids = new Set<string>();
  return value.flatMap(raw => {
    const item = sanitizeKey(raw);
    if (!item || ids.has(item.id)) return [];
    ids.add(item.id);
    return [item];
  });
};

const sanitizeKeyUpgrades = (value: unknown, keys: RewardKey[]): RewardKeyUpgrade[] => {
  if (!Array.isArray(value)) return [];
  const keyIds = new Set(keys.map(key => key.id));
  const ids = new Set<string>();
  return value.flatMap(raw => {
    if (!isRecord(raw) || !nonEmptyString(raw.id) || !isRewardGrade(raw.fromGrade)
      || !isRewardGrade(raw.toGrade) || !Array.isArray(raw.inputKeyIds)
      || raw.inputKeyIds.length !== 5 || !raw.inputKeyIds.every(nonEmptyString)
      || new Set(raw.inputKeyIds).size !== 5 || !nonEmptyString(raw.outputKeyId)
      || !nonEmptyString(raw.occurredAt) || !nullableString(raw.reversedAt)
      || ids.has(raw.id) || !raw.inputKeyIds.every(id => keyIds.has(id)) || !keyIds.has(raw.outputKeyId)) return [];
    ids.add(raw.id);
    return [{
      id: raw.id, fromGrade: raw.fromGrade, toGrade: raw.toGrade,
      inputKeyIds: raw.inputKeyIds, outputKeyId: raw.outputKeyId,
      occurredAt: raw.occurredAt, reversedAt: raw.reversedAt,
    }];
  });
};

const PURCHASE_STATUSES = new Set<PurchaseStatus>(['considering', 'wanted', 'ready', 'purchased', 'rejected']);
const sanitizePurchase = (value: unknown): PurchaseItem | null => {
  if (!isRecord(value) || !nonEmptyString(value.id) || !nonEmptyString(value.title)
    || typeof value.url !== 'string' || typeof value.note !== 'string'
    || !Number.isInteger(value.estimatedCost) || Number(value.estimatedCost) <= 0
    || !optionalPositiveInteger(value.priceMin) || !optionalPositiveInteger(value.priceMax)
    || !isRewardGrade(value.grade) || typeof value.status !== 'string'
    || !PURCHASE_STATUSES.has(value.status as PurchaseStatus) || !Array.isArray(value.priceHistory)
    || !nonEmptyString(value.createdAt) || !nonEmptyString(value.updatedAt)) return null;
  const priceHistory = value.priceHistory.flatMap(entry => {
    if (!isRecord(entry) || !Number.isInteger(entry.amount) || Number(entry.amount) <= 0 || !nonEmptyString(entry.recordedAt)) return [];
    return [{ amount: Number(entry.amount), recordedAt: entry.recordedAt }];
  });
  return {
    id: value.id, title: value.title, url: value.url, note: value.note,
    estimatedCost: Number(value.estimatedCost), priceMin: value.priceMin ?? null,
    priceMax: value.priceMax ?? null, grade: value.grade,
    status: value.status as PurchaseStatus, priceHistory,
    ...limitSettings(value), createdAt: value.createdAt, updatedAt: value.updatedAt,
  };
};

const sanitizePurchases = (value: unknown): PurchaseItem[] => {
  if (!Array.isArray(value)) return [];
  const ids = new Set<string>();
  return value.flatMap(raw => {
    const item = sanitizePurchase(raw);
    if (!item || ids.has(item.id)) return [];
    ids.add(item.id);
    return [item];
  });
};

const sanitizeMetrics = (value: unknown): RewardsLabMetrics => {
  const defaults = createDefaultRewardsLabState().metrics;
  if (!isRecord(value)) return defaults;
  return {
    labOpenCount: Number.isInteger(value.labOpenCount) && Number(value.labOpenCount) >= 0 ? Number(value.labOpenCount) : 0,
    redemptionCount: Number.isInteger(value.redemptionCount) && Number(value.redemptionCount) >= 0 ? Number(value.redemptionCount) : 0,
    lastOpenedAt: nullableString(value.lastOpenedAt) ? value.lastOpenedAt : null,
    lastRedeemedAt: nullableString(value.lastRedeemedAt) ? value.lastRedeemedAt : null,
  };
};

const withStarterCatalogWhenEmpty = (state: RewardsLabState): RewardsLabState => (
  !state.starterCatalogInstalled && state.rewards.length === 0
    ? installStarterCatalog(state, {
        now: () => state.economyActivatedAt,
        createId: (() => { let index = 0; return () => `starter-${++index}`; })(),
      }).state
    : state
);

export const sanitizeRewardsLabState = (value: unknown): RewardsLabState => {
  const defaults = createDefaultRewardsLabState();
  if (!isRecord(value) || (value.schemaVersion !== 1 && value.schemaVersion !== 2 && value.schemaVersion !== 3)) {
    return withStarterCatalogWhenEmpty(defaults);
  }
  const previousSchema = Number(value.schemaVersion);
  const claims = sanitizeClaims(value.claims);
  const keys = previousSchema === 3 ? sanitizeKeys(value.keys) : [];
  const rewards = sanitizeRewards(value.rewards);
  const storedCurrency = nonEmptyString(value.currencyName) ? value.currencyName.trim().slice(0, 40) : defaults.currencyName;
  const state: RewardsLabState = {
    schemaVersion: REWARDS_LAB_SCHEMA_VERSION,
    economyVersion: REWARDS_ECONOMY_VERSION,
    economyActivatedAt: previousSchema === 3 && nonEmptyString(value.economyActivatedAt)
      ? value.economyActivatedAt
      : defaults.economyActivatedAt,
    currencyName: storedCurrency === 'Tokens' || storedCurrency === 'points' ? defaults.currencyName : storedCurrency,
    animationsEnabled: typeof value.animationsEnabled === 'boolean' ? value.animationsEnabled : defaults.animationsEnabled,
    taskGrades: sanitizeTaskGrades(value.taskGrades),
    fairBag: previousSchema === 1 ? defaults.fairBag : sanitizeFairBag(value.fairBag),
    keyDropState: previousSchema === 3 && isRecord(value.keyDropState)
      && Number.isInteger(value.keyDropState.dryStreak) && Number(value.keyDropState.dryStreak) >= 0
      ? { dryStreak: Math.min(7, Number(value.keyDropState.dryStreak)) }
      : defaults.keyDropState,
    claims,
    gradeCorrections: previousSchema === 1 ? [] : sanitizeGradeCorrections(value.gradeCorrections, claims),
    ledger: sanitizeLedger(value.ledger),
    keys,
    keyUpgrades: previousSchema === 3 ? sanitizeKeyUpgrades(value.keyUpgrades, keys) : [],
    rewards,
    purchases: previousSchema === 3 ? sanitizePurchases(value.purchases) : [],
    starterCatalogInstalled: previousSchema === 3 && value.starterCatalogInstalled === true,
    metrics: sanitizeMetrics(value.metrics),
  };
  return withStarterCatalogWhenEmpty(state);
};

export const loadRewardsLabState = (storage: StorageLike): RewardsLabState => (
  sanitizeRewardsLabState(safeRead(storage, REWARDS_LAB_STORAGE_KEY))
);

export const saveRewardsLabState = (storage: StorageLike, state: RewardsLabState): boolean => {
  try { storage.setItem(REWARDS_LAB_STORAGE_KEY, JSON.stringify(state)); return true; } catch { return false; }
};

export const clearRewardsLabData = (storage: StorageLike): boolean => {
  try { storage.removeItem(REWARDS_LAB_STORAGE_KEY); return true; } catch { return false; }
};

export const eraseRewardsLab = (storage: StorageLike): boolean => {
  const disabled = setRewardsLabEnabled(storage, false);
  if (!disabled) return false;
  return clearRewardsLabData(storage) && clearRewardsLabLifecycleOutbox(storage);
};
