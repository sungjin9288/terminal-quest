import { GameState } from '../types/game.js';
import { isLocationUnlocked, isTownLocation } from '../data/locations.js';
import {
  showTravelMenu,
  showTravelAnimation,
  showLocationArrival
} from '../ui/travel.js';
import {
  showMessage,
  pressEnterToContinue
} from '../ui/display.js';
import {
  closeRunSummary,
  evaluateAchievements,
  formatAchievementUnlockMessage,
  resetRunSummary
} from './achievements.js';
import {
  updateQuestProgressOnExplore
} from './quest.js';
import {
  showQuestProgressUpdates
} from './questUi.js';

export interface TravelFlowResult {
  locationChanged: boolean;
}

function showAchievementUnlocks(gameState: GameState): void {
  const achievementResult = evaluateAchievements(gameState);
  for (const achievement of achievementResult.newlyUnlocked) {
    showMessage(formatAchievementUnlockMessage(achievement), 'success');
  }
}

function getCompletedActs(gameState: GameState): number[] {
  const acts = Object.entries(gameState.flags)
    .filter(([key, value]) => value && key.startsWith('act-complete-'))
    .map(([key]) => Number(key.replace('act-complete-', '')))
    .filter(act => Number.isInteger(act) && act > 0);

  return Array.from(new Set(acts)).sort((a, b) => a - b);
}

export async function handleTravel(
  gameState: GameState,
  preferredDestinationId: string | null = null
): Promise<TravelFlowResult> {
  const completedActs = getCompletedActs(gameState);
  const travelResult = await showTravelMenu(
    gameState.player.currentLocation,
    gameState.player.level,
    gameState.statistics.bossesDefeated,
    completedActs,
    gameState.player.completedQuests,
    gameState.player.unlockedLocations,
    preferredDestinationId
  );

  if (!travelResult.traveled || !travelResult.destination) {
    return { locationChanged: false };
  }

  const isUnlocked = gameState.player.unlockedLocations.includes(travelResult.destination) || isLocationUnlocked(
    travelResult.destination,
    gameState.statistics.bossesDefeated,
    completedActs,
    gameState.player.completedQuests
  );

  if (!isUnlocked) {
    showMessage('이 지역은 아직 해금되지 않았습니다.', 'warning');
    await pressEnterToContinue('important');
    return { locationChanged: false };
  }

  await showTravelAnimation(
    gameState.player.currentLocation,
    travelResult.destination
  );

  gameState.player.currentLocation = travelResult.destination;
  gameState.position.locationId = travelResult.destination;
  gameState.position.stepsTaken = 0;

  if (isTownLocation(travelResult.destination)) {
    closeRunSummary(gameState);
  } else {
    resetRunSummary(gameState, travelResult.destination);
  }

  if (!gameState.player.unlockedLocations.includes(travelResult.destination)) {
    gameState.player.unlockedLocations.push(travelResult.destination);
    gameState.statistics.locationsDiscovered++;
  }

  showLocationArrival(travelResult.destination);

  const questUpdates = updateQuestProgressOnExplore(gameState, travelResult.destination);
  if (questUpdates.length > 0) {
    showQuestProgressUpdates(gameState, questUpdates);
  }
  showAchievementUnlocks(gameState);

  await pressEnterToContinue('important');

  return { locationChanged: true };
}
