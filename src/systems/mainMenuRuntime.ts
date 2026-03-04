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
  const runtimeDependencies = mergeDependencies(
    DEFAULT_MAIN_MENU_DEPENDENCIES,
    dependencies
  );

  clearScreen();
  await showTitle();

  showBox(
    'Welcome to Terminal Quest!\n\n' +
    'Embark on an epic adventure through mysterious lands,\n' +
    'battle fearsome monsters, complete challenging quests,\n' +
    'and become the hero of legend!\n\n' +
    'May your journey be filled with glory and treasure!',
    'WELCOME'
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
        showMessage('Thanks for playing Terminal Quest!', 'success');
        showMessage('Your adventure awaits...', 'info');
        console.log();
        running = false;
        break;
    }
  }
}
