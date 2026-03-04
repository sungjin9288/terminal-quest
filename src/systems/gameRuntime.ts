import chalk from 'chalk';
import { GameState } from '../types/index.js';
import {
  GameRuntimeDependencies
} from '../types/runtime.js';
import { mergeDependencies } from '../dependencies.js';
import {
  showMessage,
  pressEnterToContinue
} from '../ui/display.js';
import {
  townLoop,
  dungeonLoop
} from './gameplayLoop.js';
import { runEncounter } from './encounterFlow.js';
import { shopMenu } from './shopUi.js';
import { handleTravel } from './travelFlow.js';
import {
  inGameMenuLoop as runInGameMenuLoop
} from './playerMenu.js';
import { saveGameFlow } from './saveFlow.js';
import { handlePlayerDeathFlow } from './deathFlow.js';
import { isTownLocation } from '../data/locations.js';
import { trackTelemetryEvent } from './telemetry.js';
import { refreshSeasonalEventState } from './seasonalEvents.js';

export type { GameRuntimeDependencies } from '../types/runtime.js';

const DEFAULT_RUNTIME_DEPENDENCIES: GameRuntimeDependencies = {
  townLoop,
  dungeonLoop,
  shopMenu,
  saveGame: saveGameFlow,
  runEncounter,
  handlePlayerDeath: handlePlayerDeathFlow,
  handleTravel,
  inGameMenuLoop: runInGameMenuLoop
};

export async function runGameRuntime(
  gameState: GameState,
  dependencies: Partial<GameRuntimeDependencies> = {}
): Promise<void> {
  const runtimeDependencies = mergeDependencies(
    DEFAULT_RUNTIME_DEPENDENCIES,
    dependencies
  );

  let sessionEndReason = 'unknown';
  const seasonalEvent = refreshSeasonalEventState(gameState);
  trackTelemetryEvent('session_start', gameState, {
    source: 'game-runtime',
    seasonalEventId: seasonalEvent.id
  });

  try {
    const openInGameMenu = (state: GameState) =>
      runtimeDependencies.inGameMenuLoop(state, { saveGame: runtimeDependencies.saveGame });

    while (true) {
      const isTown = isTownLocation(gameState.player.currentLocation);

      if (isTown) {
        const continueGame = await runtimeDependencies.townLoop(gameState, {
          shopMenu: runtimeDependencies.shopMenu,
          saveGame: runtimeDependencies.saveGame,
          handleTravel: runtimeDependencies.handleTravel,
          inGameMenuLoop: openInGameMenu
        });
        if (!continueGame) {
          sessionEndReason = 'player-exit';
          return;
        }
      } else {
        const continueGame = await runtimeDependencies.dungeonLoop(gameState, {
          runEncounter: runtimeDependencies.runEncounter,
          handlePlayerDeath: runtimeDependencies.handlePlayerDeath,
          handleTravel: runtimeDependencies.handleTravel,
          inGameMenuLoop: openInGameMenu
        });
        if (!continueGame) {
          sessionEndReason = 'player-exit';
          return;
        }
      }
    }
  } catch (error) {
    sessionEndReason = 'runtime-error';
    console.error(chalk.red('오류 발생:'), error);
    showMessage('예기치 않은 오류가 발생했습니다. 메인 메뉴로 돌아갑니다...', 'error');
    await pressEnterToContinue();
  } finally {
    trackTelemetryEvent('session_end', gameState, { reason: sessionEndReason });
  }
}
