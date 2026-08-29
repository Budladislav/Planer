import {
  DEFAULT_EXPERIMENT_FLAGS,
  ExperimentFlags,
  FairBagState,
  REWARD_GRADES,
  REWARDS_ECONOMY_VERSION,
  REWARDS_LAB_SCHEMA_VERSION,
  RewardClaim,
  RewardDefinition,
  RewardGrade,
  RewardRoll,
  RewardsLabMetrics,
  RewardsLabState,
  WalletTransaction,
  WalletTransactionKind,
  createDefaultRewardsLabState,
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

const nonEmptyString = (value: unknown): value is string => (
  typeof value === 'string' && value.trim().length > 0
);

const optionalString = (value: unknown): value is string | undefined => (
  value === undefined || typeof value === 'string'
);

const nullableString = (value: unknown): value is string | null => (
  value === null || typeof value === 'string'
);

const isRewardGrade = (value: unknown): value is RewardGrade => (
  typeof value === 'string' && Object.hasOwn(REWARD_GRADES, value)
);

const isRewardRoll = (value: unknown): value is RewardRoll => value === 2 || value === 3 || value === 4;

const safeParse = (serialized: string | null): unknown => {
  if (serialized === null) return null;
  try {
    return JSON.parse(serialized) as unknown;
  } catch {
    return null;
  }
};

const safeRead = (storage: StorageLike, key: string): unknown => {
  try {
    return safeParse(storage.getItem(key));
  } catch {
    return null;
  }
};

export const loadExperimentFlags = (storage: StorageLike): ExperimentFlags => {
  const raw = safeRead(storage, EXPERIMENT_FLAGS_STORAGE_KEY);
  if (!isRecord(raw)) return { ...DEFAULT_EXPERIMENT_FLAGS };
  return { rewardsLab: raw.rewardsLab === true };
};

export const saveExperimentFlags = (storage: StorageLike, flags: ExperimentFlags): boolean => {
  try {
    storage.setItem(EXPERIMENT_FLAGS_STORAGE_KEY, JSON.stringify(flags));
    return true;
  } catch {
    return false;
  }
};

export const setRewardsLabEnabled = (storage: StorageLike, enabled: boolean): boolean => (
  saveExperimentFlags(storage, { ...loadExperimentFlags(storage), rewardsLab: enabled })
);

const sanitizeTaskGrades = (value: unknown): RewardsLabState['taskGrades'] => {
  if (!isRecord(value)) return {};
  return Object.fromEntries(
    Object.entries(value).filter(
      ([taskId, grade]) => taskId.length > 0 && isRewardGrade(grade) && grade !== 'common',
    ),
  ) as RewardsLabState['taskGrades'];
};

const sanitizeFairBag = (value: unknown): FairBagState => {
  if (!isRecord(value) || !Array.isArray(value.remaining)) return { remaining: [], cycle: 0 };
  const remaining = value.remaining.filter(isRewardRoll);
  const countByRoll = remaining.reduce<Record<RewardRoll, number>>(
    (counts, roll) => ({ ...counts, [roll]: counts[roll] + 1 }),
    { 2: 0, 3: 0, 4: 0 },
  );
  const validBag = remaining.length === value.remaining.length
    && remaining.length <= 9
    && countByRoll[2] <= 3
    && countByRoll[3] <= 3
    && countByRoll[4] <= 3;
  const cycle = Number.isInteger(value.cycle) && Number(value.cycle) >= 0 ? Number(value.cycle) : 0;
  return { remaining: validBag ? remaining : [], cycle };
};

const sanitizeClaim = (value: unknown): RewardClaim | null => {
  if (!isRecord(value)
    || !nonEmptyString(value.id)
    || !nonEmptyString(value.taskId)
    || typeof value.taskTitle !== 'string'
    || !nonEmptyString(value.completedAt)
    || !isRewardGrade(value.grade)
    || !isRewardRoll(value.roll)
    || value.economyVersion !== REWARDS_ECONOMY_VERSION
    || !nonEmptyString(value.createdAt)) return null;

  const multiplier = REWARD_GRADES[value.grade].multiplier;
  const amount = Math.round(value.roll * multiplier);
  if (value.multiplier !== multiplier || value.amount !== amount) return null;
  return {
    id: value.id,
    taskId: value.taskId,
    taskTitle: value.taskTitle,
    completedAt: value.completedAt,
    grade: value.grade,
    multiplier,
    roll: value.roll,
    amount,
    economyVersion: REWARDS_ECONOMY_VERSION,
    createdAt: value.createdAt,
  };
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

const TRANSACTION_KINDS = new Set<WalletTransactionKind>([
  'earn', 'reverse', 'restore', 'spend', 'refund', 'adjustment',
]);

const sanitizeTransaction = (value: unknown): WalletTransaction | null => {
  if (!isRecord(value)
    || !nonEmptyString(value.id)
    || typeof value.kind !== 'string'
    || !TRANSACTION_KINDS.has(value.kind as WalletTransactionKind)
    || !Number.isInteger(value.amount)
    || Number(value.amount) === 0
    || !nonEmptyString(value.occurredAt)
    || typeof value.label !== 'string'
    || !optionalString(value.taskId)
    || !optionalString(value.claimId)
    || !optionalString(value.rewardId)
    || !optionalString(value.relatedTransactionId)) return null;

  return {
    id: value.id,
    kind: value.kind as WalletTransactionKind,
    amount: Number(value.amount),
    occurredAt: value.occurredAt,
    label: value.label,
    ...(value.taskId === undefined ? {} : { taskId: value.taskId }),
    ...(value.claimId === undefined ? {} : { claimId: value.claimId }),
    ...(value.rewardId === undefined ? {} : { rewardId: value.rewardId }),
    ...(value.relatedTransactionId === undefined ? {} : { relatedTransactionId: value.relatedTransactionId }),
  };
};

const sanitizeLedger = (value: unknown): WalletTransaction[] => {
  if (!Array.isArray(value)) return [];
  const ids = new Set<string>();
  return value.flatMap((rawTransaction) => {
    const item = sanitizeTransaction(rawTransaction);
    if (!item || ids.has(item.id)) return [];
    ids.add(item.id);
    return [item];
  });
};

const sanitizeReward = (value: unknown): RewardDefinition | null => {
  if (!isRecord(value)
    || !nonEmptyString(value.id)
    || !nonEmptyString(value.title)
    || !Number.isInteger(value.cost)
    || Number(value.cost) <= 0
    || typeof value.note !== 'string'
    || typeof value.active !== 'boolean'
    || typeof value.repeatable !== 'boolean'
    || !nonEmptyString(value.createdAt)
    || !nonEmptyString(value.updatedAt)) return null;
  return {
    id: value.id,
    title: value.title,
    cost: Number(value.cost),
    note: value.note,
    active: value.active,
    repeatable: value.repeatable,
    createdAt: value.createdAt,
    updatedAt: value.updatedAt,
  };
};

const sanitizeRewards = (value: unknown): RewardDefinition[] => {
  if (!Array.isArray(value)) return [];
  const ids = new Set<string>();
  return value.flatMap((rawReward) => {
    const reward = sanitizeReward(rawReward);
    if (!reward || ids.has(reward.id)) return [];
    ids.add(reward.id);
    return [reward];
  });
};

const sanitizeMetrics = (value: unknown): RewardsLabMetrics => {
  const defaults = createDefaultRewardsLabState().metrics;
  if (!isRecord(value)) return defaults;
  return {
    labOpenCount: Number.isInteger(value.labOpenCount) && Number(value.labOpenCount) >= 0
      ? Number(value.labOpenCount)
      : 0,
    redemptionCount: Number.isInteger(value.redemptionCount) && Number(value.redemptionCount) >= 0
      ? Number(value.redemptionCount)
      : 0,
    lastOpenedAt: nullableString(value.lastOpenedAt) ? value.lastOpenedAt : null,
    lastRedeemedAt: nullableString(value.lastRedeemedAt) ? value.lastRedeemedAt : null,
  };
};

export const sanitizeRewardsLabState = (value: unknown): RewardsLabState => {
  const defaults = createDefaultRewardsLabState();
  if (!isRecord(value) || value.schemaVersion !== REWARDS_LAB_SCHEMA_VERSION) return defaults;
  return {
    schemaVersion: REWARDS_LAB_SCHEMA_VERSION,
    currencyName: nonEmptyString(value.currencyName) ? value.currencyName.trim().slice(0, 40) : defaults.currencyName,
    animationsEnabled: typeof value.animationsEnabled === 'boolean'
      ? value.animationsEnabled
      : defaults.animationsEnabled,
    taskGrades: sanitizeTaskGrades(value.taskGrades),
    fairBag: sanitizeFairBag(value.fairBag),
    claims: sanitizeClaims(value.claims),
    ledger: sanitizeLedger(value.ledger),
    rewards: sanitizeRewards(value.rewards),
    metrics: sanitizeMetrics(value.metrics),
  };
};

export const loadRewardsLabState = (storage: StorageLike): RewardsLabState => (
  sanitizeRewardsLabState(safeRead(storage, REWARDS_LAB_STORAGE_KEY))
);

export const saveRewardsLabState = (storage: StorageLike, state: RewardsLabState): boolean => {
  try {
    storage.setItem(REWARDS_LAB_STORAGE_KEY, JSON.stringify(state));
    return true;
  } catch {
    return false;
  }
};

export const clearRewardsLabData = (storage: StorageLike): boolean => {
  try {
    storage.removeItem(REWARDS_LAB_STORAGE_KEY);
    return true;
  } catch {
    return false;
  }
};

export const eraseRewardsLab = (storage: StorageLike): boolean => {
  // Persist the kill switch before deleting anything. If disabling fails, the
  // destructive part is not attempted.
  const disabled = setRewardsLabEnabled(storage, false);
  if (!disabled) return false;
  const dataCleared = clearRewardsLabData(storage);
  const outboxCleared = clearRewardsLabLifecycleOutbox(storage);
  return dataCleared && outboxCleared;
};
