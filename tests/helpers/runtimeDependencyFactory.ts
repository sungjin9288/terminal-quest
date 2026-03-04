import { GameState } from '../../src/types/index';
import {
  GameRuntimeDependencies,
  MainMenuRuntimeDependencies
} from '../../src/types/runtime';
import { createTestGameState } from './gameStateFactory';
import { mergeTestDependencies } from './dependencyFactory';
import { mockFn } from './mockFactory';

export function createGameRuntimeDependencies(
  overrides: Partial<GameRuntimeDependencies> = {}
): GameRuntimeDependencies {
  const defaults: GameRuntimeDependencies = {
    townLoop: mockFn<GameRuntimeDependencies['townLoop']>(async () => false),
    dungeonLoop: mockFn<GameRuntimeDependencies['dungeonLoop']>(async () => false),
    shopMenu: mockFn<GameRuntimeDependencies['shopMenu']>(async () => undefined),
    saveGame: mockFn<GameRuntimeDependencies['saveGame']>(async () => true),
    runEncounter: mockFn<GameRuntimeDependencies['runEncounter']>(async () => 'victory'),
    handlePlayerDeath: mockFn<GameRuntimeDependencies['handlePlayerDeath']>(async () => true),
    handleTravel: mockFn<GameRuntimeDependencies['handleTravel']>(
      async () => ({ locationChanged: false })
    ),
    inGameMenuLoop: mockFn<GameRuntimeDependencies['inGameMenuLoop']>(async () => true)
  };

  return mergeTestDependencies(defaults, overrides);
}

export function createMainMenuRuntimeDependencies(
  overrides: Partial<MainMenuRuntimeDependencies> = {}
): MainMenuRuntimeDependencies {
  const defaultState = createTestGameState();

  const defaults: MainMenuRuntimeDependencies = {
    showMainMenu: mockFn<MainMenuRuntimeDependencies['showMainMenu']>(async () => 'exit'),
    startNewGame: mockFn<MainMenuRuntimeDependencies['startNewGame']>(async () => defaultState),
    loadGame: mockFn<MainMenuRuntimeDependencies['loadGame']>(async () => null),
    gameLoop: mockFn<MainMenuRuntimeDependencies['gameLoop']>(async (_state: GameState) => undefined),
    openSettings: mockFn<MainMenuRuntimeDependencies['openSettings']>(async () => undefined)
  };

  return mergeTestDependencies(defaults, overrides);
}
