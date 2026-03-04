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
});
