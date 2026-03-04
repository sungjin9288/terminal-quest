import {
  GameState,
  GameMode,
  GameStateType
} from '../../src/types/game';
import {
  Player,
  CharacterClass,
  Stats
} from '../../src/types/character';

export interface TestPlayerOptions {
  name?: string;
  characterClass?: CharacterClass;
  level?: number;
  currentLocation?: string;
  gold?: number;
  unlockedLocations?: string[];
  skills?: string[];
  skillPoints?: number;
}

export interface TestGameStateOptions {
  player?: Player;
  playerOptions?: TestPlayerOptions;
  gameMode?: GameMode;
  stateType?: GameStateType;
}

export function createBaseStats(): Stats {
  return {
    hp: 100,
    maxHp: 100,
    mp: 40,
    maxMp: 40,
    attack: 12,
    defense: 8,
    magicPower: 10,
    magicDefense: 8,
    speed: 9,
    critChance: 10,
    critDamage: 1.5,
    evasion: 5
  };
}

export function createTestPlayer(options: TestPlayerOptions = {}): Player {
  const level = options.level ?? 1;
  const baseStats = createBaseStats();

  return {
    name: options.name ?? 'TestPlayer',
    class: options.characterClass ?? CharacterClass.Warrior,
    level,
    experience: 0,
    experienceToNextLevel: 100,
    stats: { ...baseStats },
    baseStats: { ...baseStats },
    gold: options.gold ?? 100,
    equipment: {},
    inventory: [],
    maxInventorySize: 20,
    statusEffects: [],
    currentLocation: options.currentLocation ?? 'bit-town',
    completedQuests: [],
    activeQuests: [],
    unlockedLocations: options.unlockedLocations ?? ['bit-town', 'memory-forest'],
    playTime: 0,
    enemiesDefeated: 0,
    deaths: 0,
    skillPoints: options.skillPoints ?? 0,
    skills: options.skills ?? []
  };
}

export function createTestGameState(options: TestGameStateOptions = {}): GameState {
  const player = options.player ?? createTestPlayer(options.playerOptions);
  return {
    stateType: options.stateType ?? GameStateType.Exploration,
    gameMode: options.gameMode ?? GameMode.Adventure,
    player,
    position: { locationId: player.currentLocation, stepsTaken: 0 },
    items: {},
    monsters: {},
    locations: {},
    savePoints: {},
    quests: {},
    fastTravelPoints: [],
    statistics: {
      totalPlayTime: 0,
      enemiesDefeated: {},
      totalDamageDealt: 0,
      totalDamageTaken: 0,
      bossesDefeated: [],
      questsCompleted: 0,
      itemsCollected: 0,
      locationsDiscovered: player.unlockedLocations.length,
      goldEarned: player.gold,
      goldSpent: 0,
      deaths: 0,
      highestLevel: player.level,
      endgameChallengeUnlocked: false,
      endgameChallengeClears: 0,
      endgameChallengeTier: 0,
      endgameChallengeCurrentStreak: 0,
      endgameChallengeBestStreak: 0
    },
    questHistory: [],
    flags: {},
    gameVersion: '1.0.0'
  };
}
