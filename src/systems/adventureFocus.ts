import { GameState } from '../types/game.js';
import { getAiIntent } from './aiDirector.js';

export {
  BOSS_ENCOUNTER_STEP_TARGET,
  type AiContext,
  type AiQuestFocus,
  type AiTrackedAchievementContext,
  type LocationBossProgress,
  buildAiContext,
  formatFirstClearRewardPreview,
  getFrontierLocation,
  getLocationBossProgress,
  getObjectiveDestinationId,
  getPrimaryQuestFocus,
  getRecommendedTravelDestination
} from './aiContext.js';

type AdventureFocusTone = 'info' | 'success' | 'warning';

export interface AdventureFocusSummary {
  title: string;
  tone: AdventureFocusTone;
  lines: string[];
  recommendedLocationId: string | null;
}

export function getAdventureFocusSummary(gameState: GameState): AdventureFocusSummary | null {
  const intent = getAiIntent(gameState);
  if (!intent) {
    return null;
  }

  return {
    title: intent.title,
    tone: intent.tone,
    lines: intent.lines,
    recommendedLocationId: intent.recommendedLocationId
  };
}
