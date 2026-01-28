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

/**
 * Get sample items database
 */
export function getSampleItems(): Record<string, AnyItem> {
  return {
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

    // Additional Boots
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
