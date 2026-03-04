import {
  clearScreen,
  showTitle,
  showMessage,
  showBox
} from '../ui/display.js';
import { showMainMenu, showSettingsMenu } from '../ui/menu.js';
import { gameLoop, loadGame, startNewGame } from '../game.js';
import { MainMenuRuntimeDependencies } from '../types/runtime.js';
import { mergeDependencies } from '../dependencies.js';
import { trackTelemetryEvent } from './telemetry.js';
import { initializeRuntimeSettings } from '../runtime/settings.js';

export type { MainMenuRuntimeDependencies } from '../types/runtime.js';

const DEFAULT_MAIN_MENU_DEPENDENCIES: MainMenuRuntimeDependencies = {
  showMainMenu,
  startNewGame,
  loadGame,
  gameLoop,
  openSettings: showSettingsMenu
};

export async function runMainMenuRuntime(
  dependencies: Partial<MainMenuRuntimeDependencies> = {}
): Promise<void> {
  initializeRuntimeSettings();

  const runtimeDependencies = mergeDependencies(
    DEFAULT_MAIN_MENU_DEPENDENCIES,
    dependencies
  );

  clearScreen();
  await showTitle();

  showBox(
    '터미널 퀘스트에 오신 것을 환영합니다!\n\n' +
    '신비한 대륙을 탐험하고,\n' +
    '강력한 몬스터와 전투를 벌이며,\n' +
    '도전적인 퀘스트를 완수해 전설의 영웅이 되어보세요!\n\n' +
    '당신의 여정에 영광과 보물이 함께하길 바랍니다.',
    '환영합니다'
  );

  console.log();

  let running = true;

  while (running) {
    clearScreen();
    await showTitle();

    const choice = await runtimeDependencies.showMainMenu();

    switch (choice) {
      case 'new-game':
        {
          const gameState = await runtimeDependencies.startNewGame();
          trackTelemetryEvent('new_game_started', gameState, { source: 'main-menu' });
          await runtimeDependencies.gameLoop(gameState);
        }
        break;

      case 'load-game':
        {
          const loadedState = await runtimeDependencies.loadGame();
          if (loadedState) {
            trackTelemetryEvent('game_loaded', loadedState, { source: 'main-menu' });
            await runtimeDependencies.gameLoop(loadedState);
          }
        }
        break;

      case 'settings':
        await runtimeDependencies.openSettings();
        break;

      case 'exit':
        clearScreen();
        await showTitle();
        showMessage('터미널 퀘스트를 플레이해주셔서 감사합니다!', 'success');
        showMessage('다음 모험이 당신을 기다리고 있습니다...', 'info');
        console.log();
        running = false;
        break;
    }
  }
}
