/**
 * Item type definitions for Terminal Quest
 */

import { Stats, StatusEffect } from './character.js';

/**
 * Item rarity levels
 */
export enum ItemRarity {
  Common = 'common',
  Uncommon = 'uncommon',
  Rare = 'rare',
  Epic = 'epic',
  Legendary = 'legendary',
  Mythic = 'mythic'
}

/**
 * Item types
 */
export enum ItemType {
  Weapon = 'weapon',
  Armor = 'armor',
  Consumable = 'consumable',
  Material = 'material',
  QuestItem = 'quest-item'
}

/**
 * Weapon types
 */
export enum WeaponType {
  Sword = 'sword',
  Axe = 'axe',
  Spear = 'spear',
  Dagger = 'dagger',
  Bow = 'bow',
  Staff = 'staff',
  Wand = 'wand',
  Mace = 'mace'
}

/**
 * Armor types
 */
export enum ArmorType {
  Helmet = 'helmet',
  Chest = 'chest',
  Gloves = 'gloves',
  Boots = 'boots',
  Accessory = 'accessory'
}

/**
 * Elemental attributes
 */
export enum ElementType {
  Physical = 'physical',
  Fire = 'fire',
  Ice = 'ice',
  Lightning = 'lightning',
  Dark = 'dark',
  Light = 'light',
  Poison = 'poison'
}

/**
 * Item prefix modifiers
 */
export interface ItemPrefix {
  /** Prefix identifier */
  id: string;
  /** Display name */
  name: string;
  /** Description of the effect */
  description: string;
  /** Stat bonuses provided */
  statModifiers: Partial<Stats>;
  /** Rarity requirement for this prefix */
  minRarity: ItemRarity;
  /** Value multiplier (affects price) */
  valueMultiplier: number;
}

/**
 * Base item interface
 */
export interface Item {
  /** Unique item identifier */
  id: string;
  /** Display name */
  name: string;
  /** Item description */
  description: string;
  /** Item type */
  type: ItemType;
  /** Rarity level */
  rarity: ItemRarity;
  /** Base gold value */
  value: number;
  /** Can be sold to merchants */
  sellable: boolean;
  /** Can be stacked in inventory */
  stackable: boolean;
  /** Maximum stack size */
  maxStack: number;
  /** Required level to use */
  requiredLevel: number;
  /** Item prefix (if any) */
  prefix?: ItemPrefix;
  /** Icon/emoji for display */
  icon: string;
}

/**
 * Weapon item
 */
export interface Weapon extends Item {
  type: ItemType.Weapon;
  /** Weapon category */
  weaponType: WeaponType;
  /** Base attack damage */
  attackPower: number;
  /** Elemental type */
  element: ElementType;
  /** Elemental damage bonus */
  elementalDamage: number;
  /** Critical hit chance bonus (0-100) */
  critChanceBonus: number;
  /** Critical damage multiplier bonus */
  critDamageBonus: number;
  /** Additional stat bonuses */
  statBonuses: Partial<Stats>;
  /** Attack range (1 = melee, 2+ = ranged) */
  range: number;
  /** Two-handed weapon */
  twoHanded: boolean;
}

/**
 * Armor/equipment item
 */
export interface Armor extends Item {
  type: ItemType.Armor;
  /** Armor category */
  armorType: ArmorType;
  /** Base defense value */
  defense: number;
  /** Base magic defense */
  magicDefense: number;
  /** Elemental resistances */
  resistances: Partial<Record<ElementType, number>>;
  /** Additional stat bonuses */
  statBonuses: Partial<Stats>;
  /** Status effect immunity (if any) */
  statusImmunity?: StatusEffect[];
  /** Set bonus identifier (if part of a set) */
  setBonusId?: string;
}

/**
 * Consumable item effects
 */
export interface ConsumableEffect {
  /** Effect type */
  type: 'heal' | 'restore-mp' | 'buff' | 'cure' | 'revive';
  /** Effect power/amount */
  power: number;
  /** Duration in turns (for buffs) */
  duration?: number;
  /** Status effect to apply/cure */
  statusEffect?: StatusEffect;
  /** Stat to modify (for buffs) */
  statModifier?: Partial<Stats>;
}

/**
 * Consumable item
 */
export interface Consumable extends Item {
  type: ItemType.Consumable;
  stackable: true;
  /** Effects applied when consumed */
  effects: ConsumableEffect[];
  /** Can be used in combat */
  usableInCombat: boolean;
  /** Can be used outside combat */
  usableOutOfCombat: boolean;
  /** Consumed on use */
  consumeOnUse: boolean;
}

/**
 * Material item (for crafting)
 */
export interface Material extends Item {
  type: ItemType.Material;
  stackable: true;
  /** Material category */
  category: 'ore' | 'herb' | 'gem' | 'essence' | 'misc';
}

/**
 * Quest item
 */
export interface QuestItem extends Item {
  type: ItemType.QuestItem;
  sellable: false;
  /** Associated quest ID */
  questId: string;
}

/**
 * Equipment set bonus
 */
export interface SetBonus {
  /** Set identifier */
  id: string;
  /** Set name */
  name: string;
  /** Set description */
  description: string;
  /** Required pieces for each tier */
  tiers: {
    /** Number of pieces required */
    pieces: number;
    /** Bonus description */
    description: string;
    /** Stat bonuses */
    statBonuses: Partial<Stats>;
    /** Special effects */
    specialEffect?: string;
  }[];
}

/**
 * Union type for all item types
 */
export type AnyItem = Item | Weapon | Armor | Consumable | Material | QuestItem;
