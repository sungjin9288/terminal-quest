import {
  GameState,
  Monster
} from '../types/index.js';

export interface SeasonalEventDefinition {
  id: string;
  name: string;
  description: string;
  activeMonths: number[];
  encounterStatMultiplier: number;
  encounterGoldMultiplier: number;
  encounterExpMultiplier: number;
  dropChanceBonus: number;
  questExpMultiplier: number;
  questGoldMultiplier: number;
  bonusQuestItemId?: string;
  bonusQuestItemCycle?: number;
}

export interface SeasonalQuestBonus {
  eventId: string;
  eventName: string;
  expBonus: number;
  goldBonus: number;
  bonusItemId?: string;
  bonusItemTriggered: boolean;
}

const SEASONAL_EVENT_FLAG_PREFIX = 'seasonal-event-';

const SEASONAL_EVENTS: readonly SeasonalEventDefinition[] = [
  {
    id: 'spring-memory-festival',
    name: '봄 메모리 페스티벌',
    description: '안정화 파동으로 보상이 증가하고 전투 난이도는 소폭 상승합니다.',
    activeMonths: [3, 4, 5],
    encounterStatMultiplier: 1.04,
    encounterGoldMultiplier: 1.12,
    encounterExpMultiplier: 1.08,
    dropChanceBonus: 0.04,
    questExpMultiplier: 1.1,
    questGoldMultiplier: 1.1,
    bonusQuestItemId: 'save-token',
    bonusQuestItemCycle: 3
  },
  {
    id: 'summer-overclock-rush',
    name: '여름 오버클럭 러시',
    description: '적이 강해지지만 경험치와 골드 획득량이 크게 증가합니다.',
    activeMonths: [6, 7, 8],
    encounterStatMultiplier: 1.11,
    encounterGoldMultiplier: 1.22,
    encounterExpMultiplier: 1.16,
    dropChanceBonus: 0.03,
    questExpMultiplier: 1.12,
    questGoldMultiplier: 1.14,
    bonusQuestItemId: 'quantum-tonic',
    bonusQuestItemCycle: 5
  },
  {
    id: 'autumn-harvest-hunt',
    name: '가을 수확 헌트',
    description: '드랍률과 골드 보너스가 높아져 파밍 효율이 개선됩니다.',
    activeMonths: [9, 10, 11],
    encounterStatMultiplier: 1.06,
    encounterGoldMultiplier: 1.28,
    encounterExpMultiplier: 1.1,
    dropChanceBonus: 0.08,
    questExpMultiplier: 1.1,
    questGoldMultiplier: 1.18,
    bonusQuestItemId: 'stability-draught',
    bonusQuestItemCycle: 4
  },
  {
    id: 'winter-hardening-drive',
    name: '겨울 하드닝 드라이브',
    description: '강적 출현 확률이 높아지고 클리어 보상이 상승합니다.',
    activeMonths: [12, 1, 2],
    encounterStatMultiplier: 1.13,
    encounterGoldMultiplier: 1.18,
    encounterExpMultiplier: 1.14,
    dropChanceBonus: 0.05,
    questExpMultiplier: 1.14,
    questGoldMultiplier: 1.12,
    bonusQuestItemId: 'save-token',
    bonusQuestItemCycle: 2
  }
];

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function getSeasonalEventFlagId(eventId: string): string {
  return `${SEASONAL_EVENT_FLAG_PREFIX}${eventId}`;
}

function clearSeasonalEventFlags(gameState: GameState): void {
  for (const key of Object.keys(gameState.flags)) {
    if (key.startsWith(SEASONAL_EVENT_FLAG_PREFIX)) {
      delete gameState.flags[key];
    }
  }
}

export function listSeasonalEvents(): readonly SeasonalEventDefinition[] {
  return SEASONAL_EVENTS;
}

export function getSeasonalEventNameById(eventId: string): string | null {
  const event = SEASONAL_EVENTS.find(candidate => candidate.id === eventId);
  return event?.name ?? null;
}

export function getCurrentSeasonalEvent(
  referenceDate: Date = new Date()
): SeasonalEventDefinition {
  const month = referenceDate.getMonth() + 1;
  const event = SEASONAL_EVENTS.find(candidate =>
    candidate.activeMonths.includes(month)
  );

  return event ?? SEASONAL_EVENTS[0];
}

export function refreshSeasonalEventState(
  gameState: GameState,
  referenceDate: Date = new Date()
): SeasonalEventDefinition {
  const activeEvent = getCurrentSeasonalEvent(referenceDate);
  clearSeasonalEventFlags(gameState);
  gameState.flags[getSeasonalEventFlagId(activeEvent.id)] = true;
  return activeEvent;
}

export function getActiveSeasonalEvent(
  gameState: GameState
): SeasonalEventDefinition | null {
  for (const event of SEASONAL_EVENTS) {
    if (gameState.flags[getSeasonalEventFlagId(event.id)] === true) {
      return event;
    }
  }

  return null;
}

export function isSeasonalQuestActive(
  gameState: GameState,
  seasonalEventId?: string
): boolean {
  if (!seasonalEventId) {
    return true;
  }

  const activeEvent = getActiveSeasonalEvent(gameState);
  return activeEvent?.id === seasonalEventId;
}

export function scaleMonsterForSeasonalEvent(
  monster: Monster,
  seasonalEvent: SeasonalEventDefinition | null
): Monster {
  if (!seasonalEvent) {
    return monster;
  }

  const statMultiplier = seasonalEvent.encounterStatMultiplier;
  const hpMultiplier = 1 + (statMultiplier - 1) * 1.1;
  const speedMultiplier = 1 + (statMultiplier - 1) * 0.6;
  const scaledMaxHp = Math.max(1, Math.floor(monster.stats.maxHp * hpMultiplier));
  const scaledMaxMp = Math.max(1, Math.floor(monster.stats.maxMp * hpMultiplier));
  const hpRatio = monster.stats.maxHp > 0 ? monster.stats.hp / monster.stats.maxHp : 1;
  const mpRatio = monster.stats.maxMp > 0 ? monster.stats.mp / monster.stats.maxMp : 1;

  const minGold = Math.max(
    monster.dropTable.minGold,
    Math.floor(monster.dropTable.minGold * seasonalEvent.encounterGoldMultiplier)
  );
  const maxGold = Math.max(
    minGold,
    Math.floor(monster.dropTable.maxGold * seasonalEvent.encounterGoldMultiplier)
  );

  return {
    ...monster,
    stats: {
      ...monster.stats,
      hp: Math.max(1, Math.min(scaledMaxHp, Math.floor(scaledMaxHp * hpRatio))),
      maxHp: scaledMaxHp,
      mp: Math.max(1, Math.min(scaledMaxMp, Math.floor(scaledMaxMp * mpRatio))),
      maxMp: scaledMaxMp,
      attack: Math.max(1, Math.floor(monster.stats.attack * statMultiplier)),
      defense: Math.max(1, Math.floor(monster.stats.defense * statMultiplier)),
      magicPower: Math.max(1, Math.floor(monster.stats.magicPower * statMultiplier)),
      magicDefense: Math.max(1, Math.floor(monster.stats.magicDefense * statMultiplier)),
      speed: Math.max(1, Math.floor(monster.stats.speed * speedMultiplier)),
      critChance: clamp(monster.stats.critChance + Math.floor((statMultiplier - 1) * 100 * 0.3), 0, 100),
      critDamage: monster.stats.critDamage
    },
    expReward: Math.max(
      monster.expReward,
      Math.floor(monster.expReward * seasonalEvent.encounterExpMultiplier)
    ),
    dropTable: {
      ...monster.dropTable,
      possible: monster.dropTable.possible.map(drop => ({
        ...drop,
        chance: clamp(drop.chance + seasonalEvent.dropChanceBonus, 0, 1)
      })),
      rare: monster.dropTable.rare.map(drop => ({
        ...drop,
        chance: clamp(drop.chance + seasonalEvent.dropChanceBonus * 0.75, 0, 1)
      })),
      minGold,
      maxGold
    }
  };
}

export function buildSeasonalQuestBonus(
  gameState: GameState,
  baseExp: number,
  baseGold: number
): SeasonalQuestBonus | null {
  const activeEvent = getActiveSeasonalEvent(gameState);
  if (!activeEvent) {
    return null;
  }

  const expBonus = Math.max(
    0,
    Math.floor(baseExp * (activeEvent.questExpMultiplier - 1))
  );
  const goldBonus = Math.max(
    0,
    Math.floor(baseGold * (activeEvent.questGoldMultiplier - 1))
  );

  const completionIndex = gameState.statistics.questsCompleted + 1;
  const cycle = activeEvent.bonusQuestItemCycle ?? 0;
  const bonusItemTriggered = Boolean(
    activeEvent.bonusQuestItemId &&
    cycle > 0 &&
    completionIndex % cycle === 0
  );

  return {
    eventId: activeEvent.id,
    eventName: activeEvent.name,
    expBonus,
    goldBonus,
    bonusItemId: activeEvent.bonusQuestItemId,
    bonusItemTriggered
  };
}
