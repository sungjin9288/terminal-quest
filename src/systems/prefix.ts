/**
 * Terminal Quest - Prefix System
 * Handles monster and item prefix application and bonus calculations
 */

import { Stats } from '../types/character.js';
import { ItemRarity, ItemType, WeaponType, ArmorType, ElementType, ItemPrefix, Weapon, Armor, AnyItem } from '../types/item.js';
import { Monster, MonsterPrefix } from '../types/monster.js';

/**
 * Monster prefix data structure from JSON
 */
export interface MonsterPrefixData {
  id: string;
  name: string;
  namePrefix: string;
  description: string;
  statMultipliers: {
    hp?: number;
    attack?: number;
    defense?: number;
    magicPower?: number;
    magicDefense?: number;
    speed?: number;
    critChance?: number;
    evasion?: number;
  };
  element: string;
  onHitEffect?: {
    type: string;
    damage?: number;
    damagePercent?: number;
    duration?: number;
    chance: number;
    speedReduction?: number;
    chainCount?: number;
    accuracyReduction?: number;
  };
  passiveEffect?: {
    type: string;
    healPercent?: number;
    perTurn?: boolean;
    damageBonus?: number;
    damageReceived?: number;
    damageReduction?: number;
    allStatsBonus?: number;
  };
  expMultiplier: number;
  goldMultiplier: number;
  dropRateMultiplier: number;
  guaranteedRareDrop?: boolean;
  color: string;
  minLevel: number;
  icon: string;
}

/**
 * Item prefix data structure from JSON
 */
export interface ItemPrefixData {
  id: string;
  name: string;
  namePrefix: string;
  description: string;
  applicableTo: ('weapon' | 'armor')[];
  weaponTypes?: (string | 'all')[];
  armorTypes?: (string | 'all')[];
  statModifiers: Partial<Stats>;
  percentModifiers: Partial<Record<keyof Stats, number>>;
  elementalDamage?: {
    type: string;
    damage: number;
    chance: number;
    bonusVsUndead?: number;
  };
  onHitEffect?: {
    type: string;
    percent?: number;
    value?: number;
    duration?: number;
    chance: number;
    damagePerTurn?: number;
    defenseReduction?: number;
  };
  minRarity: string;
  valueMultiplier: number;
  icon: string;
}

/**
 * Prefix data store
 */
interface PrefixDataStore {
  monsterPrefixes: Record<string, MonsterPrefixData>;
  itemPrefixes: Record<string, ItemPrefixData>;
  prefixRarityWeights: Record<string, {
    noPrefixChance: number;
    prefixWeights: Record<string, number>;
  }>;
  monsterPrefixConfig: {
    baseChance: number;
    bossDropPrefixChance: number;
    eliteDropPrefixChance: number;
    levelScaling: {
      enabled: boolean;
      bonusPerLevel: number;
      maxBonus: number;
    };
    areaRestrictions: Record<string, string[]>;
  };
}

let prefixData: PrefixDataStore | null = null;

/**
 * Load prefix data from JSON
 */
export async function loadPrefixData(): Promise<PrefixDataStore> {
  if (prefixData) {
    return prefixData;
  }

  // In a real environment, this would load from the JSON file
  // For now, we'll use a dynamic import or fetch
  try {
    const response = await fetch('../data/prefixes.json');
    prefixData = await response.json() as PrefixDataStore;
    return prefixData;
  } catch {
    // Return empty data if loading fails
    prefixData = {
      monsterPrefixes: {},
      itemPrefixes: {},
      prefixRarityWeights: {},
      monsterPrefixConfig: {
        baseChance: 0.15,
        bossDropPrefixChance: 0.30,
        eliteDropPrefixChance: 0.25,
        levelScaling: {
          enabled: true,
          bonusPerLevel: 0.005,
          maxBonus: 0.15
        },
        areaRestrictions: {}
      }
    };
    return prefixData;
  }
}

/**
 * Set prefix data directly (for testing or pre-loaded data)
 */
export function setPrefixData(data: PrefixDataStore): void {
  prefixData = data;
}

/**
 * Get all available monster prefixes
 */
export function getMonsterPrefixes(): Record<string, MonsterPrefixData> {
  return prefixData?.monsterPrefixes ?? {};
}

/**
 * Get all available item prefixes
 */
export function getItemPrefixes(): Record<string, ItemPrefixData> {
  return prefixData?.itemPrefixes ?? {};
}

/**
 * Apply a prefix to a monster, modifying its stats and properties
 */
export function applyMonsterPrefix(
  monster: Monster,
  prefixId: string
): Monster {
  const prefixInfo = prefixData?.monsterPrefixes[prefixId];
  if (!prefixInfo) {
    console.warn(`Monster prefix not found: ${prefixId}`);
    return monster;
  }

  // Check minimum level requirement
  if (monster.level < prefixInfo.minLevel) {
    console.warn(`Monster level ${monster.level} is below minimum ${prefixInfo.minLevel} for prefix ${prefixId}`);
    return monster;
  }

  // Create the MonsterPrefix object
  const prefix: MonsterPrefix = {
    id: prefixInfo.id,
    name: prefixInfo.name,
    description: prefixInfo.description,
    statMultipliers: {
      hp: prefixInfo.statMultipliers.hp,
      attack: prefixInfo.statMultipliers.attack,
      defense: prefixInfo.statMultipliers.defense,
      magicPower: prefixInfo.statMultipliers.magicPower,
      magicDefense: prefixInfo.statMultipliers.magicDefense,
      speed: prefixInfo.statMultipliers.speed
    },
    grantedSkills: [],
    expMultiplier: prefixInfo.expMultiplier,
    goldMultiplier: prefixInfo.goldMultiplier,
    color: prefixInfo.color,
    minLevel: prefixInfo.minLevel
  };

  // Apply stat multipliers
  const modifiedStats: Stats = { ...monster.stats };

  if (prefixInfo.statMultipliers.hp) {
    modifiedStats.maxHp = Math.floor(modifiedStats.maxHp * prefixInfo.statMultipliers.hp);
    modifiedStats.hp = modifiedStats.maxHp;
  }
  if (prefixInfo.statMultipliers.attack) {
    modifiedStats.attack = Math.floor(modifiedStats.attack * prefixInfo.statMultipliers.attack);
  }
  if (prefixInfo.statMultipliers.defense) {
    modifiedStats.defense = Math.floor(modifiedStats.defense * prefixInfo.statMultipliers.defense);
  }
  if (prefixInfo.statMultipliers.magicPower) {
    modifiedStats.magicPower = Math.floor(modifiedStats.magicPower * prefixInfo.statMultipliers.magicPower);
  }
  if (prefixInfo.statMultipliers.magicDefense) {
    modifiedStats.magicDefense = Math.floor(modifiedStats.magicDefense * prefixInfo.statMultipliers.magicDefense);
  }
  if (prefixInfo.statMultipliers.speed) {
    modifiedStats.speed = Math.floor(modifiedStats.speed * prefixInfo.statMultipliers.speed);
  }
  if (prefixInfo.statMultipliers.critChance) {
    modifiedStats.critChance = Math.floor(modifiedStats.critChance * prefixInfo.statMultipliers.critChance);
  }
  if (prefixInfo.statMultipliers.evasion) {
    modifiedStats.evasion = Math.floor(modifiedStats.evasion * prefixInfo.statMultipliers.evasion);
  }

  // Apply experience and gold multipliers
  const modifiedExpReward = Math.floor(monster.expReward * prefixInfo.expMultiplier);
  const modifiedGold = {
    minGold: Math.floor(monster.dropTable.minGold * prefixInfo.goldMultiplier),
    maxGold: Math.floor(monster.dropTable.maxGold * prefixInfo.goldMultiplier)
  };

  // Create modified monster
  const modifiedMonster: Monster = {
    ...monster,
    name: `${prefixInfo.namePrefix} ${monster.name}`,
    stats: modifiedStats,
    currentStats: { ...modifiedStats },
    expReward: modifiedExpReward,
    prefix: prefix,
    dropTable: {
      ...monster.dropTable,
      minGold: modifiedGold.minGold,
      maxGold: modifiedGold.maxGold
    }
  };

  return modifiedMonster;
}

/**
 * Apply a prefix to a weapon
 */
export function applyWeaponPrefix(
  weapon: Weapon,
  prefixId: string
): Weapon {
  const prefixInfo = prefixData?.itemPrefixes[prefixId];
  if (!prefixInfo) {
    console.warn(`Item prefix not found: ${prefixId}`);
    return weapon;
  }

  // Check if prefix is applicable to weapons
  if (!prefixInfo.applicableTo.includes('weapon')) {
    console.warn(`Prefix ${prefixId} cannot be applied to weapons`);
    return weapon;
  }

  // Check weapon type restrictions
  if (prefixInfo.weaponTypes && !prefixInfo.weaponTypes.includes('all')) {
    if (!prefixInfo.weaponTypes.includes(weapon.weaponType)) {
      console.warn(`Prefix ${prefixId} cannot be applied to weapon type ${weapon.weaponType}`);
      return weapon;
    }
  }

  // Check rarity requirement
  const rarityOrder = ['common', 'uncommon', 'rare', 'epic', 'legendary', 'mythic'];
  const minRarityIndex = rarityOrder.indexOf(prefixInfo.minRarity);
  const weaponRarityIndex = rarityOrder.indexOf(weapon.rarity);
  if (weaponRarityIndex < minRarityIndex) {
    console.warn(`Weapon rarity ${weapon.rarity} is below minimum ${prefixInfo.minRarity} for prefix ${prefixId}`);
    return weapon;
  }

  // Create the ItemPrefix object
  const prefix: ItemPrefix = {
    id: prefixInfo.id,
    name: prefixInfo.name,
    description: prefixInfo.description,
    statModifiers: prefixInfo.statModifiers,
    minRarity: prefixInfo.minRarity as ItemRarity,
    valueMultiplier: prefixInfo.valueMultiplier
  };

  // Apply stat modifiers
  const modifiedStatBonuses: Partial<Stats> = { ...weapon.statBonuses };

  for (const [stat, value] of Object.entries(prefixInfo.statModifiers)) {
    const statKey = stat as keyof Stats;
    const currentValue = modifiedStatBonuses[statKey] ?? 0;
    modifiedStatBonuses[statKey] = currentValue + (value as number);
  }

  // Apply attack power bonus if present
  let modifiedAttackPower = weapon.attackPower;
  if (prefixInfo.statModifiers.attack) {
    modifiedAttackPower += prefixInfo.statModifiers.attack;
  }

  // Apply crit bonuses if present
  let modifiedCritChance = weapon.critChanceBonus;
  let modifiedCritDamage = weapon.critDamageBonus;
  if (prefixInfo.statModifiers.critChance) {
    modifiedCritChance += prefixInfo.statModifiers.critChance;
  }
  if (prefixInfo.statModifiers.critDamage) {
    modifiedCritDamage += prefixInfo.statModifiers.critDamage;
  }

  // Apply elemental damage if prefix has it
  let modifiedElement = weapon.element;
  let modifiedElementalDamage = weapon.elementalDamage;
  if (prefixInfo.elementalDamage) {
    modifiedElement = prefixInfo.elementalDamage.type as ElementType;
    modifiedElementalDamage = (weapon.elementalDamage || 0) + prefixInfo.elementalDamage.damage;
  }

  // Calculate modified value
  const modifiedValue = Math.floor(weapon.value * prefixInfo.valueMultiplier);

  // Create modified weapon
  const modifiedWeapon: Weapon = {
    ...weapon,
    name: `${prefixInfo.namePrefix} ${weapon.name}`,
    attackPower: modifiedAttackPower,
    critChanceBonus: modifiedCritChance,
    critDamageBonus: modifiedCritDamage,
    element: modifiedElement,
    elementalDamage: modifiedElementalDamage,
    statBonuses: modifiedStatBonuses,
    value: modifiedValue,
    prefix: prefix
  };

  return modifiedWeapon;
}

/**
 * Apply a prefix to armor
 */
export function applyArmorPrefix(
  armor: Armor,
  prefixId: string
): Armor {
  const prefixInfo = prefixData?.itemPrefixes[prefixId];
  if (!prefixInfo) {
    console.warn(`Item prefix not found: ${prefixId}`);
    return armor;
  }

  // Check if prefix is applicable to armor
  if (!prefixInfo.applicableTo.includes('armor')) {
    console.warn(`Prefix ${prefixId} cannot be applied to armor`);
    return armor;
  }

  // Check armor type restrictions
  if (prefixInfo.armorTypes && !prefixInfo.armorTypes.includes('all')) {
    if (!prefixInfo.armorTypes.includes(armor.armorType)) {
      console.warn(`Prefix ${prefixId} cannot be applied to armor type ${armor.armorType}`);
      return armor;
    }
  }

  // Check rarity requirement
  const rarityOrder = ['common', 'uncommon', 'rare', 'epic', 'legendary', 'mythic'];
  const minRarityIndex = rarityOrder.indexOf(prefixInfo.minRarity);
  const armorRarityIndex = rarityOrder.indexOf(armor.rarity);
  if (armorRarityIndex < minRarityIndex) {
    console.warn(`Armor rarity ${armor.rarity} is below minimum ${prefixInfo.minRarity} for prefix ${prefixId}`);
    return armor;
  }

  // Create the ItemPrefix object
  const prefix: ItemPrefix = {
    id: prefixInfo.id,
    name: prefixInfo.name,
    description: prefixInfo.description,
    statModifiers: prefixInfo.statModifiers,
    minRarity: prefixInfo.minRarity as ItemRarity,
    valueMultiplier: prefixInfo.valueMultiplier
  };

  // Apply stat modifiers
  const modifiedStatBonuses: Partial<Stats> = { ...armor.statBonuses };

  for (const [stat, value] of Object.entries(prefixInfo.statModifiers)) {
    const statKey = stat as keyof Stats;
    const currentValue = modifiedStatBonuses[statKey] ?? 0;
    modifiedStatBonuses[statKey] = currentValue + (value as number);
  }

  // Apply defense bonuses if present
  let modifiedDefense = armor.defense;
  let modifiedMagicDefense = armor.magicDefense;
  if (prefixInfo.statModifiers.defense) {
    modifiedDefense += prefixInfo.statModifiers.defense;
  }
  if (prefixInfo.statModifiers.magicDefense) {
    modifiedMagicDefense += prefixInfo.statModifiers.magicDefense;
  }

  // Calculate modified value
  const modifiedValue = Math.floor(armor.value * prefixInfo.valueMultiplier);

  // Create modified armor
  const modifiedArmor: Armor = {
    ...armor,
    name: `${prefixInfo.namePrefix} ${armor.name}`,
    defense: modifiedDefense,
    magicDefense: modifiedMagicDefense,
    statBonuses: modifiedStatBonuses,
    value: modifiedValue,
    prefix: prefix
  };

  return modifiedArmor;
}

/**
 * Apply a prefix to any item (weapon or armor)
 */
export function applyItemPrefix(
  item: AnyItem,
  prefixId: string
): AnyItem {
  if (item.type === ItemType.Weapon) {
    return applyWeaponPrefix(item as Weapon, prefixId);
  } else if (item.type === ItemType.Armor) {
    return applyArmorPrefix(item as Armor, prefixId);
  }

  console.warn(`Prefixes cannot be applied to item type: ${item.type}`);
  return item;
}

/**
 * Get a random prefix for a monster based on level and area
 */
export function getRandomMonsterPrefix(
  monsterLevel: number,
  areaId?: string
): string | null {
  if (!prefixData) {
    return null;
  }

  const config = prefixData.monsterPrefixConfig;

  // Calculate spawn chance with level scaling
  let spawnChance = config.baseChance;
  if (config.levelScaling.enabled) {
    const levelBonus = Math.min(
      monsterLevel * config.levelScaling.bonusPerLevel,
      config.levelScaling.maxBonus
    );
    spawnChance += levelBonus;
  }

  // Check if prefix should spawn
  if (Math.random() > spawnChance) {
    return null;
  }

  // Get available prefixes for this level and area
  const availablePrefixes: string[] = [];

  for (const [prefixId, prefixInfo] of Object.entries(prefixData.monsterPrefixes)) {
    // Check level requirement
    if (monsterLevel < prefixInfo.minLevel) {
      continue;
    }

    // Check area restriction
    const areaRestriction = config.areaRestrictions[prefixId];
    if (areaRestriction && areaId) {
      if (!areaRestriction.includes('all') && !areaRestriction.includes(areaId)) {
        continue;
      }
    }

    availablePrefixes.push(prefixId);
  }

  if (availablePrefixes.length === 0) {
    return null;
  }

  // Return random prefix
  const randomIndex = Math.floor(Math.random() * availablePrefixes.length);
  return availablePrefixes[randomIndex];
}

/**
 * Get a random prefix for an item based on rarity and type
 */
export function getRandomItemPrefix(
  itemType: 'weapon' | 'armor',
  itemRarity: ItemRarity,
  weaponType?: WeaponType,
  armorType?: ArmorType
): string | null {
  if (!prefixData) {
    return null;
  }

  const rarityWeights = prefixData.prefixRarityWeights[itemRarity];
  if (!rarityWeights) {
    return null;
  }

  // Check if item should have no prefix
  if (Math.random() < rarityWeights.noPrefixChance) {
    return null;
  }

  // Get available prefixes for this item
  const availablePrefixes: { id: string; weight: number }[] = [];

  for (const [prefixId, weight] of Object.entries(rarityWeights.prefixWeights)) {
    const prefixInfo = prefixData.itemPrefixes[prefixId];
    if (!prefixInfo) {
      continue;
    }

    // Check if prefix is applicable to item type
    if (!prefixInfo.applicableTo.includes(itemType)) {
      continue;
    }

    // Check weapon type restrictions
    if (itemType === 'weapon' && weaponType && prefixInfo.weaponTypes) {
      if (!prefixInfo.weaponTypes.includes('all') && !prefixInfo.weaponTypes.includes(weaponType)) {
        continue;
      }
    }

    // Check armor type restrictions
    if (itemType === 'armor' && armorType && prefixInfo.armorTypes) {
      if (!prefixInfo.armorTypes.includes('all') && !prefixInfo.armorTypes.includes(armorType)) {
        continue;
      }
    }

    availablePrefixes.push({ id: prefixId, weight });
  }

  if (availablePrefixes.length === 0) {
    return null;
  }

  // Weighted random selection
  const totalWeight = availablePrefixes.reduce((sum, p) => sum + p.weight, 0);
  let random = Math.random() * totalWeight;

  for (const prefix of availablePrefixes) {
    random -= prefix.weight;
    if (random <= 0) {
      return prefix.id;
    }
  }

  return availablePrefixes[availablePrefixes.length - 1].id;
}

/**
 * Calculate total bonus from a prefix
 */
export function calculatePrefixBonus(
  baseValue: number,
  prefix: MonsterPrefixData | ItemPrefixData,
  statKey: string
): number {
  // For monster prefixes, use multipliers
  if ('statMultipliers' in prefix && prefix.statMultipliers) {
    const multiplier = (prefix.statMultipliers as Record<string, number>)[statKey];
    if (multiplier !== undefined) {
      return Math.floor(baseValue * multiplier) - baseValue;
    }
  }

  // For item prefixes, use additive modifiers
  if ('statModifiers' in prefix && prefix.statModifiers) {
    const modifier = (prefix.statModifiers as Record<string, number>)[statKey];
    if (modifier !== undefined) {
      return modifier;
    }
  }

  return 0;
}

/**
 * Check if a monster should receive a prefix during spawning
 */
export function shouldMonsterHavePrefix(
  monsterLevel: number,
  _areaId?: string
): boolean {
  if (!prefixData) {
    return false;
  }

  const config = prefixData.monsterPrefixConfig;

  // Calculate spawn chance with level scaling
  let spawnChance = config.baseChance;
  if (config.levelScaling.enabled) {
    const levelBonus = Math.min(
      monsterLevel * config.levelScaling.bonusPerLevel,
      config.levelScaling.maxBonus
    );
    spawnChance += levelBonus;
  }

  return Math.random() < spawnChance;
}

/**
 * Get prefix chance for boss drops
 */
export function getBossDropPrefixChance(): number {
  return prefixData?.monsterPrefixConfig.bossDropPrefixChance ?? 0.30;
}

/**
 * Get prefix chance for elite monster drops
 */
export function getEliteDropPrefixChance(): number {
  return prefixData?.monsterPrefixConfig.eliteDropPrefixChance ?? 0.25;
}

/**
 * Get display name with prefix (formatted)
 */
export function getDisplayNameWithPrefix(
  baseName: string,
  prefixId: string,
  type: 'monster' | 'item'
): string {
  if (!prefixData) {
    return baseName;
  }

  const prefixInfo = type === 'monster'
    ? prefixData.monsterPrefixes[prefixId]
    : prefixData.itemPrefixes[prefixId];

  if (!prefixInfo) {
    return baseName;
  }

  return `${prefixInfo.namePrefix} ${baseName}`;
}

/**
 * Get prefix color for display
 */
export function getPrefixColor(prefixId: string, type: 'monster' | 'item'): string {
  if (!prefixData) {
    return '#FFFFFF';
  }

  if (type === 'monster') {
    const prefixInfo = prefixData.monsterPrefixes[prefixId];
    return prefixInfo?.color ?? '#FFFFFF';
  }

  // Item prefixes don't have colors in the current data, return white
  return '#FFFFFF';
}

/**
 * Get prefix icon
 */
export function getPrefixIcon(prefixId: string, type: 'monster' | 'item'): string {
  if (!prefixData) {
    return '';
  }

  const prefixInfo = type === 'monster'
    ? prefixData.monsterPrefixes[prefixId]
    : prefixData.itemPrefixes[prefixId];

  return prefixInfo?.icon ?? '';
}
