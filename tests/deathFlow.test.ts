import './helpers/moduleMocks';
import { handlePlayerDeathFlow } from '../src/systems/deathFlow';
import * as display from '../src/ui/display';
import * as deathUi from '../src/ui/death';
import * as deathSystem from '../src/systems/death';
import type { DeathPenalty, DeathResult } from '../src/systems/death';
import { createTestGameState } from './helpers/gameStateFactory';
import { mockDisplayPreset } from './helpers/uiMocks';

function createDeathPenalty(soulEssence: number): DeathPenalty {
  return {
    goldLost: 0,
    goldPercentage: 0,
    expLost: 0,
    expPercentage: 0,
    canLevelDown: false,
    consumablesLost: [],
    consumableLossPercentage: 0,
    equipmentLossChance: 0,
    isPermadeath: false,
    soulEssence
  };
}

describe('Death Flow', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should respawn player and continue when death is not game over', async () => {
    const gameState = createTestGameState({
      playerOptions: {
        name: 'DeathFlowTester',
        level: 3,
        currentLocation: 'memory-forest'
      }
    });
    const previousDeaths = gameState.statistics.deaths;
    mockDisplayPreset('deathFlow');
    jest.spyOn(deathUi, 'showDeathScreen').mockReturnValue('death-screen');
    const showGameOverSpy = jest.spyOn(deathUi, 'showGameOver').mockReturnValue('game-over-screen');
    const deathResult: DeathResult = {
      gameMode: gameState.gameMode,
      penalty: createDeathPenalty(0),
      respawnLocation: 'bit-town',
      message: 'respawn',
      isGameOver: false
    };
    jest.spyOn(deathSystem, 'handleDeath').mockReturnValue(deathResult);
    jest.spyOn(deathSystem, 'respawnPlayer').mockReturnValue({
      ...gameState.player,
      currentLocation: 'bit-town'
    });

    const result = await handlePlayerDeathFlow(gameState);

    expect(result).toBe(true);
    expect(showGameOverSpy).not.toHaveBeenCalled();
    expect(gameState.player.currentLocation).toBe('bit-town');
    expect(gameState.statistics.deaths).toBe(previousDeaths + 1);
    expect(display.showMessage).toHaveBeenCalledWith(
      expect.stringContaining('부활했습니다.'),
      'info'
    );
    expect(display.pressEnterToContinue).toHaveBeenCalledTimes(2);
  });

  it('should stop game when death result is game over', async () => {
    const gameState = createTestGameState({
      playerOptions: {
        name: 'DeathFlowTester',
        level: 3,
        currentLocation: 'memory-forest'
      }
    });
    const previousDeaths = gameState.statistics.deaths;
    mockDisplayPreset('deathFlow');
    jest.spyOn(deathUi, 'showDeathScreen').mockReturnValue('death-screen');
    const showGameOverSpy = jest.spyOn(deathUi, 'showGameOver').mockReturnValue('game-over-screen');
    const deathResult: DeathResult = {
      gameMode: gameState.gameMode,
      penalty: createDeathPenalty(300),
      respawnLocation: '',
      message: 'game-over',
      isGameOver: true
    };
    jest.spyOn(deathSystem, 'handleDeath').mockReturnValue(deathResult);
    const respawnPlayerSpy = jest.spyOn(deathSystem, 'respawnPlayer');

    const result = await handlePlayerDeathFlow(gameState);

    expect(result).toBe(false);
    expect(showGameOverSpy).toHaveBeenCalledWith(gameState.player, 300);
    expect(respawnPlayerSpy).not.toHaveBeenCalled();
    expect(gameState.statistics.deaths).toBe(previousDeaths);
    expect(display.pressEnterToContinue).toHaveBeenCalledTimes(2);
  });
});
