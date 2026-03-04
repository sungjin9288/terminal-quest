/**
 * Character type definitions for Terminal Quest
 */

/**
 * Base statistics for characters and monsters
 */
export interface Stats {
  /** Current health points */
  hp: number;
  /** Maximum health points */
  maxHp: number;
  /** Current mana points */
  mp: number;
  /** Maximum mana points */
  maxMp: number;
  /** Physical attack power */
  attack: number;
  /** Physical defense */
  defense: number;
  /** Magical attack power */
  magicPower: number;
  /** Magical defense/resistance */
  magicDefense: number;
  /** Speed/agility - determines turn order in combat */
  speed: number;
  /** Critical hit chance (0-100) */
  critChance: number;
  /** Critical hit damage multiplier */
  critDamage: number;
  /** Evasion chance (0-100) */
  evasion: number;
}

/**
 * Character class types
 */
export enum CharacterClass {
  Warrior = 'Warrior',
  Mage = 'Mage',
  Rogue = 'Rogue',
  Cleric = 'Cleric',
  Ranger = 'Ranger'
}

/**
 * Equipment slot types
 */
export enum EquipmentSlot {
  Weapon = 'weapon',
  Helmet = 'helmet',
  Armor = 'armor',
  Gloves = 'gloves',
  Boots = 'boots',
  Accessory1 = 'accessory1',
  Accessory2 = 'accessory2'
}

/**
 * Player equipment mapping
 */
export interface Equipment {
  [EquipmentSlot.Weapon]?: string;
  [EquipmentSlot.Helmet]?: string;
  [EquipmentSlot.Armor]?: string;
  [EquipmentSlot.Gloves]?: string;
  [EquipmentSlot.Boots]?: string;
  [EquipmentSlot.Accessory1]?: string;
  [EquipmentSlot.Accessory2]?: string;
}

/**
 * Status effect types
 */
export enum StatusEffect {
  Poisoned = 'poisoned',
  Burned = 'burned',
  Frozen = 'frozen',
  Stunned = 'stunned',
  Blessed = 'blessed',
  Cursed = 'cursed',
  Regenerating = 'regenerating',
  Weakened = 'weakened',
  Strengthened = 'strengthened'
}

/**
 * Active status effect on character
 */
export interface ActiveStatusEffect {
  /** Type of status effect */
  type: StatusEffect;
  /** Remaining duration in turns */
  duration: number;
  /** Effect potency/magnitude */
  power: number;
}

/**
 * Player character data
 */
export interface Player {
  /** Player's chosen name */
  name: string;
  /** Character class */
  class: CharacterClass;
  /** Current level (1-99) */
  level: number;
  /** Current experience points */
  experience: number;
  /** Experience required for next level */
  experienceToNextLevel: number;
  /** Current stats */
  stats: Stats;
  /** Base stats without equipment bonuses */
  baseStats: Stats;
  /** Currency/gold */
  gold: number;
  /** Equipped items by slot */
  equipment: Equipment;
  /** Inventory item IDs */
  inventory: string[];
  /** Maximum inventory size */
  maxInventorySize: number;
  /** Active status effects */
  statusEffects: ActiveStatusEffect[];
  /** Current location ID */
  currentLocation: string;
  /** Completed quest IDs */
  completedQuests: string[];
  /** Active quest IDs */
  activeQuests: string[];
  /** Unlocked locations */
  unlockedLocations: string[];
  /** Total play time in seconds */
  playTime: number;
  /** Number of enemies defeated */
  enemiesDefeated: number;
  /** Number of deaths */
  deaths: number;
  /** Skill points available */
  skillPoints: number;
  /** Learned skill IDs */
  skills: string[];
}

/**
 * Skill definition
 */
export interface Skill {
  /** Unique skill identifier */
  id: string;
  /** Display name */
  name: string;
  /** Skill description */
  description: string;
  /** Mana cost to use */
  manaCost: number;
  /** Base damage/healing amount */
  power: number;
  /** Skill type */
  type: 'attack' | 'heal' | 'buff' | 'debuff';
  /** Target type */
  target: 'self' | 'enemy' | 'all-enemies' | 'all-allies';
  /** Status effect applied (if any) */
  statusEffect?: StatusEffect;
  /** Status effect duration in turns */
  effectDuration?: number;
  /** Required character level */
  requiredLevel: number;
  /** Required class (if any) */
  requiredClass?: CharacterClass;
  /** Skill point cost to learn (default: 1) */
  skillPointCost?: number;
}
