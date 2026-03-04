/**
 * Quest system for Terminal Quest
 */

import {
  GameState,
  Quest,
  QuestObjective,
  QuestObjectiveType,
  QuestStatus
} from '../types/game.js';
import { getDefaultQuests } from '../data/quests.js';
import { gainExp } from './leveling.js';
import { addItem } from './inventory.js';
import { trackTelemetryEvent } from './telemetry.js';
import {
  buildSeasonalQuestBonus,
  isSeasonalQuestActive
} from './seasonalEvents.js';

export interface QuestActionResult {
  success: boolean;
  message: string;
  quest?: Quest;
}

export interface QuestProgressUpdate {
  questId: string;
  questName: string;
  objectiveDescription: string;
  currentAmount: number;
  requiredAmount: number;
  justCompleted: boolean;
  questReadyToComplete: boolean;
}

export interface QuestCompletionResult extends QuestActionResult {
  expGained: number;
  goldGained: number;
  baseExpGained: number;
  baseGoldGained: number;
  bonusExpGained: number;
  bonusGoldGained: number;
  itemsAdded: string[];
  itemsFailed: string[];
  unlockedLocations: string[];
  oldLevel: number;
  newLevel: number;
  levelsGained: number;
  skillPointsGained: number;
  seasonalEventId?: string;
  repeatableReset: boolean;
}

function countItemInInventory(gameState: GameState, itemId: string): number {
  return gameState.player.inventory.filter(id => id === itemId).length;
}

function cloneObjective(objective: QuestObjective): QuestObjective {
  return { ...objective };
}

function cloneQuest(quest: Quest): Quest {
  return {
    ...quest,
    prerequisites: [...quest.prerequisites],
    objectives: quest.objectives.map(cloneObjective),
    rewards: {
      ...quest.rewards,
      items: [...quest.rewards.items],
      unlocksLocations: quest.rewards.unlocksLocations
        ? [...quest.rewards.unlocksLocations]
        : undefined
    }
  };
}

function syncObjectiveCompletion(quest: Quest): void {
  for (const objective of quest.objectives) {
    objective.completed = objective.currentAmount >= objective.requiredAmount;
  }
}

function markQuestObjectivesCompleted(quest: Quest): void {
  for (const objective of quest.objectives) {
    objective.currentAmount = objective.requiredAmount;
    objective.completed = true;
  }
}

function resetQuestObjectives(quest: Quest): void {
  for (const objective of quest.objectives) {
    objective.currentAmount = 0;
    objective.completed = false;
  }
}

export function isQuestReadyToComplete(quest: Quest): boolean {
  return quest.status === QuestStatus.Active &&
    quest.objectives.every(objective => objective.completed);
}

/**
 * Build merged quest state from defaults and existing save data
 */
export function initializeQuestState(existingQuests: Record<string, Quest> = {}): Record<string, Quest> {
  const templateQuests = getDefaultQuests();
  const merged: Record<string, Quest> = {};

  for (const [questId, templateQuest] of Object.entries(templateQuests)) {
    const savedQuest = existingQuests[questId];
    if (!savedQuest) {
      merged[questId] = cloneQuest(templateQuest);
      continue;
    }

    const mergedQuest = cloneQuest(templateQuest);
    mergedQuest.status = savedQuest.status;

    mergedQuest.objectives = templateQuest.objectives.map(templateObjective => {
      const savedObjective = savedQuest.objectives.find(objective =>
        objective.type === templateObjective.type &&
        objective.targetId === templateObjective.targetId
      );

      if (!savedObjective) {
        return cloneObjective(templateObjective);
      }

      const currentAmount = Math.max(
        0,
        Math.min(templateObjective.requiredAmount, savedObjective.currentAmount)
      );

      return {
        ...templateObjective,
        currentAmount,
        completed: currentAmount >= templateObjective.requiredAmount
      };
    });

    if (mergedQuest.status === QuestStatus.Completed) {
      markQuestObjectivesCompleted(mergedQuest);
    } else {
      syncObjectiveCompletion(mergedQuest);
    }

    merged[questId] = mergedQuest;
  }

  // Preserve unknown quests that may exist in old or custom save data.
  for (const [questId, savedQuest] of Object.entries(existingQuests)) {
    if (!merged[questId]) {
      merged[questId] = cloneQuest(savedQuest);
    }
  }

  return merged;
}

/**
 * Normalize quest state after loading save data
 */
export function ensureQuestState(gameState: GameState): void {
  gameState.quests = initializeQuestState(gameState.quests);

  const activeSet = new Set(gameState.player.activeQuests);
  const completedSet = new Set(gameState.player.completedQuests);

  for (const quest of Object.values(gameState.quests)) {
    if (completedSet.has(quest.id)) {
      if (quest.repeatable) {
        quest.status = QuestStatus.NotStarted;
        resetQuestObjectives(quest);
        continue;
      }

      quest.status = QuestStatus.Completed;
      markQuestObjectivesCompleted(quest);
      continue;
    }

    if (activeSet.has(quest.id) && quest.status !== QuestStatus.Completed) {
      quest.status = QuestStatus.Active;
    }

    if (quest.status !== QuestStatus.Completed) {
      syncObjectiveCompletion(quest);
    } else if (quest.repeatable) {
      quest.status = QuestStatus.NotStarted;
      resetQuestObjectives(quest);
    }
  }

  const normalizedCompleted: string[] = [];
  const normalizedActive: string[] = [];

  for (const quest of Object.values(gameState.quests)) {
    if (quest.status === QuestStatus.Completed) {
      if (!quest.repeatable) {
        normalizedCompleted.push(quest.id);
      }
    } else if (quest.status === QuestStatus.Active) {
      normalizedActive.push(quest.id);
    }
  }

  gameState.player.completedQuests = normalizedCompleted;
  gameState.player.activeQuests = normalizedActive;
}

/**
 * Get quests that player can currently accept
 */
export function getAvailableQuests(gameState: GameState): Quest[] {
  return Object.values(gameState.quests)
    .filter(quest =>
      quest.status === QuestStatus.NotStarted &&
      isSeasonalQuestActive(gameState, quest.seasonalEventId) &&
      gameState.player.level >= quest.requiredLevel &&
      quest.prerequisites.every(prerequisite =>
        gameState.player.completedQuests.includes(prerequisite)
      )
    )
    .sort((a, b) => a.requiredLevel - b.requiredLevel || a.name.localeCompare(b.name));
}

/**
 * Get currently active quests
 */
export function getActiveQuests(gameState: GameState): Quest[] {
  return Object.values(gameState.quests)
    .filter(quest => quest.status === QuestStatus.Active)
    .sort((a, b) => a.requiredLevel - b.requiredLevel || a.name.localeCompare(b.name));
}

/**
 * Get completed quests
 */
export function getCompletedQuests(gameState: GameState): Quest[] {
  return Object.values(gameState.quests)
    .filter(quest => quest.status === QuestStatus.Completed)
    .sort((a, b) => a.requiredLevel - b.requiredLevel || a.name.localeCompare(b.name));
}

/**
 * Get active quests with all objectives completed (ready to turn in)
 */
export function getCompletableQuests(gameState: GameState): Quest[] {
  return getActiveQuests(gameState).filter(isQuestReadyToComplete);
}

/**
 * Accept a quest from board
 */
export function acceptQuest(gameState: GameState, questId: string): QuestActionResult {
  const quest = gameState.quests[questId];
  if (!quest) {
    return {
      success: false,
      message: '퀘스트를 찾을 수 없습니다.'
    };
  }

  if (quest.status !== QuestStatus.NotStarted) {
    return {
      success: false,
      message: '이미 수락했거나 완료한 퀘스트입니다.',
      quest
    };
  }

  if (gameState.player.level < quest.requiredLevel) {
    return {
      success: false,
      message: `레벨이 부족합니다. (필요 레벨: ${quest.requiredLevel})`,
      quest
    };
  }

  const missingPrerequisites = quest.prerequisites.filter(prerequisite =>
    !gameState.player.completedQuests.includes(prerequisite)
  );
  if (missingPrerequisites.length > 0) {
    return {
      success: false,
      message: '선행 퀘스트를 먼저 완료해야 합니다.',
      quest
    };
  }

  quest.status = QuestStatus.Active;
  for (const objective of quest.objectives) {
    if (objective.type !== QuestObjectiveType.Collect) {
      continue;
    }

    const ownedCount = countItemInInventory(gameState, objective.targetId);
    objective.currentAmount = Math.min(objective.requiredAmount, ownedCount);
    objective.completed = objective.currentAmount >= objective.requiredAmount;
  }
  syncObjectiveCompletion(quest);

  if (!gameState.player.activeQuests.includes(questId)) {
    gameState.player.activeQuests.push(questId);
  }

  trackTelemetryEvent('quest_accepted', gameState, {
    questId: quest.id,
    requiredLevel: quest.requiredLevel,
    isMainQuest: quest.isMainQuest
  });

  return {
    success: true,
    message: `${quest.name} 퀘스트를 수락했습니다.`,
    quest
  };
}

function updateQuestProgress(
  gameState: GameState,
  objectiveType: QuestObjectiveType,
  targetId: string,
  amount: number
): QuestProgressUpdate[] {
  if (amount <= 0) {
    return [];
  }

  const updates: QuestProgressUpdate[] = [];
  const activeQuests = getActiveQuests(gameState);

  for (const quest of activeQuests) {
    const questUpdates: QuestProgressUpdate[] = [];

    for (const objective of quest.objectives) {
      if (objective.type !== objectiveType || objective.targetId !== targetId) {
        continue;
      }

      const before = objective.currentAmount;
      const after = Math.min(objective.requiredAmount, before + amount);
      if (after === before) {
        continue;
      }

      objective.currentAmount = after;
      objective.completed = after >= objective.requiredAmount;

      questUpdates.push({
        questId: quest.id,
        questName: quest.name,
        objectiveDescription: objective.description,
        currentAmount: objective.currentAmount,
        requiredAmount: objective.requiredAmount,
        justCompleted: !objective.completed ? false : before < objective.requiredAmount,
        questReadyToComplete: false
      });
    }

    if (questUpdates.length > 0) {
      syncObjectiveCompletion(quest);
      const questReadyToComplete = isQuestReadyToComplete(quest);
      for (const update of questUpdates) {
        updates.push({
          ...update,
          questReadyToComplete
        });
      }
    }
  }

  return updates;
}

export function updateQuestProgressOnKill(
  gameState: GameState,
  monsterId: string,
  amount: number = 1
): QuestProgressUpdate[] {
  return updateQuestProgress(gameState, QuestObjectiveType.Kill, monsterId, amount);
}

export function updateQuestProgressOnCollect(
  gameState: GameState,
  itemId: string,
  amount: number = 1
): QuestProgressUpdate[] {
  return updateQuestProgress(gameState, QuestObjectiveType.Collect, itemId, amount);
}

export function updateQuestProgressOnExplore(
  gameState: GameState,
  locationId: string
): QuestProgressUpdate[] {
  return updateQuestProgress(gameState, QuestObjectiveType.Explore, locationId, 1);
}

export function updateQuestProgressOnTalk(
  gameState: GameState,
  targetId: string
): QuestProgressUpdate[] {
  return updateQuestProgress(gameState, QuestObjectiveType.Talk, targetId, 1);
}

/**
 * Turn in a quest and receive rewards
 */
export function completeQuest(gameState: GameState, questId: string): QuestCompletionResult {
  const quest = gameState.quests[questId];
  if (!quest) {
    return {
      success: false,
      message: '퀘스트를 찾을 수 없습니다.',
      expGained: 0,
      goldGained: 0,
      baseExpGained: 0,
      baseGoldGained: 0,
      bonusExpGained: 0,
      bonusGoldGained: 0,
      itemsAdded: [],
      itemsFailed: [],
      unlockedLocations: [],
      oldLevel: gameState.player.level,
      newLevel: gameState.player.level,
      levelsGained: 0,
      skillPointsGained: 0,
      repeatableReset: false
    };
  }

  if (!isQuestReadyToComplete(quest)) {
    return {
      success: false,
      message: '아직 완료 조건을 충족하지 않았습니다.',
      quest,
      expGained: 0,
      goldGained: 0,
      baseExpGained: 0,
      baseGoldGained: 0,
      bonusExpGained: 0,
      bonusGoldGained: 0,
      itemsAdded: [],
      itemsFailed: [],
      unlockedLocations: [],
      oldLevel: gameState.player.level,
      newLevel: gameState.player.level,
      levelsGained: 0,
      skillPointsGained: 0,
      repeatableReset: false
    };
  }

  const oldLevel = gameState.player.level;
  const oldSkillPoints = gameState.player.skillPoints;
  const seasonalBonus = buildSeasonalQuestBonus(
    gameState,
    quest.rewards.exp,
    quest.rewards.gold
  );
  const bonusExp = seasonalBonus?.expBonus ?? 0;
  const bonusGold = seasonalBonus?.goldBonus ?? 0;
  const totalExp = quest.rewards.exp + bonusExp;
  const totalGold = quest.rewards.gold + bonusGold;

  const levelResult = gainExp(gameState.player, totalExp);

  gameState.player.gold += totalGold;
  gameState.statistics.goldEarned += totalGold;

  const itemsAdded: string[] = [];
  const itemsFailed: string[] = [];

  for (const itemId of quest.rewards.items) {
    const result = addItem(gameState.player, itemId, 1);
    if (result.success) {
      itemsAdded.push(itemId);
      gameState.statistics.itemsCollected += 1;
    } else {
      itemsFailed.push(itemId);
    }
  }

  if (seasonalBonus?.bonusItemTriggered && seasonalBonus.bonusItemId) {
    const result = addItem(gameState.player, seasonalBonus.bonusItemId, 1);
    if (result.success) {
      itemsAdded.push(seasonalBonus.bonusItemId);
      gameState.statistics.itemsCollected += 1;
    } else {
      itemsFailed.push(seasonalBonus.bonusItemId);
    }
  }

  const unlockedLocations: string[] = [];
  for (const locationId of quest.rewards.unlocksLocations ?? []) {
    if (!gameState.player.unlockedLocations.includes(locationId)) {
      gameState.player.unlockedLocations.push(locationId);
      gameState.statistics.locationsDiscovered += 1;
      unlockedLocations.push(locationId);
    }
  }

  const repeatableReset = quest.repeatable;
  if (repeatableReset) {
    quest.status = QuestStatus.NotStarted;
    resetQuestObjectives(quest);
  } else {
    quest.status = QuestStatus.Completed;
    markQuestObjectivesCompleted(quest);
  }

  gameState.player.activeQuests = gameState.player.activeQuests.filter(id => id !== quest.id);
  if (!repeatableReset && !gameState.player.completedQuests.includes(quest.id)) {
    gameState.player.completedQuests.push(quest.id);
  }

  gameState.statistics.questsCompleted += 1;
  gameState.statistics.highestLevel = Math.max(
    gameState.statistics.highestLevel,
    gameState.player.level
  );

  trackTelemetryEvent('quest_completed', gameState, {
    questId: quest.id,
    isMainQuest: quest.isMainQuest,
    rewardGold: totalGold,
    rewardExp: totalExp,
    levelsGained: levelResult.levelsGained,
    repeatable: repeatableReset,
    seasonalEventId: seasonalBonus?.eventId ?? 'none'
  });

  return {
    success: true,
    message: repeatableReset
      ? `${quest.name} 완료! 반복 의뢰가 다시 게시되었습니다.`
      : `${quest.name} 완료!`,
    quest,
    expGained: totalExp,
    goldGained: totalGold,
    baseExpGained: quest.rewards.exp,
    baseGoldGained: quest.rewards.gold,
    bonusExpGained: bonusExp,
    bonusGoldGained: bonusGold,
    itemsAdded,
    itemsFailed,
    unlockedLocations,
    oldLevel,
    newLevel: levelResult.newLevel,
    levelsGained: levelResult.levelsGained,
    skillPointsGained: gameState.player.skillPoints - oldSkillPoints,
    seasonalEventId: seasonalBonus?.eventId,
    repeatableReset
  };
}
