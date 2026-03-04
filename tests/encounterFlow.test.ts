import './helpers/moduleMocks';
import { runEncounter } from '../src/systems/encounterFlow';
import * as monstersData from '../src/data/monsters';
import * as locationsData from '../src/data/locations';
import * as battle from '../src/systems/battle';
import { MonsterRank } from '../src/types/index';
import { createTestGameState } from './helpers/gameStateFactory';
import {
  createTestGameLocation,
  createTestMonster
} from './helpers/dataFixtureFactory';
import { mockDisplayPreset } from './helpers/uiMocks';

describe('Encounter Flow', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should return victory with fallback gold when no monster is available', async () => {
    const gameState = createTestGameState({
      playerOptions: {
        name: 'EncounterTester',
        level: 3,
        gold: 100,
        currentLocation: 'bit-town'
      }
    });
    mockDisplayPreset('encounter');

    jest.spyOn(monstersData, 'getSampleMonsters').mockReturnValue({});
    jest.spyOn(locationsData, 'getLocationMonsters').mockReturnValue([]);
    jest.spyOn(locationsData, 'getLocationById').mockReturnValue(null);
    jest.spyOn(monstersData, 'getRandomMonster').mockReturnValue(null);
    const runBattleSpy = jest.spyOn(battle, 'runBattle').mockResolvedValue({
      won: false,
      escaped: false,
      leveledUp: false
    });

    const result = await runEncounter(gameState);

    expect(result).toBe('victory');
    expect(gameState.player.gold).toBe(110);
    expect(gameState.statistics.goldEarned).toBe(110);
    expect(runBattleSpy).not.toHaveBeenCalled();
  });

  it('should apply boss progression flags on boss victory', async () => {
    const gameState = createTestGameState({
      playerOptions: {
        name: 'BossTester',
        level: 5,
        gold: 100,
        currentLocation: 'memory-forest'
      }
    });
    gameState.position.stepsTaken = 10;
    mockDisplayPreset('encounter');

    const bossMonster = createTestMonster({
      id: 'test-boss',
      name: 'Test Boss',
      description: 'Boss encounter',
      rank: MonsterRank.Boss,
      isBoss: true
    });
    const bossLocation = createTestGameLocation('memory-forest', {
      boss: 'test-boss',
      rewards: {
        firstClear: {
          exp: 0,
          gold: 10,
          items: []
        }
      },
      connections: []
    });

    jest.spyOn(monstersData, 'getSampleMonsters').mockReturnValue({
      'test-boss': bossMonster
    });
    jest.spyOn(locationsData, 'getLocationMonsters').mockReturnValue([]);
    jest.spyOn(monstersData, 'getRandomMonster').mockReturnValue(null);
    jest.spyOn(locationsData, 'getLocationById').mockImplementation((id: string) => {
      if (id === 'memory-forest') {
        return bossLocation;
      }
      return null;
    });
    jest.spyOn(locationsData, 'getLocationsByAct').mockReturnValue([bossLocation]);
    jest.spyOn(locationsData, 'getActSummary').mockReturnValue(null);
    jest.spyOn(battle, 'runBattle').mockResolvedValue({
      won: true,
      escaped: false,
      leveledUp: false,
      rewards: {
        experience: 0,
        gold: 20,
        items: []
      }
    });

    const result = await runEncounter(gameState);

    expect(result).toBe('victory');
    expect(gameState.statistics.bossesDefeated).toContain('test-boss');
    expect(gameState.flags['location-clear-reward-memory-forest']).toBe(true);
    expect(gameState.flags['act-complete-1']).toBe(true);
    expect(gameState.statistics.goldEarned).toBe(130);
  });

  it('should return escape when battle result is escaped', async () => {
    const gameState = createTestGameState({
      playerOptions: {
        name: 'EscapeTester',
        level: 3,
        currentLocation: 'memory-forest'
      }
    });
    mockDisplayPreset('encounter');

    const normalMonster = createTestMonster({
      id: 'test-mob',
      name: 'Test Mob',
      description: 'Normal encounter',
      rank: MonsterRank.Normal,
      isBoss: false
    });
    const location = createTestGameLocation('memory-forest', {
      boss: 'test-boss',
      rewards: { firstClear: { exp: 0, gold: 0, items: [] } },
      connections: []
    });

    jest.spyOn(monstersData, 'getSampleMonsters').mockReturnValue({
      'test-mob': normalMonster
    });
    jest.spyOn(locationsData, 'getLocationById').mockReturnValue(location);
    jest.spyOn(locationsData, 'getLocationMonsters').mockReturnValue(['test-mob']);
    jest.spyOn(monstersData, 'getRandomMonster').mockReturnValue(normalMonster);
    jest.spyOn(Math, 'random').mockReturnValue(0);
    jest.spyOn(battle, 'runBattle').mockResolvedValue({
      won: false,
      escaped: true,
      leveledUp: false
    });

    const result = await runEncounter(gameState);

    expect(result).toBe('escape');
  });

  it('should unlock endgame challenge after final boss victory', async () => {
    const gameState = createTestGameState({
      playerOptions: {
        name: 'FinalBossTester',
        level: 30,
        currentLocation: 'corruption-space',
        gold: 1000
      }
    });
    gameState.position.stepsTaken = 10;
    mockDisplayPreset('encounter');

    const finalBossMonster = createTestMonster({
      id: 'corruption-core',
      name: 'Corruption Core',
      description: 'Final boss encounter',
      rank: MonsterRank.Boss,
      isBoss: true
    });
    const finalBossLocation = createTestGameLocation('corruption-space', {
      boss: 'corruption-core',
      rewards: {
        firstClear: {
          exp: 0,
          gold: 0,
          items: []
        }
      },
      connections: []
    });

    jest.spyOn(monstersData, 'getSampleMonsters').mockReturnValue({
      'corruption-core': finalBossMonster
    });
    jest.spyOn(locationsData, 'getLocationMonsters').mockReturnValue([]);
    jest.spyOn(monstersData, 'getRandomMonster').mockReturnValue(null);
    jest.spyOn(locationsData, 'getLocationById').mockImplementation((id: string) => {
      if (id === 'corruption-space') {
        return finalBossLocation;
      }
      return null;
    });
    jest.spyOn(locationsData, 'getLocationsByAct').mockReturnValue([finalBossLocation]);
    jest.spyOn(locationsData, 'getActSummary').mockReturnValue(null);
    jest.spyOn(battle, 'runBattle').mockResolvedValue({
      won: true,
      escaped: false,
      leveledUp: false,
      rewards: {
        experience: 0,
        gold: 200,
        items: []
      }
    });

    const result = await runEncounter(gameState);

    expect(result).toBe('victory');
    expect(gameState.statistics.bossesDefeated).toContain('corruption-core');
    expect(gameState.statistics.endgameChallengeUnlocked).toBe(true);
    expect(gameState.statistics.endgameChallengeTier).toBe(1);
    expect(gameState.statistics.endgameChallengeClears).toBe(0);
  });

  it('should scale endgame encounters and progress challenge tier on victory', async () => {
    const gameState = createTestGameState({
      playerOptions: {
        name: 'EndgameTester',
        level: 30,
        currentLocation: 'corruption-space',
        gold: 100
      }
    });
    gameState.statistics.bossesDefeated.push('corruption-core');
    gameState.statistics.endgameChallengeUnlocked = true;
    gameState.statistics.endgameChallengeClears = 2;
    gameState.statistics.endgameChallengeTier = 1;
    gameState.statistics.endgameChallengeCurrentStreak = 1;
    gameState.statistics.endgameChallengeBestStreak = 1;
    mockDisplayPreset('encounter');

    const baseMonster = createTestMonster({
      id: 'endgame-mob',
      name: 'Endgame Mob',
      description: 'Endgame target',
      rank: MonsterRank.Normal,
      isBoss: false,
      level: 10
    });
    const location = createTestGameLocation('corruption-space', {
      monsters: ['endgame-mob'],
      boss: 'corruption-core',
      rewards: { firstClear: { exp: 0, gold: 0, items: [] } },
      connections: []
    });

    let encounteredMonsterLevel = 0;
    let encounteredMonsterMinGold = 0;
    let encounteredMonsterName = '';

    jest.spyOn(monstersData, 'getSampleMonsters').mockReturnValue({
      'endgame-mob': baseMonster
    });
    jest.spyOn(locationsData, 'getLocationById').mockReturnValue(location);
    jest.spyOn(locationsData, 'getLocationMonsters').mockReturnValue(['endgame-mob']);
    jest.spyOn(monstersData, 'getRandomMonster').mockReturnValue(baseMonster);
    jest.spyOn(Math, 'random').mockReturnValue(0);
    jest.spyOn(battle, 'runBattle').mockImplementation(async (player, monster) => {
      encounteredMonsterLevel = monster.level;
      encounteredMonsterMinGold = monster.dropTable.minGold;
      encounteredMonsterName = monster.name;
      player.gold += monster.dropTable.minGold;

      return {
        won: true,
        escaped: false,
        leveledUp: false,
        rewards: {
          experience: 0,
          gold: monster.dropTable.minGold,
          items: []
        }
      };
    });

    const result = await runEncounter(gameState);

    expect(result).toBe('victory');
    expect(encounteredMonsterName).toContain('[심연 T1]');
    expect(encounteredMonsterLevel).toBeGreaterThan(baseMonster.level);
    expect(encounteredMonsterMinGold).toBeGreaterThan(baseMonster.dropTable.minGold);
    expect(gameState.statistics.endgameChallengeClears).toBe(3);
    expect(gameState.statistics.endgameChallengeCurrentStreak).toBe(2);
    expect(gameState.statistics.endgameChallengeBestStreak).toBe(2);
    expect(gameState.statistics.endgameChallengeTier).toBe(2);
    expect(gameState.player.inventory).toContain('save-token');
    expect(gameState.statistics.itemsCollected).toBe(1);
  });

  it('should reset endgame challenge streak on escape', async () => {
    const gameState = createTestGameState({
      playerOptions: {
        name: 'EndgameEscapeTester',
        level: 30,
        currentLocation: 'corruption-space'
      }
    });
    gameState.statistics.bossesDefeated.push('corruption-core');
    gameState.statistics.endgameChallengeUnlocked = true;
    gameState.statistics.endgameChallengeClears = 5;
    gameState.statistics.endgameChallengeTier = 2;
    gameState.statistics.endgameChallengeCurrentStreak = 4;
    gameState.statistics.endgameChallengeBestStreak = 4;
    mockDisplayPreset('encounter');

    const normalMonster = createTestMonster({
      id: 'endgame-escape-mob',
      name: 'Endgame Escape Mob',
      description: 'Endgame escape test',
      rank: MonsterRank.Normal,
      isBoss: false
    });
    const location = createTestGameLocation('corruption-space', {
      monsters: ['endgame-escape-mob'],
      boss: 'corruption-core',
      rewards: { firstClear: { exp: 0, gold: 0, items: [] } },
      connections: []
    });

    jest.spyOn(monstersData, 'getSampleMonsters').mockReturnValue({
      'endgame-escape-mob': normalMonster
    });
    jest.spyOn(locationsData, 'getLocationById').mockReturnValue(location);
    jest.spyOn(locationsData, 'getLocationMonsters').mockReturnValue(['endgame-escape-mob']);
    jest.spyOn(monstersData, 'getRandomMonster').mockReturnValue(normalMonster);
    jest.spyOn(Math, 'random').mockReturnValue(0);
    jest.spyOn(battle, 'runBattle').mockResolvedValue({
      won: false,
      escaped: true,
      leveledUp: false
    });

    const result = await runEncounter(gameState);

    expect(result).toBe('escape');
    expect(gameState.statistics.endgameChallengeCurrentStreak).toBe(0);
    expect(gameState.statistics.endgameChallengeBestStreak).toBe(4);
    expect(gameState.statistics.endgameChallengeClears).toBe(5);
  });
});
