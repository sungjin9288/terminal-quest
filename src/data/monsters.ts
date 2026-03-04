/**
 * Sample monster data for Terminal Quest
 */

import {
  Monster,
  MonsterType,
  MonsterRank,
  ElementType,
  AIBehavior
} from '../types/index.js';
import { readFileSync } from 'fs';
import { join } from 'path';

interface MonsterJsonDropItem {
  id: string;
  chance?: number;
}

interface MonsterJsonDrop {
  gold?: [number, number];
  exp?: number;
  items?: MonsterJsonDropItem[];
}

interface MonsterJsonStats {
  hp?: number;
  attack?: number;
  defense?: number;
  speed?: number;
  mp?: number;
  magicPower?: number;
  magicDefense?: number;
  critChance?: number;
  critDamage?: number;
  evasion?: number;
}

interface MonsterJsonEntry {
  id: string;
  name?: string;
  level?: number;
  type?: string;
  rank?: string;
  stats?: MonsterJsonStats;
  drops?: MonsterJsonDrop;
  icon?: string;
  attackPattern?: string;
}

interface MonsterJsonRegion {
  monsters?: MonsterJsonEntry[];
}

interface MonsterJsonFile {
  regions?: Record<string, MonsterJsonRegion>;
}

interface LocationDataEntry {
  id: string;
  recommendedLevel: [number, number];
  monsters: string[];
  boss: string;
}

interface LocationDataFile {
  locations?: LocationDataEntry[];
}

let monsterCache: Record<string, Monster> | null = null;

function mapMonsterType(typeText?: string): MonsterType {
  const key = (typeText ?? '').toLowerCase();
  if (key.includes('beast')) return MonsterType.Beast;
  if (key.includes('undead')) return MonsterType.Undead;
  if (key.includes('demon')) return MonsterType.Demon;
  if (key.includes('dragon')) return MonsterType.Dragon;
  if (key.includes('elemental')) return MonsterType.Elemental;
  if (key.includes('humanoid')) return MonsterType.Humanoid;
  if (key.includes('construct')) return MonsterType.Construct;
  return MonsterType.Aberration;
}

function mapMonsterRank(rankText?: string): MonsterRank {
  const key = (rankText ?? '').toLowerCase();
  if (key.includes('world')) return MonsterRank.WorldBoss;
  if (key.includes('boss')) return MonsterRank.Boss;
  if (key.includes('elite')) return MonsterRank.Elite;
  return MonsterRank.Normal;
}

function inferElementFromMonsterId(monsterId: string): ElementType {
  const id = monsterId.toLowerCase();
  if (/(fire|flame|ember|burn)/.test(id)) return ElementType.Fire;
  if (/(ice|frost|snow|cold)/.test(id)) return ElementType.Ice;
  if (/(lightning|thunder|storm|volt)/.test(id)) return ElementType.Lightning;
  if (/(poison|venom|toxic)/.test(id)) return ElementType.Poison;
  if (/(dark|shadow|corrupt|void|ghost)/.test(id)) return ElementType.Dark;
  if (/(light|holy|bless)/.test(id)) return ElementType.Light;
  return ElementType.Physical;
}

function buildMonsterFromJson(entry: MonsterJsonEntry): Monster {
  const level = Math.max(1, entry.level ?? 1);
  const rank = mapMonsterRank(entry.rank);
  const isBoss = rank === MonsterRank.Boss || rank === MonsterRank.WorldBoss;
  const baseHp = Math.max(20, entry.stats?.hp ?? 35 + level * 12);

  const dropItems = (entry.drops?.items ?? []).map(drop => ({
    itemId: drop.id,
    chance: Math.min(1, Math.max(0, drop.chance ?? 0.2)),
    minQuantity: 1,
    maxQuantity: 1
  }));

  const minGold = entry.drops?.gold?.[0] ?? level * (isBoss ? 20 : 5);
  const maxGold = entry.drops?.gold?.[1] ?? level * (isBoss ? 35 : 10);

  return {
    id: entry.id,
    name: entry.name ?? entry.id,
    description: entry.attackPattern
      ? `${entry.name ?? entry.id} - ${entry.attackPattern}`
      : `${entry.name ?? entry.id} roams the region.`,
    type: mapMonsterType(entry.type),
    rank,
    level,
    stats: {
      hp: baseHp,
      maxHp: baseHp,
      mp: Math.max(10, entry.stats?.mp ?? 10 + level * 2),
      maxMp: Math.max(10, entry.stats?.mp ?? 10 + level * 2),
      attack: Math.max(3, entry.stats?.attack ?? 4 + level * 2),
      defense: Math.max(1, entry.stats?.defense ?? 2 + level),
      magicPower: Math.max(2, entry.stats?.magicPower ?? 3 + level),
      magicDefense: Math.max(1, entry.stats?.magicDefense ?? 2 + level),
      speed: Math.max(2, entry.stats?.speed ?? 3 + level),
      critChance: Math.max(2, entry.stats?.critChance ?? (isBoss ? 15 : 8)),
      critDamage: Math.max(1.2, entry.stats?.critDamage ?? (isBoss ? 2.0 : 1.5)),
      evasion: Math.max(0, entry.stats?.evasion ?? (isBoss ? 8 : 5))
    },
    element: inferElementFromMonsterId(entry.id),
    resistances: {},
    skills: [],
    aiPattern: isBoss ? AIBehavior.Tactical : AIBehavior.Balanced,
    dropTable: {
      guaranteed: [],
      possible: dropItems,
      rare: [],
      minGold,
      maxGold: Math.max(minGold, maxGold)
    },
    expReward: Math.max(1, entry.drops?.exp ?? level * (isBoss ? 90 : 16)),
    statusEffects: [],
    icon: entry.icon ?? (isBoss ? '👑' : '👾'),
    canBeStunned: !isBoss,
    canBePoisoned: mapMonsterType(entry.type) !== MonsterType.Undead && mapMonsterType(entry.type) !== MonsterType.Construct,
    isBoss,
    spawnWeight: isBoss ? 0 : 5
  };
}

function loadJsonMonsters(): MonsterJsonEntry[] {
  try {
    const dataPath = join(process.cwd(), 'data', 'monsters.json');
    const rawData = readFileSync(dataPath, 'utf-8');
    const parsed = JSON.parse(rawData) as MonsterJsonFile;
    const entries: MonsterJsonEntry[] = [];

    for (const region of Object.values(parsed.regions ?? {})) {
      for (const monster of region.monsters ?? []) {
        if (monster.id) entries.push(monster);
      }
    }

    return entries;
  } catch {
    return [];
  }
}

function formatMonsterNameFromId(monsterId: string): string {
  return monsterId
    .split('-')
    .map(token => token.charAt(0).toUpperCase() + token.slice(1))
    .join(' ');
}

function createGeneratedLocationMonster(monsterId: string, level: number, isBoss: boolean): Monster {
  const clampedLevel = Math.max(1, level);
  const hp = isBoss ? 240 + clampedLevel * 26 : 35 + clampedLevel * 12;
  const attack = isBoss ? 16 + clampedLevel * 3 : 5 + clampedLevel * 2;
  const defense = isBoss ? 10 + clampedLevel * 2 : 3 + clampedLevel;
  const magicPower = isBoss ? 14 + clampedLevel * 2 : 3 + Math.floor(clampedLevel * 1.3);
  const magicDefense = isBoss ? 9 + clampedLevel * 2 : 2 + clampedLevel;
  const speed = isBoss ? 8 + Math.floor(clampedLevel * 1.2) : 3 + clampedLevel;
  const rank = isBoss ? MonsterRank.Boss : MonsterRank.Normal;

  return {
    id: monsterId,
    name: formatMonsterNameFromId(monsterId),
    description: isBoss
      ? '지역의 핵심 데이터를 지배하는 강력한 존재입니다.'
      : '지역에서 관측된 미확인 엔티티입니다.',
    type: isBoss ? MonsterType.Aberration : MonsterType.Construct,
    rank,
    level: clampedLevel,
    stats: {
      hp,
      maxHp: hp,
      mp: Math.max(12, Math.floor(hp * 0.2)),
      maxMp: Math.max(12, Math.floor(hp * 0.2)),
      attack,
      defense,
      magicPower,
      magicDefense,
      speed,
      critChance: isBoss ? 16 : 8,
      critDamage: isBoss ? 2.0 : 1.5,
      evasion: isBoss ? 9 : 5
    },
    element: inferElementFromMonsterId(monsterId),
    resistances: {},
    skills: [],
    aiPattern: isBoss ? AIBehavior.Tactical : AIBehavior.Balanced,
    dropTable: {
      guaranteed: [],
      possible: [
        {
          itemId: 'health-potion',
          chance: isBoss ? 0.8 : 0.35,
          minQuantity: 1,
          maxQuantity: isBoss ? 3 : 1
        },
        {
          itemId: 'mana-potion',
          chance: isBoss ? 0.7 : 0.25,
          minQuantity: 1,
          maxQuantity: isBoss ? 2 : 1
        }
      ],
      rare: isBoss
        ? [
          {
            itemId: 'save-token',
            chance: 0.15,
            minQuantity: 1,
            maxQuantity: 1
          }
        ]
        : [],
      minGold: isBoss ? clampedLevel * 24 : clampedLevel * 6,
      maxGold: isBoss ? clampedLevel * 42 : clampedLevel * 12
    },
    expReward: isBoss ? clampedLevel * 100 : clampedLevel * 16,
    statusEffects: [],
    icon: isBoss ? '👑' : '👾',
    canBeStunned: !isBoss,
    canBePoisoned: !isBoss,
    isBoss,
    spawnWeight: isBoss ? 0 : 5
  };
}

function loadLocationMonsterReferences(): Array<{ id: string; level: number; isBoss: boolean }> {
  try {
    const dataPath = join(process.cwd(), 'data', 'locations.json');
    const rawData = readFileSync(dataPath, 'utf-8');
    const parsed = JSON.parse(rawData) as LocationDataFile;
    const refs = new Map<string, { id: string; level: number; isBoss: boolean }>();

    for (const location of parsed.locations ?? []) {
      const minLevel = Math.max(1, location.recommendedLevel?.[0] ?? 1);
      const maxLevel = Math.max(minLevel, location.recommendedLevel?.[1] ?? minLevel);
      const normalLevel = Math.floor((minLevel + maxLevel) / 2);
      const bossLevel = maxLevel + 2;

      for (const monsterId of location.monsters ?? []) {
        const current = refs.get(monsterId);
        if (!current || current.level < normalLevel) {
          refs.set(monsterId, { id: monsterId, level: normalLevel, isBoss: false });
        }
      }

      if (location.boss) {
        const current = refs.get(location.boss);
        if (!current || current.level < bossLevel || !current.isBoss) {
          refs.set(location.boss, { id: location.boss, level: bossLevel, isBoss: true });
        }
      }
    }

    return Array.from(refs.values());
  } catch {
    return [];
  }
}

/**
 * Get sample monsters database
 */
export function getSampleMonsters(): Record<string, Monster> {
  if (monsterCache) {
    return monsterCache;
  }

  const monsters: Record<string, Monster> = {
    'slime': {
      id: 'slime',
      name: 'Slime',
      description: 'A gelatinous blob that jiggles menacingly',
      type: MonsterType.Beast,
      rank: MonsterRank.Normal,
      level: 1,
      stats: {
        hp: 30,
        maxHp: 30,
        mp: 10,
        maxMp: 10,
        attack: 5,
        defense: 2,
        magicPower: 3,
        magicDefense: 3,
        speed: 3,
        critChance: 5,
        critDamage: 1.5,
        evasion: 5
      },
      element: ElementType.Physical,
      resistances: {
        [ElementType.Physical]: -0.2,
        [ElementType.Fire]: -0.5,
        [ElementType.Ice]: 0.3
      },
      skills: [],
      aiPattern: AIBehavior.Aggressive,
      dropTable: {
        guaranteed: [],
        possible: [
          {
            itemId: 'slime-gel',
            chance: 0.5,
            minQuantity: 1,
            maxQuantity: 2
          }
        ],
        rare: [],
        minGold: 5,
        maxGold: 15
      },
      expReward: 20,
      statusEffects: [],
      icon: '🟢',
      canBeStunned: true,
      canBePoisoned: false,
      isBoss: false,
      spawnWeight: 10
    },

    'goblin': {
      id: 'goblin',
      name: 'Goblin',
      description: 'A small, mischievous creature with a rusty dagger',
      type: MonsterType.Humanoid,
      rank: MonsterRank.Normal,
      level: 2,
      stats: {
        hp: 45,
        maxHp: 45,
        mp: 15,
        maxMp: 15,
        attack: 8,
        defense: 4,
        magicPower: 2,
        magicDefense: 3,
        speed: 7,
        critChance: 10,
        critDamage: 1.8,
        evasion: 10
      },
      element: ElementType.Physical,
      resistances: {
        [ElementType.Physical]: 0,
        [ElementType.Dark]: 0.2
      },
      skills: [],
      aiPattern: AIBehavior.Aggressive,
      dropTable: {
        guaranteed: [],
        possible: [
          {
            itemId: 'rusty-dagger',
            chance: 0.15,
            minQuantity: 1,
            maxQuantity: 1
          },
          {
            itemId: 'goblin-ear',
            chance: 0.3,
            minQuantity: 1,
            maxQuantity: 1
          }
        ],
        rare: [
          {
            itemId: 'gold-ring',
            chance: 0.05,
            minQuantity: 1,
            maxQuantity: 1
          }
        ],
        minGold: 10,
        maxGold: 25
      },
      expReward: 35,
      statusEffects: [],
      icon: '👺',
      canBeStunned: true,
      canBePoisoned: true,
      isBoss: false,
      spawnWeight: 8
    },

    'wolf': {
      id: 'wolf',
      name: 'Wild Wolf',
      description: 'A fierce predator with sharp fangs',
      type: MonsterType.Beast,
      rank: MonsterRank.Normal,
      level: 3,
      stats: {
        hp: 60,
        maxHp: 60,
        mp: 20,
        maxMp: 20,
        attack: 12,
        defense: 5,
        magicPower: 4,
        magicDefense: 4,
        speed: 12,
        critChance: 15,
        critDamage: 2.0,
        evasion: 15
      },
      element: ElementType.Physical,
      resistances: {
        [ElementType.Physical]: 0.1,
        [ElementType.Ice]: -0.3
      },
      skills: [],
      aiPattern: AIBehavior.Aggressive,
      dropTable: {
        guaranteed: [],
        possible: [
          {
            itemId: 'wolf-pelt',
            chance: 0.6,
            minQuantity: 1,
            maxQuantity: 2
          },
          {
            itemId: 'wolf-fang',
            chance: 0.4,
            minQuantity: 1,
            maxQuantity: 1
          }
        ],
        rare: [],
        minGold: 15,
        maxGold: 35
      },
      expReward: 50,
      statusEffects: [],
      icon: '🐺',
      canBeStunned: true,
      canBePoisoned: true,
      isBoss: false,
      spawnWeight: 7
    },

    'skeleton': {
      id: 'skeleton',
      name: 'Skeleton Warrior',
      description: 'An undead warrior wielding a bone sword',
      type: MonsterType.Undead,
      rank: MonsterRank.Normal,
      level: 4,
      stats: {
        hp: 70,
        maxHp: 70,
        mp: 25,
        maxMp: 25,
        attack: 14,
        defense: 8,
        magicPower: 6,
        magicDefense: 6,
        speed: 6,
        critChance: 8,
        critDamage: 1.6,
        evasion: 8
      },
      element: ElementType.Dark,
      resistances: {
        [ElementType.Physical]: 0.2,
        [ElementType.Dark]: 0.5,
        [ElementType.Light]: -0.8,
        [ElementType.Poison]: 1.0
      },
      skills: [],
      aiPattern: AIBehavior.Balanced,
      dropTable: {
        guaranteed: [],
        possible: [
          {
            itemId: 'bone-fragment',
            chance: 0.7,
            minQuantity: 1,
            maxQuantity: 3
          },
          {
            itemId: 'rusty-sword',
            chance: 0.2,
            minQuantity: 1,
            maxQuantity: 1
          }
        ],
        rare: [
          {
            itemId: 'cursed-ring',
            chance: 0.08,
            minQuantity: 1,
            maxQuantity: 1
          }
        ],
        minGold: 20,
        maxGold: 45
      },
      expReward: 70,
      statusEffects: [],
      icon: '💀',
      canBeStunned: false,
      canBePoisoned: false,
      isBoss: false,
      spawnWeight: 6
    },

    'orc': {
      id: 'orc',
      name: 'Orc Warrior',
      description: 'A brutish warrior with immense strength',
      type: MonsterType.Humanoid,
      rank: MonsterRank.Elite,
      level: 5,
      stats: {
        hp: 120,
        maxHp: 120,
        mp: 30,
        maxMp: 30,
        attack: 18,
        defense: 10,
        magicPower: 5,
        magicDefense: 7,
        speed: 5,
        critChance: 12,
        critDamage: 2.2,
        evasion: 5
      },
      element: ElementType.Physical,
      resistances: {
        [ElementType.Physical]: 0.2,
        [ElementType.Fire]: -0.2
      },
      skills: [],
      aiPattern: AIBehavior.Berserker,
      dropTable: {
        guaranteed: [
          {
            itemId: 'orc-tusk',
            chance: 1.0,
            minQuantity: 1,
            maxQuantity: 1
          }
        ],
        possible: [
          {
            itemId: 'iron-axe',
            chance: 0.3,
            minQuantity: 1,
            maxQuantity: 1
          },
          {
            itemId: 'health-potion',
            chance: 0.4,
            minQuantity: 1,
            maxQuantity: 2
          }
        ],
        rare: [
          {
            itemId: 'orc-helm',
            chance: 0.1,
            minQuantity: 1,
            maxQuantity: 1
          }
        ],
        minGold: 40,
        maxGold: 80
      },
      expReward: 100,
      statusEffects: [],
      icon: '👹',
      canBeStunned: true,
      canBePoisoned: true,
      isBoss: false,
      spawnWeight: 4
    },

    'fire-elemental': {
      id: 'fire-elemental',
      name: 'Fire Elemental',
      description: 'A being of pure flame',
      type: MonsterType.Elemental,
      rank: MonsterRank.Elite,
      level: 6,
      stats: {
        hp: 90,
        maxHp: 90,
        mp: 80,
        maxMp: 80,
        attack: 10,
        defense: 6,
        magicPower: 22,
        magicDefense: 12,
        speed: 10,
        critChance: 10,
        critDamage: 2.5,
        evasion: 12
      },
      element: ElementType.Fire,
      resistances: {
        [ElementType.Physical]: 0.3,
        [ElementType.Fire]: 0.9,
        [ElementType.Ice]: -1.0,
        [ElementType.Lightning]: 0.2
      },
      skills: [],
      aiPattern: AIBehavior.Aggressive,
      dropTable: {
        guaranteed: [],
        possible: [
          {
            itemId: 'fire-essence',
            chance: 0.8,
            minQuantity: 1,
            maxQuantity: 3
          },
          {
            itemId: 'ember-stone',
            chance: 0.4,
            minQuantity: 1,
            maxQuantity: 1
          }
        ],
        rare: [
          {
            itemId: 'flame-ring',
            chance: 0.12,
            minQuantity: 1,
            maxQuantity: 1
          }
        ],
        minGold: 50,
        maxGold: 100
      },
      expReward: 130,
      statusEffects: [],
      icon: '🔥',
      canBeStunned: false,
      canBePoisoned: false,
      isBoss: false,
      spawnWeight: 3
    },

    // ======================
    // MEMORY FOREST MONSTERS (메모리 숲)
    // Act 1 - Levels 1-10
    // ======================

    'bug-slime': {
      id: 'bug-slime',
      name: '버그 슬라임 (Bug Slime)',
      description: 'A gelatinous blob of corrupted code that oozes with syntax errors',
      type: MonsterType.Beast,
      rank: MonsterRank.Normal,
      level: 1,
      stats: {
        hp: 30,
        maxHp: 30,
        mp: 5,
        maxMp: 5,
        attack: 5,
        defense: 2,
        magicPower: 2,
        magicDefense: 2,
        speed: 3,
        critChance: 5,
        critDamage: 1.3,
        evasion: 5
      },
      element: ElementType.Physical,
      resistances: {
        [ElementType.Physical]: -0.2,
        [ElementType.Lightning]: 0.3
      },
      skills: [],
      aiPattern: AIBehavior.Aggressive,
      dropTable: {
        guaranteed: [],
        possible: [
          {
            itemId: 'slime-gel',
            chance: 0.7,
            minQuantity: 1,
            maxQuantity: 2
          },
          {
            itemId: 'health-potion',
            chance: 0.3,
            minQuantity: 1,
            maxQuantity: 1
          }
        ],
        rare: [],
        minGold: 5,
        maxGold: 10
      },
      expReward: 10,
      statusEffects: [],
      icon: '🟢',
      canBeStunned: true,
      canBePoisoned: true,
      isBoss: false,
      spawnWeight: 10
    },

    '404-ghost': {
      id: '404-ghost',
      name: '404 고스트 (404 Ghost)',
      description: 'A phantom error that appears when something cannot be found',
      type: MonsterType.Undead,
      rank: MonsterRank.Normal,
      level: 2,
      stats: {
        hp: 40,
        maxHp: 40,
        mp: 15,
        maxMp: 15,
        attack: 6,
        defense: 3,
        magicPower: 8,
        magicDefense: 5,
        speed: 8,
        critChance: 8,
        critDamage: 1.4,
        evasion: 12
      },
      element: ElementType.Dark,
      resistances: {
        [ElementType.Physical]: 0.3,
        [ElementType.Dark]: 0.5,
        [ElementType.Light]: -0.6
      },
      skills: [],
      aiPattern: AIBehavior.Balanced,
      dropTable: {
        guaranteed: [],
        possible: [
          {
            itemId: 'ghost-essence',
            chance: 0.5,
            minQuantity: 1,
            maxQuantity: 1
          },
          {
            itemId: 'mana-potion',
            chance: 0.3,
            minQuantity: 1,
            maxQuantity: 1
          }
        ],
        rare: [],
        minGold: 8,
        maxGold: 15
      },
      expReward: 20,
      statusEffects: [],
      icon: '👻',
      canBeStunned: false,
      canBePoisoned: false,
      isBoss: false,
      spawnWeight: 9
    },

    'spambot': {
      id: 'spambot',
      name: '스팸봇 (Spambot)',
      description: 'An automated nuisance that floods the system with junk data',
      type: MonsterType.Construct,
      rank: MonsterRank.Normal,
      level: 2,
      stats: {
        hp: 45,
        maxHp: 45,
        mp: 10,
        maxMp: 10,
        attack: 7,
        defense: 4,
        magicPower: 3,
        magicDefense: 3,
        speed: 6,
        critChance: 6,
        critDamage: 1.3,
        evasion: 8
      },
      element: ElementType.Physical,
      resistances: {
        [ElementType.Physical]: 0.2,
        [ElementType.Lightning]: -0.4,
        [ElementType.Poison]: 1.0
      },
      skills: [],
      aiPattern: AIBehavior.Aggressive,
      dropTable: {
        guaranteed: [],
        possible: [
          {
            itemId: 'scrap-metal',
            chance: 0.6,
            minQuantity: 1,
            maxQuantity: 2
          },
          {
            itemId: 'health-potion',
            chance: 0.3,
            minQuantity: 1,
            maxQuantity: 1
          }
        ],
        rare: [],
        minGold: 10,
        maxGold: 20
      },
      expReward: 20,
      statusEffects: [],
      icon: '🤖',
      canBeStunned: true,
      canBePoisoned: false,
      isBoss: false,
      spawnWeight: 9
    },

    'glitch-rabbit': {
      id: 'glitch-rabbit',
      name: '글리치 래빗 (Glitch Rabbit)',
      description: 'A corrupted creature that blinks in and out of existence',
      type: MonsterType.Beast,
      rank: MonsterRank.Normal,
      level: 3,
      stats: {
        hp: 55,
        maxHp: 55,
        mp: 20,
        maxMp: 20,
        attack: 9,
        defense: 4,
        magicPower: 5,
        magicDefense: 4,
        speed: 14,
        critChance: 12,
        critDamage: 1.5,
        evasion: 18
      },
      element: ElementType.Physical,
      resistances: {
        [ElementType.Physical]: 0,
        [ElementType.Lightning]: -0.3
      },
      skills: [],
      aiPattern: AIBehavior.Aggressive,
      dropTable: {
        guaranteed: [],
        possible: [
          {
            itemId: 'rabbit-foot',
            chance: 0.5,
            minQuantity: 1,
            maxQuantity: 1
          },
          {
            itemId: 'glitch-fragment',
            chance: 0.4,
            minQuantity: 1,
            maxQuantity: 2
          },
          {
            itemId: 'health-potion',
            chance: 0.3,
            minQuantity: 1,
            maxQuantity: 1
          }
        ],
        rare: [],
        minGold: 15,
        maxGold: 25
      },
      expReward: 30,
      statusEffects: [],
      icon: '🐰',
      canBeStunned: true,
      canBePoisoned: true,
      isBoss: false,
      spawnWeight: 8
    },

    'data-crow': {
      id: 'data-crow',
      name: '데이터 크로우 (Data Crow)',
      description: 'A bird made of binary data that steals information',
      type: MonsterType.Beast,
      rank: MonsterRank.Normal,
      level: 3,
      stats: {
        hp: 50,
        maxHp: 50,
        mp: 25,
        maxMp: 25,
        attack: 10,
        defense: 3,
        magicPower: 7,
        magicDefense: 5,
        speed: 12,
        critChance: 15,
        critDamage: 1.6,
        evasion: 15
      },
      element: ElementType.Physical,
      resistances: {
        [ElementType.Physical]: -0.1
      },
      skills: [],
      aiPattern: AIBehavior.Aggressive,
      dropTable: {
        guaranteed: [],
        possible: [
          {
            itemId: 'crow-feather',
            chance: 0.6,
            minQuantity: 1,
            maxQuantity: 3
          },
          {
            itemId: 'data-chip',
            chance: 0.4,
            minQuantity: 1,
            maxQuantity: 1
          },
          {
            itemId: 'mana-potion',
            chance: 0.3,
            minQuantity: 1,
            maxQuantity: 1
          }
        ],
        rare: [],
        minGold: 15,
        maxGold: 30
      },
      expReward: 30,
      statusEffects: [],
      icon: '🐦‍⬛',
      canBeStunned: true,
      canBePoisoned: true,
      isBoss: false,
      spawnWeight: 8
    },

    'virus-bee': {
      id: 'virus-bee',
      name: '바이러스 비 (Virus Bee)',
      description: 'An infected insect that spreads malicious code',
      type: MonsterType.Beast,
      rank: MonsterRank.Normal,
      level: 4,
      stats: {
        hp: 60,
        maxHp: 60,
        mp: 20,
        maxMp: 20,
        attack: 12,
        defense: 4,
        magicPower: 6,
        magicDefense: 4,
        speed: 13,
        critChance: 10,
        critDamage: 1.5,
        evasion: 14
      },
      element: ElementType.Poison,
      resistances: {
        [ElementType.Physical]: 0,
        [ElementType.Poison]: 0.8,
        [ElementType.Fire]: -0.4
      },
      skills: [],
      aiPattern: AIBehavior.Aggressive,
      dropTable: {
        guaranteed: [],
        possible: [
          {
            itemId: 'virus-sample',
            chance: 0.6,
            minQuantity: 1,
            maxQuantity: 2
          },
          {
            itemId: 'bee-sting',
            chance: 0.5,
            minQuantity: 1,
            maxQuantity: 1
          },
          {
            itemId: 'antidote',
            chance: 0.3,
            minQuantity: 1,
            maxQuantity: 1
          }
        ],
        rare: [],
        minGold: 20,
        maxGold: 35
      },
      expReward: 40,
      statusEffects: [],
      icon: '🐝',
      canBeStunned: true,
      canBePoisoned: false,
      isBoss: false,
      spawnWeight: 7
    },

    'compile-snake': {
      id: 'compile-snake',
      name: '컴파일 스네이크 (Compile Snake)',
      description: 'A serpent that compresses and optimizes its prey',
      type: MonsterType.Beast,
      rank: MonsterRank.Normal,
      level: 4,
      stats: {
        hp: 70,
        maxHp: 70,
        mp: 25,
        maxMp: 25,
        attack: 13,
        defense: 6,
        magicPower: 8,
        magicDefense: 6,
        speed: 10,
        critChance: 12,
        critDamage: 1.7,
        evasion: 12
      },
      element: ElementType.Physical,
      resistances: {
        [ElementType.Physical]: 0.2,
        [ElementType.Ice]: -0.5,
        [ElementType.Poison]: 0.6
      },
      skills: [],
      aiPattern: AIBehavior.Balanced,
      dropTable: {
        guaranteed: [],
        possible: [
          {
            itemId: 'snake-scale',
            chance: 0.6,
            minQuantity: 1,
            maxQuantity: 3
          },
          {
            itemId: 'compiler-core',
            chance: 0.4,
            minQuantity: 1,
            maxQuantity: 1
          },
          {
            itemId: 'health-potion',
            chance: 0.3,
            minQuantity: 1,
            maxQuantity: 1
          }
        ],
        rare: [
          {
            itemId: 'snake-fang',
            chance: 0.15,
            minQuantity: 1,
            maxQuantity: 1
          }
        ],
        minGold: 20,
        maxGold: 40
      },
      expReward: 40,
      statusEffects: [],
      icon: '🐍',
      canBeStunned: true,
      canBePoisoned: false,
      isBoss: false,
      spawnWeight: 7
    },

    'process-bat': {
      id: 'process-bat',
      name: '프로세스 뱃 (Process Bat)',
      description: 'A nocturnal creature that drains system resources',
      type: MonsterType.Beast,
      rank: MonsterRank.Normal,
      level: 5,
      stats: {
        hp: 75,
        maxHp: 75,
        mp: 30,
        maxMp: 30,
        attack: 14,
        defense: 5,
        magicPower: 10,
        magicDefense: 7,
        speed: 15,
        critChance: 14,
        critDamage: 1.6,
        evasion: 16
      },
      element: ElementType.Dark,
      resistances: {
        [ElementType.Physical]: 0.1,
        [ElementType.Dark]: 0.4,
        [ElementType.Light]: -0.5
      },
      skills: [],
      aiPattern: AIBehavior.Aggressive,
      dropTable: {
        guaranteed: [],
        possible: [
          {
            itemId: 'bat-wing',
            chance: 0.6,
            minQuantity: 1,
            maxQuantity: 2
          },
          {
            itemId: 'process-thread',
            chance: 0.4,
            minQuantity: 1,
            maxQuantity: 1
          },
          {
            itemId: 'mana-potion',
            chance: 0.3,
            minQuantity: 1,
            maxQuantity: 2
          }
        ],
        rare: [],
        minGold: 25,
        maxGold: 45
      },
      expReward: 50,
      statusEffects: [],
      icon: '🦇',
      canBeStunned: true,
      canBePoisoned: true,
      isBoss: false,
      spawnWeight: 6
    },

    'glitch-wolf': {
      id: 'glitch-wolf',
      name: '글리치 울프 (Glitch Wolf)',
      description: 'A mid-boss corrupted by fragmented data. Its form flickers unstably.',
      type: MonsterType.Beast,
      rank: MonsterRank.Elite,
      level: 6,
      stats: {
        hp: 250,
        maxHp: 250,
        mp: 50,
        maxMp: 50,
        attack: 20,
        defense: 10,
        magicPower: 12,
        magicDefense: 10,
        speed: 16,
        critChance: 18,
        critDamage: 2.0,
        evasion: 18
      },
      element: ElementType.Physical,
      resistances: {
        [ElementType.Physical]: 0.2,
        [ElementType.Lightning]: -0.4,
        [ElementType.Ice]: 0.1
      },
      skills: [],
      aiPattern: AIBehavior.Berserker,
      dropTable: {
        guaranteed: [
          {
            itemId: 'glitch-core',
            chance: 1.0,
            minQuantity: 1,
            maxQuantity: 1
          }
        ],
        possible: [
          {
            itemId: 'wolf-pelt',
            chance: 0.8,
            minQuantity: 2,
            maxQuantity: 3
          },
          {
            itemId: 'health-potion',
            chance: 0.6,
            minQuantity: 2,
            maxQuantity: 3
          },
          {
            itemId: 'mana-potion',
            chance: 0.5,
            minQuantity: 1,
            maxQuantity: 2
          }
        ],
        rare: [
          {
            itemId: 'glitch-fang',
            chance: 0.3,
            minQuantity: 1,
            maxQuantity: 1
          }
        ],
        minGold: 150,
        maxGold: 300
      },
      expReward: 300,
      statusEffects: [],
      icon: '🐺',
      canBeStunned: false,
      canBePoisoned: false,
      isBoss: true,
      spawnWeight: 1
    },

    'memory-leak-titan': {
      id: 'memory-leak-titan',
      name: '메모리 리크 타이탄 (Memory Leak Titan)',
      description: 'The boss of Memory Forest. A massive entity that endlessly consumes memory.',
      type: MonsterType.Construct,
      rank: MonsterRank.Boss,
      level: 10,
      stats: {
        hp: 800,
        maxHp: 800,
        mp: 100,
        maxMp: 100,
        attack: 30,
        defense: 15,
        magicPower: 20,
        magicDefense: 15,
        speed: 8,
        critChance: 15,
        critDamage: 2.2,
        evasion: 10
      },
      element: ElementType.Physical,
      resistances: {
        [ElementType.Physical]: 0.3,
        [ElementType.Lightning]: -0.6,
        [ElementType.Fire]: 0.2,
        [ElementType.Poison]: 1.0
      },
      skills: [],
      aiPattern: AIBehavior.Tactical,
      dropTable: {
        guaranteed: [
          {
            itemId: 'memory-core',
            chance: 1.0,
            minQuantity: 1,
            maxQuantity: 1
          },
          {
            itemId: 'save-token',
            chance: 1.0,
            minQuantity: 1,
            maxQuantity: 1
          }
        ],
        possible: [
          {
            itemId: 'health-potion',
            chance: 1.0,
            minQuantity: 3,
            maxQuantity: 5
          },
          {
            itemId: 'mana-potion',
            chance: 1.0,
            minQuantity: 2,
            maxQuantity: 4
          },
          {
            itemId: 'titan-fragment',
            chance: 0.8,
            minQuantity: 2,
            maxQuantity: 3
          }
        ],
        rare: [
          {
            itemId: 'memory-blade',
            chance: 0.4,
            minQuantity: 1,
            maxQuantity: 1
          },
          {
            itemId: 'leak-ring',
            chance: 0.3,
            minQuantity: 1,
            maxQuantity: 1
          }
        ],
        minGold: 500,
        maxGold: 1000
      },
      expReward: 1000,
      statusEffects: [],
      icon: '🗿',
      canBeStunned: false,
      canBePoisoned: false,
      isBoss: true,
      spawnWeight: 0
    },

    // ======================
    // CACHE CAVE MONSTERS (캐시 동굴)
    // Act 1 - Levels 5-8
    // ======================

    'cache-mite': {
      id: 'cache-mite',
      name: '캐시 마이트 (Cache Mite)',
      description: 'A tiny insect that feeds on cached data',
      type: MonsterType.Beast,
      rank: MonsterRank.Normal,
      level: 5,
      stats: {
        hp: 80,
        maxHp: 80,
        mp: 20,
        maxMp: 20,
        attack: 15,
        defense: 6,
        magicPower: 8,
        magicDefense: 6,
        speed: 11,
        critChance: 12,
        critDamage: 1.5,
        evasion: 13
      },
      element: ElementType.Physical,
      resistances: {
        [ElementType.Physical]: 0.1,
        [ElementType.Fire]: -0.3
      },
      skills: [],
      aiPattern: AIBehavior.Aggressive,
      dropTable: {
        guaranteed: [],
        possible: [
          {
            itemId: 'mite-shell',
            chance: 0.6,
            minQuantity: 1,
            maxQuantity: 2
          },
          {
            itemId: 'cache-fragment',
            chance: 0.5,
            minQuantity: 1,
            maxQuantity: 1
          },
          {
            itemId: 'health-potion',
            chance: 0.3,
            minQuantity: 1,
            maxQuantity: 1
          }
        ],
        rare: [],
        minGold: 25,
        maxGold: 45
      },
      expReward: 50,
      statusEffects: [],
      icon: '🪲',
      canBeStunned: true,
      canBePoisoned: true,
      isBoss: false,
      spawnWeight: 9
    },

    'buffer-bat': {
      id: 'buffer-bat',
      name: '버퍼 뱃 (Buffer Bat)',
      description: 'A cave-dwelling bat that temporarily stores attacks',
      type: MonsterType.Beast,
      rank: MonsterRank.Normal,
      level: 5,
      stats: {
        hp: 75,
        maxHp: 75,
        mp: 35,
        maxMp: 35,
        attack: 14,
        defense: 5,
        magicPower: 11,
        magicDefense: 8,
        speed: 16,
        critChance: 15,
        critDamage: 1.6,
        evasion: 17
      },
      element: ElementType.Dark,
      resistances: {
        [ElementType.Physical]: 0.1,
        [ElementType.Dark]: 0.4,
        [ElementType.Light]: -0.5
      },
      skills: [],
      aiPattern: AIBehavior.Aggressive,
      dropTable: {
        guaranteed: [],
        possible: [
          {
            itemId: 'bat-wing',
            chance: 0.6,
            minQuantity: 1,
            maxQuantity: 2
          },
          {
            itemId: 'buffer-crystal',
            chance: 0.4,
            minQuantity: 1,
            maxQuantity: 1
          },
          {
            itemId: 'mana-potion',
            chance: 0.3,
            minQuantity: 1,
            maxQuantity: 1
          }
        ],
        rare: [],
        minGold: 25,
        maxGold: 50
      },
      expReward: 50,
      statusEffects: [],
      icon: '🦇',
      canBeStunned: true,
      canBePoisoned: true,
      isBoss: false,
      spawnWeight: 9
    },

    'overflow-spider': {
      id: 'overflow-spider',
      name: '오버플로우 스파이더 (Overflow Spider)',
      description: 'A spider that weaves webs of infinite loops',
      type: MonsterType.Beast,
      rank: MonsterRank.Normal,
      level: 6,
      stats: {
        hp: 100,
        maxHp: 100,
        mp: 30,
        maxMp: 30,
        attack: 16,
        defense: 8,
        magicPower: 10,
        magicDefense: 8,
        speed: 12,
        critChance: 14,
        critDamage: 1.7,
        evasion: 14
      },
      element: ElementType.Physical,
      resistances: {
        [ElementType.Physical]: 0.2,
        [ElementType.Poison]: 0.7,
        [ElementType.Fire]: -0.4
      },
      skills: [],
      aiPattern: AIBehavior.Tactical,
      dropTable: {
        guaranteed: [],
        possible: [
          {
            itemId: 'spider-silk',
            chance: 0.7,
            minQuantity: 1,
            maxQuantity: 3
          },
          {
            itemId: 'overflow-gem',
            chance: 0.4,
            minQuantity: 1,
            maxQuantity: 1
          },
          {
            itemId: 'health-potion',
            chance: 0.3,
            minQuantity: 1,
            maxQuantity: 2
          }
        ],
        rare: [
          {
            itemId: 'spider-fang',
            chance: 0.2,
            minQuantity: 1,
            maxQuantity: 1
          }
        ],
        minGold: 30,
        maxGold: 55
      },
      expReward: 60,
      statusEffects: [],
      icon: '🕷️',
      canBeStunned: true,
      canBePoisoned: false,
      isBoss: false,
      spawnWeight: 8
    },

    'fetch-golem': {
      id: 'fetch-golem',
      name: '페치 골렘 (Fetch Golem)',
      description: 'A stone construct that retrieves and throws data blocks',
      type: MonsterType.Construct,
      rank: MonsterRank.Normal,
      level: 6,
      stats: {
        hp: 120,
        maxHp: 120,
        mp: 20,
        maxMp: 20,
        attack: 18,
        defense: 12,
        magicPower: 6,
        magicDefense: 10,
        speed: 6,
        critChance: 8,
        critDamage: 1.8,
        evasion: 6
      },
      element: ElementType.Physical,
      resistances: {
        [ElementType.Physical]: 0.4,
        [ElementType.Lightning]: -0.5,
        [ElementType.Poison]: 1.0
      },
      skills: [],
      aiPattern: AIBehavior.Defensive,
      dropTable: {
        guaranteed: [],
        possible: [
          {
            itemId: 'golem-core',
            chance: 0.5,
            minQuantity: 1,
            maxQuantity: 1
          },
          {
            itemId: 'stone-chunk',
            chance: 0.7,
            minQuantity: 2,
            maxQuantity: 3
          },
          {
            itemId: 'health-potion',
            chance: 0.3,
            minQuantity: 1,
            maxQuantity: 2
          }
        ],
        rare: [],
        minGold: 30,
        maxGold: 60
      },
      expReward: 60,
      statusEffects: [],
      icon: '🗿',
      canBeStunned: false,
      canBePoisoned: false,
      isBoss: false,
      spawnWeight: 7
    },

    'latency-lizard': {
      id: 'latency-lizard',
      name: '레이턴시 리자드 (Latency Lizard)',
      description: 'A reptile that moves in delayed, unpredictable bursts',
      type: MonsterType.Beast,
      rank: MonsterRank.Normal,
      level: 7,
      stats: {
        hp: 110,
        maxHp: 110,
        mp: 25,
        maxMp: 25,
        attack: 19,
        defense: 9,
        magicPower: 9,
        magicDefense: 8,
        speed: 10,
        critChance: 16,
        critDamage: 1.8,
        evasion: 12
      },
      element: ElementType.Physical,
      resistances: {
        [ElementType.Physical]: 0.2,
        [ElementType.Ice]: -0.4
      },
      skills: [],
      aiPattern: AIBehavior.Balanced,
      dropTable: {
        guaranteed: [],
        possible: [
          {
            itemId: 'lizard-scale',
            chance: 0.7,
            minQuantity: 1,
            maxQuantity: 3
          },
          {
            itemId: 'delay-crystal',
            chance: 0.4,
            minQuantity: 1,
            maxQuantity: 1
          },
          {
            itemId: 'health-potion',
            chance: 0.3,
            minQuantity: 1,
            maxQuantity: 2
          }
        ],
        rare: [],
        minGold: 35,
        maxGold: 65
      },
      expReward: 70,
      statusEffects: [],
      icon: '🦎',
      canBeStunned: true,
      canBePoisoned: true,
      isBoss: false,
      spawnWeight: 7
    },

    'corrupted-cache': {
      id: 'corrupted-cache',
      name: '손상된 캐시 (Corrupted Cache)',
      description: 'A damaged cache entity that explodes with unstable data',
      type: MonsterType.Construct,
      rank: MonsterRank.Elite,
      level: 7,
      stats: {
        hp: 130,
        maxHp: 130,
        mp: 40,
        maxMp: 40,
        attack: 20,
        defense: 10,
        magicPower: 15,
        magicDefense: 12,
        speed: 9,
        critChance: 18,
        critDamage: 2.0,
        evasion: 10
      },
      element: ElementType.Physical,
      resistances: {
        [ElementType.Physical]: 0.3,
        [ElementType.Lightning]: -0.7,
        [ElementType.Poison]: 1.0
      },
      skills: [],
      aiPattern: AIBehavior.Berserker,
      dropTable: {
        guaranteed: [],
        possible: [
          {
            itemId: 'corrupted-core',
            chance: 0.8,
            minQuantity: 1,
            maxQuantity: 2
          },
          {
            itemId: 'cache-crystal',
            chance: 0.6,
            minQuantity: 1,
            maxQuantity: 1
          },
          {
            itemId: 'health-potion',
            chance: 0.4,
            minQuantity: 2,
            maxQuantity: 3
          }
        ],
        rare: [
          {
            itemId: 'unstable-gem',
            chance: 0.25,
            minQuantity: 1,
            maxQuantity: 1
          }
        ],
        minGold: 60,
        maxGold: 120
      },
      expReward: 105,
      statusEffects: [],
      icon: '💥',
      canBeStunned: false,
      canBePoisoned: false,
      isBoss: false,
      spawnWeight: 4
    },

    'cache-guardian': {
      id: 'cache-guardian',
      name: '캐시 가디언 (Cache Guardian)',
      description: 'The boss of Cache Cave. A massive guardian that protects precious cached data.',
      type: MonsterType.Construct,
      rank: MonsterRank.Boss,
      level: 8,
      stats: {
        hp: 600,
        maxHp: 600,
        mp: 80,
        maxMp: 80,
        attack: 25,
        defense: 18,
        magicPower: 18,
        magicDefense: 16,
        speed: 7,
        critChance: 14,
        critDamage: 2.1,
        evasion: 8
      },
      element: ElementType.Physical,
      resistances: {
        [ElementType.Physical]: 0.4,
        [ElementType.Lightning]: -0.6,
        [ElementType.Fire]: 0.2,
        [ElementType.Ice]: 0.2,
        [ElementType.Poison]: 1.0
      },
      skills: [],
      aiPattern: AIBehavior.Defensive,
      dropTable: {
        guaranteed: [
          {
            itemId: 'guardian-core',
            chance: 1.0,
            minQuantity: 1,
            maxQuantity: 1
          },
          {
            itemId: 'save-token',
            chance: 1.0,
            minQuantity: 1,
            maxQuantity: 1
          }
        ],
        possible: [
          {
            itemId: 'health-potion',
            chance: 1.0,
            minQuantity: 3,
            maxQuantity: 5
          },
          {
            itemId: 'mana-potion',
            chance: 1.0,
            minQuantity: 2,
            maxQuantity: 4
          },
          {
            itemId: 'cache-shard',
            chance: 0.8,
            minQuantity: 2,
            maxQuantity: 3
          }
        ],
        rare: [
          {
            itemId: 'guardian-shield',
            chance: 0.4,
            minQuantity: 1,
            maxQuantity: 1
          },
          {
            itemId: 'cache-ring',
            chance: 0.3,
            minQuantity: 1,
            maxQuantity: 1
          }
        ],
        minGold: 400,
        maxGold: 800
      },
      expReward: 800,
      statusEffects: [],
      icon: '🛡️',
      canBeStunned: false,
      canBePoisoned: false,
      isBoss: true,
      spawnWeight: 0
    },

    // ======================
    // BIT PLAINS MONSTERS (비트 평원)
    // Act 1 - Levels 8-12
    // ======================

    'bit-hopper': {
      id: 'bit-hopper',
      name: '비트 호퍼 (Bit Hopper)',
      description: 'A small creature that bounces between binary states',
      type: MonsterType.Beast,
      rank: MonsterRank.Normal,
      level: 8,
      stats: {
        hp: 120,
        maxHp: 120,
        mp: 30,
        maxMp: 30,
        attack: 22,
        defense: 10,
        magicPower: 12,
        magicDefense: 10,
        speed: 14,
        critChance: 16,
        critDamage: 1.6,
        evasion: 16
      },
      element: ElementType.Physical,
      resistances: {
        [ElementType.Physical]: 0.1,
        [ElementType.Lightning]: 0.3
      },
      skills: [],
      aiPattern: AIBehavior.Aggressive,
      dropTable: {
        guaranteed: [],
        possible: [
          {
            itemId: 'bit-fragment',
            chance: 0.7,
            minQuantity: 2,
            maxQuantity: 4
          },
          {
            itemId: 'hopper-leg',
            chance: 0.5,
            minQuantity: 1,
            maxQuantity: 2
          },
          {
            itemId: 'health-potion',
            chance: 0.3,
            minQuantity: 1,
            maxQuantity: 2
          }
        ],
        rare: [],
        minGold: 40,
        maxGold: 70
      },
      expReward: 80,
      statusEffects: [],
      icon: '🦗',
      canBeStunned: true,
      canBePoisoned: true,
      isBoss: false,
      spawnWeight: 9
    },

    'byte-wolf': {
      id: 'byte-wolf',
      name: '바이트 울프 (Byte Wolf)',
      description: 'A digital predator that hunts in packs',
      type: MonsterType.Beast,
      rank: MonsterRank.Normal,
      level: 9,
      stats: {
        hp: 140,
        maxHp: 140,
        mp: 35,
        maxMp: 35,
        attack: 24,
        defense: 11,
        magicPower: 13,
        magicDefense: 11,
        speed: 16,
        critChance: 18,
        critDamage: 1.9,
        evasion: 16
      },
      element: ElementType.Physical,
      resistances: {
        [ElementType.Physical]: 0.2,
        [ElementType.Ice]: -0.3
      },
      skills: [],
      aiPattern: AIBehavior.Aggressive,
      dropTable: {
        guaranteed: [],
        possible: [
          {
            itemId: 'wolf-pelt',
            chance: 0.7,
            minQuantity: 1,
            maxQuantity: 3
          },
          {
            itemId: 'byte-core',
            chance: 0.5,
            minQuantity: 1,
            maxQuantity: 1
          },
          {
            itemId: 'health-potion',
            chance: 0.3,
            minQuantity: 1,
            maxQuantity: 2
          }
        ],
        rare: [
          {
            itemId: 'wolf-fang',
            chance: 0.25,
            minQuantity: 1,
            maxQuantity: 1
          }
        ],
        minGold: 45,
        maxGold: 80
      },
      expReward: 90,
      statusEffects: [],
      icon: '🐺',
      canBeStunned: true,
      canBePoisoned: true,
      isBoss: false,
      spawnWeight: 8
    },

    'binary-eagle': {
      id: 'binary-eagle',
      name: '바이너리 이글 (Binary Eagle)',
      description: 'A majestic bird of prey composed of ones and zeros',
      type: MonsterType.Beast,
      rank: MonsterRank.Normal,
      level: 9,
      stats: {
        hp: 130,
        maxHp: 130,
        mp: 40,
        maxMp: 40,
        attack: 26,
        defense: 9,
        magicPower: 15,
        magicDefense: 12,
        speed: 18,
        critChance: 20,
        critDamage: 2.0,
        evasion: 20
      },
      element: ElementType.Physical,
      resistances: {
        [ElementType.Physical]: 0,
        [ElementType.Lightning]: -0.4
      },
      skills: [],
      aiPattern: AIBehavior.Aggressive,
      dropTable: {
        guaranteed: [],
        possible: [
          {
            itemId: 'eagle-feather',
            chance: 0.7,
            minQuantity: 1,
            maxQuantity: 3
          },
          {
            itemId: 'binary-chip',
            chance: 0.5,
            minQuantity: 1,
            maxQuantity: 1
          },
          {
            itemId: 'mana-potion',
            chance: 0.3,
            minQuantity: 1,
            maxQuantity: 2
          }
        ],
        rare: [
          {
            itemId: 'eagle-talon',
            chance: 0.2,
            minQuantity: 1,
            maxQuantity: 1
          }
        ],
        minGold: 45,
        maxGold: 85
      },
      expReward: 90,
      statusEffects: [],
      icon: '🦅',
      canBeStunned: true,
      canBePoisoned: true,
      isBoss: false,
      spawnWeight: 8
    },

    'packet-scorpion': {
      id: 'packet-scorpion',
      name: '패킷 스콜피온 (Packet Scorpion)',
      description: 'A venomous creature that injects corrupted data packets',
      type: MonsterType.Beast,
      rank: MonsterRank.Normal,
      level: 10,
      stats: {
        hp: 150,
        maxHp: 150,
        mp: 35,
        maxMp: 35,
        attack: 27,
        defense: 13,
        magicPower: 14,
        magicDefense: 12,
        speed: 12,
        critChance: 20,
        critDamage: 2.2,
        evasion: 14
      },
      element: ElementType.Poison,
      resistances: {
        [ElementType.Physical]: 0.3,
        [ElementType.Poison]: 0.9,
        [ElementType.Fire]: -0.3
      },
      skills: [],
      aiPattern: AIBehavior.Tactical,
      dropTable: {
        guaranteed: [],
        possible: [
          {
            itemId: 'scorpion-tail',
            chance: 0.7,
            minQuantity: 1,
            maxQuantity: 2
          },
          {
            itemId: 'packet-venom',
            chance: 0.6,
            minQuantity: 1,
            maxQuantity: 1
          },
          {
            itemId: 'antidote',
            chance: 0.3,
            minQuantity: 1,
            maxQuantity: 2
          }
        ],
        rare: [
          {
            itemId: 'venom-gland',
            chance: 0.25,
            minQuantity: 1,
            maxQuantity: 1
          }
        ],
        minGold: 50,
        maxGold: 90
      },
      expReward: 100,
      statusEffects: [],
      icon: '🦂',
      canBeStunned: true,
      canBePoisoned: false,
      isBoss: false,
      spawnWeight: 7
    },

    'logic-gate-knight': {
      id: 'logic-gate-knight',
      name: '로직 게이트 나이트 (Logic Gate Knight)',
      description: 'An armored warrior powered by boolean logic',
      type: MonsterType.Construct,
      rank: MonsterRank.Elite,
      level: 10,
      stats: {
        hp: 200,
        maxHp: 200,
        mp: 50,
        maxMp: 50,
        attack: 30,
        defense: 16,
        magicPower: 16,
        magicDefense: 16,
        speed: 10,
        critChance: 15,
        critDamage: 1.9,
        evasion: 12
      },
      element: ElementType.Physical,
      resistances: {
        [ElementType.Physical]: 0.4,
        [ElementType.Lightning]: -0.5,
        [ElementType.Poison]: 1.0
      },
      skills: [],
      aiPattern: AIBehavior.Balanced,
      dropTable: {
        guaranteed: [
          {
            itemId: 'logic-core',
            chance: 1.0,
            minQuantity: 1,
            maxQuantity: 1
          }
        ],
        possible: [
          {
            itemId: 'knight-plate',
            chance: 0.6,
            minQuantity: 1,
            maxQuantity: 1
          },
          {
            itemId: 'gate-circuit',
            chance: 0.7,
            minQuantity: 1,
            maxQuantity: 2
          },
          {
            itemId: 'health-potion',
            chance: 0.5,
            minQuantity: 2,
            maxQuantity: 3
          }
        ],
        rare: [
          {
            itemId: 'logic-sword',
            chance: 0.3,
            minQuantity: 1,
            maxQuantity: 1
          }
        ],
        minGold: 100,
        maxGold: 200
      },
      expReward: 150,
      statusEffects: [],
      icon: '🤖',
      canBeStunned: false,
      canBePoisoned: false,
      isBoss: false,
      spawnWeight: 5
    },

    'algorithm-wyvern': {
      id: 'algorithm-wyvern',
      name: '알고리즘 와이번 (Algorithm Wyvern)',
      description: 'A flying dragon that executes complex attack patterns',
      type: MonsterType.Dragon,
      rank: MonsterRank.Elite,
      level: 11,
      stats: {
        hp: 220,
        maxHp: 220,
        mp: 60,
        maxMp: 60,
        attack: 28,
        defense: 14,
        magicPower: 20,
        magicDefense: 16,
        speed: 15,
        critChance: 18,
        critDamage: 2.1,
        evasion: 18
      },
      element: ElementType.Physical,
      resistances: {
        [ElementType.Physical]: 0.2,
        [ElementType.Lightning]: -0.5,
        [ElementType.Ice]: 0.3
      },
      skills: [],
      aiPattern: AIBehavior.Tactical,
      dropTable: {
        guaranteed: [],
        possible: [
          {
            itemId: 'wyvern-scale',
            chance: 0.8,
            minQuantity: 2,
            maxQuantity: 4
          },
          {
            itemId: 'algorithm-gem',
            chance: 0.6,
            minQuantity: 1,
            maxQuantity: 1
          },
          {
            itemId: 'mana-potion',
            chance: 0.5,
            minQuantity: 2,
            maxQuantity: 3
          }
        ],
        rare: [
          {
            itemId: 'wyvern-wing',
            chance: 0.3,
            minQuantity: 1,
            maxQuantity: 1
          }
        ],
        minGold: 110,
        maxGold: 220
      },
      expReward: 165,
      statusEffects: [],
      icon: '🐉',
      canBeStunned: false,
      canBePoisoned: false,
      isBoss: false,
      spawnWeight: 4
    },

    'data-tyrant': {
      id: 'data-tyrant',
      name: '데이터 타이런트 (Data Tyrant)',
      description: 'The boss of Bit Plains. A tyrannical overlord that commands vast data streams.',
      type: MonsterType.Dragon,
      rank: MonsterRank.Boss,
      level: 12,
      stats: {
        hp: 1000,
        maxHp: 1000,
        mp: 120,
        maxMp: 120,
        attack: 35,
        defense: 20,
        magicPower: 25,
        magicDefense: 20,
        speed: 12,
        critChance: 20,
        critDamage: 2.3,
        evasion: 14
      },
      element: ElementType.Lightning,
      resistances: {
        [ElementType.Physical]: 0.3,
        [ElementType.Lightning]: 0.7,
        [ElementType.Fire]: 0.2,
        [ElementType.Ice]: -0.4,
        [ElementType.Poison]: 0.5
      },
      skills: [],
      aiPattern: AIBehavior.Tactical,
      dropTable: {
        guaranteed: [
          {
            itemId: 'tyrant-core',
            chance: 1.0,
            minQuantity: 1,
            maxQuantity: 1
          },
          {
            itemId: 'save-token',
            chance: 1.0,
            minQuantity: 2,
            maxQuantity: 2
          }
        ],
        possible: [
          {
            itemId: 'health-potion',
            chance: 1.0,
            minQuantity: 4,
            maxQuantity: 6
          },
          {
            itemId: 'mana-potion',
            chance: 1.0,
            minQuantity: 3,
            maxQuantity: 5
          },
          {
            itemId: 'data-shard',
            chance: 0.9,
            minQuantity: 2,
            maxQuantity: 4
          }
        ],
        rare: [
          {
            itemId: 'tyrant-crown',
            chance: 0.5,
            minQuantity: 1,
            maxQuantity: 1
          },
          {
            itemId: 'data-blade',
            chance: 0.4,
            minQuantity: 1,
            maxQuantity: 1
          },
          {
            itemId: 'lightning-ring',
            chance: 0.3,
            minQuantity: 1,
            maxQuantity: 1
          }
        ],
        minGold: 600,
        maxGold: 1200
      },
      expReward: 1200,
      statusEffects: [],
      icon: '👑',
      canBeStunned: false,
      canBePoisoned: false,
      isBoss: true,
      spawnWeight: 0
    }
  };

  for (const jsonMonster of loadJsonMonsters()) {
    if (!monsters[jsonMonster.id]) {
      monsters[jsonMonster.id] = buildMonsterFromJson(jsonMonster);
    }
  }

  for (const ref of loadLocationMonsterReferences()) {
    if (!monsters[ref.id]) {
      monsters[ref.id] = createGeneratedLocationMonster(ref.id, ref.level, ref.isBoss);
    }
  }

  monsterCache = monsters;
  return monsterCache;
}

/**
 * Get a random monster by level range
 */
export function getRandomMonster(
  monsters: Record<string, Monster>,
  minLevel: number,
  maxLevel: number
): Monster | null {
  const eligibleMonsters = Object.values(monsters).filter(
    m => m.level >= minLevel && m.level <= maxLevel
  );

  if (eligibleMonsters.length === 0) {
    return null;
  }

  // Weighted random selection
  const totalWeight = eligibleMonsters.reduce((sum, m) => sum + m.spawnWeight, 0);
  let random = Math.random() * totalWeight;

  for (const monster of eligibleMonsters) {
    random -= monster.spawnWeight;
    if (random <= 0) {
      return monster;
    }
  }

  return eligibleMonsters[eligibleMonsters.length - 1];
}
