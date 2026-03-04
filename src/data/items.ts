/**
 * Sample item data for Terminal Quest
 */

import {
  Weapon,
  Armor,
  Consumable,
  Material,
  ItemType,
  ItemRarity,
  WeaponType,
  ArmorType,
  ElementType,
  AnyItem
} from '../types/item.js';
import { readFileSync } from 'fs';
import { join } from 'path';
import { getSampleMonsters } from './monsters.js';

interface MonsterDropItemRef {
  id: string;
}

interface MonsterDropData {
  items?: MonsterDropItemRef[];
}

interface MonsterDataEntry {
  drops?: MonsterDropData;
}

interface MonsterRegionData {
  monsters?: MonsterDataEntry[];
}

interface MonsterDataFile {
  regions?: Record<string, MonsterRegionData>;
}

interface ShopEntry {
  inventory?: Record<string, string[]>;
}

interface ShopDataFile {
  shops?: Record<string, ShopEntry>;
}

let itemCache: Record<string, AnyItem> | null = null;

function formatNameFromId(itemId: string): string {
  return itemId
    .split('-')
    .map(token => token.charAt(0).toUpperCase() + token.slice(1))
    .join(' ');
}

function pickGeneratedRarity(itemId: string): ItemRarity {
  if (/(crown|blade|sword|shield|ring|core|dragon|tyrant|guardian)/.test(itemId)) {
    return ItemRarity.Rare;
  }
  if (/(gem|crystal|essence|logic|algorithm|cache|memory)/.test(itemId)) {
    return ItemRarity.Uncommon;
  }
  return ItemRarity.Common;
}

function pickGeneratedIcon(itemId: string): string {
  if (itemId.includes('ring')) return '💍';
  if (itemId.includes('core')) return '🔋';
  if (itemId.includes('crystal') || itemId.includes('gem')) return '💎';
  if (itemId.includes('blade') || itemId.includes('sword')) return '⚔️';
  if (itemId.includes('shield')) return '🛡️';
  return '📦';
}

function collectReferencedItemIds(): string[] {
  const ids = new Set<string>();

  for (const monster of Object.values(getSampleMonsters())) {
    for (const group of ['guaranteed', 'possible', 'rare'] as const) {
      for (const drop of monster.dropTable[group]) {
        ids.add(drop.itemId);
      }
    }
  }

  try {
    const monsterDataPath = join(process.cwd(), 'data', 'monsters.json');
    const monsterRaw = readFileSync(monsterDataPath, 'utf-8');
    const monsterData = JSON.parse(monsterRaw) as MonsterDataFile;

    for (const region of Object.values(monsterData.regions ?? {})) {
      for (const monster of region.monsters ?? []) {
        for (const item of monster.drops?.items ?? []) {
          if (item.id) ids.add(item.id);
        }
      }
    }
  } catch {
    // Ignore fallback failures and use static data only
  }

  try {
    const shopDataPath = join(process.cwd(), 'data', 'shops.json');
    const shopRaw = readFileSync(shopDataPath, 'utf-8');
    const shopData = JSON.parse(shopRaw) as ShopDataFile;

    for (const shop of Object.values(shopData.shops ?? {})) {
      for (const tierIds of Object.values(shop.inventory ?? {})) {
        for (const itemId of tierIds) {
          ids.add(itemId);
        }
      }
    }
  } catch {
    // Ignore fallback failures and use static data only
  }

  return Array.from(ids);
}

function createGeneratedDropItem(itemId: string): Material {
  const rarity = pickGeneratedRarity(itemId);

  return {
    id: itemId,
    name: formatNameFromId(itemId),
    description: `Recovered material from fallen enemies: ${formatNameFromId(itemId)}.`,
    type: ItemType.Material,
    rarity,
    value: rarity === ItemRarity.Rare ? 120 : rarity === ItemRarity.Uncommon ? 60 : 25,
    sellable: true,
    stackable: true,
    maxStack: 99,
    requiredLevel: 1,
    category: 'misc',
    icon: pickGeneratedIcon(itemId)
  };
}

/**
 * Get sample items database
 */
export function getSampleItems(): Record<string, AnyItem> {
  if (itemCache) {
    return itemCache;
  }

  const items: Record<string, AnyItem> = {
    // Weapons
    'rusty-sword': {
      id: 'rusty-sword',
      name: 'Rusty Sword',
      description: 'An old, worn sword that has seen better days',
      type: ItemType.Weapon,
      weaponType: WeaponType.Sword,
      rarity: ItemRarity.Common,
      value: 50,
      sellable: true,
      stackable: false,
      maxStack: 1,
      requiredLevel: 1,
      attackPower: 8,
      element: ElementType.Physical,
      elementalDamage: 0,
      critChanceBonus: 0,
      critDamageBonus: 0,
      statBonuses: {},
      range: 1,
      twoHanded: false,
      icon: '⚔️'
    } as Weapon,

    'compiler-blade': {
      id: 'compiler-blade',
      name: 'Compiler Blade',
      description: 'A blade forged from pure syntax, optimizes damage output',
      type: ItemType.Weapon,
      weaponType: WeaponType.Sword,
      rarity: ItemRarity.Uncommon,
      value: 250,
      sellable: true,
      stackable: false,
      maxStack: 1,
      requiredLevel: 3,
      attackPower: 25,
      element: ElementType.Physical,
      elementalDamage: 0,
      critChanceBonus: 5,
      critDamageBonus: 0.2,
      statBonuses: { attack: 3 },
      range: 1,
      twoHanded: false,
      icon: '⚔️'
    } as Weapon,

    'flaming-parser-sword': {
      id: 'flaming-parser-sword',
      name: 'Flaming Parser Sword',
      description: 'Burns through syntax errors and enemies alike',
      type: ItemType.Weapon,
      weaponType: WeaponType.Sword,
      rarity: ItemRarity.Rare,
      value: 500,
      sellable: true,
      stackable: false,
      maxStack: 1,
      requiredLevel: 5,
      attackPower: 28,
      element: ElementType.Fire,
      elementalDamage: 12,
      critChanceBonus: 8,
      critDamageBonus: 0.3,
      statBonuses: { attack: 5, magicPower: 3 },
      range: 1,
      twoHanded: false,
      icon: '⚔️'
    } as Weapon,

    'debugger-staff': {
      id: 'debugger-staff',
      name: 'Debugger Staff',
      description: 'Points out all the flaws in your enemies',
      type: ItemType.Weapon,
      weaponType: WeaponType.Staff,
      rarity: ItemRarity.Uncommon,
      value: 300,
      sellable: true,
      stackable: false,
      maxStack: 1,
      requiredLevel: 3,
      attackPower: 12,
      element: ElementType.Physical,
      elementalDamage: 0,
      critChanceBonus: 3,
      critDamageBonus: 0.1,
      statBonuses: { magicPower: 15, maxMp: 20 },
      range: 1,
      twoHanded: true,
      icon: '🪄'
    } as Weapon,

    'rusty-dagger': {
      id: 'rusty-dagger',
      name: 'Rusty Dagger',
      description: 'A small, worn dagger',
      type: ItemType.Weapon,
      weaponType: WeaponType.Dagger,
      rarity: ItemRarity.Common,
      value: 30,
      sellable: true,
      stackable: false,
      maxStack: 1,
      requiredLevel: 1,
      attackPower: 6,
      element: ElementType.Physical,
      elementalDamage: 0,
      critChanceBonus: 10,
      critDamageBonus: 0.5,
      statBonuses: { speed: 2 },
      range: 1,
      twoHanded: false,
      icon: '🗡️'
    } as Weapon,

    // Additional Swords
    'parser-sword': {
      id: 'parser-sword',
      name: '파서 소드 (Parser Sword)',
      description: 'Analyzes enemy weaknesses before striking',
      type: ItemType.Weapon,
      weaponType: WeaponType.Sword,
      rarity: ItemRarity.Uncommon,
      value: 400,
      sellable: true,
      stackable: false,
      maxStack: 1,
      requiredLevel: 5,
      attackPower: 32,
      element: ElementType.Physical,
      elementalDamage: 0,
      critChanceBonus: 6,
      critDamageBonus: 0.25,
      statBonuses: { attack: 4 },
      range: 1,
      twoHanded: false,
      icon: '⚔️'
    } as Weapon,

    'algorithm-katana': {
      id: 'algorithm-katana',
      name: '알고리즘 카타나 (Algorithm Katana)',
      description: 'Executes attacks with algorithmic precision',
      type: ItemType.Weapon,
      weaponType: WeaponType.Sword,
      rarity: ItemRarity.Rare,
      value: 800,
      sellable: true,
      stackable: false,
      maxStack: 1,
      requiredLevel: 10,
      attackPower: 48,
      element: ElementType.Physical,
      elementalDamage: 0,
      critChanceBonus: 12,
      critDamageBonus: 0.5,
      statBonuses: { attack: 6, speed: 3 },
      range: 1,
      twoHanded: false,
      icon: '⚔️'
    } as Weapon,

    'recursive-blade': {
      id: 'recursive-blade',
      name: '재귀 블레이드 (Recursive Blade)',
      description: 'A blade that calls upon itself for maximum power',
      type: ItemType.Weapon,
      weaponType: WeaponType.Sword,
      rarity: ItemRarity.Rare,
      value: 1500,
      sellable: true,
      stackable: false,
      maxStack: 1,
      requiredLevel: 15,
      attackPower: 65,
      element: ElementType.Physical,
      elementalDamage: 0,
      critChanceBonus: 15,
      critDamageBonus: 0.6,
      statBonuses: { attack: 8, magicPower: 5 },
      range: 1,
      twoHanded: false,
      icon: '⚔️'
    } as Weapon,

    // Blunt Weapons
    'debug-hammer': {
      id: 'debug-hammer',
      name: '디버그 해머 (Debug Hammer)',
      description: 'Smashes bugs with brutal efficiency',
      type: ItemType.Weapon,
      weaponType: WeaponType.Mace,
      rarity: ItemRarity.Common,
      value: 120,
      sellable: true,
      stackable: false,
      maxStack: 1,
      requiredLevel: 2,
      attackPower: 15,
      element: ElementType.Physical,
      elementalDamage: 0,
      critChanceBonus: 2,
      critDamageBonus: 0.3,
      statBonuses: { defense: 2 },
      range: 1,
      twoHanded: false,
      icon: '🔨'
    } as Weapon,

    'refactor-mace': {
      id: 'refactor-mace',
      name: '리팩터 메이스 (Refactor Mace)',
      description: 'Restructures enemy defenses with each blow',
      type: ItemType.Weapon,
      weaponType: WeaponType.Mace,
      rarity: ItemRarity.Uncommon,
      value: 600,
      sellable: true,
      stackable: false,
      maxStack: 1,
      requiredLevel: 7,
      attackPower: 40,
      element: ElementType.Physical,
      elementalDamage: 0,
      critChanceBonus: 5,
      critDamageBonus: 0.4,
      statBonuses: { defense: 4, maxHp: 20 },
      range: 1,
      twoHanded: false,
      icon: '🔨'
    } as Weapon,

    'optimize-maul': {
      id: 'optimize-maul',
      name: '최적화 몰 (Optimize Maul)',
      description: 'Maximizes impact through perfect weight distribution',
      type: ItemType.Weapon,
      weaponType: WeaponType.Mace,
      rarity: ItemRarity.Rare,
      value: 1200,
      sellable: true,
      stackable: false,
      maxStack: 1,
      requiredLevel: 12,
      attackPower: 58,
      element: ElementType.Physical,
      elementalDamage: 0,
      critChanceBonus: 8,
      critDamageBonus: 0.5,
      statBonuses: { defense: 6, maxHp: 35 },
      range: 1,
      twoHanded: true,
      icon: '🔨'
    } as Weapon,

    // Ranged Weapons
    'pointer-bow': {
      id: 'pointer-bow',
      name: '포인터 보우 (Pointer Bow)',
      description: 'Points to targets with precision',
      type: ItemType.Weapon,
      weaponType: WeaponType.Bow,
      rarity: ItemRarity.Common,
      value: 200,
      sellable: true,
      stackable: false,
      maxStack: 1,
      requiredLevel: 3,
      attackPower: 18,
      element: ElementType.Physical,
      elementalDamage: 0,
      critChanceBonus: 10,
      critDamageBonus: 0.4,
      statBonuses: { speed: 2 },
      range: 3,
      twoHanded: true,
      icon: '🏹'
    } as Weapon,

    'array-crossbow': {
      id: 'array-crossbow',
      name: '배열 석궁 (Array Crossbow)',
      description: 'Fires bolts in indexed sequences',
      type: ItemType.Weapon,
      weaponType: WeaponType.Bow,
      rarity: ItemRarity.Uncommon,
      value: 700,
      sellable: true,
      stackable: false,
      maxStack: 1,
      requiredLevel: 8,
      attackPower: 42,
      element: ElementType.Physical,
      elementalDamage: 0,
      critChanceBonus: 14,
      critDamageBonus: 0.6,
      statBonuses: { speed: 4, critChance: 5 },
      range: 4,
      twoHanded: true,
      icon: '🏹'
    } as Weapon,

    'function-longbow': {
      id: 'function-longbow',
      name: '함수 장궁 (Function Longbow)',
      description: 'Executes perfect shots through mathematical calculation',
      type: ItemType.Weapon,
      weaponType: WeaponType.Bow,
      rarity: ItemRarity.Rare,
      value: 1400,
      sellable: true,
      stackable: false,
      maxStack: 1,
      requiredLevel: 13,
      attackPower: 60,
      element: ElementType.Physical,
      elementalDamage: 0,
      critChanceBonus: 18,
      critDamageBonus: 0.8,
      statBonuses: { speed: 6, critChance: 8 },
      range: 5,
      twoHanded: true,
      icon: '🏹'
    } as Weapon,

    // Additional Magic Weapons
    'variable-wand': {
      id: 'variable-wand',
      name: '변수 완드 (Variable Wand)',
      description: 'Stores magical energy in flexible variables',
      type: ItemType.Weapon,
      weaponType: WeaponType.Wand,
      rarity: ItemRarity.Common,
      value: 150,
      sellable: true,
      stackable: false,
      maxStack: 1,
      requiredLevel: 2,
      attackPower: 8,
      element: ElementType.Physical,
      elementalDamage: 0,
      critChanceBonus: 5,
      critDamageBonus: 0.1,
      statBonuses: { magicPower: 10, maxMp: 15 },
      range: 2,
      twoHanded: false,
      icon: '🪄'
    } as Weapon,

    'recursion-staff': {
      id: 'recursion-staff',
      name: '재귀 스태프 (Recursion Staff)',
      description: 'Amplifies spells through recursive casting',
      type: ItemType.Weapon,
      weaponType: WeaponType.Staff,
      rarity: ItemRarity.Rare,
      value: 900,
      sellable: true,
      stackable: false,
      maxStack: 1,
      requiredLevel: 9,
      attackPower: 20,
      element: ElementType.Physical,
      elementalDamage: 0,
      critChanceBonus: 8,
      critDamageBonus: 0.2,
      statBonuses: { magicPower: 35, maxMp: 40, magicDefense: 5 },
      range: 2,
      twoHanded: true,
      icon: '🪄'
    } as Weapon,

    'lambda-scepter': {
      id: 'lambda-scepter',
      name: '람다 셉터 (Lambda Scepter)',
      description: 'Channels pure functional magic',
      type: ItemType.Weapon,
      weaponType: WeaponType.Wand,
      rarity: ItemRarity.Rare,
      value: 1600,
      sellable: true,
      stackable: false,
      maxStack: 1,
      requiredLevel: 14,
      attackPower: 28,
      element: ElementType.Physical,
      elementalDamage: 0,
      critChanceBonus: 12,
      critDamageBonus: 0.3,
      statBonuses: { magicPower: 50, maxMp: 60 },
      range: 2,
      twoHanded: false,
      icon: '🪄'
    } as Weapon,

    'quantum-edge': {
      id: 'quantum-edge',
      name: '퀀텀 엣지 (Quantum Edge)',
      description: 'Slices through timelines with deterministic precision',
      type: ItemType.Weapon,
      weaponType: WeaponType.Sword,
      rarity: ItemRarity.Epic,
      value: 2600,
      sellable: true,
      stackable: false,
      maxStack: 1,
      requiredLevel: 22,
      attackPower: 88,
      element: ElementType.Lightning,
      elementalDamage: 28,
      critChanceBonus: 20,
      critDamageBonus: 1.0,
      statBonuses: { attack: 14, speed: 8, critChance: 6 },
      range: 1,
      twoHanded: false,
      icon: '⚡'
    } as Weapon,

    'nullspace-reaver': {
      id: 'nullspace-reaver',
      name: '널스페이스 리버 (Nullspace Reaver)',
      description: 'Collapses enemy defenses into nothingness',
      type: ItemType.Weapon,
      weaponType: WeaponType.Mace,
      rarity: ItemRarity.Epic,
      value: 3200,
      sellable: true,
      stackable: false,
      maxStack: 1,
      requiredLevel: 26,
      attackPower: 106,
      element: ElementType.Dark,
      elementalDamage: 30,
      critChanceBonus: 14,
      critDamageBonus: 1.1,
      statBonuses: { attack: 18, defense: 10, maxHp: 70 },
      range: 1,
      twoHanded: true,
      icon: '🔨'
    } as Weapon,

    'singularity-bow': {
      id: 'singularity-bow',
      name: '싱귤래리티 보우 (Singularity Bow)',
      description: 'Compresses all trajectories into one lethal point',
      type: ItemType.Weapon,
      weaponType: WeaponType.Bow,
      rarity: ItemRarity.Legendary,
      value: 4300,
      sellable: true,
      stackable: false,
      maxStack: 1,
      requiredLevel: 29,
      attackPower: 124,
      element: ElementType.Light,
      elementalDamage: 36,
      critChanceBonus: 24,
      critDamageBonus: 1.4,
      statBonuses: { attack: 20, speed: 12, critChance: 10, evasion: 8 },
      range: 6,
      twoHanded: true,
      icon: '🏹'
    } as Weapon,

    // Armor
    'leather-armor': {
      id: 'leather-armor',
      name: 'Leather Armor',
      description: 'Basic protection made from tanned hide',
      type: ItemType.Armor,
      armorType: ArmorType.Chest,
      rarity: ItemRarity.Common,
      value: 80,
      sellable: true,
      stackable: false,
      maxStack: 1,
      requiredLevel: 1,
      defense: 8,
      magicDefense: 4,
      resistances: {},
      statBonuses: {},
      icon: '🦺'
    } as Armor,

    'firewall-armor': {
      id: 'firewall-armor',
      name: 'Firewall Armor',
      description: 'Protective gear that blocks both attacks and unauthorized access',
      type: ItemType.Armor,
      armorType: ArmorType.Chest,
      rarity: ItemRarity.Rare,
      value: 600,
      sellable: true,
      stackable: false,
      maxStack: 1,
      requiredLevel: 5,
      defense: 24,
      magicDefense: 18,
      resistances: {
        [ElementType.Fire]: 0.3,
        [ElementType.Dark]: 0.2
      },
      statBonuses: { maxHp: 30, defense: 5 },
      icon: '🛡️'
    } as Armor,

    'iron-helmet': {
      id: 'iron-helmet',
      name: 'Iron Helmet',
      description: 'A sturdy helmet made of iron',
      type: ItemType.Armor,
      armorType: ArmorType.Helmet,
      rarity: ItemRarity.Common,
      value: 100,
      sellable: true,
      stackable: false,
      maxStack: 1,
      requiredLevel: 2,
      defense: 6,
      magicDefense: 3,
      resistances: {},
      statBonuses: { maxHp: 10 },
      icon: '⛑️'
    } as Armor,

    'encryption-gloves': {
      id: 'encryption-gloves',
      name: 'Encryption Gloves',
      description: 'Gloves that scramble your attack patterns',
      type: ItemType.Armor,
      armorType: ArmorType.Gloves,
      rarity: ItemRarity.Uncommon,
      value: 180,
      sellable: true,
      stackable: false,
      maxStack: 1,
      requiredLevel: 3,
      defense: 4,
      magicDefense: 6,
      resistances: {},
      statBonuses: { attack: 3, critChance: 5 },
      icon: '🧤'
    } as Armor,

    'stealth-boots': {
      id: 'stealth-boots',
      name: 'Stealth Boots',
      description: 'Boots that muffle your footsteps',
      type: ItemType.Armor,
      armorType: ArmorType.Boots,
      rarity: ItemRarity.Uncommon,
      value: 150,
      sellable: true,
      stackable: false,
      maxStack: 1,
      requiredLevel: 2,
      defense: 3,
      magicDefense: 3,
      resistances: {},
      statBonuses: { speed: 5, evasion: 8 },
      icon: '👢'
    } as Armor,

    // Additional Helmets
    'bit-helmet': {
      id: 'bit-helmet',
      name: '비트 헬멧 (Bit Helmet)',
      description: 'Basic protection for your data core',
      type: ItemType.Armor,
      armorType: ArmorType.Helmet,
      rarity: ItemRarity.Common,
      value: 80,
      sellable: true,
      stackable: false,
      maxStack: 1,
      requiredLevel: 1,
      defense: 4,
      magicDefense: 2,
      resistances: {},
      statBonuses: { maxHp: 5 },
      icon: '⛑️'
    } as Armor,

    'cache-helm': {
      id: 'cache-helm',
      name: '캐시 투구 (Cache Helm)',
      description: 'Stores defensive data for quick access',
      type: ItemType.Armor,
      armorType: ArmorType.Helmet,
      rarity: ItemRarity.Uncommon,
      value: 500,
      sellable: true,
      stackable: false,
      maxStack: 1,
      requiredLevel: 6,
      defense: 12,
      magicDefense: 8,
      resistances: {},
      statBonuses: { maxHp: 20, defense: 3 },
      icon: '⛑️'
    } as Armor,

    'firewall-crown': {
      id: 'firewall-crown',
      name: '방화벽 왕관 (Firewall Crown)',
      description: 'Blocks both physical and magical attacks',
      type: ItemType.Armor,
      armorType: ArmorType.Helmet,
      rarity: ItemRarity.Rare,
      value: 1200,
      sellable: true,
      stackable: false,
      maxStack: 1,
      requiredLevel: 12,
      defense: 20,
      magicDefense: 15,
      resistances: {
        [ElementType.Fire]: 0.2
      },
      statBonuses: { maxHp: 40, defense: 6, magicDefense: 4 },
      icon: '👑'
    } as Armor,

    // Additional Chest Armor
    'byte-chainmail': {
      id: 'byte-chainmail',
      name: '바이트 체인메일 (Byte Chainmail)',
      description: 'Interlocking bytes provide flexible protection',
      type: ItemType.Armor,
      armorType: ArmorType.Chest,
      rarity: ItemRarity.Uncommon,
      value: 400,
      sellable: true,
      stackable: false,
      maxStack: 1,
      requiredLevel: 5,
      defense: 16,
      magicDefense: 10,
      resistances: {},
      statBonuses: { maxHp: 25, defense: 4 },
      icon: '🦺'
    } as Armor,

    'encryption-plate': {
      id: 'encryption-plate',
      name: '암호화 판금 (Encryption Plate)',
      description: 'Military-grade encryption protects against all damage',
      type: ItemType.Armor,
      armorType: ArmorType.Chest,
      rarity: ItemRarity.Rare,
      value: 1800,
      sellable: true,
      stackable: false,
      maxStack: 1,
      requiredLevel: 15,
      defense: 32,
      magicDefense: 24,
      resistances: {
        [ElementType.Physical]: 0.15,
        [ElementType.Fire]: 0.15,
        [ElementType.Ice]: 0.15,
        [ElementType.Lightning]: 0.15
      },
      statBonuses: { maxHp: 50, defense: 8, magicDefense: 6 },
      icon: '🛡️'
    } as Armor,

    // Additional Gloves
    'pointer-gloves': {
      id: 'pointer-gloves',
      name: '포인터 장갑 (Pointer Gloves)',
      description: 'Points to weak spots with precision',
      type: ItemType.Armor,
      armorType: ArmorType.Gloves,
      rarity: ItemRarity.Common,
      value: 100,
      sellable: true,
      stackable: false,
      maxStack: 1,
      requiredLevel: 2,
      defense: 3,
      magicDefense: 2,
      resistances: {},
      statBonuses: { attack: 2, critChance: 3 },
      icon: '🧤'
    } as Armor,

    'cloth-gloves': {
      id: 'cloth-gloves',
      name: '천 장갑 (Cloth Gloves)',
      description: 'Light gloves that slightly improve casting stability',
      type: ItemType.Armor,
      armorType: ArmorType.Gloves,
      rarity: ItemRarity.Common,
      value: 70,
      sellable: true,
      stackable: false,
      maxStack: 1,
      requiredLevel: 1,
      defense: 2,
      magicDefense: 3,
      resistances: {},
      statBonuses: { magicPower: 1 },
      icon: '🧤'
    } as Armor,

    // Additional Boots
    'leather-boots': {
      id: 'leather-boots',
      name: '가죽 부츠 (Leather Boots)',
      description: 'Basic boots made from treated leather',
      type: ItemType.Armor,
      armorType: ArmorType.Boots,
      rarity: ItemRarity.Common,
      value: 75,
      sellable: true,
      stackable: false,
      maxStack: 1,
      requiredLevel: 1,
      defense: 2,
      magicDefense: 1,
      resistances: {},
      statBonuses: { speed: 1 },
      icon: '👢'
    } as Armor,

    'speedrun-boots': {
      id: 'speedrun-boots',
      name: '스피드런 부츠 (Speedrun Boots)',
      description: 'Optimized for maximum efficiency',
      type: ItemType.Armor,
      armorType: ArmorType.Boots,
      rarity: ItemRarity.Rare,
      value: 1100,
      sellable: true,
      stackable: false,
      maxStack: 1,
      requiredLevel: 11,
      defense: 10,
      magicDefense: 8,
      resistances: {},
      statBonuses: { speed: 10, evasion: 12, attack: 3 },
      icon: '👟'
    } as Armor,

    'gold-ring': {
      id: 'gold-ring',
      name: 'Gold Ring',
      description: 'A simple gold ring that seems to attract wealth',
      type: ItemType.Armor,
      armorType: ArmorType.Accessory,
      rarity: ItemRarity.Uncommon,
      value: 200,
      sellable: true,
      stackable: false,
      maxStack: 1,
      requiredLevel: 1,
      defense: 0,
      magicDefense: 2,
      resistances: {},
      statBonuses: {},
      icon: '💍'
    } as Armor,

    'checksum-aegis': {
      id: 'checksum-aegis',
      name: '체크섬 이지스 (Checksum Aegis)',
      description: 'Validates and nullifies incoming corruption damage',
      type: ItemType.Armor,
      armorType: ArmorType.Chest,
      rarity: ItemRarity.Epic,
      value: 2800,
      sellable: true,
      stackable: false,
      maxStack: 1,
      requiredLevel: 23,
      defense: 48,
      magicDefense: 40,
      resistances: {
        [ElementType.Fire]: 0.18,
        [ElementType.Ice]: 0.18,
        [ElementType.Lightning]: 0.18,
        [ElementType.Dark]: 0.18
      },
      statBonuses: { maxHp: 110, defense: 14, magicDefense: 12 },
      icon: '🛡️'
    } as Armor,

    'kernel-guard-boots': {
      id: 'kernel-guard-boots',
      name: '커널 가드 부츠 (Kernel Guard Boots)',
      description: 'Kernel-level safeguards with unmatched mobility',
      type: ItemType.Armor,
      armorType: ArmorType.Boots,
      rarity: ItemRarity.Epic,
      value: 3400,
      sellable: true,
      stackable: false,
      maxStack: 1,
      requiredLevel: 28,
      defense: 22,
      magicDefense: 18,
      resistances: {},
      statBonuses: { speed: 16, evasion: 14, maxHp: 40 },
      icon: '🥾'
    } as Armor,

    'entropy-ring': {
      id: 'entropy-ring',
      name: '엔트로피 링 (Entropy Ring)',
      description: 'A chaotic ring that amplifies both offense and resilience',
      type: ItemType.Armor,
      armorType: ArmorType.Accessory,
      rarity: ItemRarity.Legendary,
      value: 3900,
      sellable: true,
      stackable: false,
      maxStack: 1,
      requiredLevel: 29,
      defense: 10,
      magicDefense: 16,
      resistances: {
        [ElementType.Dark]: 0.25,
        [ElementType.Poison]: 0.25
      },
      statBonuses: {
        attack: 14,
        magicPower: 14,
        critChance: 9,
        critDamage: 0.6,
        maxHp: 45
      },
      icon: '💍'
    } as Armor,

    'root-crown': {
      id: 'root-crown',
      name: '루트 크라운 (Root Crown)',
      description: 'Authority-grade helm that stabilizes all combat systems',
      type: ItemType.Armor,
      armorType: ArmorType.Helmet,
      rarity: ItemRarity.Legendary,
      value: 4200,
      sellable: true,
      stackable: false,
      maxStack: 1,
      requiredLevel: 30,
      defense: 30,
      magicDefense: 30,
      resistances: {
        [ElementType.Light]: 0.2,
        [ElementType.Dark]: 0.2,
        [ElementType.Fire]: 0.15,
        [ElementType.Ice]: 0.15
      },
      statBonuses: { maxHp: 90, maxMp: 80, defense: 10, magicDefense: 10 },
      icon: '👑'
    } as Armor,

    // Consumables
    'health-potion': {
      id: 'health-potion',
      name: 'Health Potion',
      description: 'Restores 50 HP',
      type: ItemType.Consumable,
      rarity: ItemRarity.Common,
      value: 50,
      sellable: true,
      stackable: true,
      maxStack: 99,
      requiredLevel: 1,
      effects: [
        {
          type: 'heal',
          power: 50
        }
      ],
      usableInCombat: true,
      usableOutOfCombat: true,
      consumeOnUse: true,
      icon: '💊'
    } as Consumable,

    'mana-potion': {
      id: 'mana-potion',
      name: 'Mana Potion',
      description: 'Restores 30 MP',
      type: ItemType.Consumable,
      rarity: ItemRarity.Common,
      value: 40,
      sellable: true,
      stackable: true,
      maxStack: 99,
      requiredLevel: 1,
      effects: [
        {
          type: 'restore-mp',
          power: 30
        }
      ],
      usableInCombat: true,
      usableOutOfCombat: true,
      consumeOnUse: true,
      icon: '🔵'
    } as Consumable,

    'memory-fragment-small': {
      id: 'memory-fragment-small',
      name: '작은 메모리 파편 (Small Memory Fragment)',
      description: 'A small piece of crystallized memory, restores 30 HP',
      type: ItemType.Consumable,
      rarity: ItemRarity.Common,
      value: 30,
      sellable: true,
      stackable: true,
      maxStack: 99,
      requiredLevel: 1,
      effects: [
        {
          type: 'heal',
          power: 30
        }
      ],
      usableInCombat: true,
      usableOutOfCombat: true,
      consumeOnUse: true,
      icon: '💎'
    } as Consumable,

    'memory-fragment-medium': {
      id: 'memory-fragment-medium',
      name: '중형 메모리 파편 (Medium Memory Fragment)',
      description: 'A medium-sized memory crystal, restores 80 HP',
      type: ItemType.Consumable,
      rarity: ItemRarity.Uncommon,
      value: 80,
      sellable: true,
      stackable: true,
      maxStack: 99,
      requiredLevel: 3,
      effects: [
        {
          type: 'heal',
          power: 80
        }
      ],
      usableInCombat: true,
      usableOutOfCombat: true,
      consumeOnUse: true,
      icon: '💎'
    } as Consumable,

    'memory-fragment-large': {
      id: 'memory-fragment-large',
      name: '대형 메모리 파편 (Large Memory Fragment)',
      description: 'A large memory crystal of exceptional quality, restores 150 HP',
      type: ItemType.Consumable,
      rarity: ItemRarity.Rare,
      value: 150,
      sellable: true,
      stackable: true,
      maxStack: 99,
      requiredLevel: 5,
      effects: [
        {
          type: 'heal',
          power: 150
        }
      ],
      usableInCombat: true,
      usableOutOfCombat: true,
      consumeOnUse: true,
      icon: '💎'
    } as Consumable,

    'mega-health-potion': {
      id: 'mega-health-potion',
      name: 'Mega Health Potion',
      description: 'Restores 150 HP',
      type: ItemType.Consumable,
      rarity: ItemRarity.Uncommon,
      value: 150,
      sellable: true,
      stackable: true,
      maxStack: 99,
      requiredLevel: 5,
      effects: [
        {
          type: 'heal',
          power: 150
        }
      ],
      usableInCombat: true,
      usableOutOfCombat: true,
      consumeOnUse: true,
      icon: '💊'
    } as Consumable,

    'mega-mana-potion': {
      id: 'mega-mana-potion',
      name: 'Mega Mana Potion',
      description: 'Restores 120 MP',
      type: ItemType.Consumable,
      rarity: ItemRarity.Uncommon,
      value: 140,
      sellable: true,
      stackable: true,
      maxStack: 99,
      requiredLevel: 5,
      effects: [
        {
          type: 'restore-mp',
          power: 120
        }
      ],
      usableInCombat: true,
      usableOutOfCombat: true,
      consumeOnUse: true,
      icon: '🔷'
    } as Consumable,

    'antidote': {
      id: 'antidote',
      name: '해독제 (Antidote)',
      description: 'Cures poison and other ailments',
      type: ItemType.Consumable,
      rarity: ItemRarity.Common,
      value: 60,
      sellable: true,
      stackable: true,
      maxStack: 99,
      requiredLevel: 1,
      effects: [
        {
          type: 'cure',
          power: 0
        }
      ],
      usableInCombat: true,
      usableOutOfCombat: true,
      consumeOnUse: true,
      icon: '🧪'
    } as Consumable,

    'overclock-drink': {
      id: 'overclock-drink',
      name: '오버클럭 드링크 (Overclock Drink)',
      description: 'Pushes your system beyond limits. +15 Attack for 5 turns',
      type: ItemType.Consumable,
      rarity: ItemRarity.Uncommon,
      value: 100,
      sellable: true,
      stackable: true,
      maxStack: 99,
      requiredLevel: 3,
      effects: [
        {
          type: 'buff',
          power: 15,
          duration: 5,
          statModifier: { attack: 15 }
        }
      ],
      usableInCombat: true,
      usableOutOfCombat: false,
      consumeOnUse: true,
      icon: '⚡'
    } as Consumable,

    'defense-shell': {
      id: 'defense-shell',
      name: '디펜스 쉘 (Defense Shell)',
      description: 'Creates a protective barrier. +20 Defense for 5 turns',
      type: ItemType.Consumable,
      rarity: ItemRarity.Uncommon,
      value: 100,
      sellable: true,
      stackable: true,
      maxStack: 99,
      requiredLevel: 3,
      effects: [
        {
          type: 'buff',
          power: 20,
          duration: 5,
          statModifier: { defense: 20 }
        }
      ],
      usableInCombat: true,
      usableOutOfCombat: false,
      consumeOnUse: true,
      icon: '🛡️'
    } as Consumable,

    'ultra-health-potion': {
      id: 'ultra-health-potion',
      name: 'Ultra Health Potion',
      description: 'Restores 320 HP',
      type: ItemType.Consumable,
      rarity: ItemRarity.Epic,
      value: 340,
      sellable: true,
      stackable: true,
      maxStack: 99,
      requiredLevel: 22,
      effects: [
        {
          type: 'heal',
          power: 320
        }
      ],
      usableInCombat: true,
      usableOutOfCombat: true,
      consumeOnUse: true,
      icon: '🧪'
    } as Consumable,

    'ultra-mana-potion': {
      id: 'ultra-mana-potion',
      name: 'Ultra Mana Potion',
      description: 'Restores 260 MP',
      type: ItemType.Consumable,
      rarity: ItemRarity.Epic,
      value: 320,
      sellable: true,
      stackable: true,
      maxStack: 99,
      requiredLevel: 24,
      effects: [
        {
          type: 'restore-mp',
          power: 260
        }
      ],
      usableInCombat: true,
      usableOutOfCombat: true,
      consumeOnUse: true,
      icon: '🔮'
    } as Consumable,

    'quantum-tonic': {
      id: 'quantum-tonic',
      name: '퀀텀 토닉 (Quantum Tonic)',
      description: 'Boosts attack and magic power by 35 for 6 turns',
      type: ItemType.Consumable,
      rarity: ItemRarity.Legendary,
      value: 720,
      sellable: true,
      stackable: true,
      maxStack: 99,
      requiredLevel: 28,
      effects: [
        {
          type: 'buff',
          power: 35,
          duration: 6,
          statModifier: { attack: 35, magicPower: 35 }
        }
      ],
      usableInCombat: true,
      usableOutOfCombat: false,
      consumeOnUse: true,
      icon: '⚛️'
    } as Consumable,

    'stability-draught': {
      id: 'stability-draught',
      name: '스테빌리티 드래프트 (Stability Draught)',
      description: 'Restores 220 HP/MP and cures status effects',
      type: ItemType.Consumable,
      rarity: ItemRarity.Legendary,
      value: 880,
      sellable: true,
      stackable: true,
      maxStack: 99,
      requiredLevel: 30,
      effects: [
        {
          type: 'heal',
          power: 220
        },
        {
          type: 'restore-mp',
          power: 220
        },
        {
          type: 'cure',
          power: 0
        }
      ],
      usableInCombat: true,
      usableOutOfCombat: true,
      consumeOnUse: true,
      icon: '✨'
    } as Consumable,

    // Materials
    'slime-gel': {
      id: 'slime-gel',
      name: 'Slime Gel',
      description: 'Gooey substance from a slime',
      type: ItemType.Material,
      rarity: ItemRarity.Common,
      value: 5,
      sellable: true,
      stackable: true,
      maxStack: 99,
      requiredLevel: 1,
      category: 'misc',
      icon: '🟢'
    } as Material,

    'goblin-ear': {
      id: 'goblin-ear',
      name: 'Goblin Ear',
      description: 'A trophy from a defeated goblin',
      type: ItemType.Material,
      rarity: ItemRarity.Common,
      value: 8,
      sellable: true,
      stackable: true,
      maxStack: 99,
      requiredLevel: 1,
      category: 'misc',
      icon: '👂'
    } as Material,

    'wolf-pelt': {
      id: 'wolf-pelt',
      name: 'Wolf Pelt',
      description: 'Fur from a wild wolf',
      type: ItemType.Material,
      rarity: ItemRarity.Common,
      value: 15,
      sellable: true,
      stackable: true,
      maxStack: 99,
      requiredLevel: 1,
      category: 'misc',
      icon: '🐺'
    } as Material,

    'wolf-fang': {
      id: 'wolf-fang',
      name: 'Wolf Fang',
      description: 'Sharp fang from a wolf',
      type: ItemType.Material,
      rarity: ItemRarity.Common,
      value: 20,
      sellable: true,
      stackable: true,
      maxStack: 99,
      requiredLevel: 1,
      category: 'misc',
      icon: '🦷'
    } as Material,

    'bone-fragment': {
      id: 'bone-fragment',
      name: 'Bone Fragment',
      description: 'A piece of bone from an undead creature',
      type: ItemType.Material,
      rarity: ItemRarity.Common,
      value: 12,
      sellable: true,
      stackable: true,
      maxStack: 99,
      requiredLevel: 1,
      category: 'misc',
      icon: '🦴'
    } as Material,

    'orc-tusk': {
      id: 'orc-tusk',
      name: 'Orc Tusk',
      description: 'A large tusk from an orc',
      type: ItemType.Material,
      rarity: ItemRarity.Uncommon,
      value: 35,
      sellable: true,
      stackable: true,
      maxStack: 99,
      requiredLevel: 1,
      category: 'misc',
      icon: '🦷'
    } as Material,

    'fire-essence': {
      id: 'fire-essence',
      name: 'Fire Essence',
      description: 'Concentrated elemental fire energy',
      type: ItemType.Material,
      rarity: ItemRarity.Uncommon,
      value: 50,
      sellable: true,
      stackable: true,
      maxStack: 99,
      requiredLevel: 1,
      category: 'essence',
      icon: '🔥'
    } as Material,

    'ember-stone': {
      id: 'ember-stone',
      name: 'Ember Stone',
      description: 'A stone that burns eternally',
      type: ItemType.Material,
      rarity: ItemRarity.Rare,
      value: 100,
      sellable: true,
      stackable: true,
      maxStack: 99,
      requiredLevel: 1,
      category: 'gem',
      icon: '💎'
    } as Material,

    // Save Token (Special Item)
    'save-token': {
      id: 'save-token',
      name: 'Save Token',
      description: 'A magical token that allows emergency save anywhere (max 10)',
      type: ItemType.Material,
      rarity: ItemRarity.Uncommon,
      value: 5000,
      sellable: true,
      stackable: true,
      maxStack: 10,
      requiredLevel: 1,
      category: 'misc',
      icon: '🎫'
    } as Material
  };

  for (const itemId of collectReferencedItemIds()) {
    if (!items[itemId]) {
      items[itemId] = createGeneratedDropItem(itemId);
    }
  }

  itemCache = items;
  return itemCache;
}

/**
 * Get item by ID
 */
export function getItemById(itemId: string): AnyItem | null {
  const items = getSampleItems();
  return items[itemId] || null;
}

/**
 * Get items by type
 */
export function getItemsByType(type: ItemType): AnyItem[] {
  const items = getSampleItems();
  return Object.values(items).filter(item => item.type === type);
}

/**
 * Get items by rarity
 */
export function getItemsByRarity(rarity: ItemRarity): AnyItem[] {
  const items = getSampleItems();
  return Object.values(items).filter(item => item.rarity === rarity);
}
