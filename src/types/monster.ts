/**
 * Monster and enemy type definitions for Terminal Quest
 */

import { Stats, ActiveStatusEffect } from './character.js';
import { ElementType } from './item.js';

/**
 * Monster types/categories
 */
export enum MonsterType {
  Beast = 'beast',
  Undead = 'undead',
  Demon = 'demon',
  Dragon = 'dragon',
  Elemental = 'elemental',
  Humanoid = 'humanoid',
  Construct = 'construct',
  Aberration = 'aberration'
}

/**
 * Monster rank/difficulty
 */
export enum MonsterRank {
  Normal = 'normal',
  Elite = 'elite',
  Boss = 'boss',
  WorldBoss = 'world-boss'
}

/**
 * Monster prefix modifiers (e.g., "Enraged", "Corrupted")
 */
export interface MonsterPrefix {
  /** Prefix identifier */
  id: string;
  /** Display name */
  name: string;
  /** Description */
  description: string;
  /** Stat multipliers */
  statMultipliers: {
    hp?: number;
    attack?: number;
    defense?: number;
    magicPower?: number;
    magicDefense?: number;
    speed?: number;
  };
  /** Additional abilities granted */
  grantedSkills?: string[];
  /** Experience multiplier */
  expMultiplier: number;
  /** Gold drop multiplier */
  goldMultiplier: number;
  /** Visual indicator color */
  color: string;
  /** Minimum monster level for this prefix */
  minLevel: number;
}

/**
 * Drop table entry
 */
export interface DropTableEntry {
  /** Item ID to drop */
  itemId: string;
  /** Drop chance (0-1, where 1 = 100%) */
  chance: number;
  /** Minimum quantity */
  minQuantity: number;
  /** Maximum quantity */
  maxQuantity: number;
  /** Required monster prefix (optional) */
  requiredPrefix?: string;
}

/**
 * Complete drop table for a monster
 */
export interface DropTable {
  /** Guaranteed drops */
  guaranteed: DropTableEntry[];
  /** Possible drops (rolled individually) */
  possible: DropTableEntry[];
  /** Rare drops (lower chance) */
  rare: DropTableEntry[];
  /** Minimum gold dropped */
  minGold: number;
  /** Maximum gold dropped */
  maxGold: number;
}

/**
 * Monster AI behavior pattern
 */
export enum AIBehavior {
  Aggressive = 'aggressive',
  Defensive = 'defensive',
  Balanced = 'balanced',
  Support = 'support',
  Berserker = 'berserker',
  Tactical = 'tactical'
}

/**
 * Monster/enemy definition
 */
export interface Monster {
  /** Unique monster identifier */
  id: string;
  /** Display name */
  name: string;
  /** Description/lore */
  description: string;
  /** Monster type */
  type: MonsterType;
  /** Rank/difficulty tier */
  rank: MonsterRank;
  /** Monster level */
  level: number;
  /** Base stats */
  stats: Stats;
  /** Current stats (with buffs/debuffs) */
  currentStats?: Stats;
  /** Elemental affinity */
  element: ElementType;
  /** Elemental resistances (-1 to 1, where -1 = weakness, 1 = immunity) */
  resistances: Partial<Record<ElementType, number>>;
  /** Available skills */
  skills: string[];
  /** AI behavior pattern */
  aiPattern: AIBehavior;
  /** Drop table */
  dropTable: DropTable;
  /** Base experience reward */
  expReward: number;
  /** Applied prefix (if any) */
  prefix?: MonsterPrefix;
  /** Active status effects */
  statusEffects: ActiveStatusEffect[];
  /** Icon/emoji for display */
  icon: string;
  /** Can be stunned */
  canBeStunned: boolean;
  /** Can be poisoned */
  canBePoisoned: boolean;
  /** Boss monster flag */
  isBoss: boolean;
  /** Spawn weight (for random encounters) */
  spawnWeight: number;
}

/**
 * Monster spawn configuration
 */
export interface MonsterSpawn {
  /** Monster ID */
  monsterId: string;
  /** Minimum level for this monster */
  minLevel: number;
  /** Maximum level for this monster */
  maxLevel: number;
  /** Spawn weight (higher = more common) */
  weight: number;
  /** Possible prefixes */
  possiblePrefixes: string[];
  /** Prefix spawn chance (0-1) */
  prefixChance: number;
}

/**
 * Enemy party/group configuration
 */
export interface EnemyParty {
  /** Party identifier */
  id: string;
  /** Party name */
  name: string;
  /** Monster IDs in this party */
  monsters: string[];
  /** Minimum party size */
  minSize: number;
  /** Maximum party size */
  maxSize: number;
  /** Spawn weight */
  weight: number;
  /** Boss fight flag */
  isBossFight: boolean;
}

/**
 * Active monster instance in combat
 */
export interface MonsterInstance extends Monster {
  /** Unique instance ID */
  instanceId: string;
  /** Current HP */
  currentHp: number;
  /** Current MP */
  currentMp: number;
  /** Turn order priority */
  turnPriority: number;
  /** Is defeated */
  isDefeated: boolean;
}
