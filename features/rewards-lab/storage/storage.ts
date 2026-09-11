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
  RewardPaymentMode,
  RewardsEconomyVersion,
  RewardsLabMetrics,
  RewardsLabState,
  WalletTransaction,
  WalletTransactionKind,
  createDefaultRewardsLabState,
  getV2RewardAmount,
} from '../domain';
import {
  LEGACY_REWARDS_LAB_ARCHIVE_KEY,
  LEGACY_REWARDS_LAB_EXPERIMENT_FLAGS_KEY,
  LEGACY_REWARDS_LAB_OUTBOX_KEY,
  LEGACY_REWARDS_LAB_STORAGE_KEY,
  REWARDS_LAB_EXPERIMENT_FLAGS_KEY,
} from '../contracts';
import { REWARDS_LAB_LIFECYCLE_OUTBOX_KEY, clearRewardsLabLifecycleOutbox } from '../outbox';

export const EXPERIMENT_FLAGS_STORAGE_KEY = REWARDS_LAB_EXPERIMENT_FLAGS_KEY;
export const REWARDS_LAB_STORAGE_KEY = 'takt:rewards:state:v1';

export interface LegacyRewardsLabArchive {
  schemaVersion: 1;
  archivedAt: string;
  payload: {
    flags: string | null;
    state: string | null;
    outbox: string | null;
  };
}

export interface RewardsBackupPayload {
  schemaVersion: 1;
  enabled: boolean;
  state: RewardsLabState;
  legacyLabArchive: LegacyRewardsLabArchive | null;
}

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
const isRewardPaymentMode = (value: unknown): value is RewardPaymentMode => (
  value === 'credits' || value === 'key' || value === 'credits-and-key'
);

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
    ...(isRewardGrade(value.manualGrade) ? { manualGrade: value.manualGrade } : {}),
    ...(isRewardGrade(value.minimumGrade) ? { minimumGrade: value.minimumGrade } : {}),
    ...(Array.isArray(value.importanceReasons) ? {
      importanceReasons: value.importanceReasons.filter((reason): reason is 'week' | 'month' | 'year' | 'goal' | 'event' => (
        reason === 'week' || reason === 'month' || reason === 'year' || reason === 'goal' || reason === 'event'
      )),
    } : {}),
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
    || !Number.isInteger(value.amount)
    || (Number(value.amount) === 0 && value.kind !== 'spend' && value.kind !== 'refund')
    || !nonEmptyString(value.occurredAt) || typeof value.label !== 'string'
    || !optionalString(value.taskId) || !optionalString(value.claimId)
    || !optionalString(value.rewardId) || !optionalString(value.purchaseId)
    || !optionalString(value.keyId) || !optionalString(value.relatedTransactionId)
    || (Number(value.amount) === 0 && value.kind === 'spend'
      && (!nonEmptyString(value.rewardId) || !nonEmptyString(value.keyId)))
    || (Number(value.amount) === 0 && value.kind === 'refund'
      && (!nonEmptyString(value.keyId) || !nonEmptyString(value.relatedTransactionId)))
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
    || !Number.isInteger(value.cost) || Number(value.cost) < 0
    || typeof value.note !== 'string' || typeof value.active !== 'boolean'
    || typeof value.repeatable !== 'boolean' || !nonEmptyString(value.createdAt)
    || !nonEmptyString(value.updatedAt)) return null;
  const paymentMode = isRewardPaymentMode(value.paymentMode) ? value.paymentMode : 'credits-and-key';
  if (paymentMode !== 'key' && Number(value.cost) <= 0) return null;
  return {
    id: value.id, title: value.title, cost: Number(value.cost), note: value.note,
    active: value.active, repeatable: value.repeatable,
    variableCost: paymentMode !== 'key' && typeof value.variableCost === 'boolean' ? value.variableCost : false,
    grade: isRewardGrade(value.grade) ? value.grade : 'common',
    paymentMode,
    displayOrder: Number.isInteger(value.displayOrder) && Number(value.displayOrder) >= 0
      ? Number(value.displayOrder)
      : 0,
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

export const sanitizeRewardsLabState = (value: unknown): RewardsLabState => {
  const defaults = createDefaultRewardsLabState();
  if (!isRecord(value) || (value.schemaVersion !== 1 && value.schemaVersion !== 2
    && value.schemaVersion !== 3 && value.schemaVersion !== 4)) {
    return defaults;
  }
  const previousSchema = Number(value.schemaVersion);
  const claims = sanitizeClaims(value.claims);
  const keys = previousSchema >= 3 ? sanitizeKeys(value.keys) : [];
  const sanitizedRewards = sanitizeRewards(value.rewards);
  const rewards = (previousSchema === 4
    ? sanitizedRewards.sort((left, right) => left.displayOrder - right.displayOrder || left.createdAt.localeCompare(right.createdAt))
    : sanitizedRewards).map((reward, index) => ({
    ...reward,
    displayOrder: index,
  }));
  const storedCurrency = nonEmptyString(value.currencyName) ? value.currencyName.trim().slice(0, 40) : defaults.currencyName;
  const state: RewardsLabState = {
    schemaVersion: REWARDS_LAB_SCHEMA_VERSION,
    economyVersion: REWARDS_ECONOMY_VERSION,
    economyActivatedAt: previousSchema >= 3 && nonEmptyString(value.economyActivatedAt)
      ? value.economyActivatedAt
      : defaults.economyActivatedAt,
    currencyName: storedCurrency === 'Tokens' || storedCurrency === 'points' ? defaults.currencyName : storedCurrency,
    animationsEnabled: typeof value.animationsEnabled === 'boolean' ? value.animationsEnabled : defaults.animationsEnabled,
    taskGrades: sanitizeTaskGrades(value.taskGrades),
    fairBag: previousSchema === 1 ? defaults.fairBag : sanitizeFairBag(value.fairBag),
    keyDropState: previousSchema >= 3 && isRecord(value.keyDropState)
      && Number.isInteger(value.keyDropState.dryStreak) && Number(value.keyDropState.dryStreak) >= 0
      ? { dryStreak: Math.min(7, Number(value.keyDropState.dryStreak)) }
      : defaults.keyDropState,
    claims,
    gradeCorrections: previousSchema === 1 ? [] : sanitizeGradeCorrections(value.gradeCorrections, claims),
    ledger: sanitizeLedger(value.ledger),
    keys,
    keyUpgrades: previousSchema >= 3 ? sanitizeKeyUpgrades(value.keyUpgrades, keys) : [],
    rewards,
    rewardCatalogView: previousSchema === 4 && value.rewardCatalogView === 'compact' ? 'compact' : 'detailed',
    purchases: previousSchema >= 3 ? sanitizePurchases(value.purchases) : [],
    starterCatalogInstalled: previousSchema >= 3 && value.starterCatalogInstalled === true,
    metrics: sanitizeMetrics(value.metrics),
  };
  return state;
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

const readRaw = (storage: StorageLike, key: string): string | null => {
  try { return storage.getItem(key); } catch { return null; }
};

const sanitizeLegacyArchive = (value: unknown): LegacyRewardsLabArchive | null => {
  if (!isRecord(value) || value.schemaVersion !== 1 || !nonEmptyString(value.archivedAt) || !isRecord(value.payload)) return null;
  const { flags, state, outbox } = value.payload;
  if (!nullableString(flags) || !nullableString(state) || !nullableString(outbox)) return null;
  return { schemaVersion: 1, archivedAt: value.archivedAt, payload: { flags, state, outbox } };
};

export const loadLegacyRewardsLabArchive = (storage: StorageLike): LegacyRewardsLabArchive | null => (
  sanitizeLegacyArchive(safeRead(storage, LEGACY_REWARDS_LAB_ARCHIVE_KEY))
);

export const ensureLegacyRewardsLabArchive = (
  storage: StorageLike,
  archivedAt = new Date().toISOString(),
): LegacyRewardsLabArchive | null => {
  const existing = loadLegacyRewardsLabArchive(storage);
  if (existing) return existing;

  const payload = {
    flags: readRaw(storage, LEGACY_REWARDS_LAB_EXPERIMENT_FLAGS_KEY),
    state: readRaw(storage, LEGACY_REWARDS_LAB_STORAGE_KEY),
    outbox: readRaw(storage, LEGACY_REWARDS_LAB_OUTBOX_KEY),
  };
  if (payload.flags === null && payload.state === null && payload.outbox === null) return null;

  const archive: LegacyRewardsLabArchive = { schemaVersion: 1, archivedAt, payload };
  try {
    storage.setItem(LEGACY_REWARDS_LAB_ARCHIVE_KEY, JSON.stringify(archive));
    return archive;
  } catch {
    // The untouched legacy keys are still the primary safety copy.
    return archive;
  }
};

export const createRewardsBackupPayload = (storage: StorageLike): RewardsBackupPayload => ({
  schemaVersion: 1,
  enabled: loadExperimentFlags(storage).rewardsLab,
  state: loadRewardsLabState(storage),
  legacyLabArchive: ensureLegacyRewardsLabArchive(storage),
});

const restoreRaw = (storage: StorageLike, key: string, value: string | null): void => {
  if (value === null) storage.removeItem(key);
  else storage.setItem(key, value);
};

export const restoreRewardsBackupPayload = (storage: StorageLike, value: unknown): boolean => {
  if (!isRecord(value) || value.schemaVersion !== 1 || typeof value.enabled !== 'boolean'
    || !isRecord(value.state) || (value.state.schemaVersion !== 1 && value.state.schemaVersion !== 2
      && value.state.schemaVersion !== 3 && value.state.schemaVersion !== 4)
    || (value.legacyLabArchive !== null && sanitizeLegacyArchive(value.legacyLabArchive) === null)) return false;

  const previous = {
    flags: readRaw(storage, EXPERIMENT_FLAGS_STORAGE_KEY),
    state: readRaw(storage, REWARDS_LAB_STORAGE_KEY),
    outbox: readRaw(storage, REWARDS_LAB_LIFECYCLE_OUTBOX_KEY),
    archive: readRaw(storage, LEGACY_REWARDS_LAB_ARCHIVE_KEY),
  };
  const rollback = () => {
    try {
      restoreRaw(storage, EXPERIMENT_FLAGS_STORAGE_KEY, previous.flags);
      restoreRaw(storage, REWARDS_LAB_STORAGE_KEY, previous.state);
      restoreRaw(storage, REWARDS_LAB_LIFECYCLE_OUTBOX_KEY, previous.outbox);
      restoreRaw(storage, LEGACY_REWARDS_LAB_ARCHIVE_KEY, previous.archive);
    } catch {
      // Best effort only: callers still receive a failed import result.
    }
  };

  try {
    storage.setItem(REWARDS_LAB_STORAGE_KEY, JSON.stringify(sanitizeRewardsLabState(value.state)));
    storage.removeItem(REWARDS_LAB_LIFECYCLE_OUTBOX_KEY);
    const archive = value.legacyLabArchive === null ? null : sanitizeLegacyArchive(value.legacyLabArchive);
    if (archive) storage.setItem(LEGACY_REWARDS_LAB_ARCHIVE_KEY, JSON.stringify(archive));
    if (!setRewardsLabEnabled(storage, value.enabled)) throw new Error('flag write failed');
    return true;
  } catch {
    rollback();
    return false;
  }
};
