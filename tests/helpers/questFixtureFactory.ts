import { GameState } from '../../src/types/game';
import {
  createTestGameState,
  type TestPlayerOptions
} from './gameStateFactory';

interface QuestGameStateOptions {
  playerOptions?: Partial<TestPlayerOptions>;
  inventory?: string[];
}

const QUEST_DEFAULT_PLAYER_OPTIONS: TestPlayerOptions = {
  name: 'QuestTester',
  level: 1,
  currentLocation: 'bit-town'
};

export function createQuestTestGameState(
  options: QuestGameStateOptions = {}
): GameState {
  const gameState = createTestGameState({
    playerOptions: {
      ...QUEST_DEFAULT_PLAYER_OPTIONS,
      ...options.playerOptions
    }
  });

  if (options.inventory) {
    gameState.player.inventory = [...options.inventory];
  }

  return gameState;
}
