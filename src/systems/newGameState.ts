import {
  GameState,
  GameMode,
  GameStateType,
  Player,
  CharacterClass,
  Stats
} from '../types/index.js';
import { addItem } from './inventory.js';
import { getExpForNextLevel } from './leveling.js';
import { getStartingSkills } from './skills.js';
import {
  createAchievementState,
  createAchievementTrackingState,
  createRunSummary
} from './achievements.js';
import {
  CURRENT_GAME_STATE_VERSION,
  migrateLoadedGameState
} from './gameStateMigration.js';

function createInitialStats(characterClass: CharacterClass): Stats {
  const baseStats: Record<CharacterClass, Stats> = {
    [CharacterClass.Warrior]: {
      hp: 120, maxHp: 120, mp: 30, maxMp: 30,
      attack: 15, defense: 12, magicPower: 5, magicDefense: 8,
      speed: 8, critChance: 10, critDamage: 1.5, evasion: 5
    },
    [CharacterClass.Mage]: {
      hp: 70, maxHp: 70, mp: 100, maxMp: 100,
      attack: 5, defense: 5, magicPower: 20, magicDefense: 15,
      speed: 10, critChance: 8, critDamage: 2.0, evasion: 8
    },
    [CharacterClass.Rogue]: {
      hp: 90, maxHp: 90, mp: 50, maxMp: 50,
      attack: 18, defense: 7, magicPower: 8, magicDefense: 7,
      speed: 18, critChance: 25, critDamage: 2.5, evasion: 20
    },
    [CharacterClass.Cleric]: {
      hp: 100, maxHp: 100, mp: 80, maxMp: 80,
      attack: 8, defense: 10, magicPower: 15, magicDefense: 12,
      speed: 9, critChance: 5, critDamage: 1.5, evasion: 7
    },
    [CharacterClass.Ranger]: {
      hp: 95, maxHp: 95, mp: 60, maxMp: 60,
      attack: 14, defense: 9, magicPower: 10, magicDefense: 10,
      speed: 14, critChance: 15, critDamage: 2.0, evasion: 12
    }
  };
  return baseStats[characterClass];
}

export function createPlayer(
  name: string,
  characterClass: CharacterClass,
  _gameMode: GameMode
): Player {
  const stats = createInitialStats(characterClass);

  const player: Player = {
    name,
    class: characterClass,
    level: 1,
    experience: 0,
    experienceToNextLevel: getExpForNextLevel(1),
    stats,
    baseStats: { ...stats },
    gold: 100,
    equipment: {},
    inventory: [],
    maxInventorySize: 20,
    statusEffects: [],
    currentLocation: 'bit-town',
    completedQuests: [],
    activeQuests: [],
    unlockedLocations: ['bit-town', 'memory-forest'],
    playTime: 0,
    enemiesDefeated: 0,
    deaths: 0,
    skillPoints: 0,
    skills: getStartingSkills(characterClass)
  };

  switch (characterClass) {
    case CharacterClass.Warrior:
      addItem(player, 'rusty-sword');
      addItem(player, 'leather-armor');
      break;
    case CharacterClass.Mage:
      addItem(player, 'debugger-staff');
      addItem(player, 'leather-armor');
      break;
    case CharacterClass.Rogue:
      addItem(player, 'rusty-dagger');
      addItem(player, 'leather-armor');
      break;
    case CharacterClass.Cleric:
      addItem(player, 'rusty-sword');
      addItem(player, 'leather-armor');
      break;
    case CharacterClass.Ranger:
      addItem(player, 'rusty-dagger');
      addItem(player, 'leather-armor');
      break;
  }

  addItem(player, 'health-potion', 5);
  addItem(player, 'mana-potion', 3);
  addItem(player, 'save-token', 3);

  return player;
}

export function createNewGameState(
  name: string,
  characterClass: CharacterClass,
  gameMode: GameMode
): GameState {
  const player = createPlayer(name, characterClass, gameMode);

  const gameState: GameState = {
    stateType: GameStateType.Exploration,
    gameMode,
    player,
    position: { locationId: 'bit-town', stepsTaken: 0 },
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
      locationsDiscovered: 2,
      goldEarned: 100,
      goldSpent: 0,
      deaths: 0,
      highestLevel: 1,
      endgameChallengeUnlocked: false,
      endgameChallengeClears: 0,
      endgameChallengeTier: 0,
      endgameChallengeCurrentStreak: 0,
      endgameChallengeBestStreak: 0
    },
    questHistory: [],
    achievements: createAchievementState(),
    achievementTracking: createAchievementTrackingState(),
    runSummary: createRunSummary(),
    flags: {},
    gameVersion: CURRENT_GAME_STATE_VERSION
  };

  migrateLoadedGameState(gameState, gameState.gameVersion);
  return gameState;
}
