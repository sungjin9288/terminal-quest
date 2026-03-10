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
import { listSaves } from './save.js';

export type { MainMenuRuntimeDependencies } from '../types/runtime.js';

const DEFAULT_MAIN_MENU_DEPENDENCIES: MainMenuRuntimeDependencies = {
  showMainMenu,
  startNewGame,
  loadGame,
  gameLoop,
  openSettings: showSettingsMenu,
  listSaves
};

function showRecentSaveSummary(dependencies: MainMenuRuntimeDependencies): void {
  const latestSave = dependencies
    .listSaves()
    .filter(slot => slot.exists && typeof slot.savedAt === 'number')
    .sort((a, b) => (b.savedAt ?? 0) - (a.savedAt ?? 0))[0];

  if (!latestSave) {
    showMessage('저장된 여정이 없습니다. 새 작전을 시작할 수 있습니다.', 'info');
    return;
  }

  const achievementProgress = typeof latestSave.achievementTotal === 'number'
    ? ` | 업적 ${latestSave.achievementCount ?? 0}/${latestSave.achievementTotal}`
    : '';
  const resumeSummary = latestSave.resumeTitle
    ? ` | 재개 ${latestSave.resumeTitle}`
    : '';
  const trackingModeSummary = latestSave.achievementTrackingMode
    ? ` | 추적 ${latestSave.achievementTrackingMode === 'pinned' ? '핀 고정' : '자동 전환'}`
    : '';
  const trackedAchievementSummary = latestSave.trackedAchievementTitle
    ? ` | 추적 업적 ${latestSave.trackedAchievementTitle}${latestSave.trackedAchievementProgress ? ` ${latestSave.trackedAchievementProgress}` : ''}`
    : '';
  const nextAchievementSummary = latestSave.nextAchievementTitle &&
    latestSave.nextAchievementTitle !== latestSave.trackedAchievementTitle
    ? ` | 다음 업적 ${latestSave.nextAchievementTitle}${latestSave.nextAchievementProgress ? ` ${latestSave.nextAchievementProgress}` : ''}`
    : '';
  const trackingHistorySummary = latestSave.achievementTrackingHistory
    ? ` | 추적 기록 ${latestSave.achievementTrackingHistory}`
    : '';

  showMessage(
    `최근 기록: 슬롯 ${latestSave.slotNumber} ${latestSave.playerName ?? 'Unknown'} ` +
    `Lv${latestSave.playerLevel ?? 0} @ ${latestSave.locationName ?? 'Unknown'}${achievementProgress}${resumeSummary}${trackingModeSummary}${trackedAchievementSummary}${nextAchievementSummary}${trackingHistorySummary}`,
    'info'
  );
}

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
    showRecentSaveSummary(runtimeDependencies);

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
