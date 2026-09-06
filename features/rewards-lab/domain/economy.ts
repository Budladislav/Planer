import {
  EconomyRuntime,
  FairBagState,
  REWARD_GRADES,
  REWARDS_ECONOMY_VERSION,
  RewardClaim,
  RewardDefinition,
  RewardGrade,
  RewardGradeCorrection,
  RewardLuckSlot,
  RewardsLabState,
  WalletTransaction,
} from './types';

export const FAIR_BAG_SLOTS: readonly RewardLuckSlot[] = [0, 1, 2, 3, 4, 5, 6, 7, 8];

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

  // A valid bag can only be empty before starting a new cycle.
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
  if (grade === 'common') {
    delete taskGrades[taskId];
  } else {
    taskGrades[taskId] = grade;
  }
  return { ...state, taskGrades };
};

export const claimLedgerTotal = (state: RewardsLabState, claimId: string): number => (
  state.ledger.reduce(
    (total, transaction) => transaction.claimId === claimId ? total + transaction.amount : total,
    0,
  )
);

export const isRewardClaimActive = (state: RewardsLabState, taskId: string): boolean => {
  const claim = state.claims[taskId];
  return Boolean(claim && claimLedgerTotal(state, claim.id) > 0);
};

export const getEarnedTaskRewards = (state: RewardsLabState): number => (
  state.ledger.reduce(
    (total, item) => item.claimId ? total + item.amount : total,
    0,
  )
);

const transaction = (
  runtime: EconomyRuntime,
  input: Omit<WalletTransaction, 'id' | 'occurredAt'> & { occurredAt?: string },
): WalletTransaction => ({
  ...input,
  id: createId(runtime),
  occurredAt: input.occurredAt ?? now(runtime),
});

export interface CompleteTaskRewardInput {
  taskId: string;
  taskTitle: string;
  completedAt: string;
}

export interface CompletionRewardResult {
  state: RewardsLabState;
  claim: RewardClaim;
  transaction: WalletTransaction | null;
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
      return { state, claim: existingClaim, transaction: null, outcome: 'already-posted' };
    }

    const restoredClaim: RewardClaim = {
      ...existingClaim,
      taskTitle: input.taskTitle,
      completedAt: input.completedAt,
    };
    const restored = transaction(runtime, {
      kind: 'restore',
      amount: restoredClaim.amount,
      label: `Restored reward for ${restoredClaim.taskTitle}`,
      taskId: restoredClaim.taskId,
      claimId: restoredClaim.id,
      economyVersion: restoredClaim.economyVersion,
    });
    return {
      state: {
        ...state,
        claims: { ...state.claims, [input.taskId]: restoredClaim },
        ledger: [...state.ledger, restored],
      },
      claim: restoredClaim,
      transaction: restored,
      outcome: 'restored',
    };
  }

  const draw = drawFromFairBag(state.fairBag, runtime.random);
  const grade = getTaskGrade(state, input.taskId);
  const claim: RewardClaim = {
    id: createId(runtime),
    taskId: input.taskId,
    taskTitle: input.taskTitle,
    completedAt: input.completedAt,
    grade,
    luckSlot: draw.luckSlot,
    amount: getV2RewardAmount(grade, draw.luckSlot),
    economyVersion: REWARDS_ECONOMY_VERSION,
    createdAt: now(runtime),
  };
  const earned = transaction(runtime, {
    kind: 'earn',
    amount: claim.amount,
    label: `Reward for ${claim.taskTitle}`,
    taskId: claim.taskId,
    claimId: claim.id,
    economyVersion: claim.economyVersion,
    occurredAt: input.completedAt,
  });

  return {
    state: {
      ...state,
      fairBag: draw.fairBag,
      claims: { ...state.claims, [input.taskId]: claim },
      ledger: [...state.ledger, earned],
    },
    claim,
    transaction: earned,
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
  if (claimLedgerTotal(state, claim.id) > 0) {
    return { state, claim, correction: null, outcome: 'claim-active' };
  }
  if (claim.grade === grade) {
    return { state, claim, correction: null, outcome: 'unchanged' };
  }

  const amount = getClaimAmountForGrade(claim, grade);
  const updatedClaim: RewardClaim = claim.economyVersion === 1
    ? {
        ...claim,
        grade,
        multiplier: REWARD_GRADES[grade].legacyMultiplier,
        amount,
      }
    : { ...claim, grade, amount };
  const correction: RewardGradeCorrection = {
    id: createId(runtime),
    claimId: claim.id,
    taskId,
    fromGrade: claim.grade,
    toGrade: grade,
    previousAmount: claim.amount,
    amount,
    economyVersion: claim.economyVersion,
    occurredAt: now(runtime),
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
  if (claimLedgerTotal(state, claim.id) <= 0) {
    return { state, transaction: null, outcome: 'already-reversed' };
  }

  const reversed = transaction(runtime, {
    kind: 'reverse',
    amount: -claim.amount,
    label: `Reversed reward for ${claim.taskTitle}`,
    taskId: claim.taskId,
    claimId: claim.id,
    economyVersion: claim.economyVersion,
  });
  return {
    state: { ...state, ledger: [...state.ledger, reversed] },
    transaction: reversed,
    outcome: 'reversed',
  };
};

export interface RewardDefinitionInput {
  title: string;
  cost: number;
  note?: string;
  active?: boolean;
  repeatable?: boolean;
}

const normalizeDefinitionInput = (input: RewardDefinitionInput): Omit<RewardDefinition, 'id' | 'createdAt' | 'updatedAt'> => {
  const title = input.title.trim();
  if (!title) throw new Error('Reward title is required.');
  if (!Number.isInteger(input.cost) || input.cost <= 0) {
    throw new Error('Reward cost must be a positive integer.');
  }
  return {
    title,
    cost: input.cost,
    note: input.note?.trim() ?? '',
    active: input.active ?? true,
    repeatable: input.repeatable ?? true,
  };
};

export const addRewardDefinition = (
  state: RewardsLabState,
  input: RewardDefinitionInput,
  runtime: EconomyRuntime = {},
): { state: RewardsLabState; reward: RewardDefinition } => {
  const timestamp = now(runtime);
  const reward: RewardDefinition = {
    id: createId(runtime),
    ...normalizeDefinitionInput(input),
    createdAt: timestamp,
    updatedAt: timestamp,
  };
  return { state: { ...state, rewards: [...state.rewards, reward] }, reward };
};

export const updateRewardDefinition = (
  state: RewardsLabState,
  rewardId: string,
  input: RewardDefinitionInput,
  runtime: EconomyRuntime = {},
): { state: RewardsLabState; reward: RewardDefinition | null } => {
  const existing = state.rewards.find((reward) => reward.id === rewardId);
  if (!existing) return { state, reward: null };
  const reward: RewardDefinition = {
    ...existing,
    ...normalizeDefinitionInput(input),
    updatedAt: now(runtime),
  };
  return {
    state: { ...state, rewards: state.rewards.map((item) => item.id === rewardId ? reward : item) },
    reward,
  };
};

export const archiveRewardDefinition = (
  state: RewardsLabState,
  rewardId: string,
  runtime: EconomyRuntime = {},
): { state: RewardsLabState; reward: RewardDefinition | null } => {
  const existing = state.rewards.find((reward) => reward.id === rewardId);
  if (!existing) return { state, reward: null };
  return updateRewardDefinition(state, rewardId, { ...existing, active: false }, runtime);
};

const hasUnrefundedSpend = (state: RewardsLabState, rewardId: string): boolean => {
  const refunds = new Set(
    state.ledger
      .filter((item) => item.kind === 'refund' && item.relatedTransactionId)
      .map((item) => item.relatedTransactionId),
  );
  return state.ledger.some(
    (item) => item.kind === 'spend' && item.rewardId === rewardId && !refunds.has(item.id),
  );
};

export type RedeemRewardOutcome =
  | 'redeemed'
  | 'not-found'
  | 'inactive'
  | 'insufficient-balance'
  | 'already-redeemed';

export interface RedeemRewardResult {
  state: RewardsLabState;
  transaction: WalletTransaction | null;
  outcome: RedeemRewardOutcome;
}

export const redeemReward = (
  state: RewardsLabState,
  rewardId: string,
  runtime: EconomyRuntime = {},
): RedeemRewardResult => {
  const reward = state.rewards.find((item) => item.id === rewardId);
  if (!reward) return { state, transaction: null, outcome: 'not-found' };
  if (!reward.active) return { state, transaction: null, outcome: 'inactive' };
  if (!reward.repeatable && hasUnrefundedSpend(state, rewardId)) {
    return { state, transaction: null, outcome: 'already-redeemed' };
  }
  if (getWalletBalance(state) < reward.cost) {
    return { state, transaction: null, outcome: 'insufficient-balance' };
  }

  const spent = transaction(runtime, {
    kind: 'spend',
    amount: -reward.cost,
    label: reward.title,
    rewardId: reward.id,
  });
  const occurredAt = spent.occurredAt;
  return {
    state: {
      ...state,
      ledger: [...state.ledger, spent],
      metrics: {
        ...state.metrics,
        redemptionCount: state.metrics.redemptionCount + 1,
        lastRedeemedAt: occurredAt,
      },
    },
    transaction: spent,
    outcome: 'redeemed',
  };
};

export type RefundOutcome = 'refunded' | 'not-found' | 'not-spend' | 'already-refunded';

export const refundRedemption = (
  state: RewardsLabState,
  spendTransactionId: string,
  runtime: EconomyRuntime = {},
): { state: RewardsLabState; transaction: WalletTransaction | null; outcome: RefundOutcome } => {
  const spent = state.ledger.find((item) => item.id === spendTransactionId);
  if (!spent) return { state, transaction: null, outcome: 'not-found' };
  if (spent.kind !== 'spend') return { state, transaction: null, outcome: 'not-spend' };
  if (state.ledger.some(
    (item) => item.kind === 'refund' && item.relatedTransactionId === spendTransactionId,
  )) {
    return { state, transaction: null, outcome: 'already-refunded' };
  }

  const refunded = transaction(runtime, {
    kind: 'refund',
    amount: -spent.amount,
    label: `Refund: ${spent.label}`,
    rewardId: spent.rewardId,
    relatedTransactionId: spent.id,
  });
  return {
    state: { ...state, ledger: [...state.ledger, refunded] },
    transaction: refunded,
    outcome: 'refunded',
  };
};

export const adjustWalletBalance = (
  state: RewardsLabState,
  amount: number,
  label: string,
  runtime: EconomyRuntime = {},
): { state: RewardsLabState; transaction: WalletTransaction } => {
  if (!Number.isInteger(amount) || amount === 0) {
    throw new Error('Adjustment must be a non-zero integer.');
  }
  const normalizedLabel = label.trim();
  if (!normalizedLabel) throw new Error('Adjustment reason is required.');
  const adjustment = transaction(runtime, {
    kind: 'adjustment',
    amount,
    label: normalizedLabel,
  });
  return { state: { ...state, ledger: [...state.ledger, adjustment] }, transaction: adjustment };
};

export const recordLabOpened = (
  state: RewardsLabState,
  runtime: EconomyRuntime = {},
): RewardsLabState => ({
  ...state,
  metrics: {
    ...state.metrics,
    labOpenCount: state.metrics.labOpenCount + 1,
    lastOpenedAt: now(runtime),
  },
});
