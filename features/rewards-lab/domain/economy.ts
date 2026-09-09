import {
  EconomyRuntime,
  FairBagState,
  KeyDropState,
  PurchaseItem,
  PurchaseStatus,
  REWARD_GRADES,
  REWARDS_ECONOMY_VERSION,
  RewardClaim,
  RewardDefinition,
  RewardGrade,
  RewardGradeCorrection,
  RewardKey,
  RewardKeyUpgrade,
  RewardLuckSlot,
  RewardLimitSettings,
  RewardsLabState,
  WalletTransaction,
} from './types';

export const FAIR_BAG_SLOTS: readonly RewardLuckSlot[] = [0, 1, 2, 3, 4, 5, 6, 7, 8];
export const KEY_UPGRADE_COST = 5;

export const KEY_DROP_PROBABILITIES: Record<RewardGrade, Record<RewardGrade, number>> = {
  common: { common: 0.20, uncommon: 0.08, rare: 0.02, legendary: 0.003, mythic: 0.0005 },
  uncommon: { common: 0.22, uncommon: 0.12, rare: 0.04, legendary: 0.01, mythic: 0.002 },
  rare: { common: 0.20, uncommon: 0.18, rare: 0.10, legendary: 0.03, mythic: 0.005 },
  legendary: { common: 0.15, uncommon: 0.20, rare: 0.20, legendary: 0.10, mythic: 0.02 },
  mythic: { common: 0.05, uncommon: 0.15, rare: 0.25, legendary: 0.30, mythic: 0.15 },
};

const rewardGrades = Object.keys(REWARD_GRADES) as RewardGrade[];

const now = (runtime: EconomyRuntime): string => runtime.now?.() ?? new Date().toISOString();

const fallbackId = (): string => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
};

const createId = (runtime: EconomyRuntime): string => runtime.createId?.() ?? fallbackId();

const normalizedRandom = (random: () => number): number => {
  const value = random();
  if (!Number.isFinite(value) || value <= 0) return 0;
  if (value >= 1) return 0.999_999_999_999;
  return value;
};

const shuffledBag = (random: () => number): RewardLuckSlot[] => {
  const values = [...FAIR_BAG_SLOTS];
  for (let index = values.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(normalizedRandom(random) * (index + 1));
    [values[index], values[swapIndex]] = [values[swapIndex], values[index]];
  }
  return values;
};

export interface FairBagDraw {
  luckSlot: RewardLuckSlot;
  fairBag: FairBagState;
}

export const drawFromFairBag = (
  fairBag: FairBagState,
  random: () => number = Math.random,
): FairBagDraw => {
  const startedCycle = fairBag.remaining.length === 0;
  const remaining = startedCycle ? shuffledBag(random) : [...fairBag.remaining];
  const luckSlot = remaining.pop();
  if (luckSlot === undefined) {
    return { luckSlot: 0, fairBag: { remaining: [], cycle: fairBag.cycle + 1 } };
  }
  return {
    luckSlot,
    fairBag: {
      remaining,
      cycle: fairBag.cycle + (startedCycle ? 1 : 0),
    },
  };
};

export const getV2RewardAmount = (grade: RewardGrade, luckSlot: RewardLuckSlot): number => {
  const { min, max } = REWARD_GRADES[grade];
  return min + Math.round((luckSlot / (FAIR_BAG_SLOTS.length - 1)) * (max - min));
};

export interface KeyDropDraw {
  grade: RewardGrade | null;
  keyDropState: KeyDropState;
  protectedDrop: boolean;
}

export const drawRewardKey = (
  taskGrade: RewardGrade,
  keyDropState: KeyDropState,
  random: () => number = Math.random,
): KeyDropDraw => {
  if (keyDropState.dryStreak >= 7) {
    return { grade: 'common', keyDropState: { dryStreak: 0 }, protectedDrop: true };
  }

  const probabilities = KEY_DROP_PROBABILITIES[taskGrade];
  const sample = normalizedRandom(random);
  let cursor = 0;
  for (const grade of rewardGrades) {
    cursor += probabilities[grade];
    if (sample < cursor) {
      return { grade, keyDropState: { dryStreak: 0 }, protectedDrop: false };
    }
  }

  // From the sixth dry attempt onward, protected randomness adds only Common
  // chance in the otherwise empty tail. All rarer base probabilities stay fixed.
  const pityChance = keyDropState.dryStreak >= 5 ? (keyDropState.dryStreak - 4) * 0.10 : 0;
  if (sample < Math.min(1, cursor + pityChance)) {
    return { grade: 'common', keyDropState: { dryStreak: 0 }, protectedDrop: true };
  }
  return {
    grade: null,
    keyDropState: { dryStreak: keyDropState.dryStreak + 1 },
    protectedDrop: false,
  };
};

const getClaimAmountForGrade = (claim: RewardClaim, grade: RewardGrade): number => (
  claim.economyVersion === 1
    ? Math.round(claim.roll * REWARD_GRADES[grade].legacyMultiplier)
    : getV2RewardAmount(grade, claim.luckSlot)
);

export const getWalletBalance = (state: Pick<RewardsLabState, 'ledger'>): number => (
  state.ledger.reduce((total, transaction) => total + transaction.amount, 0)
);

export const getTaskGrade = (
  state: Pick<RewardsLabState, 'taskGrades'>,
  taskId: string,
): RewardGrade => state.taskGrades[taskId] ?? 'common';

export const setTaskGrade = (
  state: RewardsLabState,
  taskId: string,
  grade: RewardGrade,
): RewardsLabState => {
  const taskGrades = { ...state.taskGrades };
  if (grade === 'common') delete taskGrades[taskId];
  else taskGrades[taskId] = grade;
  return { ...state, taskGrades };
};

const gradeRank = (grade: RewardGrade): number => rewardGrades.indexOf(grade);

export const claimLedgerTotal = (state: RewardsLabState, claimId: string): number => (
  state.ledger.reduce(
    (total, item) => item.claimId === claimId ? total + item.amount : total,
    0,
  )
);

export const isRewardClaimActive = (state: RewardsLabState, taskId: string): boolean => {
  const claim = state.claims[taskId];
  return Boolean(claim && claimLedgerTotal(state, claim.id) > 0);
};

export const getEarnedTaskRewards = (state: RewardsLabState): number => (
  state.ledger.reduce((total, item) => item.claimId ? total + item.amount : total, 0)
);

const transaction = (
  runtime: EconomyRuntime,
  input: Omit<WalletTransaction, 'id' | 'occurredAt'> & { occurredAt?: string },
): WalletTransaction => ({
  ...input,
  id: createId(runtime),
  occurredAt: input.occurredAt ?? now(runtime),
});

export const getAvailableKeyCounts = (
  state: Pick<RewardsLabState, 'keys'>,
): Record<RewardGrade, number> => {
  const counts = Object.fromEntries(rewardGrades.map(grade => [grade, 0])) as Record<RewardGrade, number>;
  state.keys.forEach(key => {
    if (key.status === 'available') counts[key.grade] += 1;
  });
  return counts;
};

const patchKey = (keys: RewardKey[], keyId: string, patch: Partial<RewardKey>): RewardKey[] => (
  keys.map(key => key.id === keyId ? { ...key, ...patch } : key)
);

const restoredKeyStatus = (state: RewardsLabState, key: RewardKey): RewardKey['status'] => {
  if (!key.sourceClaimId) return 'available';
  const sourceClaim = Object.values(state.claims).find(claim => claim.id === key.sourceClaimId);
  return sourceClaim && claimLedgerTotal(state, sourceClaim.id) <= 0 ? 'suspended' : 'available';
};

export interface CompleteTaskRewardInput {
  taskId: string;
  taskTitle: string;
  completedAt: string;
}

export interface CompletionRewardResult {
  state: RewardsLabState;
  claim: RewardClaim;
  transaction: WalletTransaction | null;
  key: RewardKey | null;
  keyDropWasProtected: boolean;
  outcome: 'earned' | 'restored' | 'already-posted';
}

export const claimTaskCompletion = (
  state: RewardsLabState,
  input: CompleteTaskRewardInput,
  runtime: EconomyRuntime = {},
): CompletionRewardResult => {
  const existingClaim = state.claims[input.taskId];
  if (existingClaim) {
    if (claimLedgerTotal(state, existingClaim.id) > 0) {
      const key = existingClaim.economyVersion === 3 && existingClaim.keyId
        ? state.keys.find(item => item.id === existingClaim.keyId) ?? null
        : null;
      return { state, claim: existingClaim, transaction: null, key, keyDropWasProtected: false, outcome: 'already-posted' };
    }

    const restoredClaim: RewardClaim = { ...existingClaim, taskTitle: input.taskTitle, completedAt: input.completedAt };
    const restored = transaction(runtime, {
      kind: 'restore', amount: restoredClaim.amount,
      label: `Restored reward for ${restoredClaim.taskTitle}`,
      taskId: restoredClaim.taskId, claimId: restoredClaim.id,
      economyVersion: restoredClaim.economyVersion,
    });
    let keys = state.keys;
    let key: RewardKey | null = null;
    if (restoredClaim.economyVersion === 3 && restoredClaim.keyId) {
      const existingKey = keys.find(item => item.id === restoredClaim.keyId) ?? null;
      if (existingKey?.status === 'suspended') {
        keys = patchKey(keys, existingKey.id, { status: 'available' });
        key = { ...existingKey, status: 'available' };
      } else key = existingKey;
    }
    return {
      state: {
        ...state,
        claims: { ...state.claims, [input.taskId]: restoredClaim },
        ledger: [...state.ledger, restored],
        keys,
      },
      claim: restoredClaim,
      transaction: restored,
      key,
      keyDropWasProtected: false,
      outcome: 'restored',
    };
  }

  const random = runtime.random ?? Math.random;
  const pointDraw = drawFromFairBag(state.fairBag, random);
  const grade = getTaskGrade(state, input.taskId);
  const timestamp = now(runtime);
  const claimId = createId(runtime);
  const keyDraw = drawRewardKey(grade, state.keyDropState, random);
  const key: RewardKey | null = keyDraw.grade ? {
    id: createId(runtime),
    grade: keyDraw.grade,
    status: 'available',
    createdAt: timestamp,
    sourceClaimId: claimId,
    sourceTaskId: input.taskId,
  } : null;
  const claim: RewardClaim = {
    id: claimId,
    taskId: input.taskId,
    taskTitle: input.taskTitle,
    completedAt: input.completedAt,
    grade,
    luckSlot: pointDraw.luckSlot,
    amount: getV2RewardAmount(grade, pointDraw.luckSlot),
    economyVersion: REWARDS_ECONOMY_VERSION,
    createdAt: timestamp,
    keyId: key?.id ?? null,
  };
  const earned = transaction(runtime, {
    kind: 'earn', amount: claim.amount, label: `Reward for ${claim.taskTitle}`,
    taskId: claim.taskId, claimId: claim.id,
    economyVersion: claim.economyVersion, occurredAt: input.completedAt,
  });

  return {
    state: {
      ...state,
      fairBag: pointDraw.fairBag,
      keyDropState: keyDraw.keyDropState,
      claims: { ...state.claims, [input.taskId]: claim },
      ledger: [...state.ledger, earned],
      keys: key ? [...state.keys, key] : state.keys,
    },
    claim,
    transaction: earned,
    key,
    keyDropWasProtected: keyDraw.protectedDrop,
    outcome: 'earned',
  };
};

export type RegradeTaskClaimOutcome = 'regraded' | 'not-claimed' | 'claim-active' | 'unchanged';

export interface RegradeTaskClaimResult {
  state: RewardsLabState;
  claim: RewardClaim | null;
  correction: RewardGradeCorrection | null;
  outcome: RegradeTaskClaimOutcome;
}

export const regradeReversedTaskClaim = (
  state: RewardsLabState,
  taskId: string,
  grade: RewardGrade,
  runtime: EconomyRuntime = {},
): RegradeTaskClaimResult => {
  const claim = state.claims[taskId];
  if (!claim) return { state, claim: null, correction: null, outcome: 'not-claimed' };
  if (claimLedgerTotal(state, claim.id) > 0) return { state, claim, correction: null, outcome: 'claim-active' };
  if (claim.grade === grade) return { state, claim, correction: null, outcome: 'unchanged' };

  const amount = getClaimAmountForGrade(claim, grade);
  const updatedClaim: RewardClaim = claim.economyVersion === 1
    ? { ...claim, grade, multiplier: REWARD_GRADES[grade].legacyMultiplier, amount }
    : { ...claim, grade, amount };
  const correction: RewardGradeCorrection = {
    id: createId(runtime), claimId: claim.id, taskId,
    fromGrade: claim.grade, toGrade: grade,
    previousAmount: claim.amount, amount,
    economyVersion: claim.economyVersion, occurredAt: now(runtime),
  };
  const stateWithGrade = setTaskGrade(state, taskId, grade);
  return {
    state: {
      ...stateWithGrade,
      claims: { ...stateWithGrade.claims, [taskId]: updatedClaim },
      gradeCorrections: [...stateWithGrade.gradeCorrections, correction],
    },
    claim: updatedClaim,
    correction,
    outcome: 'regraded',
  };
};

export interface EnsureTaskMinimumGradeResult {
  state: RewardsLabState;
  outcome: 'raised' | 'unchanged';
}

/**
 * Applies a system-owned grade floor without rerolling an existing reward.
 * Active claims receive only the positive difference as an append-only ledger
 * entry; reversed claims keep a zero balance until they are completed again.
 */
export const ensureTaskMinimumGrade = (
  state: RewardsLabState,
  taskId: string,
  minimumGrade: RewardGrade,
  runtime: EconomyRuntime = {},
): EnsureTaskMinimumGradeResult => {
  const claim = state.claims[taskId];
  const currentGrade = claim?.grade ?? getTaskGrade(state, taskId);
  if (gradeRank(currentGrade) >= gradeRank(minimumGrade)) return { state, outcome: 'unchanged' };

  if (!claim) {
    return { state: setTaskGrade(state, taskId, minimumGrade), outcome: 'raised' };
  }

  const amount = getClaimAmountForGrade(claim, minimumGrade);
  const updatedClaim: RewardClaim = claim.economyVersion === 1
    ? { ...claim, grade: minimumGrade, multiplier: REWARD_GRADES[minimumGrade].legacyMultiplier, amount }
    : { ...claim, grade: minimumGrade, amount };
  const occurredAt = now(runtime);
  const correction: RewardGradeCorrection = {
    id: createId(runtime),
    claimId: claim.id,
    taskId,
    fromGrade: claim.grade,
    toGrade: minimumGrade,
    previousAmount: claim.amount,
    amount,
    economyVersion: claim.economyVersion,
    occurredAt,
  };
  const active = claimLedgerTotal(state, claim.id) > 0;
  const adjustment = active && amount > claim.amount
    ? transaction(runtime, {
        kind: 'earn',
        amount: amount - claim.amount,
        label: `Goal minimum grade for ${claim.taskTitle}`,
        taskId,
        claimId: claim.id,
        economyVersion: claim.economyVersion,
        occurredAt,
      })
    : null;
  const stateWithGrade = setTaskGrade(state, taskId, minimumGrade);

  return {
    state: {
      ...stateWithGrade,
      claims: { ...stateWithGrade.claims, [taskId]: updatedClaim },
      gradeCorrections: [...stateWithGrade.gradeCorrections, correction],
      ledger: adjustment ? [...stateWithGrade.ledger, adjustment] : stateWithGrade.ledger,
    },
    outcome: 'raised',
  };
};

export interface ReopenTaskRewardResult {
  state: RewardsLabState;
  transaction: WalletTransaction | null;
  outcome: 'reversed' | 'not-claimed' | 'already-reversed';
}

export const reverseTaskCompletion = (
  state: RewardsLabState,
  taskId: string,
  runtime: EconomyRuntime = {},
): ReopenTaskRewardResult => {
  const claim = state.claims[taskId];
  if (!claim) return { state, transaction: null, outcome: 'not-claimed' };
  if (claimLedgerTotal(state, claim.id) <= 0) return { state, transaction: null, outcome: 'already-reversed' };

  const reversed = transaction(runtime, {
    kind: 'reverse', amount: -claim.amount, label: `Reversed reward for ${claim.taskTitle}`,
    taskId: claim.taskId, claimId: claim.id, economyVersion: claim.economyVersion,
  });
  let keys = state.keys;
  if (claim.economyVersion === 3 && claim.keyId) {
    const key = keys.find(item => item.id === claim.keyId);
    if (key?.status === 'available') keys = patchKey(keys, key.id, { status: 'suspended' });
  }
  return { state: { ...state, ledger: [...state.ledger, reversed], keys }, transaction: reversed, outcome: 'reversed' };
};

export interface RewardDefinitionInput extends Partial<RewardLimitSettings> {
  title: string;
  cost: number;
  variableCost?: boolean;
  grade?: RewardGrade;
  note?: string;
  active?: boolean;
  repeatable?: boolean;
  starterTemplateId?: string;
}

const normalizeLimitSettings = (input: Partial<RewardLimitSettings>): RewardLimitSettings => {
  const cooldownDays = Number.isInteger(input.cooldownDays) && Number(input.cooldownDays) >= 0
    ? Number(input.cooldownDays)
    : 0;
  const limitCount = Number.isInteger(input.limitCount) && Number(input.limitCount) > 0
    ? Number(input.limitCount)
    : null;
  const limitWindowDays = limitCount !== null
    && Number.isInteger(input.limitWindowDays) && Number(input.limitWindowDays) > 0
    ? Number(input.limitWindowDays)
    : null;
  return { cooldownDays, limitCount, limitWindowDays, limitGroup: input.limitGroup?.trim().slice(0, 60) ?? '' };
};

const normalizeDefinitionInput = (
  input: RewardDefinitionInput,
): Omit<RewardDefinition, 'id' | 'createdAt' | 'updatedAt'> => {
  const title = input.title.trim();
  if (!title) throw new Error('Reward title is required.');
  if (!Number.isInteger(input.cost) || input.cost <= 0) throw new Error('Reward cost must be a positive integer.');
  return {
    title,
    cost: input.cost,
    variableCost: input.variableCost ?? false,
    grade: input.grade && Object.hasOwn(REWARD_GRADES, input.grade) ? input.grade : 'common',
    note: input.note?.trim() ?? '',
    active: input.active ?? true,
    repeatable: input.repeatable ?? true,
    ...normalizeLimitSettings(input),
    ...(input.starterTemplateId ? { starterTemplateId: input.starterTemplateId } : {}),
  };
};

export const addRewardDefinition = (
  state: RewardsLabState,
  input: RewardDefinitionInput,
  runtime: EconomyRuntime = {},
): { state: RewardsLabState; reward: RewardDefinition } => {
  const timestamp = now(runtime);
  const reward: RewardDefinition = {
    id: createId(runtime), ...normalizeDefinitionInput(input), createdAt: timestamp, updatedAt: timestamp,
  };
  return { state: { ...state, rewards: [...state.rewards, reward] }, reward };
};

export const updateRewardDefinition = (
  state: RewardsLabState,
  rewardId: string,
  input: RewardDefinitionInput,
  runtime: EconomyRuntime = {},
): { state: RewardsLabState; reward: RewardDefinition | null } => {
  const existing = state.rewards.find(reward => reward.id === rewardId);
  if (!existing) return { state, reward: null };
  const reward: RewardDefinition = {
    ...existing, ...normalizeDefinitionInput(input),
    starterTemplateId: existing.starterTemplateId ?? input.starterTemplateId,
    updatedAt: now(runtime),
  };
  return { state: { ...state, rewards: state.rewards.map(item => item.id === rewardId ? reward : item) }, reward };
};

export const archiveRewardDefinition = (
  state: RewardsLabState,
  rewardId: string,
  runtime: EconomyRuntime = {},
): { state: RewardsLabState; reward: RewardDefinition | null } => {
  const existing = state.rewards.find(reward => reward.id === rewardId);
  if (!existing) return { state, reward: null };
  return updateRewardDefinition(state, rewardId, { ...existing, active: false }, runtime);
};

const refundedSpendIds = (state: RewardsLabState): Set<string> => new Set(
  state.ledger.filter(item => item.kind === 'refund' && item.relatedTransactionId)
    .map(item => item.relatedTransactionId as string),
);

export const getActiveSpendTransactions = (state: RewardsLabState): WalletTransaction[] => {
  const refunded = refundedSpendIds(state);
  return state.ledger.filter(item => item.kind === 'spend' && !refunded.has(item.id));
};

const targetLimitGroup = (state: RewardsLabState, item: WalletTransaction): string => {
  if (item.rewardId) return state.rewards.find(reward => reward.id === item.rewardId)?.limitGroup ?? '';
  if (item.purchaseId) return state.purchases.find(purchase => purchase.id === item.purchaseId)?.limitGroup ?? '';
  return '';
};

export type RedemptionAvailabilityOutcome =
  | 'available'
  | 'inactive'
  | 'already-redeemed'
  | 'insufficient-balance'
  | 'missing-key'
  | 'cooldown'
  | 'limit-reached';

export interface RedemptionAvailability {
  outcome: RedemptionAvailabilityOutcome;
  nextAvailableAt?: string;
  missingAmount?: number;
}

interface RedeemableTarget extends RewardLimitSettings {
  id: string;
  cost: number;
  grade: RewardGrade;
  repeatable: boolean;
  active: boolean;
  kind: 'reward' | 'purchase';
}

export const getRedemptionAvailability = (
  state: RewardsLabState,
  target: RedeemableTarget,
  at = new Date(),
): RedemptionAvailability => {
  if (!target.active) return { outcome: 'inactive' };
  const spends = getActiveSpendTransactions(state);
  const ownSpends = spends.filter(item => target.kind === 'reward' ? item.rewardId === target.id : item.purchaseId === target.id);
  if (!target.repeatable && ownSpends.length > 0) return { outcome: 'already-redeemed' };
  if (getWalletBalance(state) < target.cost) {
    return { outcome: 'insufficient-balance', missingAmount: target.cost - getWalletBalance(state) };
  }
  if (!state.keys.some(key => key.grade === target.grade && key.status === 'available')) {
    return { outcome: 'missing-key' };
  }

  const atTime = at.getTime();
  if (target.cooldownDays > 0 && ownSpends.length > 0) {
    const lastTime = Math.max(...ownSpends.map(item => new Date(item.occurredAt).getTime()).filter(Number.isFinite));
    const availableAt = lastTime + target.cooldownDays * 86_400_000;
    if (Number.isFinite(availableAt) && availableAt > atTime) {
      return { outcome: 'cooldown', nextAvailableAt: new Date(availableAt).toISOString() };
    }
  }

  if (target.limitCount && target.limitWindowDays) {
    const fromTime = atTime - target.limitWindowDays * 86_400_000;
    const relevant = target.limitGroup
      ? spends.filter(item => targetLimitGroup(state, item) === target.limitGroup)
      : ownSpends;
    const recent = relevant
      .map(item => new Date(item.occurredAt).getTime())
      .filter(time => Number.isFinite(time) && time > fromTime && time <= atTime)
      .sort((left, right) => left - right);
    if (recent.length >= target.limitCount) {
      const boundary = recent[recent.length - target.limitCount] + target.limitWindowDays * 86_400_000;
      return { outcome: 'limit-reached', nextAvailableAt: new Date(boundary).toISOString() };
    }
  }
  return { outcome: 'available' };
};

const consumeKey = (
  keys: RewardKey[],
  grade: RewardGrade,
  transactionId: string,
): { keys: RewardKey[]; key: RewardKey | null } => {
  const key = keys.find(item => item.grade === grade && item.status === 'available') ?? null;
  if (!key) return { keys, key: null };
  return {
    keys: patchKey(keys, key.id, { status: 'spent', consumedByTransactionId: transactionId }),
    key: { ...key, status: 'spent', consumedByTransactionId: transactionId },
  };
};

export type RedeemRewardOutcome = RedemptionAvailabilityOutcome | 'not-found' | 'redeemed';

export interface RedeemRewardResult {
  state: RewardsLabState;
  transaction: WalletTransaction | null;
  outcome: RedeemRewardOutcome;
}

export const redeemReward = (
  state: RewardsLabState,
  rewardId: string,
  actualCostOrRuntime?: number | EconomyRuntime,
  runtimeOverride: EconomyRuntime = {},
): RedeemRewardResult => {
  const actualCost = typeof actualCostOrRuntime === 'number' ? actualCostOrRuntime : undefined;
  const runtime = typeof actualCostOrRuntime === 'object' ? actualCostOrRuntime : runtimeOverride;
  const reward = state.rewards.find(item => item.id === rewardId);
  if (!reward) return { state, transaction: null, outcome: 'not-found' };
  const cost = reward.variableCost ? actualCost : reward.cost;
  if (!Number.isInteger(cost) || Number(cost) <= 0) return { state, transaction: null, outcome: 'inactive' };
  const availability = getRedemptionAvailability(state, {
    ...reward, cost: Number(cost), kind: 'reward', active: reward.active,
  }, new Date(now(runtime)));
  if (availability.outcome !== 'available') return { state, transaction: null, outcome: availability.outcome };

  const transactionId = createId(runtime);
  const keyResult = consumeKey(state.keys, reward.grade, transactionId);
  if (!keyResult.key) return { state, transaction: null, outcome: 'missing-key' };
  const spent: WalletTransaction = {
    id: transactionId, kind: 'spend', amount: -Number(cost), occurredAt: now(runtime),
    label: reward.title, rewardId: reward.id, keyId: keyResult.key.id,
  };
  return {
    state: {
      ...state,
      ledger: [...state.ledger, spent],
      keys: keyResult.keys,
      metrics: {
        ...state.metrics,
        redemptionCount: state.metrics.redemptionCount + 1,
        lastRedeemedAt: spent.occurredAt,
      },
    },
    transaction: spent,
    outcome: 'redeemed',
  } as RedeemRewardResult & { outcome: 'redeemed' };
};

export type RefundOutcome = 'refunded' | 'not-found' | 'not-spend' | 'already-refunded';

export const refundRedemption = (
  state: RewardsLabState,
  spendTransactionId: string,
  runtime: EconomyRuntime = {},
): { state: RewardsLabState; transaction: WalletTransaction | null; outcome: RefundOutcome } => {
  const spent = state.ledger.find(item => item.id === spendTransactionId);
  if (!spent) return { state, transaction: null, outcome: 'not-found' };
  if (spent.kind !== 'spend') return { state, transaction: null, outcome: 'not-spend' };
  if (state.ledger.some(item => item.kind === 'refund' && item.relatedTransactionId === spendTransactionId)) {
    return { state, transaction: null, outcome: 'already-refunded' };
  }
  const refunded = transaction(runtime, {
    kind: 'refund', amount: -spent.amount, label: `Refund: ${spent.label}`,
    rewardId: spent.rewardId, purchaseId: spent.purchaseId, keyId: spent.keyId,
    relatedTransactionId: spent.id,
  });
  let keys = state.keys;
  if (spent.keyId) {
    const key = keys.find(item => item.id === spent.keyId);
    if (key?.status === 'spent' && key.consumedByTransactionId === spent.id) {
      keys = patchKey(keys, key.id, {
        status: restoredKeyStatus(state, key),
        consumedByTransactionId: undefined,
      });
    }
  }
  const purchases = spent.purchaseId
    ? state.purchases.map(item => item.id === spent.purchaseId && item.status === 'purchased'
      ? { ...item, status: 'ready' as const, updatedAt: refunded.occurredAt }
      : item)
    : state.purchases;
  return {
    state: { ...state, ledger: [...state.ledger, refunded], keys, purchases },
    transaction: refunded,
    outcome: 'refunded',
  };
};

export interface KeyUpgradeResult {
  state: RewardsLabState;
  upgrade: RewardKeyUpgrade | null;
  outcome: 'upgraded' | 'highest-grade' | 'insufficient-keys';
}

export const upgradeRewardKeys = (
  state: RewardsLabState,
  fromGrade: RewardGrade,
  runtime: EconomyRuntime = {},
): KeyUpgradeResult => {
  const index = rewardGrades.indexOf(fromGrade);
  if (index < 0 || index === rewardGrades.length - 1) return { state, upgrade: null, outcome: 'highest-grade' };
  const inputKeys = state.keys.filter(key => key.grade === fromGrade && key.status === 'available').slice(0, KEY_UPGRADE_COST);
  if (inputKeys.length < KEY_UPGRADE_COST) return { state, upgrade: null, outcome: 'insufficient-keys' };
  const timestamp = now(runtime);
  const upgradeId = createId(runtime);
  const outputKey: RewardKey = {
    id: createId(runtime), grade: rewardGrades[index + 1], status: 'available',
    createdAt: timestamp, sourceUpgradeId: upgradeId,
  };
  const inputIds = new Set(inputKeys.map(key => key.id));
  const keys = state.keys.map(key => inputIds.has(key.id)
    ? { ...key, status: 'upgraded' as const, consumedByUpgradeId: upgradeId }
    : key);
  const upgrade: RewardKeyUpgrade = {
    id: upgradeId, fromGrade, toGrade: outputKey.grade,
    inputKeyIds: inputKeys.map(key => key.id), outputKeyId: outputKey.id,
    occurredAt: timestamp, reversedAt: null,
  };
  return {
    state: { ...state, keys: [...keys, outputKey], keyUpgrades: [...state.keyUpgrades, upgrade] },
    upgrade,
    outcome: 'upgraded',
  };
};

export const undoLatestKeyUpgrade = (
  state: RewardsLabState,
  runtime: EconomyRuntime = {},
): { state: RewardsLabState; upgrade: RewardKeyUpgrade | null; outcome: 'reversed' | 'not-found' | 'output-used' } => {
  const upgrade = [...state.keyUpgrades].reverse().find(item => item.reversedAt === null) ?? null;
  if (!upgrade) return { state, upgrade: null, outcome: 'not-found' };
  const output = state.keys.find(key => key.id === upgrade.outputKeyId);
  if (!output || output.status !== 'available') return { state, upgrade, outcome: 'output-used' };
  const inputIds = new Set(upgrade.inputKeyIds);
  const keys = state.keys.map(key => {
    if (key.id === output.id) return { ...key, status: 'reversed' as const };
    if (inputIds.has(key.id) && key.status === 'upgraded' && key.consumedByUpgradeId === upgrade.id) {
      return { ...key, status: restoredKeyStatus(state, key), consumedByUpgradeId: undefined };
    }
    return key;
  });
  const reversedAt = now(runtime);
  return {
    state: {
      ...state,
      keys,
      keyUpgrades: state.keyUpgrades.map(item => item.id === upgrade.id ? { ...item, reversedAt } : item),
    },
    upgrade: { ...upgrade, reversedAt },
    outcome: 'reversed',
  };
};

export interface PurchaseItemInput extends Partial<RewardLimitSettings> {
  title: string;
  url?: string;
  note?: string;
  estimatedCost: number;
  priceMin?: number | null;
  priceMax?: number | null;
  grade?: RewardGrade;
  status?: PurchaseStatus;
}

const normalizePurchaseInput = (
  input: PurchaseItemInput,
): Omit<PurchaseItem, 'id' | 'createdAt' | 'updatedAt' | 'priceHistory'> => {
  const title = input.title.trim();
  if (!title) throw new Error('Purchase title is required.');
  if (!Number.isInteger(input.estimatedCost) || input.estimatedCost <= 0) throw new Error('Estimated cost must be positive.');
  const normalizeOptionalPrice = (value: number | null | undefined): number | null => (
    Number.isInteger(value) && Number(value) > 0 ? Number(value) : null
  );
  const priceMin = normalizeOptionalPrice(input.priceMin);
  const priceMax = normalizeOptionalPrice(input.priceMax);
  if (priceMin && priceMax && priceMin > priceMax) throw new Error('Price range is invalid.');
  return {
    title,
    url: input.url?.trim().slice(0, 500) ?? '',
    note: input.note?.trim() ?? '',
    estimatedCost: input.estimatedCost,
    priceMin,
    priceMax,
    grade: input.grade && Object.hasOwn(REWARD_GRADES, input.grade) ? input.grade : 'rare',
    status: input.status ?? 'considering',
    ...normalizeLimitSettings(input),
  };
};

export const addPurchaseItem = (
  state: RewardsLabState,
  input: PurchaseItemInput,
  runtime: EconomyRuntime = {},
): { state: RewardsLabState; purchase: PurchaseItem } => {
  const timestamp = now(runtime);
  const purchase: PurchaseItem = {
    id: createId(runtime), ...normalizePurchaseInput(input), priceHistory: [],
    createdAt: timestamp, updatedAt: timestamp,
  };
  return { state: { ...state, purchases: [...state.purchases, purchase] }, purchase };
};

export const updatePurchaseItem = (
  state: RewardsLabState,
  purchaseId: string,
  input: PurchaseItemInput,
  runtime: EconomyRuntime = {},
): { state: RewardsLabState; purchase: PurchaseItem | null } => {
  const existing = state.purchases.find(item => item.id === purchaseId);
  if (!existing) return { state, purchase: null };
  const normalized = normalizePurchaseInput(input);
  const timestamp = now(runtime);
  const priceHistory = normalized.estimatedCost !== existing.estimatedCost
    ? [...existing.priceHistory, { amount: normalized.estimatedCost, recordedAt: timestamp }]
    : existing.priceHistory;
  const purchase = { ...existing, ...normalized, priceHistory, updatedAt: timestamp };
  return {
    state: { ...state, purchases: state.purchases.map(item => item.id === purchaseId ? purchase : item) },
    purchase,
  };
};

export type RedeemPurchaseOutcome = RedeemRewardOutcome | 'already-purchased';

export const redeemPurchase = (
  state: RewardsLabState,
  purchaseId: string,
  actualCost: number,
  runtime: EconomyRuntime = {},
): { state: RewardsLabState; transaction: WalletTransaction | null; outcome: RedeemPurchaseOutcome } => {
  const purchase = state.purchases.find(item => item.id === purchaseId);
  if (!purchase) return { state, transaction: null, outcome: 'not-found' };
  if (purchase.status === 'purchased') return { state, transaction: null, outcome: 'already-purchased' };
  if (purchase.status === 'rejected') return { state, transaction: null, outcome: 'inactive' };
  if (!Number.isInteger(actualCost) || actualCost <= 0) return { state, transaction: null, outcome: 'inactive' };
  const availability = getRedemptionAvailability(state, {
    ...purchase, cost: actualCost, repeatable: false, active: true, kind: 'purchase',
  }, new Date(now(runtime)));
  if (availability.outcome !== 'available') return { state, transaction: null, outcome: availability.outcome };

  const transactionId = createId(runtime);
  const keyResult = consumeKey(state.keys, purchase.grade, transactionId);
  if (!keyResult.key) return { state, transaction: null, outcome: 'missing-key' };
  const timestamp = now(runtime);
  const spent: WalletTransaction = {
    id: transactionId, kind: 'spend', amount: -actualCost, occurredAt: timestamp,
    label: purchase.title, purchaseId: purchase.id, keyId: keyResult.key.id,
  };
  const updatedPurchase: PurchaseItem = {
    ...purchase,
    estimatedCost: actualCost,
    status: 'purchased',
    priceHistory: purchase.estimatedCost === actualCost
      ? purchase.priceHistory
      : [...purchase.priceHistory, { amount: actualCost, recordedAt: timestamp }],
    updatedAt: timestamp,
  };
  return {
    state: {
      ...state,
      ledger: [...state.ledger, spent],
      keys: keyResult.keys,
      purchases: state.purchases.map(item => item.id === purchase.id ? updatedPurchase : item),
      metrics: {
        ...state.metrics,
        redemptionCount: state.metrics.redemptionCount + 1,
        lastRedeemedAt: timestamp,
      },
    },
    transaction: spent,
    outcome: 'redeemed',
  };
};

export const adjustWalletBalance = (
  state: RewardsLabState,
  amount: number,
  label: string,
  runtime: EconomyRuntime = {},
): { state: RewardsLabState; transaction: WalletTransaction } => {
  if (!Number.isInteger(amount) || amount === 0) throw new Error('Adjustment must be a non-zero integer.');
  const normalizedLabel = label.trim();
  if (!normalizedLabel) throw new Error('Adjustment reason is required.');
  const adjustment = transaction(runtime, { kind: 'adjustment', amount, label: normalizedLabel });
  return { state: { ...state, ledger: [...state.ledger, adjustment] }, transaction: adjustment };
};

export const recordLabOpened = (
  state: RewardsLabState,
  runtime: EconomyRuntime = {},
): RewardsLabState => ({
  ...state,
  metrics: { ...state.metrics, labOpenCount: state.metrics.labOpenCount + 1, lastOpenedAt: now(runtime) },
});
