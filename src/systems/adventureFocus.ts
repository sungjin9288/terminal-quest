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
import {
  GameState,
  Quest,
  QuestObjective,
  QuestObjectiveType
} from '../types/game.js';
import {
  getActiveQuests,
  getAvailableQuests,
  getCompletableQuests
} from './quest.js';

export const BOSS_ENCOUNTER_STEP_TARGET = 10;

type AdventureFocusTone = 'info' | 'success' | 'warning';

export interface AdventureFocusSummary {
  title: string;
  tone: AdventureFocusTone;
  lines: string[];
  recommendedLocationId: string | null;
}

export interface LocationBossProgress {
  bossId: string;
  bossName: string;
  stepsTaken: number;
  stepsRequired: number;
  remainingSteps: number;
  ready: boolean;
}

interface QuestFocus {
  quest: Quest;
  objective: QuestObjective;
  readyToTurnIn: boolean;
}

interface FirstClearRewardPreview {
  exp: number;
  gold: number;
  skillPoints: number;
  itemNames: string[];
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

function getPrimaryQuestFocus(gameState: GameState): QuestFocus | null {
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
    readyToTurnIn: completableQuests[0]?.id === selectedQuest.id
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

function getObjectiveDestinationId(
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

function getFirstClearRewardPreview(locationId: string): FirstClearRewardPreview | null {
  const location = getLocationById(locationId);
  if (!location || !('rewards' in location) || !location.rewards.firstClear) {
    return null;
  }

  const reward = location.rewards.firstClear;

  return {
    exp: reward.exp,
    gold: reward.gold,
    skillPoints: reward.skillPoints ?? 0,
    itemNames: reward.items
      .map(itemId => getItemById(itemId)?.name ?? itemId)
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

  if (questFocus) {
    const objectiveDestinationId = getObjectiveDestinationId(gameState, questFocus.objective);
    if (objectiveDestinationId && objectiveDestinationId !== locationId) {
      return objectiveDestinationId;
    }
  }

  const frontier = getFrontierLocation(gameState);
  if (frontier && frontier.id !== locationId) {
    return frontier.id;
  }

  return null;
}

export function getAdventureFocusSummary(gameState: GameState): AdventureFocusSummary | null {
  const currentLocationId = gameState.player.currentLocation;
  const bossProgress = getLocationBossProgress(gameState);
  const questFocus = getPrimaryQuestFocus(gameState);
  const availableQuestCount = getAvailableQuests(gameState).length;

  if (questFocus?.readyToTurnIn) {
    const recommendedLocationId = !isTownLocation(currentLocationId)
      ? getHubTown().id
      : getObjectiveDestinationId(gameState, questFocus.objective);
    const recommendedLocation = recommendedLocationId
      ? getLocationById(recommendedLocationId)
      : null;

    const lines = [
      isTownLocation(currentLocationId)
        ? `${questFocus.quest.name} 보상을 게시판에서 수령하세요.`
        : `${questFocus.quest.name} 완료. 마을로 돌아가 보상을 수령하세요.`
    ];

    if (recommendedLocation && recommendedLocation.id !== currentLocationId) {
      lines.push(`추천 목적지: ${recommendedLocation.name}`);
    }

    return {
      title: '완료 직전',
      tone: 'success',
      recommendedLocationId: recommendedLocation?.id ?? null,
      lines
    };
  }

  if (bossProgress) {
    const rewardPreview = formatFirstClearRewardPreview(currentLocationId);
    return {
      title: bossProgress.ready ? '보스 경보' : '보스 추적',
      tone: bossProgress.ready ? 'warning' : 'info',
      recommendedLocationId: null,
      lines: [
        bossProgress.ready
          ? `${bossProgress.bossName}이(가) 출현할 수 있습니다. 다음 전투를 준비하세요.`
          : `${bossProgress.bossName} 조우까지 탐색 ${bossProgress.remainingSteps}회 남음 (${bossProgress.stepsTaken}/${bossProgress.stepsRequired})`,
        rewardPreview
          ? `첫 클리어 보상: ${rewardPreview}`
          : '자원 상태를 정비한 뒤 탐색을 이어가세요.'
      ]
    };
  }

  if (questFocus) {
    const recommendedLocationId = getObjectiveDestinationId(gameState, questFocus.objective);
    const recommendedLocation = recommendedLocationId
      ? getLocationById(recommendedLocationId)
      : null;

    const lines = [
      `${questFocus.quest.name}: ${questFocus.objective.description}`
    ];

    if (recommendedLocation && recommendedLocation.id !== currentLocationId) {
      lines.push(`추천 목적지: ${recommendedLocation.name}`);
    } else if (isTownLocation(currentLocationId) && availableQuestCount > 0) {
      lines.push(`추가 수락 가능 퀘스트 ${availableQuestCount}개`);
    }

    return {
      title: '다음 목표',
      tone: 'info',
      recommendedLocationId: recommendedLocation?.id ?? null,
      lines
    };
  }

  const frontier = getFrontierLocation(gameState);
  if (frontier) {
    const levelFit = isLevelAppropriate(gameState.player.level, frontier.id);
    const readinessText = levelFit === 'under'
      ? '조금 위험하지만 다음 진척을 위해 공략해야 하는'
      : levelFit === 'over'
        ? '가볍게 정리하면서 보상을 챙길 수 있는'
        : '지금 공략하기 좋은';
    const rewardPreview = formatFirstClearRewardPreview(frontier.id);

    return {
      title: '다음 공략',
      tone: levelFit === 'under' ? 'warning' : 'info',
      recommendedLocationId: frontier.id,
      lines: [
        `${frontier.name}은(는) ${readinessText} 지역입니다.`,
        rewardPreview
          ? `첫 클리어 보상: ${rewardPreview}`
          : `예상 플레이 시간: ${frontier.targetPlaytime}`
      ]
    };
  }

  if (isTownLocation(currentLocationId) && availableQuestCount > 0) {
    return {
      title: '새 퀘스트',
      tone: 'info',
      recommendedLocationId: getHubTown().id,
      lines: [
        `수락 가능 퀘스트 ${availableQuestCount}개가 있습니다.`,
        '게시판에서 다음 진행 루트를 확보하세요.'
      ]
    };
  }

  return null;
}
