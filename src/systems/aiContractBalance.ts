import { CharacterClass, GameMode, QuestObjectiveType, type Quest } from '../types/index.js';
import { getAllLocations, getHubTown, type GameLocation } from '../data/locations.js';
import { getDefaultQuests } from '../data/quests.js';
import { getSampleMonsters } from '../data/monsters.js';
import { recordAiMoment } from './aiMemory.js';
import { composeAiContracts } from './aiContractComposer.js';
import { createNewGameState } from './newGameState.js';
import { estimateQuestPlaytimeRange } from './playtimeBalance.js';

export type AiContractBalanceScenarioId = 'opening-push' | 'recovery-reset' | 'extended-supply';

export interface AiContractBalanceTargets {
  maxGoldToCombatGoldRatio: number;
  maxGoldToStaticQuestRatio: number;
  maxExpToStaticQuestRatio: number;
  maxGoldPerMinuteToStaticRatio: number;
  maxExpPerMinuteToStaticRatio: number;
  maxRewardItems: number;
}

export interface AiContractBalanceActBenchmark {
  act: number;
  minLevel: number;
  maxLevel: number;
  averageCombatGold: number;
  staticQuestAverageGold: number;
  staticQuestAverageExp: number;
  staticQuestAverageGoldPerMinute: number;
  staticQuestAverageExpPerMinute: number;
}

export interface AiContractScenarioMetric {
  scenarioId: AiContractBalanceScenarioId;
  act: number;
  locationId: string;
  locationName: string;
  reconQuestId: string;
  adaptiveQuestId: string;
  adaptiveDirective: string;
  sessionWindow: string;
  adaptiveObjectiveType: string;
  rewardGold: number;
  rewardExp: number;
  rewardItems: number;
  estimatedMinutes: number;
  goldToCombatGoldRatio: number;
  goldToStaticQuestRatio: number;
  expToStaticQuestRatio: number;
  goldPerMinuteToStaticRatio: number;
  expPerMinuteToStaticRatio: number;
}

export interface AiContractBalanceReport {
  targets: AiContractBalanceTargets;
  benchmarksByAct: AiContractBalanceActBenchmark[];
  scenarioMetrics: AiContractScenarioMetric[];
  warnings: string[];
  errors: string[];
}

export const AI_CONTRACT_BALANCE_TARGETS: AiContractBalanceTargets = {
  maxGoldToCombatGoldRatio: 3.2,
  maxGoldToStaticQuestRatio: 1.35,
  maxExpToStaticQuestRatio: 1.35,
  maxGoldPerMinuteToStaticRatio: 1.55,
  maxExpPerMinuteToStaticRatio: 1.55,
  maxRewardItems: 2
};

function average(values: number[]): number {
  if (values.length === 0) {
    return 0;
  }

  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function midpoint(min: number, max: number): number {
  return (min + max) / 2;
}

function stripVariantSuffix(value: string): string {
  return value.replace(/\s*\([^()]+\)\s*$/, '').trim();
}

function compareLocations(a: GameLocation, b: GameLocation): number {
  return a.act - b.act || a.order - b.order || a.name.localeCompare(b.name);
}

function getSortedLocations(): GameLocation[] {
  return [...getAllLocations()].sort(compareLocations);
}

function getExpectedCombatGold(location: GameLocation): number {
  const monsters = getSampleMonsters();
  const values = location.monsters
    .map(monsterId => monsters[monsterId])
    .filter((monster): monster is NonNullable<typeof monster> => Boolean(monster))
    .map(monster => (monster.dropTable.minGold + monster.dropTable.maxGold) / 2);

  return average(values);
}

function getStaticQuestsForAct(act: number): Quest[] {
  const locations = getSortedLocations().filter(location => location.act === act);
  if (locations.length === 0) {
    return [];
  }

  const minLevel = Math.min(...locations.map(location => location.recommendedLevel[0]));
  const maxLevel = Math.max(...locations.map(location => location.recommendedLevel[1]));

  return Object.values(getDefaultQuests())
    .filter(quest =>
      !quest.repeatable &&
      !quest.seasonalEventId &&
      quest.requiredLevel >= minLevel &&
      quest.requiredLevel <= maxLevel
    );
}

function getActBenchmark(act: number): AiContractBalanceActBenchmark {
  const locations = getSortedLocations().filter(location => location.act === act);
  const staticQuests = getStaticQuestsForAct(act);
  const questMinuteValues = staticQuests.map(quest => {
    const range = estimateQuestPlaytimeRange(quest);
    return Math.max(1, midpoint(range.min, range.max));
  });
  const goldPerMinuteValues = staticQuests.map((quest, index) =>
    quest.rewards.gold / questMinuteValues[index]
  );
  const expPerMinuteValues = staticQuests.map((quest, index) =>
    quest.rewards.exp / questMinuteValues[index]
  );

  return {
    act,
    minLevel: Math.min(...locations.map(location => location.recommendedLevel[0])),
    maxLevel: Math.max(...locations.map(location => location.recommendedLevel[1])),
    averageCombatGold: average(locations.map(getExpectedCombatGold)),
    staticQuestAverageGold: average(staticQuests.map(quest => quest.rewards.gold)),
    staticQuestAverageExp: average(staticQuests.map(quest => quest.rewards.exp)),
    staticQuestAverageGoldPerMinute: average(goldPerMinuteValues),
    staticQuestAverageExpPerMinute: average(expPerMinuteValues)
  };
}

function buildScenarioGameState(location: GameLocation, scenarioId: AiContractBalanceScenarioId) {
  const gameState = createNewGameState('BalanceProbe', CharacterClass.Warrior, GameMode.Adventure);
  const hub = getHubTown();
  const sortedLocations = getSortedLocations();
  const targetIndex = sortedLocations.findIndex(entry => entry.id === location.id);
  const clearedLocations = targetIndex > 0 ? sortedLocations.slice(0, targetIndex) : [];
  const recommendedLevel = location.recommendedLevel[0];

  gameState.player.level = recommendedLevel;
  gameState.statistics.highestLevel = recommendedLevel;
  gameState.player.currentLocation = hub.id;
  gameState.position.locationId = hub.id;
  gameState.position.stepsTaken = 0;
  gameState.player.unlockedLocations = [
    hub.id,
    ...clearedLocations.map(entry => entry.id),
    location.id
  ];
  gameState.statistics.bossesDefeated = clearedLocations.map(entry => entry.boss);
  gameState.statistics.locationsDiscovered = gameState.player.unlockedLocations.length;

  switch (scenarioId) {
    case 'recovery-reset':
      gameState.player.stats.hp = Math.max(1, Math.floor(gameState.player.stats.maxHp * 0.35));
      gameState.player.stats.mp = Math.max(0, Math.floor(gameState.player.stats.maxMp * 0.2));
      recordAiMoment(gameState, {
        type: 'defeat',
        label: `${stripVariantSuffix(location.name)} 후퇴`,
        timestamp: 1700000000000
      });
      break;
    case 'extended-supply':
      gameState.statistics.totalPlayTime = 45 * 60;
      gameState.player.inventory = Array.from({ length: 14 }, () => 'health-potion');
      recordAiMoment(gameState, {
        type: 'purchase',
        label: '보급 재정렬',
        timestamp: 1700000000000
      });
      break;
    case 'opening-push':
    default:
      break;
  }

  return gameState;
}

function getExpectedAdaptiveQuestId(scenarioId: AiContractBalanceScenarioId): string {
  switch (scenarioId) {
    case 'recovery-reset':
      return 'ai-contract-frontier-recovery';
    case 'extended-supply':
      return 'ai-contract-frontier-supply';
    case 'opening-push':
    default:
      return 'ai-contract-frontier-cull';
  }
}

function getExpectedAdaptiveDirective(scenarioId: AiContractBalanceScenarioId): string {
  switch (scenarioId) {
    case 'recovery-reset':
      return 'recovery';
    case 'extended-supply':
      return 'supply';
    case 'opening-push':
    default:
      return 'push';
  }
}

function getExpectedSessionWindow(scenarioId: AiContractBalanceScenarioId): string {
  switch (scenarioId) {
    case 'extended-supply':
      return 'extended';
    case 'recovery-reset':
    case 'opening-push':
    default:
      return 'opening';
  }
}

function getExpectedObjectiveType(scenarioId: AiContractBalanceScenarioId): QuestObjectiveType {
  switch (scenarioId) {
    case 'recovery-reset':
    case 'extended-supply':
      return QuestObjectiveType.Talk;
    case 'opening-push':
    default:
      return QuestObjectiveType.Kill;
  }
}

export function formatAiContractBalanceScenarioLine(metric: AiContractScenarioMetric): string {
  return [
    `${metric.scenarioId}`,
    `Act ${metric.act}`,
    metric.locationName,
    `adaptive=${metric.adaptiveQuestId}`,
    `directive=${metric.adaptiveDirective}`,
    `window=${metric.sessionWindow}`,
    `goldRatio=${metric.goldToCombatGoldRatio.toFixed(2)}`,
    `questGoldRatio=${metric.goldToStaticQuestRatio.toFixed(2)}`,
    `questExpRatio=${metric.expToStaticQuestRatio.toFixed(2)}`,
    `goldPerMinRatio=${metric.goldPerMinuteToStaticRatio.toFixed(2)}`,
    `expPerMinRatio=${metric.expPerMinuteToStaticRatio.toFixed(2)}`
  ].join(' | ');
}

export function collectAiContractBalanceReport(
  targets: AiContractBalanceTargets = AI_CONTRACT_BALANCE_TARGETS
): AiContractBalanceReport {
  const warnings: string[] = [];
  const errors: string[] = [];
  const scenarioMetrics: AiContractScenarioMetric[] = [];
  const locations = getSortedLocations();
  const benchmarksByAct = Array.from(new Set(locations.map(location => location.act)))
    .sort((a, b) => a - b)
    .map(getActBenchmark);
  const benchmarkMap = new Map(benchmarksByAct.map(entry => [entry.act, entry] as const));
  const scenarioIds: AiContractBalanceScenarioId[] = [
    'opening-push',
    'recovery-reset',
    'extended-supply'
  ];

  for (const location of locations) {
    const benchmark = benchmarkMap.get(location.act);
    if (!benchmark) {
      errors.push(`[ai-contract-balance] missing benchmark for Act ${location.act}`);
      continue;
    }

    for (const scenarioId of scenarioIds) {
      const gameState = buildScenarioGameState(location, scenarioId);
      const contracts = composeAiContracts(gameState);
      const reconQuest = contracts.find(quest => quest.id === 'ai-contract-frontier-recon');
      const adaptiveQuest = contracts.find(quest => quest.id !== 'ai-contract-frontier-recon');
      const expectedAdaptiveQuestId = getExpectedAdaptiveQuestId(scenarioId);
      const expectedDirective = getExpectedAdaptiveDirective(scenarioId);
      const expectedSessionWindow = getExpectedSessionWindow(scenarioId);
      const expectedObjectiveType = getExpectedObjectiveType(scenarioId);

      if (contracts.length !== 2) {
        errors.push(
          `[ai-contract-balance] ${location.id}/${scenarioId} expected 2 contracts but received ${contracts.length}`
        );
        continue;
      }

      if (!reconQuest) {
        errors.push(`[ai-contract-balance] ${location.id}/${scenarioId} missing recon contract`);
        continue;
      }

      if (!adaptiveQuest) {
        errors.push(`[ai-contract-balance] ${location.id}/${scenarioId} missing adaptive contract`);
        continue;
      }

      if (adaptiveQuest.id !== expectedAdaptiveQuestId) {
        errors.push(
          `[ai-contract-balance] ${location.id}/${scenarioId} expected ${expectedAdaptiveQuestId} but received ${adaptiveQuest.id}`
        );
      }

      if (adaptiveQuest.aiContract?.directive !== expectedDirective) {
        errors.push(
          `[ai-contract-balance] ${location.id}/${scenarioId} expected directive ${expectedDirective} but received ${adaptiveQuest.aiContract?.directive ?? 'none'}`
        );
      }

      if (adaptiveQuest.aiContract?.sessionWindow !== expectedSessionWindow) {
        errors.push(
          `[ai-contract-balance] ${location.id}/${scenarioId} expected session window ${expectedSessionWindow} but received ${adaptiveQuest.aiContract?.sessionWindow ?? 'none'}`
        );
      }

      if ((adaptiveQuest.objectives[0]?.type ?? '') !== expectedObjectiveType) {
        errors.push(
          `[ai-contract-balance] ${location.id}/${scenarioId} expected objective ${expectedObjectiveType} but received ${adaptiveQuest.objectives[0]?.type ?? 'none'}`
        );
      }

      if (adaptiveQuest.rewards.items.length > targets.maxRewardItems) {
        errors.push(
          `[ai-contract-balance] ${location.id}/${scenarioId} reward item count ${adaptiveQuest.rewards.items.length} exceeds ${targets.maxRewardItems}`
        );
      }

      const estimatedRange = estimateQuestPlaytimeRange(adaptiveQuest);
      const estimatedMinutes = Math.max(1, midpoint(estimatedRange.min, estimatedRange.max));
      const averageCombatGold = Math.max(1, benchmark.averageCombatGold);
      const staticQuestAverageGold = Math.max(1, benchmark.staticQuestAverageGold);
      const staticQuestAverageExp = Math.max(1, benchmark.staticQuestAverageExp);
      const staticQuestAverageGoldPerMinute = Math.max(0.01, benchmark.staticQuestAverageGoldPerMinute);
      const staticQuestAverageExpPerMinute = Math.max(0.01, benchmark.staticQuestAverageExpPerMinute);
      const goldPerMinute = adaptiveQuest.rewards.gold / estimatedMinutes;
      const expPerMinute = adaptiveQuest.rewards.exp / estimatedMinutes;

      const metric: AiContractScenarioMetric = {
        scenarioId,
        act: location.act,
        locationId: location.id,
        locationName: stripVariantSuffix(location.name),
        reconQuestId: reconQuest.id,
        adaptiveQuestId: adaptiveQuest.id,
        adaptiveDirective: adaptiveQuest.aiContract?.directive ?? 'unknown',
        sessionWindow: adaptiveQuest.aiContract?.sessionWindow ?? 'unknown',
        adaptiveObjectiveType: adaptiveQuest.objectives[0]?.type ?? 'none',
        rewardGold: adaptiveQuest.rewards.gold,
        rewardExp: adaptiveQuest.rewards.exp,
        rewardItems: adaptiveQuest.rewards.items.length,
        estimatedMinutes,
        goldToCombatGoldRatio: adaptiveQuest.rewards.gold / averageCombatGold,
        goldToStaticQuestRatio: adaptiveQuest.rewards.gold / staticQuestAverageGold,
        expToStaticQuestRatio: adaptiveQuest.rewards.exp / staticQuestAverageExp,
        goldPerMinuteToStaticRatio: goldPerMinute / staticQuestAverageGoldPerMinute,
        expPerMinuteToStaticRatio: expPerMinute / staticQuestAverageExpPerMinute
      };
      scenarioMetrics.push(metric);

      if (metric.goldToCombatGoldRatio > targets.maxGoldToCombatGoldRatio) {
        warnings.push(
          `[ai-contract-balance] ${location.id}/${scenarioId} gold/combat ratio ${metric.goldToCombatGoldRatio.toFixed(2)} exceeds ${targets.maxGoldToCombatGoldRatio}`
        );
      }
      if (metric.goldToStaticQuestRatio > targets.maxGoldToStaticQuestRatio) {
        warnings.push(
          `[ai-contract-balance] ${location.id}/${scenarioId} gold/static ratio ${metric.goldToStaticQuestRatio.toFixed(2)} exceeds ${targets.maxGoldToStaticQuestRatio}`
        );
      }
      if (metric.expToStaticQuestRatio > targets.maxExpToStaticQuestRatio) {
        warnings.push(
          `[ai-contract-balance] ${location.id}/${scenarioId} exp/static ratio ${metric.expToStaticQuestRatio.toFixed(2)} exceeds ${targets.maxExpToStaticQuestRatio}`
        );
      }
      if (metric.goldPerMinuteToStaticRatio > targets.maxGoldPerMinuteToStaticRatio) {
        warnings.push(
          `[ai-contract-balance] ${location.id}/${scenarioId} gold/min ratio ${metric.goldPerMinuteToStaticRatio.toFixed(2)} exceeds ${targets.maxGoldPerMinuteToStaticRatio}`
        );
      }
      if (metric.expPerMinuteToStaticRatio > targets.maxExpPerMinuteToStaticRatio) {
        warnings.push(
          `[ai-contract-balance] ${location.id}/${scenarioId} exp/min ratio ${metric.expPerMinuteToStaticRatio.toFixed(2)} exceeds ${targets.maxExpPerMinuteToStaticRatio}`
        );
      }
    }
  }

  return {
    targets,
    benchmarksByAct,
    scenarioMetrics,
    warnings,
    errors
  };
}
