import {
  Quest,
  QuestObjective,
  QuestObjectiveType
} from '../types/index.js';

export interface MinutesRange {
  min: number;
  max: number;
}

export interface FirstClearPlaytimeEstimate {
  targetMinutes: number;
  fullCompletionTargetRange: MinutesRange;
  locationRange: MinutesRange;
  mainQuestRange: MinutesRange;
  sideQuestRange: MinutesRange;
  recommendedSideQuestRange: MinutesRange;
  branchExplorationRange: MinutesRange;
  retryOverheadRange: MinutesRange;
  travelOverheadRange: MinutesRange;
  totalRange: MinutesRange;
  averageMinutes: number;
  averageHours: number;
  postClearEndgameRange: MinutesRange;
  postClearBuildExperimentRange: MinutesRange;
  postClearChallengeRouteRange: MinutesRange;
  fullCompletionRange: MinutesRange;
  fullCompletionAverageMinutes: number;
  fullCompletionAverageHours: number;
  sideQuestShare: number;
  repeatableShare: number;
  branchRootCount: number;
  warnings: string[];
  guardrailViolations: string[];
  meetsTarget: boolean;
  meetsFullCompletionTarget: boolean;
  meetsGuardrails: boolean;
}

export interface PlaytimeBalanceConfig {
  targetMinutes: number;
  fullCompletionTargetRange: MinutesRange;
  sideQuestCompletionMinRatio: number;
  sideQuestCompletionMaxRatio: number;
  staticTravelOverheadRange: MinutesRange;
  perLocationRetryRange: MinutesRange;
  perBossRetryRange: MinutesRange;
  perBranchRootRange: MinutesRange;
  postClearEndgameRunCountRange: MinutesRange;
  postClearEndgamePerRunRange: MinutesRange;
  postClearBuildExperimentRange: MinutesRange;
  postClearChallengeRouteRange: MinutesRange;
  minBranchRoots: number;
  minSideQuestShare: number;
  maxRepeatableShare: number;
}

export const DEFAULT_PLAYTIME_BALANCE_CONFIG: PlaytimeBalanceConfig = {
  targetMinutes: 12 * 60,
  fullCompletionTargetRange: { min: 20 * 60, max: 24 * 60 },
  sideQuestCompletionMinRatio: 0.6,
  sideQuestCompletionMaxRatio: 0.75,
  staticTravelOverheadRange: { min: 40, max: 70 },
  perLocationRetryRange: { min: 2, max: 4 },
  perBossRetryRange: { min: 4, max: 7 },
  perBranchRootRange: { min: 5, max: 9 },
  postClearEndgameRunCountRange: { min: 8, max: 12 },
  postClearEndgamePerRunRange: { min: 10, max: 14 },
  postClearBuildExperimentRange: { min: 90, max: 150 },
  postClearChallengeRouteRange: { min: 80, max: 140 },
  minBranchRoots: 4,
  minSideQuestShare: 0.12,
  maxRepeatableShare: 0.55
};

export const EXTENDED_PLAYTIME_BALANCE_CONFIG: PlaytimeBalanceConfig = {
  ...DEFAULT_PLAYTIME_BALANCE_CONFIG,
  fullCompletionTargetRange: { min: 25 * 60, max: 30 * 60 },
  sideQuestCompletionMinRatio: 0.75,
  sideQuestCompletionMaxRatio: 0.9,
  postClearEndgameRunCountRange: { min: 10, max: 14 },
  postClearEndgamePerRunRange: { min: 11, max: 16 },
  postClearBuildExperimentRange: { min: 120, max: 220 },
  postClearChallengeRouteRange: { min: 130, max: 250 },
  minBranchRoots: 6,
  minSideQuestShare: 0.2,
  maxRepeatableShare: 0.45
};

function clampMinMax(min: number, max: number): MinutesRange {
  if (min <= max) {
    return { min, max };
  }

  return { min: max, max: min };
}

function addRanges(...ranges: MinutesRange[]): MinutesRange {
  return ranges.reduce(
    (acc, range) => ({
      min: acc.min + range.min,
      max: acc.max + range.max
    }),
    { min: 0, max: 0 }
  );
}

function scaleRangeWithDifferentRatios(
  range: MinutesRange,
  minRatio: number,
  maxRatio: number
): MinutesRange {
  return clampMinMax(
    range.min * minRatio,
    range.max * maxRatio
  );
}

function midpoint(range: MinutesRange): number {
  return (range.min + range.max) / 2;
}

function getObjectiveMinuteWeight(objectiveType: QuestObjectiveType): MinutesRange {
  switch (objectiveType) {
    case QuestObjectiveType.Kill:
      return { min: 1.0, max: 1.8 };
    case QuestObjectiveType.Collect:
      return { min: 1.4, max: 2.3 };
    case QuestObjectiveType.Explore:
      return { min: 4.5, max: 7.0 };
    case QuestObjectiveType.Talk:
      return { min: 1.0, max: 1.6 };
    case QuestObjectiveType.Survive:
      return { min: 3.0, max: 5.0 };
    case QuestObjectiveType.Escort:
      return { min: 3.5, max: 5.5 };
    default:
      return { min: 1.5, max: 2.5 };
  }
}

function objectivePlaytimeRange(objective: QuestObjective): MinutesRange {
  const amount = Math.max(1, objective.requiredAmount || 1);
  const weight = getObjectiveMinuteWeight(objective.type);

  return {
    min: weight.min * amount,
    max: weight.max * amount
  };
}

export function estimateQuestPlaytimeRange(quest: Quest): MinutesRange {
  const baseRange: MinutesRange = { min: 3, max: 5 };
  const objectiveRanges = quest.objectives.map(objectivePlaytimeRange);
  const objectiveSum = addRanges(...objectiveRanges);
  const coordinationOverhead = Math.max(0, quest.objectives.length - 1);
  const coordinationRange: MinutesRange = {
    min: coordinationOverhead * 0.8,
    max: coordinationOverhead * 1.5
  };

  return addRanges(baseRange, objectiveSum, coordinationRange);
}

export function parseTargetPlaytimeRange(value: string): MinutesRange | null {
  const normalized = value.trim();
  if (normalized.length === 0) {
    return null;
  }

  const rangeMatch = normalized.match(/(\d+)\s*-\s*(\d+)/);
  if (rangeMatch) {
    return clampMinMax(Number(rangeMatch[1]), Number(rangeMatch[2]));
  }

  const singleMatch = normalized.match(/(\d+)/);
  if (singleMatch) {
    const minute = Number(singleMatch[1]);
    return { min: minute, max: minute };
  }

  return null;
}

export function estimateFirstClearPlaytime(
  locations: Array<{ id: string; targetPlaytime: string; boss?: string | null }>,
  quests: Quest[],
  config: PlaytimeBalanceConfig = DEFAULT_PLAYTIME_BALANCE_CONFIG
): FirstClearPlaytimeEstimate {
  const warnings: string[] = [];
  const guardrailViolations: string[] = [];

  let locationRange: MinutesRange = { min: 0, max: 0 };
  const missingLocationTargets: string[] = [];
  for (const location of locations) {
    const parsed = parseTargetPlaytimeRange(location.targetPlaytime);
    if (!parsed) {
      missingLocationTargets.push(location.id);
      continue;
    }

    locationRange = addRanges(locationRange, parsed);
  }

  if (missingLocationTargets.length > 0) {
    warnings.push(
      `locations missing parseable targetPlaytime: ${missingLocationTargets.join(', ')}`
    );
  }

  let mainQuestRange: MinutesRange = { min: 0, max: 0 };
  let sideQuestRange: MinutesRange = { min: 0, max: 0 };
  for (const quest of quests) {
    const questRange = estimateQuestPlaytimeRange(quest);
    if (quest.isMainQuest) {
      mainQuestRange = addRanges(mainQuestRange, questRange);
    } else {
      sideQuestRange = addRanges(sideQuestRange, questRange);
    }
  }

  const recommendedSideQuestRange = scaleRangeWithDifferentRatios(
    sideQuestRange,
    config.sideQuestCompletionMinRatio,
    config.sideQuestCompletionMaxRatio
  );

  const prerequisiteUsage = new Map<string, number>();
  for (const quest of quests) {
    for (const prerequisiteId of quest.prerequisites ?? []) {
      prerequisiteUsage.set(
        prerequisiteId,
        (prerequisiteUsage.get(prerequisiteId) ?? 0) + 1
      );
    }
  }
  const branchRootCount = Array.from(prerequisiteUsage.values())
    .filter(count => count >= 2)
    .length;

  const branchExplorationRange: MinutesRange = {
    min: branchRootCount * config.perBranchRootRange.min,
    max: branchRootCount * config.perBranchRootRange.max
  };

  const bossCount = locations.filter(location => Boolean(location.boss)).length;
  const retryOverheadRange: MinutesRange = {
    min:
      locations.length * config.perLocationRetryRange.min +
      bossCount * config.perBossRetryRange.min,
    max:
      locations.length * config.perLocationRetryRange.max +
      bossCount * config.perBossRetryRange.max
  };

  const totalRange = addRanges(
    locationRange,
    mainQuestRange,
    recommendedSideQuestRange,
    branchExplorationRange,
    retryOverheadRange,
    config.staticTravelOverheadRange
  );

  const averageMinutes = midpoint(totalRange);

  const postClearEndgameRange: MinutesRange = {
    min:
      config.postClearEndgameRunCountRange.min *
      config.postClearEndgamePerRunRange.min,
    max:
      config.postClearEndgameRunCountRange.max *
      config.postClearEndgamePerRunRange.max
  };

  const fullCompletionRange = addRanges(
    totalRange,
    postClearEndgameRange,
    config.postClearBuildExperimentRange,
    config.postClearChallengeRouteRange
  );
  const fullCompletionAverageMinutes = midpoint(fullCompletionRange);

  const sideQuestShare = averageMinutes > 0
    ? midpoint(recommendedSideQuestRange) / averageMinutes
    : 0;
  const repeatableShare = fullCompletionAverageMinutes > 0
    ? midpoint(postClearEndgameRange) / fullCompletionAverageMinutes
    : 0;

  if (branchRootCount < config.minBranchRoots) {
    guardrailViolations.push(
      `branch roots below guardrail (${branchRootCount} < ${config.minBranchRoots})`
    );
  }

  if (sideQuestShare < config.minSideQuestShare) {
    guardrailViolations.push(
      `side quest share below guardrail (${(sideQuestShare * 100).toFixed(1)}% < ${(config.minSideQuestShare * 100).toFixed(1)}%)`
    );
  }

  if (repeatableShare > config.maxRepeatableShare) {
    guardrailViolations.push(
      `repeatable share above guardrail (${(repeatableShare * 100).toFixed(1)}% > ${(config.maxRepeatableShare * 100).toFixed(1)}%)`
    );
  }

  const meetsFullCompletionTarget =
    fullCompletionAverageMinutes >= config.fullCompletionTargetRange.min &&
    fullCompletionAverageMinutes <= config.fullCompletionTargetRange.max;

  if (!meetsFullCompletionTarget) {
    const direction = fullCompletionAverageMinutes < config.fullCompletionTargetRange.min
      ? 'below'
      : 'above';
    warnings.push(
      `full completion average is ${direction} target range (${Math.round(fullCompletionAverageMinutes)}분, target ${config.fullCompletionTargetRange.min}-${config.fullCompletionTargetRange.max}분)`
    );
  }

  return {
    targetMinutes: config.targetMinutes,
    fullCompletionTargetRange: config.fullCompletionTargetRange,
    locationRange,
    mainQuestRange,
    sideQuestRange,
    recommendedSideQuestRange,
    branchExplorationRange,
    retryOverheadRange,
    travelOverheadRange: config.staticTravelOverheadRange,
    totalRange,
    averageMinutes,
    averageHours: averageMinutes / 60,
    postClearEndgameRange,
    postClearBuildExperimentRange: config.postClearBuildExperimentRange,
    postClearChallengeRouteRange: config.postClearChallengeRouteRange,
    fullCompletionRange,
    fullCompletionAverageMinutes,
    fullCompletionAverageHours: fullCompletionAverageMinutes / 60,
    sideQuestShare,
    repeatableShare,
    branchRootCount,
    warnings,
    guardrailViolations,
    meetsTarget: averageMinutes >= config.targetMinutes,
    meetsFullCompletionTarget,
    meetsGuardrails: guardrailViolations.length === 0
  };
}
