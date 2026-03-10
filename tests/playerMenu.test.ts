import './helpers/moduleMocks';
import { inGameMenuLoop } from '../src/systems/playerMenu';
import * as menu from '../src/ui/menu';
import { createTestGameState } from './helpers/gameStateFactory';
import { mockDisplayPreset, mockPromptSequence } from './helpers/uiMocks';

describe('Player Menu', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should return true when continue is selected', async () => {
    const gameState = createTestGameState({
      playerOptions: {
        name: 'MenuTester',
        level: 3,
        currentLocation: 'bit-town'
      }
    });
    mockDisplayPreset('playerMenu');

    jest.spyOn(menu, 'showInGameMenu').mockResolvedValue('continue');

    const result = await inGameMenuLoop(gameState, {
      saveGame: jest.fn(async () => true)
    });

    expect(result).toBe(true);
  });

  it('should execute save action before continuing game', async () => {
    const gameState = createTestGameState({
      playerOptions: {
        name: 'MenuTester',
        level: 3,
        currentLocation: 'bit-town'
      }
    });
    mockDisplayPreset('playerMenu');

    const showInGameMenuMock = jest.spyOn(menu, 'showInGameMenu');
    showInGameMenuMock
      .mockResolvedValueOnce('save')
      .mockResolvedValueOnce('continue');

    const saveGame = jest.fn(async () => true);

    const result = await inGameMenuLoop(gameState, { saveGame });

    expect(result).toBe(true);
    expect(saveGame).toHaveBeenCalledTimes(1);
    expect(saveGame).toHaveBeenCalledWith(gameState);
  });

  it('should return false when main-menu is confirmed', async () => {
    const gameState = createTestGameState({
      playerOptions: {
        name: 'MenuTester',
        level: 3,
        currentLocation: 'bit-town'
      }
    });
    mockDisplayPreset('playerMenu');

    jest.spyOn(menu, 'showInGameMenu').mockResolvedValue('main-menu');
    jest.spyOn(menu, 'confirmAction').mockResolvedValue(true);

    const result = await inGameMenuLoop(gameState, {
      saveGame: jest.fn(async () => true)
    });

    expect(result).toBe(false);
  });

  it('should open the terminal achievement menu and pin a selected achievement', async () => {
    const gameState = createTestGameState({
      playerOptions: {
        name: 'MenuTester',
        level: 3,
        currentLocation: 'bit-town'
      }
    });
    gameState.statistics.locationsDiscovered = 3;
    mockDisplayPreset('playerMenu');

    const showInGameMenuMock = jest.spyOn(menu, 'showInGameMenu');
    showInGameMenuMock
      .mockResolvedValueOnce('achievements')
      .mockResolvedValueOnce('continue');

    mockPromptSequence([
      { choice: 'track' },
      { achievementId: 'frontier_scout' },
      { choice: 'back' }
    ]);

    const result = await inGameMenuLoop(gameState, {
      saveGame: jest.fn(async () => true)
    });

    expect(result).toBe(true);
    expect(gameState.achievementTracking).toMatchObject({
      mode: 'pinned',
      achievementId: 'frontier_scout'
    });
    expect(gameState.achievementTracking?.history[0]?.message).toContain('전선 개척');
  });
});
