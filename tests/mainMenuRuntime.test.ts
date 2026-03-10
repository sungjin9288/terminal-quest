import './helpers/moduleMocks';
import { runMainMenuRuntime, MainMenuRuntimeDependencies } from '../src/systems/mainMenuRuntime';
import * as display from '../src/ui/display';
import { createTestGameState } from './helpers/gameStateFactory';
import { mockDisplayPreset } from './helpers/uiMocks';
import { createMainMenuRuntimeDependencies } from './helpers/runtimeDependencyFactory';
import { mockFn } from './helpers/mockFactory';

describe('Main Menu Runtime', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should run new game flow and pass state into game loop', async () => {
    mockDisplayPreset('mainMenuRuntime');

    const newGameState = createTestGameState({
      playerOptions: {
        name: 'MainMenuTester',
        level: 3,
        currentLocation: 'bit-town'
      }
    });
    const showMainMenu = mockFn<MainMenuRuntimeDependencies['showMainMenu']>(async () => 'exit');
    showMainMenu
      .mockResolvedValueOnce('new-game')
      .mockResolvedValueOnce('exit');
    const startNewGame = mockFn<MainMenuRuntimeDependencies['startNewGame']>(async () => newGameState);
    const gameLoop = mockFn<MainMenuRuntimeDependencies['gameLoop']>(async () => undefined);

    await runMainMenuRuntime(
      createMainMenuRuntimeDependencies({
        showMainMenu,
        startNewGame,
        gameLoop
      })
    );

    expect(startNewGame).toHaveBeenCalledTimes(1);
    expect(gameLoop).toHaveBeenCalledTimes(1);
    expect(gameLoop).toHaveBeenCalledWith(newGameState);
  });

  it('should skip game loop when load returns null', async () => {
    mockDisplayPreset('mainMenuRuntime');

    const showMainMenu = mockFn<MainMenuRuntimeDependencies['showMainMenu']>(async () => 'exit');
    showMainMenu
      .mockResolvedValueOnce('load-game')
      .mockResolvedValueOnce('exit');
    const loadGame = mockFn<MainMenuRuntimeDependencies['loadGame']>(async () => null);
    const gameLoop = mockFn<MainMenuRuntimeDependencies['gameLoop']>(async () => undefined);

    await runMainMenuRuntime(
      createMainMenuRuntimeDependencies({
        showMainMenu,
        loadGame,
        gameLoop
      })
    );

    expect(loadGame).toHaveBeenCalledTimes(1);
    expect(gameLoop).not.toHaveBeenCalled();
  });

  it('should open settings flow when settings is selected', async () => {
    mockDisplayPreset('mainMenuRuntime');

    const showMainMenu = mockFn<MainMenuRuntimeDependencies['showMainMenu']>(async () => 'exit');
    showMainMenu
      .mockResolvedValueOnce('settings')
      .mockResolvedValueOnce('exit');
    const openSettings = mockFn<MainMenuRuntimeDependencies['openSettings']>(async () => undefined);
    const gameLoop = mockFn<MainMenuRuntimeDependencies['gameLoop']>(async () => undefined);

    await runMainMenuRuntime(
      createMainMenuRuntimeDependencies({
        showMainMenu,
        openSettings,
        gameLoop
      })
    );

    expect(openSettings).toHaveBeenCalledTimes(1);
    expect(gameLoop).not.toHaveBeenCalled();
  });

  it('should show exit message and terminate loop', async () => {
    mockDisplayPreset('mainMenuRuntime');

    await runMainMenuRuntime(createMainMenuRuntimeDependencies());

    expect(display.showMessage).toHaveBeenCalledWith(
      '터미널 퀘스트를 플레이해주셔서 감사합니다!',
      'success'
    );
    expect(display.showMessage).toHaveBeenCalledWith(
      '다음 모험이 당신을 기다리고 있습니다...',
      'info'
    );
  });

  it('should show recent save summary with achievement progress before prompting', async () => {
    mockDisplayPreset('mainMenuRuntime');

    const showMainMenu = mockFn<MainMenuRuntimeDependencies['showMainMenu']>(async () => 'exit');
    const listSaves = mockFn<MainMenuRuntimeDependencies['listSaves']>(() => [
      {
        slotNumber: 2,
        exists: true,
        savedAt: 1730390400000,
        locationName: '비트 타운',
        playerName: 'Archivist',
        playerLevel: 4,
        playTime: 600,
        achievementCount: 3,
        achievementTotal: 10,
        resumeTitle: '새 퀘스트',
        achievementTrackingMode: 'pinned',
        achievementTrackingHistory: '상점 구매 후 자동 전환: 전선 개척 3/4',
        trackedAchievementTitle: '전선 개척',
        trackedAchievementProgress: '3/4',
        nextAchievementTitle: '전선 개척',
        nextAchievementProgress: '3/4',
        achievementPerkSummary: ['가방 +6칸', '상점 할인 8%']
      }
    ]);

    await runMainMenuRuntime(
      createMainMenuRuntimeDependencies({
        showMainMenu,
        listSaves
      })
    );

    expect(display.showMessage).toHaveBeenCalledWith(
      '최근 기록: 슬롯 2 Archivist Lv4 @ 비트 타운 | 업적 3/10 | 재개 새 퀘스트 | 추적 핀 고정 | 추적 업적 전선 개척 3/4 | 특전 가방 +6칸, 상점 할인 8% | 추적 기록 상점 구매 후 자동 전환: 전선 개척 3/4',
      'info'
    );
  });
});
