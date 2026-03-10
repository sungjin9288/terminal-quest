import {
  type GameLocation,
  getAllLocations,
  getHubTown,
  getLocationById,
  isLevelAppropriate,
  isTownLocation
} from '../data/locations.js';
import { getItemById } from '../data/items.js';
import { getSampleMonsters } from '../data/monsters.js';
import { GameState, Quest, QuestObjective, QuestObjectiveType } from '../types/game.js';
import { canAffordCost, getInnRestCost } from './economy.js';
import { getTrackedAchievement } from './achievements.js';
import {
  getActiveQuests,
  getAvailableQuests,
  getCompletableQuests
} from './quest.js';

export const BOSS_ENCOUNTER_STEP_TARGET = 10;

export interface LocationBossProgress {
  bossId: string;
  bossName: string;
  stepsTaken: number;
  stepsRequired: number;
  remainingSteps: number;
  ready: boolean;
}

export interface AiQuestFocus {
  quest: Quest;
  objective: QuestObjective;
  readyToTurnIn: boolean;
  destinationId: string | null;
}

export interface AiTrackedAchievementContext {
  id: string;
  title: string;
  description: string;
  category: string;
  progressLabel: string;
  progressPercent: number;
}

export interface AiContext {
  currentLocationId: string;
  isTown: boolean;
  questFocus: AiQuestFocus | null;
  availableQuestCount: number;
  bossProgress: LocationBossProgress | null;
  frontier: GameLocation | null;
  frontierLevelFit: 'under' | 'appropriate' | 'over' | null;
  frontierRewardPreview: string | null;
  recommendedTravelDestinationId: string | null;
  hpRatio: number;
  mpRatio: number;
  inventoryRatio: number;
  innRestCost: number;
  canAffordInnRest: boolean;
  trackedAchievement: AiTrackedAchievementContext | null;
}

function compareLocations(a: GameLocation, b: GameLocation): number {
  return a.act - b.act || a.order - b.order || a.name.localeCompare(b.name);
}

function getSortedLocations(): GameLocation[] {
  return [...getAllLocations()].sort(compareLocations);
}

function formatMonsterName(monsterId: string): string {
  const monster = getSampleMonsters()[monsterId];
  if (monster) {
    return monster.name;
  }

  return monsterId
    .split('-')
    .map(token => token.charAt(0).toUpperCase() + token.slice(1))
    .join(' ');
}

export function getPrimaryQuestFocus(gameState: GameState): AiQuestFocus | null {
  const completableQuests = getCompletableQuests(gameState);
  const selectedQuest = completableQuests[0] ?? getActiveQuests(gameState)[0];
  if (!selectedQuest) {
    return null;
  }

  const objective = selectedQuest.objectives.find(item => !item.completed) ?? selectedQuest.objectives[0];
  if (!objective) {
    return null;
  }

  return {
    quest: selectedQuest,
    objective,
    readyToTurnIn: completableQuests[0]?.id === selectedQuest.id,
    destinationId: getObjectiveDestinationId(gameState, objective)
  };
}

function isDungeonLocation(locationId: string): boolean {
  const location = getLocationById(locationId);
  return Boolean(location && 'boss' in location);
}

function locationContainsMonster(location: GameLocation, monsterId: string): boolean {
  const miniBosses = Array.isArray(location.miniBoss)
    ? location.miniBoss
    : location.miniBoss
      ? [location.miniBoss]
      : [];

  return location.monsters.includes(monsterId) ||
    location.boss === monsterId ||
    miniBosses.includes(monsterId);
}

export function getObjectiveDestinationId(
  gameState: GameState,
  objective: QuestObjective
): string | null {
  switch (objective.type) {
    case QuestObjectiveType.Explore:
      return getLocationById(objective.targetId) ? objective.targetId : null;
    case QuestObjectiveType.Talk:
      if (
        objective.targetId === 'merchant' ||
        objective.targetId === 'innkeeper' ||
        objective.targetId === 'quest-board'
      ) {
        return getHubTown().id;
      }
      return null;
    case QuestObjectiveType.Kill: {
      const unlocked = getSortedLocations().find(location =>
        gameState.player.unlockedLocations.includes(location.id) &&
        locationContainsMonster(location, objective.targetId)
      );
      if (unlocked) {
        return unlocked.id;
      }

      const fallback = getSortedLocations().find(location =>
        locationContainsMonster(location, objective.targetId)
      );
      return fallback?.id ?? null;
    }
    default:
      return null;
  }
}

function getFirstClearRewardPreview(locationId: string): {
  exp: number;
  gold: number;
  skillPoints: number;
  itemNames: string[];
} | null {
  const location = getLocationById(locationId);
  if (!location || !('rewards' in location) || !location.rewards.firstClear) {
    return null;
  }

  const reward = location.rewards.firstClear;

  return {
    exp: reward.exp,
    gold: reward.gold,
    skillPoints: reward.skillPoints ?? 0,
    itemNames: reward.items.map(itemId => getItemById(itemId)?.name ?? itemId)
  };
}

export function formatFirstClearRewardPreview(locationId: string): string | null {
  const preview = getFirstClearRewardPreview(locationId);
  if (!preview) {
    return null;
  }

  const parts: string[] = [];
  if (preview.exp > 0) {
    parts.push(`EXP +${preview.exp}`);
  }
  if (preview.gold > 0) {
    parts.push(`골드 +${preview.gold}`);
  }
  if (preview.skillPoints > 0) {
    parts.push(`SP +${preview.skillPoints}`);
  }
  if (preview.itemNames.length > 0) {
    const visibleItems = preview.itemNames.slice(0, 2);
    const overflowCount = preview.itemNames.length - visibleItems.length;
    const itemLabel = overflowCount > 0
      ? `${visibleItems.join(', ')} 외 ${overflowCount}개`
      : visibleItems.join(', ');
    parts.push(`아이템 ${itemLabel}`);
  }

  return parts.join(' / ');
}

export function getFrontierLocation(gameState: GameState): GameLocation | null {
  return getSortedLocations().find(location =>
    gameState.player.unlockedLocations.includes(location.id) &&
    !gameState.statistics.bossesDefeated.includes(location.boss)
  ) ?? null;
}

export function getLocationBossProgress(gameState: GameState): LocationBossProgress | null {
  const locationId = gameState.player.currentLocation;
  if (!isDungeonLocation(locationId)) {
    return null;
  }

  const location = getLocationById(locationId);
  if (!location || !('boss' in location)) {
    return null;
  }

  if (gameState.statistics.bossesDefeated.includes(location.boss)) {
    return null;
  }

  const stepsTaken = gameState.position.locationId === locationId
    ? Math.max(0, gameState.position.stepsTaken)
    : 0;
  const remainingSteps = Math.max(0, BOSS_ENCOUNTER_STEP_TARGET - stepsTaken);

  return {
    bossId: location.boss,
    bossName: formatMonsterName(location.boss),
    stepsTaken,
    stepsRequired: BOSS_ENCOUNTER_STEP_TARGET,
    remainingSteps,
    ready: remainingSteps === 0
  };
}

export function getRecommendedTravelDestination(gameState: GameState): string | null {
  const locationId = gameState.player.currentLocation;
  const questFocus = getPrimaryQuestFocus(gameState);

  if (questFocus?.readyToTurnIn && !isTownLocation(locationId)) {
    return getHubTown().id;
  }

  if (questFocus?.destinationId && questFocus.destinationId !== locationId) {
    return questFocus.destinationId;
  }

  const frontier = getFrontierLocation(gameState);
  if (frontier && frontier.id !== locationId) {
    return frontier.id;
  }

  return null;
}

function buildTrackedAchievementContext(gameState: GameState): AiTrackedAchievementContext | null {
  const tracked = getTrackedAchievement(gameState);
  if (!tracked) {
    return null;
  }

  return {
    id: tracked.id,
    title: tracked.title,
    description: tracked.description,
    category: tracked.category,
    progressLabel: `${tracked.progress.current}/${tracked.progress.target}`,
    progressPercent: tracked.progress.target > 0
      ? Math.max(0, Math.min(100, Math.round((tracked.progress.current / tracked.progress.target) * 100)))
      : 0
  };
}

export function buildAiContext(gameState: GameState): AiContext {
  const frontier = getFrontierLocation(gameState);
  const hpRatio = gameState.player.stats.maxHp > 0
    ? gameState.player.stats.hp / gameState.player.stats.maxHp
    : 1;
  const mpRatio = gameState.player.stats.maxMp > 0
    ? gameState.player.stats.mp / gameState.player.stats.maxMp
    : 1;
  const inventoryRatio = gameState.player.maxInventorySize > 0
    ? gameState.player.inventory.length / gameState.player.maxInventorySize
    : 0;
  const innRestCost = getInnRestCost(gameState.player.level);

  return {
    currentLocationId: gameState.player.currentLocation,
    isTown: isTownLocation(gameState.player.currentLocation),
    questFocus: getPrimaryQuestFocus(gameState),
    availableQuestCount: getAvailableQuests(gameState).length,
    bossProgress: getLocationBossProgress(gameState),
    frontier,
    frontierLevelFit: frontier ? isLevelAppropriate(gameState.player.level, frontier.id) : null,
    frontierRewardPreview: frontier ? formatFirstClearRewardPreview(frontier.id) : null,
    recommendedTravelDestinationId: getRecommendedTravelDestination(gameState),
    hpRatio,
    mpRatio,
    inventoryRatio,
    innRestCost,
    canAffordInnRest: canAffordCost(gameState.player.gold, innRestCost),
    trackedAchievement: buildTrackedAchievementContext(gameState)
  };
}
