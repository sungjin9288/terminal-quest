import './helpers/moduleMocks';
import { startNewGameFlow } from '../src/systems/newGameFlow';
import { GameMode, CharacterClass } from '../src/types/index';
import * as menuUi from '../src/ui/menu';
import * as display from '../src/ui/display';
import * as migration from '../src/systems/gameStateMigration';
import * as locations from '../src/data/locations';
import { createTestHubTown } from './helpers/dataFixtureFactory';
import { mockDisplayPreset } from './helpers/uiMocks';

describe('New Game Flow', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should initialize adventure game state with warrior defaults', async () => {
    mockDisplayPreset('newGameFlow');

    jest.spyOn(menuUi, 'showGameModeSelect').mockResolvedValue(GameMode.Adventure);
    jest.spyOn(menuUi, 'showCharacterCreation').mockResolvedValue({
      name: 'BootstrapTester',
      class: CharacterClass.Warrior
    });
    jest.spyOn(locations, 'getHubTown').mockReturnValue(
      createTestHubTown({
        id: 'bit-town',
        name: 'Bit Town',
        description: 'hub',
        facilities: [],
        connections: []
      })
    );
    const migrateSpy = jest.spyOn(migration, 'migrateLoadedGameState');

    const gameState = await startNewGameFlow();

    expect(gameState.gameMode).toBe(GameMode.Adventure);
    expect(gameState.player.name).toBe('BootstrapTester');
    expect(gameState.player.class).toBe(CharacterClass.Warrior);
    expect(gameState.player.inventory).toContain('rusty-sword');
    expect(gameState.player.inventory).toContain('leather-armor');
    expect(gameState.player.inventory.filter(id => id === 'health-potion')).toHaveLength(5);
    expect(gameState.player.inventory.filter(id => id === 'mana-potion')).toHaveLength(3);
    expect(gameState.player.inventory.filter(id => id === 'save-token')).toHaveLength(3);
    expect(gameState.player.skills).toContain('power-strike');
    expect(gameState.statistics.locationsDiscovered).toBe(2);
    expect(gameState.statistics.endgameChallengeUnlocked).toBe(false);
    expect(gameState.statistics.endgameChallengeTier).toBe(0);
    expect(migrateSpy).toHaveBeenCalledWith(gameState, gameState.gameVersion);
    expect(display.showLoading).toHaveBeenCalledTimes(2);
    expect(display.showBox).toHaveBeenCalledWith(
      expect.stringContaining('BootstrapTester'),
      '프롤로그'
    );
    expect(display.pressEnterToContinue).toHaveBeenCalledTimes(1);
  });

  it('should provide mage starting equipment and skill', async () => {
    mockDisplayPreset('newGameFlow');

    jest.spyOn(menuUi, 'showGameModeSelect').mockResolvedValue(GameMode.Story);
    jest.spyOn(menuUi, 'showCharacterCreation').mockResolvedValue({
      name: 'MageTester',
      class: CharacterClass.Mage
    });

    const gameState = await startNewGameFlow();

    expect(gameState.player.class).toBe(CharacterClass.Mage);
    expect(gameState.player.inventory).toContain('debugger-staff');
    expect(gameState.player.skills).toContain('arcane-bolt');
  });
});
