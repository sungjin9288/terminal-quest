/**
 * Combat system for Terminal Quest
 */

import {
  Player,
  Monster,
  MonsterInstance,
  ElementType,
  Consumable
} from '../types/index.js';
import { getItemById } from '../data/items.js';

/**
 * Combat action types
 */
export type CombatActionType = 'attack' | 'skill' | 'item' | 'defend' | 'escape';

/**
 * Combat action result
 */
export interface CombatActionResult {
  success: boolean;
  damage?: number;
  healing?: number;
  critical?: boolean;
  missed?: boolean;
  message: string;
  targetDefeated?: boolean;
}

/**
 * Battle rewards
 */
export interface BattleRewards {
  experience: number;
  gold: number;
  items: string[];
}

/**
 * Create a monster instance for battle
 */
export function createMonsterInstance(monster: Monster): MonsterInstance {
  return {
    ...monster,
    stats: { ...monster.stats },
    resistances: { ...monster.resistances },
    skills: [...monster.skills],
    statusEffects: [...monster.statusEffects],
    dropTable: {
      guaranteed: monster.dropTable.guaranteed.map(drop => ({ ...drop })),
      possible: monster.dropTable.possible.map(drop => ({ ...drop })),
      rare: monster.dropTable.rare.map(drop => ({ ...drop })),
      minGold: monster.dropTable.minGold,
      maxGold: monster.dropTable.maxGold
    },
    instanceId: `${monster.id}-${Date.now()}-${Math.random()}`,
    currentHp: monster.stats.hp,
    currentMp: monster.stats.mp,
    currentStats: { ...monster.stats },
    turnPriority: 0,
    isDefeated: false
  };
}

/**
 * Calculate damage based on attacker and defender stats
 * Formula: Base Damage = Attack * (100 / (100 + Defense)) * Random(0.9-1.1)
 */
export function calculateDamage(
  attack: number,
  defense: number,
  _isMagic: boolean = false,
  elementalMultiplier: number = 1.0
): number {
  // Base damage calculation
  const baseDamage = attack * (100 / (100 + defense));

  // Random variance (90% - 110%)
  const variance = 0.9 + Math.random() * 0.2;

  // Apply elemental multiplier
  const finalDamage = Math.floor(baseDamage * variance * elementalMultiplier);

  return Math.max(1, finalDamage); // Minimum 1 damage
}

/**
 * Check if attack is critical
 */
export function checkCritical(critChance: number): boolean {
  return Math.random() * 100 < critChance;
}

/**
 * Check if attack misses
 */
export function checkMiss(evasion: number): boolean {
  return Math.random() * 100 < evasion;
}

/**
 * Get elemental effectiveness multiplier
 */
export function getElementalMultiplier(
  attackElement: ElementType,
  defenderResistances: Partial<Record<ElementType, number>>
): number {
  const resistance = defenderResistances[attackElement] || 0;

  // Resistance ranges from -1 (weak) to 1 (immune)
  // -1 = 2x damage, 0 = 1x damage, 0.5 = 0.5x damage, 1 = 0x damage
  return Math.max(0, 1 - resistance);
}

/**
 * Player attacks monster
 */
export function playerAttack(
  player: Player,
  monster: MonsterInstance,
  isMagic: boolean = false
): CombatActionResult {
  // Check if attack misses
  if (checkMiss(monster.stats.evasion)) {
    return {
      success: true,
      missed: true,
      message: `${player.name}'s attack missed!`
    };
  }

  // Check for critical hit
  const isCritical = checkCritical(player.stats.critChance);

  // Calculate damage
  const attack = isMagic ? player.stats.magicPower : player.stats.attack;
  const defense = isMagic ? monster.stats.magicDefense : monster.stats.defense;

  let damage = calculateDamage(attack, defense, isMagic);

  // Apply critical multiplier
  if (isCritical) {
    damage = Math.floor(damage * player.stats.critDamage);
  }

  // Apply damage
  monster.currentHp = Math.max(0, monster.currentHp - damage);
  const defeated = monster.currentHp === 0;

  if (defeated) {
    monster.isDefeated = true;
  }

  return {
    success: true,
    damage,
    critical: isCritical,
    targetDefeated: defeated,
    message: `${player.name} attacks for ${damage} damage!${isCritical ? ' Critical hit!' : ''}`
  };
}

/**
 * Monster attacks player
 */
export function monsterAttack(
  monster: MonsterInstance,
  player: Player
): CombatActionResult {
  // Check if attack misses
  if (checkMiss(player.stats.evasion)) {
    return {
      success: true,
      missed: true,
      message: `${monster.name}'s attack missed!`
    };
  }

  // Check for critical hit
  const isCritical = checkCritical(monster.stats.critChance);

  // Calculate damage
  let damage = calculateDamage(
    monster.stats.attack,
    player.stats.defense,
    false
  );

  // Apply critical multiplier
  if (isCritical) {
    damage = Math.floor(damage * monster.stats.critDamage);
  }

  // Apply damage
  player.stats.hp = Math.max(0, player.stats.hp - damage);

  return {
    success: true,
    damage,
    critical: isCritical,
    targetDefeated: player.stats.hp === 0,
    message: `${monster.name} attacks for ${damage} damage!${isCritical ? ' Critical hit!' : ''}`
  };
}

/**
 * Player defends (reduces damage next turn)
 */
export function playerDefend(player: Player): CombatActionResult {
  return {
    success: true,
    message: `${player.name} takes a defensive stance!`
  };
}

/**
 * Use consumable item
 */
export function useItem(
  player: Player,
  item: Consumable
): CombatActionResult {
  let message = `${player.name} used ${item.name}!`;
  let healing = 0;

  item.effects.forEach(effect => {
    switch (effect.type) {
      case 'heal':
        const healAmount = effect.power;
        const actualHeal = Math.min(healAmount, player.stats.maxHp - player.stats.hp);
        player.stats.hp += actualHeal;
        healing += actualHeal;
        message += ` Restored ${actualHeal} HP!`;
        break;

      case 'restore-mp':
        const mpAmount = effect.power;
        const actualRestore = Math.min(mpAmount, player.stats.maxMp - player.stats.mp);
        player.stats.mp += actualRestore;
        message += ` Restored ${actualRestore} MP!`;
        break;

      case 'cure':
        // Remove status effects (simplified)
        player.statusEffects = [];
        message += ` Cured status effects!`;
        break;
    }
  });

  return {
    success: true,
    healing,
    message
  };
}

/**
 * Attempt to escape from battle
 */
export function attemptEscape(
  player: Player,
  monster: MonsterInstance,
  isBossFight: boolean
): CombatActionResult {
  if (isBossFight) {
    return {
      success: false,
      message: `Cannot escape from a boss fight!`
    };
  }

  // Escape chance based on speed difference
  const speedDiff = player.stats.speed - monster.stats.speed;
  const baseChance = 50;
  const escapeChance = Math.max(25, Math.min(75, baseChance + speedDiff * 2));

  const escaped = Math.random() * 100 < escapeChance;

  if (escaped) {
    return {
      success: true,
      message: `${player.name} successfully escaped!`
    };
  } else {
    return {
      success: false,
      message: `${player.name} failed to escape!`
    };
  }
}

/**
 * Calculate battle rewards
 */
export function calculateRewards(
  monster: MonsterInstance,
  player: Player
): BattleRewards {
  // Base experience
  let experience = monster.expReward;

  // Level difference bonus
  const levelDiff = monster.level - player.level;
  if (levelDiff > 0) {
    experience = Math.floor(experience * (1 + levelDiff * 0.1));
  }

  // Gold calculation
  const { minGold, maxGold } = monster.dropTable;
  const gold = Math.floor(minGold + Math.random() * (maxGold - minGold + 1));

  // Item drops
  const items: string[] = [];
  const pushDropItem = (itemId: string): void => {
    if (getItemById(itemId)) {
      items.push(itemId);
    }
  };

  // Guaranteed drops
  monster.dropTable.guaranteed.forEach(drop => {
    if (Math.random() < drop.chance) {
      const quantity = Math.floor(
        drop.minQuantity + Math.random() * (drop.maxQuantity - drop.minQuantity + 1)
      );
      for (let i = 0; i < quantity; i++) {
        pushDropItem(drop.itemId);
      }
    }
  });

  // Possible drops
  monster.dropTable.possible.forEach(drop => {
    if (Math.random() < drop.chance) {
      const quantity = Math.floor(
        drop.minQuantity + Math.random() * (drop.maxQuantity - drop.minQuantity + 1)
      );
      for (let i = 0; i < quantity; i++) {
        pushDropItem(drop.itemId);
      }
    }
  });

  // Rare drops
  monster.dropTable.rare.forEach(drop => {
    if (Math.random() < drop.chance) {
      const quantity = Math.floor(
        drop.minQuantity + Math.random() * (drop.maxQuantity - drop.minQuantity + 1)
      );
      for (let i = 0; i < quantity; i++) {
        pushDropItem(drop.itemId);
      }
    }
  });

  return { experience, gold, items };
}

/**
 * Determine turn order
 */
export function determineTurnOrder(
  playerSpeed: number,
  monsterSpeed: number
): 'player' | 'monster' {
  // Add some randomness
  const playerPriority = playerSpeed + Math.random() * 10;
  const monsterPriority = monsterSpeed + Math.random() * 10;

  return playerPriority >= monsterPriority ? 'player' : 'monster';
}

/**
 * Simple monster AI
 */
export function monsterAI(monster: MonsterInstance): CombatActionType {
  // Simple AI: always attack for now
  // Can be expanded with different behaviors based on monster.aiPattern

  const hpPercentage = (monster.currentHp / monster.stats.maxHp) * 100;

  // If low HP, maybe defend or use skill (future implementation)
  if (hpPercentage < 30) {
    // For now, just attack
    return 'attack';
  }

  return 'attack';
}
