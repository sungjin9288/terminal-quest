/**
 * Leveling and experience system for Terminal Quest
 */

import { Player, CharacterClass, Stats } from '../types/character.js';

/**
 * Experience curve data points from game_balance_final.md
 */
const EXP_CURVE: Record<number, number> = {
  1: 100,    // Lv 1→2
  2: 150,    // Lv 2→3
  3: 200,    // Lv 3→4
  4: 250,    // Lv 4→5
  5: 300,    // Lv 5→6
  6: 400,    // Lv 6→7
  7: 500,    // Lv 7→8
  8: 600,    // Lv 8→9
  9: 700,    // Lv 9→10
  10: 800,   // Lv 10→11
  11: 950,   // Lv 11→12
  12: 1100,  // Lv 12→13
  13: 1250,  // Lv 13→14
  14: 1400,  // Lv 14→15
  15: 1600,  // Lv 15→16
  16: 1800,  // Lv 16→17
  17: 2000,  // Lv 17→18
  18: 2200,  // Lv 18→19
  19: 2400,  // Lv 19→20
  20: 2500,  // Lv 20→21
  21: 3000,  // Lv 21→22
  22: 3500,  // Lv 22→23
  23: 4000,  // Lv 23→24
  24: 4500,  // Lv 24→25
  25: 5000,  // Lv 25→26
  26: 5500,  // Lv 26→27
  27: 6000,  // Lv 27→28
  28: 7000,  // Lv 28→29
  29: 8000,  // Lv 29→30
  30: 10000  // Lv 30→31 (max level)
};

/**
 * Get experience required for next level
 */
export function getExpForNextLevel(level: number): number {
  if (level >= 30) {
    return 10000; // Max level
  }
  return EXP_CURVE[level] || 1000;
}

/**
 * Level up result
 */
export interface LevelUpResult {
  leveledUp: boolean;
  newLevel: number;
  oldStats: Stats;
  newStats: Stats;
  statIncreases: Partial<Stats>;
  skillPoints: number;
}

/**
 * Calculate stat growth per level based on class
 */
export function calculateStatGrowth(characterClass: CharacterClass, level: number): Partial<Stats> {
  const baseGrowth: Record<CharacterClass, Partial<Stats>> = {
    [CharacterClass.Warrior]: {
      maxHp: 12,
      maxMp: 3,
      attack: 3,
      defense: 2,
      magicPower: 1,
      magicDefense: 1,
      speed: 1,
      critChance: 0.5,
      critDamage: 0.02,
      evasion: 0.3
    },
    [CharacterClass.Mage]: {
      maxHp: 6,
      maxMp: 8,
      attack: 1,
      defense: 1,
      magicPower: 4,
      magicDefense: 2,
      speed: 1,
      critChance: 0.3,
      critDamage: 0.03,
      evasion: 0.5
    },
    [CharacterClass.Rogue]: {
      maxHp: 8,
      maxMp: 4,
      attack: 3,
      defense: 1,
      magicPower: 1,
      magicDefense: 1,
      speed: 2,
      critChance: 1.2,
      critDamage: 0.05,
      evasion: 1.0
    },
    [CharacterClass.Cleric]: {
      maxHp: 10,
      maxMp: 6,
      attack: 2,
      defense: 2,
      magicPower: 3,
      magicDefense: 2,
      speed: 1,
      critChance: 0.3,
      critDamage: 0.02,
      evasion: 0.5
    },
    [CharacterClass.Ranger]: {
      maxHp: 9,
      maxMp: 5,
      attack: 3,
      defense: 1,
      magicPower: 2,
      magicDefense: 1,
      speed: 2,
      critChance: 0.8,
      critDamage: 0.04,
      evasion: 0.8
    }
  };

  const growth = baseGrowth[characterClass];

  // Every 5 levels, bonus stats
  if (level % 5 === 0) {
    return {
      maxHp: (growth.maxHp || 0) * 1.5,
      maxMp: (growth.maxMp || 0) * 1.5,
      attack: (growth.attack || 0) * 1.2,
      defense: (growth.defense || 0) * 1.2,
      magicPower: (growth.magicPower || 0) * 1.2,
      magicDefense: (growth.magicDefense || 0) * 1.2,
      speed: (growth.speed || 0) * 1.2,
      critChance: (growth.critChance || 0) * 1.5,
      critDamage: (growth.critDamage || 0) * 1.5,
      evasion: (growth.evasion || 0) * 1.5
    };
  }

  return growth;
}

/**
 * Apply stat increases to player
 */
function applyStatIncreases(stats: Stats, increases: Partial<Stats>): void {
  Object.keys(increases).forEach(key => {
    const statKey = key as keyof Stats;
    const value = increases[statKey];
    if (value !== undefined) {
      stats[statKey] = Math.floor(stats[statKey] + value);
    }
  });
}

/**
 * Gain experience points
 */
export function gainExp(player: Player, amount: number): LevelUpResult {
  const oldStats = { ...player.baseStats };

  player.experience += amount;

  let leveledUp = false;
  let totalStatIncreases: Partial<Stats> = {};

  // Check for multiple level ups
  while (player.experience >= player.experienceToNextLevel && player.level < 30) {
    leveledUp = true;
    player.experience -= player.experienceToNextLevel;
    player.level += 1;

    // Calculate stat growth
    const statGrowth = calculateStatGrowth(player.class, player.level);

    // Apply stat increases
    applyStatIncreases(player.baseStats, statGrowth);

    // Accumulate total stat increases
    Object.keys(statGrowth).forEach(key => {
      const statKey = key as keyof Stats;
      const value = statGrowth[statKey];
      if (value !== undefined) {
        totalStatIncreases[statKey] = (totalStatIncreases[statKey] || 0) + value;
      }
    });

    // Update experience requirement for next level
    player.experienceToNextLevel = getExpForNextLevel(player.level);

    // Grant skill point
    player.skillPoints += 1;
  }

  if (leveledUp) {
    // Update current stats from base stats
    player.stats = { ...player.baseStats };

    // Restore HP and MP on level up
    player.stats.hp = player.stats.maxHp;
    player.stats.mp = player.stats.maxMp;
  }

  return {
    leveledUp,
    newLevel: player.level,
    oldStats,
    newStats: { ...player.baseStats },
    statIncreases: totalStatIncreases,
    skillPoints: player.skillPoints
  };
}

/**
 * Check if player can level up
 */
export function canLevelUp(player: Player): boolean {
  return player.experience >= player.experienceToNextLevel && player.level < 30;
}

/**
 * Get level progress percentage
 */
export function getLevelProgress(player: Player): number {
  if (player.level >= 30) {
    return 100;
  }
  return Math.floor((player.experience / player.experienceToNextLevel) * 100);
}

/**
 * Get total experience for a level
 */
export function getTotalExpForLevel(level: number): number {
  let total = 0;
  for (let i = 1; i < level; i++) {
    total += getExpForNextLevel(i);
  }
  return total;
}

/**
 * Calculate experience from monster
 */
export function calculateMonsterExp(monsterLevel: number, playerLevel: number, isBoss: boolean = false, hasPrefix: boolean = false): number {
  let baseExp: number;

  if (isBoss) {
    baseExp = monsterLevel * 100;
  } else if (hasPrefix) {
    baseExp = monsterLevel * 15;
  } else {
    baseExp = monsterLevel * 10;
  }

  // Level difference bonus
  const levelDiff = monsterLevel - playerLevel;
  if (levelDiff > 0) {
    const bonus = levelDiff * 0.1;
    baseExp = Math.floor(baseExp * (1 + bonus));
  } else if (levelDiff < -3) {
    // Penalty for killing low-level monsters
    const penalty = Math.max(0.5, 1 + (levelDiff + 3) * 0.1);
    baseExp = Math.floor(baseExp * penalty);
  }

  return Math.max(1, baseExp);
}
