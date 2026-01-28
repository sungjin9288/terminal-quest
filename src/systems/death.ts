/**
 * Terminal Quest - Death System
 * Handles death penalties, respawning, and game over based on game mode
 */

import { Player } from '../types/character.js';
import { GameMode, SaveData } from '../types/game.js';
import { PlayerPosition } from '../types/location.js';
import { ItemType } from '../types/item.js';
import { getSampleItems } from '../data/items.js';

/**
 * Death penalty result
 */
export interface DeathPenalty {
  /** Gold lost */
  goldLost: number;
  /** Gold percentage lost */
  goldPercentage: number;
  /** Experience lost */
  expLost: number;
  /** Experience percentage lost */
  expPercentage: number;
  /** Whether level can decrease */
  canLevelDown: boolean;
  /** Consumables lost (item IDs) */
  consumablesLost: string[];
  /** Consumable loss percentage */
  consumableLossPercentage: number;
  /** Equipment lost (item ID, if any) */
  equipmentLost?: string;
  /** Equipment loss chance */
  equipmentLossChance: number;
  /** Is permadeath */
  isPermadeath: boolean;
  /** Soul essence earned (for hardcore mode) */
  soulEssence: number;
}

/**
 * Death handling result
 */
export interface DeathResult {
  /** Game mode */
  gameMode: GameMode;
  /** Penalty applied */
  penalty: DeathPenalty;
  /** Respawn location ID */
  respawnLocation: string;
  /** Respawn position */
  respawnPosition?: PlayerPosition;
  /** Message to display */
  message: string;
  /** Is game over (hardcore) */
  isGameOver: boolean;
  /** Save data to delete (hardcore) */
  saveToDelete?: string;
}

/**
 * Mode-specific penalty configuration
 */
interface DeathPenaltyConfig {
  goldLossPercent: number;
  expLossPercent: number;
  canLevelDown: boolean;
  consumableLossPercent: number;
  equipmentLossChance: number;
  isPermadeath: boolean;
  respawnAtSameLocation: boolean;
}

/**
 * Death penalty configurations by game mode
 */
const DEATH_PENALTY_CONFIG: Record<GameMode, DeathPenaltyConfig> = {
  [GameMode.Story]: {
    goldLossPercent: 0.10, // 10%
    expLossPercent: 0,     // No EXP loss
    canLevelDown: false,
    consumableLossPercent: 0,
    equipmentLossChance: 0,
    isPermadeath: false,
    respawnAtSameLocation: true
  },
  [GameMode.Adventure]: {
    goldLossPercent: 0.30, // 30%
    expLossPercent: 0.10,  // 10%
    canLevelDown: false,
    consumableLossPercent: 0.50, // 50%
    equipmentLossChance: 0,
    isPermadeath: false,
    respawnAtSameLocation: false
  },
  [GameMode.Challenge]: {
    goldLossPercent: 0.50, // 50%
    expLossPercent: 0.20,  // 20%
    canLevelDown: true,
    consumableLossPercent: 1.0, // 100%
    equipmentLossChance: 0.30, // 30%
    isPermadeath: false,
    respawnAtSameLocation: false
  },
  [GameMode.Hardcore]: {
    goldLossPercent: 1.0,  // 100% (doesn't matter - save deleted)
    expLossPercent: 1.0,   // 100% (doesn't matter - save deleted)
    canLevelDown: true,
    consumableLossPercent: 1.0,
    equipmentLossChance: 1.0,
    isPermadeath: true,
    respawnAtSameLocation: false
  }
};

/**
 * Calculate death penalty based on player state and game mode
 */
export function calculateDeathPenalty(
  player: Player,
  gameMode: GameMode
): DeathPenalty {
  const config = DEATH_PENALTY_CONFIG[gameMode];

  // Calculate gold loss
  const goldLost = Math.floor(player.gold * config.goldLossPercent);

  // Calculate experience loss
  const expLost = Math.floor(player.experience * config.expLossPercent);

  // Calculate consumables to lose
  const consumablesLost = calculateConsumableLoss(
    player.inventory,
    config.consumableLossPercent
  );

  // Calculate equipment loss (Challenge mode only)
  let equipmentLost: string | undefined;
  if (config.equipmentLossChance > 0 && Math.random() < config.equipmentLossChance) {
    equipmentLost = getRandomEquippedItem(player);
  }

  // Calculate soul essence for hardcore mode
  const soulEssence = config.isPermadeath ? player.level * 100 : 0;

  return {
    goldLost,
    goldPercentage: config.goldLossPercent * 100,
    expLost,
    expPercentage: config.expLossPercent * 100,
    canLevelDown: config.canLevelDown,
    consumablesLost,
    consumableLossPercentage: config.consumableLossPercent * 100,
    equipmentLost,
    equipmentLossChance: config.equipmentLossChance * 100,
    isPermadeath: config.isPermadeath,
    soulEssence
  };
}

/**
 * Calculate which consumables to lose
 */
function calculateConsumableLoss(
  inventory: string[],
  lossPercent: number
): string[] {
  if (lossPercent === 0) return [];

  const items = getSampleItems();
  const consumables = inventory.filter(itemId => {
    const item = items[itemId];
    return item && item.type === ItemType.Consumable;
  });

  if (lossPercent >= 1.0) {
    // Lose all consumables
    return [...consumables];
  }

  // Lose random percentage of consumables
  const countToLose = Math.ceil(consumables.length * lossPercent);
  const shuffled = [...consumables].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, countToLose);
}

/**
 * Get a random equipped item (for Challenge mode penalty)
 */
function getRandomEquippedItem(player: Player): string | undefined {
  const equippedItems: string[] = [];

  for (const [_slot, itemId] of Object.entries(player.equipment)) {
    if (itemId) {
      equippedItems.push(itemId);
    }
  }

  if (equippedItems.length === 0) return undefined;

  const randomIndex = Math.floor(Math.random() * equippedItems.length);
  return equippedItems[randomIndex];
}

/**
 * Handle player death
 */
export function handleDeath(
  player: Player,
  gameMode: GameMode,
  currentSavePoint?: string,
  currentSaveData?: SaveData
): DeathResult {
  const config = DEATH_PENALTY_CONFIG[gameMode];
  const penalty = calculateDeathPenalty(player, gameMode);

  // Hardcore mode - game over
  if (config.isPermadeath) {
    return {
      gameMode,
      penalty,
      respawnLocation: '',
      message: '당신의 여정이 영원히 끝났습니다...',
      isGameOver: true,
      saveToDelete: currentSaveData?.fileName
    };
  }

  // Determine respawn location
  let respawnLocation: string;
  let respawnPosition: PlayerPosition | undefined;

  if (config.respawnAtSameLocation) {
    // Story mode - respawn at same location
    respawnLocation = player.currentLocation;
    respawnPosition = currentSaveData?.position;
  } else {
    // Adventure/Challenge - respawn at last save point
    respawnLocation = currentSavePoint ?? player.currentLocation;
    respawnPosition = currentSaveData?.position;
  }

  // Generate message based on mode
  const message = getDeathMessage(gameMode, respawnLocation);

  return {
    gameMode,
    penalty,
    respawnLocation,
    respawnPosition,
    message,
    isGameOver: false
  };
}

/**
 * Apply death penalty to player
 */
export function applyDeathPenalty(
  player: Player,
  penalty: DeathPenalty
): Player {
  const updatedPlayer = { ...player };

  // Apply gold loss
  updatedPlayer.gold = Math.max(0, player.gold - penalty.goldLost);

  // Apply experience loss
  updatedPlayer.experience = Math.max(0, player.experience - penalty.expLost);

  // Handle level down if applicable
  if (penalty.canLevelDown && penalty.expLost > 0) {
    updatedPlayer.level = recalculateLevel(updatedPlayer.experience, player.level);
  }

  // Remove lost consumables
  if (penalty.consumablesLost.length > 0) {
    const consumablesToRemove = [...penalty.consumablesLost];
    updatedPlayer.inventory = player.inventory.filter(itemId => {
      const index = consumablesToRemove.indexOf(itemId);
      if (index !== -1) {
        consumablesToRemove.splice(index, 1);
        return false;
      }
      return true;
    });
  }

  // Remove lost equipment
  if (penalty.equipmentLost) {
    for (const [slot, itemId] of Object.entries(updatedPlayer.equipment)) {
      if (itemId === penalty.equipmentLost) {
        (updatedPlayer.equipment as Record<string, string | undefined>)[slot] = undefined;
        break;
      }
    }
  }

  // Increment death counter
  updatedPlayer.deaths = (player.deaths ?? 0) + 1;

  return updatedPlayer;
}

/**
 * Recalculate level based on current experience
 */
function recalculateLevel(currentExp: number, currentLevel: number): number {
  // Experience table (cumulative)
  const expTable = getExperienceTable();

  // Find the appropriate level for current exp
  for (let level = currentLevel; level >= 1; level--) {
    if (currentExp >= expTable[level - 1]) {
      return level;
    }
  }

  return 1;
}

/**
 * Get cumulative experience table
 */
function getExperienceTable(): number[] {
  // Cumulative exp needed for each level (index = level - 1)
  return [
    0,      // Lv 1
    100,    // Lv 2
    250,    // Lv 3
    450,    // Lv 4
    700,    // Lv 5
    1000,   // Lv 6
    1400,   // Lv 7
    1900,   // Lv 8
    2500,   // Lv 9
    3200,   // Lv 10
    4000,   // Lv 11
    4900,   // Lv 12
    5900,   // Lv 13
    7000,   // Lv 14
    8200,   // Lv 15
    9500,   // Lv 16
    11000,  // Lv 17
    12700,  // Lv 18
    14600,  // Lv 19
    16700,  // Lv 20
    19100,  // Lv 21
    21800,  // Lv 22
    24800,  // Lv 23
    28100,  // Lv 24
    31700,  // Lv 25
    35700,  // Lv 26
    40100,  // Lv 27
    45000,  // Lv 28
    50400,  // Lv 29
    56400   // Lv 30
  ];
}

/**
 * Respawn player at specified location
 */
export function respawnPlayer(
  player: Player,
  respawnLocation: string,
  penalty: DeathPenalty
): Player {
  // First apply penalty
  let updatedPlayer = applyDeathPenalty(player, penalty);

  // Update location
  updatedPlayer.currentLocation = respawnLocation;

  // Restore HP to full
  updatedPlayer.stats = {
    ...updatedPlayer.stats,
    hp: updatedPlayer.stats.maxHp,
    mp: updatedPlayer.stats.maxMp
  };

  // Clear status effects
  updatedPlayer.statusEffects = [];

  return updatedPlayer;
}

/**
 * Get death message based on game mode
 */
function getDeathMessage(gameMode: GameMode, respawnLocation: string): string {
  switch (gameMode) {
    case GameMode.Story:
      return `정신을 차렸습니다. 같은 자리에서 다시 시작합니다...`;
    case GameMode.Adventure:
      return `최근 세이브 지점으로 돌아갑니다...\n→ ${respawnLocation}`;
    case GameMode.Challenge:
      return `세이브 지점으로 돌아갑니다. 상당한 손실이 있습니다...\n→ ${respawnLocation}`;
    case GameMode.Hardcore:
      return '당신의 여정이 영원히 끝났습니다...';
    default:
      return '최근 세이브 지점으로 돌아갑니다...';
  }
}

/**
 * Get mode display name
 */
export function getGameModeName(gameMode: GameMode): string {
  const names: Record<GameMode, string> = {
    [GameMode.Story]: '스토리 모드',
    [GameMode.Adventure]: '어드벤처 모드',
    [GameMode.Challenge]: '챌린지 모드',
    [GameMode.Hardcore]: '하드코어 모드'
  };
  return names[gameMode];
}

/**
 * Get mode description
 */
export function getGameModeDescription(gameMode: GameMode): string {
  const descriptions: Record<GameMode, string> = {
    [GameMode.Story]: '쉬운 난이도. 죽어도 같은 위치에서 부활, 골드 10% 손실만',
    [GameMode.Adventure]: '일반 난이도. 세이브 복귀, 골드 30% + 경험치 10% + 소모품 50% 손실',
    [GameMode.Challenge]: '어려움. 세이브 복귀, 골드 50% + 경험치 20% + 소모품 전부 + 장비 랜덤 손실',
    [GameMode.Hardcore]: '극한 난이도. 죽으면 세이브 삭제, 영구 사망'
  };
  return descriptions[gameMode];
}

/**
 * Check if game mode allows respawn
 */
export function canRespawn(gameMode: GameMode): boolean {
  return !DEATH_PENALTY_CONFIG[gameMode].isPermadeath;
}

/**
 * Calculate soul essence for meta progression (Hardcore mode)
 */
export function calculateSoulEssence(player: Player): number {
  return player.level * 100;
}

/**
 * Format gold amount for display
 */
export function formatGoldLoss(amount: number): string {
  return `-${amount.toLocaleString()}G`;
}

/**
 * Format experience amount for display
 */
export function formatExpLoss(amount: number): string {
  return `-${amount.toLocaleString()} EXP`;
}

/**
 * Get penalty severity (for UI styling)
 */
export function getPenaltySeverity(gameMode: GameMode): 'light' | 'medium' | 'heavy' | 'fatal' {
  switch (gameMode) {
    case GameMode.Story:
      return 'light';
    case GameMode.Adventure:
      return 'medium';
    case GameMode.Challenge:
      return 'heavy';
    case GameMode.Hardcore:
      return 'fatal';
    default:
      return 'medium';
  }
}
