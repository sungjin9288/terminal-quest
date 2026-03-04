import './helpers/moduleMocks';
import { townLoop, dungeonLoop } from '../src/systems/gameplayLoop';
import * as travelUi from '../src/ui/travel';
import * as locations from '../src/data/locations';
import * as questUi from '../src/systems/questUi';
import { createTestGameState } from './helpers/gameStateFactory';
import { createTestHubTown } from './helpers/dataFixtureFactory';
import { mockDisplayPreset } from './helpers/uiMocks';
import { getInnRestCost } from '../src/systems/economy';
import { resetRuntimeSettings, updateRuntimeSettings } from '../src/runtime/settings';

describe('Gameplay Loop', () => {
  afterEach(() => {
    resetRuntimeSettings();
    jest.restoreAllMocks();
  });

  it('should recompute town location name on each loop iteration', async () => {
    const gameState = createTestGameState({
      playerOptions: {
        name: 'LoopTester',
        level: 3,
        currentLocation: 'memory-forest'
      }
    });
    mockDisplayPreset('townLoop');

    const shownLocationNames: string[] = [];
    jest.spyOn(locations, 'getLocationDisplayName').mockImplementation(id => `LOC:${id}`);
    jest.spyOn(travelUi, 'showTownMenu').mockImplementation(async (locationName: string) => {
      shownLocationNames.push(locationName);
      return shownLocationNames.length === 1 ? 'travel' : 'menu';
    });

    const result = await townLoop(gameState, {
      shopMenu: jest.fn(async () => undefined),
      saveGame: jest.fn(async () => true),
      handleTravel: jest.fn(async () => {
        gameState.player.currentLocation = 'bit-town';
        return { locationChanged: true };
      }),
      inGameMenuLoop: jest.fn(async () => false)
    });

    expect(result).toBe(false);
    expect(shownLocationNames).toEqual(['LOC:memory-forest', 'LOC:bit-town']);
  });

  it('should open quest board in town when facility exists', async () => {
    const gameState = createTestGameState({
      playerOptions: {
        name: 'LoopTester',
        level: 3,
        currentLocation: 'bit-town'
      }
    });
    mockDisplayPreset('townLoop');

    jest.spyOn(locations, 'getLocationById').mockReturnValue(
      createTestHubTown({
        id: 'bit-town',
        name: 'Bit Town',
        description: 'town',
        facilities: ['quest-board'],
        connections: ['memory-forest']
      })
    );

    const showTownMenuMock = jest.spyOn(travelUi, 'showTownMenu');
    showTownMenuMock
      .mockResolvedValueOnce('quest')
      .mockResolvedValueOnce('menu');

    const questBoardSpy = jest.spyOn(questUi, 'questBoardLoop').mockResolvedValue(undefined);

    const result = await townLoop(gameState, {
      shopMenu: jest.fn(async () => undefined),
      saveGame: jest.fn(async () => true),
      handleTravel: jest.fn(async () => ({ locationChanged: false })),
      inGameMenuLoop: jest.fn(async () => false)
    });

    expect(result).toBe(false);
    expect(questBoardSpy).toHaveBeenCalledTimes(1);
  });

  it('should spend gold and fully recover stats when using inn rest', async () => {
    const gameState = createTestGameState({
      playerOptions: {
        name: 'LoopTester',
        level: 3,
        currentLocation: 'bit-town',
        gold: 200
      }
    });
    gameState.player.stats.hp = 12;
    gameState.player.stats.mp = 5;
    mockDisplayPreset('townLoop');

    jest.spyOn(travelUi, 'showTownMenu')
      .mockResolvedValueOnce('inn')
      .mockResolvedValueOnce('menu');
    jest.spyOn(questUi, 'applyTalkQuestProgress').mockResolvedValue(undefined);

    const expectedCost = getInnRestCost(gameState.player.level);

    const result = await townLoop(gameState, {
      shopMenu: jest.fn(async () => undefined),
      saveGame: jest.fn(async () => true),
      handleTravel: jest.fn(async () => ({ locationChanged: false })),
      inGameMenuLoop: jest.fn(async () => false)
    });

    expect(result).toBe(false);
    expect(gameState.player.gold).toBe(200 - expectedCost);
    expect(gameState.statistics.goldSpent).toBe(expectedCost);
    expect(gameState.player.stats.hp).toBe(gameState.player.stats.maxHp);
    expect(gameState.player.stats.mp).toBe(gameState.player.stats.maxMp);
  });

  it('should block inn rest when gold is insufficient', async () => {
    const gameState = createTestGameState({
      playerOptions: {
        name: 'LoopTester',
        level: 3,
        currentLocation: 'bit-town',
        gold: 10
      }
    });
    gameState.player.stats.hp = 12;
    gameState.player.stats.mp = 5;
    mockDisplayPreset('townLoop');

    jest.spyOn(travelUi, 'showTownMenu')
      .mockResolvedValueOnce('inn')
      .mockResolvedValueOnce('menu');

    const result = await townLoop(gameState, {
      shopMenu: jest.fn(async () => undefined),
      saveGame: jest.fn(async () => true),
      handleTravel: jest.fn(async () => ({ locationChanged: false })),
      inGameMenuLoop: jest.fn(async () => false)
    });

    expect(result).toBe(false);
    expect(gameState.player.gold).toBe(10);
    expect(gameState.statistics.goldSpent).toBe(0);
    expect(gameState.player.stats.hp).toBe(12);
    expect(gameState.player.stats.mp).toBe(5);
  });

  it('should switch to town loop when dungeon travel lands in town', async () => {
    const gameState = createTestGameState({
      playerOptions: {
        name: 'LoopTester',
        level: 3,
        currentLocation: 'memory-forest'
      }
    });
    mockDisplayPreset('townLoop');

    jest.spyOn(travelUi, 'showDungeonMenu').mockResolvedValue('travel');

    const result = await dungeonLoop(gameState, {
      runEncounter: jest.fn(async () => 'victory'),
      handlePlayerDeath: jest.fn(async () => true),
      handleTravel: jest.fn(async () => {
        gameState.player.currentLocation = 'bit-town';
        return { locationChanged: true };
      }),
      inGameMenuLoop: jest.fn(async () => true),
      random: jest.fn(() => 0.9)
    });

    expect(result).toBe(true);
  });

  it('should use injected random provider for town explore rewards', async () => {
    const gameState = createTestGameState({
      playerOptions: {
        name: 'LoopTester',
        level: 3,
        currentLocation: 'bit-town'
      }
    });
    mockDisplayPreset('townLoop');

    jest.spyOn(travelUi, 'showTownMenu')
      .mockResolvedValueOnce('explore')
      .mockResolvedValueOnce('menu');

    const random = jest
      .fn()
      .mockReturnValueOnce(0.1)
      .mockReturnValueOnce(0.5);

    const result = await townLoop(gameState, {
      shopMenu: jest.fn(async () => undefined),
      saveGame: jest.fn(async () => true),
      handleTravel: jest.fn(async () => ({ locationChanged: false })),
      inGameMenuLoop: jest.fn(async () => false),
      random
    });

    expect(result).toBe(false);
    expect(gameState.player.gold).toBe(115);
    expect(gameState.statistics.goldEarned).toBe(115);
    expect(random).toHaveBeenCalledTimes(2);
  });

  it('should stop game when player is defeated and declines to continue after encounter', async () => {
    const gameState = createTestGameState({
      playerOptions: {
        name: 'LoopTester',
        level: 3,
        currentLocation: 'memory-forest'
      }
    });
    mockDisplayPreset('townLoop');

    jest.spyOn(travelUi, 'showDungeonMenu').mockResolvedValue('explore');

    const runEncounter = jest.fn(async () => 'defeat' as const);
    const handlePlayerDeath = jest.fn(async () => false);

    const result = await dungeonLoop(gameState, {
      runEncounter,
      handlePlayerDeath,
      handleTravel: jest.fn(async () => ({ locationChanged: false })),
      inGameMenuLoop: jest.fn(async () => true),
      random: jest.fn(() => 0.1)
    });

    expect(result).toBe(false);
    expect(runEncounter).toHaveBeenCalledTimes(1);
    expect(handlePlayerDeath).toHaveBeenCalledTimes(1);
  });

  it('should show context guidance in town by default', async () => {
    const gameState = createTestGameState({
      playerOptions: {
        name: 'GuideTester',
        level: 3,
        currentLocation: 'bit-town'
      }
    });
    mockDisplayPreset('townLoop');

    jest.spyOn(travelUi, 'showTownMenu')
      .mockResolvedValueOnce('menu');

    await townLoop(gameState, {
      shopMenu: jest.fn(async () => undefined),
      saveGame: jest.fn(async () => true),
      handleTravel: jest.fn(async () => ({ locationChanged: false })),
      inGameMenuLoop: jest.fn(async () => false)
    });

    const logs = (console.log as jest.Mock).mock.calls.map(args => String(args[0] ?? ''));
    expect(logs.some(line => line.includes('추천 행동'))).toBe(true);
  });

  it('should hide context guidance when setting is disabled', async () => {
    const gameState = createTestGameState({
      playerOptions: {
        name: 'GuideTester',
        level: 3,
        currentLocation: 'bit-town'
      }
    });
    updateRuntimeSettings({ showContextHints: false }, { storage: false });
    mockDisplayPreset('townLoop');

    jest.spyOn(travelUi, 'showTownMenu')
      .mockResolvedValueOnce('menu');

    await townLoop(gameState, {
      shopMenu: jest.fn(async () => undefined),
      saveGame: jest.fn(async () => true),
      handleTravel: jest.fn(async () => ({ locationChanged: false })),
      inGameMenuLoop: jest.fn(async () => false)
    });

    const logs = (console.log as jest.Mock).mock.calls.map(args => String(args[0] ?? ''));
    expect(logs.some(line => line.includes('추천 행동'))).toBe(false);
  });
});
