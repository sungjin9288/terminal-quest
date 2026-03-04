import './helpers/moduleMocks';
import { runGameRuntime, GameRuntimeDependencies } from '../src/systems/gameRuntime';
import * as display from '../src/ui/display';
import { createTestGameState } from './helpers/gameStateFactory';
import { mockDisplayUi } from './helpers/uiMocks';
import { createGameRuntimeDependencies } from './helpers/runtimeDependencyFactory';
import { silenceConsoleError } from './helpers/runtimeMocks';
import { mockFn } from './helpers/mockFactory';

describe('Game Runtime', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should run town loop for town location', async () => {
    const gameState = createTestGameState({
      playerOptions: {
        name: 'RuntimeTester',
        level: 3,
        currentLocation: 'bit-town'
      }
    });
    const dependencies = createGameRuntimeDependencies();

    await runGameRuntime(gameState, dependencies);

    expect(dependencies.townLoop).toHaveBeenCalledTimes(1);
    expect(dependencies.dungeonLoop).not.toHaveBeenCalled();
  });

  it('should run dungeon loop for dungeon location', async () => {
    const gameState = createTestGameState({
      playerOptions: {
        name: 'RuntimeTester',
        level: 3,
        currentLocation: 'memory-forest'
      }
    });
    const dependencies = createGameRuntimeDependencies();

    await runGameRuntime(gameState, dependencies);

    expect(dependencies.dungeonLoop).toHaveBeenCalledTimes(1);
    expect(dependencies.townLoop).not.toHaveBeenCalled();
  });

  it('should handle runtime errors and return safely', async () => {
    const gameState = createTestGameState({
      playerOptions: {
        name: 'RuntimeTester',
        level: 3,
        currentLocation: 'bit-town'
      }
    });
    mockDisplayUi({
      consoleLog: false,
      showMessage: true,
      pressEnterToContinue: true
    });
    silenceConsoleError();

    const dependencies = createGameRuntimeDependencies({
      townLoop: mockFn<GameRuntimeDependencies['townLoop']>(async () => {
        throw new Error('runtime failure');
      })
    });

    await runGameRuntime(gameState, dependencies);

    expect(display.showMessage).toHaveBeenCalledWith(
      '예기치 않은 오류가 발생했습니다. 메인 메뉴로 돌아갑니다...',
      'error'
    );
    expect(display.pressEnterToContinue).toHaveBeenCalledTimes(1);
  });
});
