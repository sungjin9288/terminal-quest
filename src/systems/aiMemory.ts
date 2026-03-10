import { AiMoment, type AiMomentType, AiState } from '../types/ai.js';
import { GameState } from '../types/game.js';
import { ensureAiState } from './aiDirector.js';

const AI_MEMORY_LIMIT = 8;

function normalizeMoment(label: string): string {
  return label.trim().replace(/\s+/g, ' ');
}

export function recordAiMoment(
  gameState: GameState,
  moment: {
    type: AiMomentType;
    label: string;
    timestamp?: number;
  }
): AiState {
  const aiState = ensureAiState(gameState);
  const label = normalizeMoment(moment.label);
  if (!label) {
    return aiState;
  }

  const entry: AiMoment = {
    type: moment.type,
    label,
    timestamp: moment.timestamp ?? Date.now()
  };

  const remaining = aiState.memory.recentMoments.filter(candidate =>
    candidate.type !== entry.type || candidate.label !== entry.label
  );

  aiState.memory.recentMoments = [entry, ...remaining].slice(0, AI_MEMORY_LIMIT);
  return aiState;
}

export function getRecentAiMoments(
  gameState: GameState,
  limit: number = 3
): AiMoment[] {
  return ensureAiState(gameState).memory.recentMoments.slice(0, Math.max(0, limit));
}
