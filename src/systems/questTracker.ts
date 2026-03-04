import { GameState } from '../types/game.js';
import { getActiveQuests, getCompletableQuests } from './quest.js';

export type QuestTrackerStatus = 'active' | 'ready';

export interface QuestTrackerSummary {
  questId: string;
  questName: string;
  status: QuestTrackerStatus;
  objectiveDescription: string;
  currentAmount: number;
  requiredAmount: number;
}

/**
 * Build quest summary for HUD tracking.
 * Prioritizes completable quests before normal active quests.
 */
export function getQuestTrackerSummary(gameState: GameState): QuestTrackerSummary | null {
  const completableQuests = getCompletableQuests(gameState);
  const activeQuests = getActiveQuests(gameState);
  const selectedQuest = completableQuests[0] ?? activeQuests[0];

  if (!selectedQuest) {
    return null;
  }

  const objective = selectedQuest.objectives.find(item => !item.completed) ?? selectedQuest.objectives[0];
  if (!objective) {
    return null;
  }

  return {
    questId: selectedQuest.id,
    questName: selectedQuest.name,
    status: completableQuests.length > 0 && completableQuests[0]?.id === selectedQuest.id
      ? 'ready'
      : 'active',
    objectiveDescription: objective.description,
    currentAmount: objective.currentAmount,
    requiredAmount: objective.requiredAmount
  };
}
