/**
 * Public game facade for Terminal Quest.
 */

import { GameState } from './types/index.js';
export { questBoardLoop } from './systems/questUi.js';
import { startNewGameFlow } from './systems/newGameFlow.js';
import {
  loadGameFlow,
  saveGameFlow
} from './systems/saveFlow.js';
import { runGameRuntime } from './systems/gameRuntime.js';

/**
 * Start a new game
 */
export async function startNewGame(): Promise<GameState> {
  return startNewGameFlow();
}

/**
 * Load an existing game
 */
export async function loadGame(): Promise<GameState | null> {
  return loadGameFlow();
}

/**
 * Save the current game
 */
export async function saveGame(gameState: GameState): Promise<boolean> {
  return saveGameFlow(gameState);
}

/**
 * Main game loop
 */
export async function gameLoop(gameState: GameState): Promise<void> {
  return runGameRuntime(gameState);
}
