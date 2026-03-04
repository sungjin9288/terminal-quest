import {
  GameState,
  GameMode,
  GameStateType,
  Player,
  CharacterClass,
  Stats
} from '../types/index.js';
import {
  clearScreen,
  showTitle,
  showMessage,
  showLoading,
  showBox,
  pressEnterToContinue
} from '../ui/display.js';
import {
  showGameModeSelect,
  showCharacterCreation
} from '../ui/menu.js';
import { addItem } from './inventory.js';
import { getExpForNextLevel } from './leveling.js';
import { getStartingSkills } from './skills.js';
import { migrateLoadedGameState } from './gameStateMigration.js';
import { getHubTown } from '../data/locations.js';
import { getGameModeName } from './death.js';

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

export async function startNewGameFlow(): Promise<GameState> {
  clearScreen();
  await showTitle();

  const gameMode = await showGameModeSelect();
  showMessage(`${getGameModeName(gameMode)} 선택됨`, 'success');
  await showLoading('게임 초기화 중', 1000);

  clearScreen();
  await showTitle();

  const characterData = await showCharacterCreation();
  showMessage(`환영합니다, ${characterData.class} ${characterData.name}!`, 'success');
  await showLoading('캐릭터 생성 중', 1500);

  const player = createPlayer(characterData.name, characterData.class, gameMode);

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
    flags: {},
    gameVersion: '1.0.0'
  };

  migrateLoadedGameState(gameState, gameState.gameVersion);

  clearScreen();
  await showTitle();

  const hub = getHubTown();
  showBox(
    `당신은 ${hub.name}에서 눈을 떴습니다.\n` +
    `평화로운 마을에 햇살이 내리쬐고, 주민들이 분주히 움직입니다.\n` +
    `하지만 어둠의 소문이 퍼지고 있습니다...\n` +
    `주변 숲에서 몬스터들이 나타나기 시작했다고 합니다.\n\n` +
    `당신의 모험이 시작됩니다, ${player.name}!`,
    '프롤로그'
  );

  await pressEnterToContinue();

  return gameState;
}
