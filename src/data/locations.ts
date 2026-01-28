/**
 * Terminal Quest - Location Data Manager
 * Loads and manages location data from JSON
 */

import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Location save point data
 */
export interface LocationSavePoint {
  id: string;
  name: string;
  position: string;
}

/**
 * Location unlock condition
 */
export interface UnlockCondition {
  type: 'boss-defeated' | 'act-complete' | 'quest-complete';
  target: string | number;
}

/**
 * Location rewards
 */
export interface LocationRewards {
  firstClear?: {
    exp: number;
    gold: number;
    items: string[];
    skillPoints?: number;
  };
  actClearBonus?: boolean;
}

/**
 * Game location data
 */
export interface GameLocation {
  id: string;
  name: string;
  act: number;
  order: number;
  recommendedLevel: [number, number];
  targetPlaytime: string;
  description: string;
  theme: string;
  difficulty: string;
  monsters: string[];
  miniBoss?: string | string[] | null;
  boss: string;
  savePoints: LocationSavePoint[];
  connections: string[];
  unlockCondition: UnlockCondition | null;
  rewards: LocationRewards;
  environmentEffects: string[];
  bgm: string;
  floors?: number;
  sections?: string[];
  isFinalDungeon?: boolean;
  finalBoss?: boolean;
}

/**
 * Hub town data
 */
export interface HubTown {
  id: string;
  name: string;
  description: string;
  type: string;
  facilities: string[];
  connections: string[];
}

/**
 * Act summary data
 */
export interface ActSummary {
  name: string;
  maps: string[];
  targetPlaytime: string;
  levelRange: [number, number];
  totalSavePoints: number;
  clearRewards?: {
    skillPoints?: number;
    saveTokens?: number;
    unlocks?: string[];
  };
}

/**
 * Location database
 */
interface LocationDatabase {
  hub: HubTown;
  locations: GameLocation[];
  actSummary: Record<string, ActSummary>;
}

let locationCache: LocationDatabase | null = null;

/**
 * Load location data from JSON
 */
function loadLocationData(): LocationDatabase {
  if (locationCache) {
    return locationCache;
  }

  try {
    const dataPath = join(__dirname, '../../data/locations.json');
    const rawData = readFileSync(dataPath, 'utf-8');
    const data = JSON.parse(rawData);

    locationCache = {
      hub: data.hub,
      locations: data.locations,
      actSummary: data.actSummary
    };

    return locationCache;
  } catch (_error) {
    // Return default data if file not found
    return getDefaultLocationData();
  }
}

/**
 * Get default location data (fallback)
 */
function getDefaultLocationData(): LocationDatabase {
  return {
    hub: {
      id: 'bit-town',
      name: '비트 타운 (Bit Town)',
      description: 'The central hub town where adventurers gather.',
      type: 'town',
      facilities: ['shop', 'inn', 'save-point'],
      connections: ['memory-forest']
    },
    locations: [
      {
        id: 'memory-forest',
        name: '메모리 숲 (Memory Forest)',
        act: 1,
        order: 1,
        recommendedLevel: [1, 5],
        targetPlaytime: '15-20분',
        description: 'A mystical forest where fragmented memories drift like fireflies.',
        theme: 'forest',
        difficulty: 'easy',
        monsters: ['bug-slime', '404-ghost', 'spambot'],
        miniBoss: 'glitch-wolf',
        boss: 'memory-leak-titan',
        savePoints: [
          { id: 'memory-forest-entrance', name: '숲 입구', position: 'start' }
        ],
        connections: ['bit-town', 'cache-cave'],
        unlockCondition: null,
        rewards: { firstClear: { exp: 500, gold: 300, items: ['memory-core'] } },
        environmentEffects: ['memory-fog'],
        bgm: 'forest-of-memories'
      }
    ],
    actSummary: {
      act1: {
        name: '기초 (Foundation)',
        maps: ['memory-forest', 'cache-cave', 'bit-plains'],
        targetPlaytime: '45-60분',
        levelRange: [1, 12],
        totalSavePoints: 8
      }
    }
  };
}

/**
 * Get hub town data
 */
export function getHubTown(): HubTown {
  return loadLocationData().hub;
}

/**
 * Get all locations
 */
export function getAllLocations(): GameLocation[] {
  return loadLocationData().locations;
}

/**
 * Get location by ID
 */
export function getLocationById(id: string): GameLocation | HubTown | null {
  const data = loadLocationData();

  if (data.hub.id === id) {
    return data.hub;
  }

  return data.locations.find(loc => loc.id === id) || null;
}

/**
 * Get locations by act
 */
export function getLocationsByAct(act: number): GameLocation[] {
  return loadLocationData().locations.filter(loc => loc.act === act);
}

/**
 * Get connected locations for a given location
 */
export function getConnectedLocations(locationId: string): (GameLocation | HubTown)[] {
  const data = loadLocationData();

  // Check if it's the hub
  if (data.hub.id === locationId) {
    return data.locations.filter(loc =>
      data.hub.connections.includes(loc.id)
    );
  }

  // Find the location
  const location = data.locations.find(loc => loc.id === locationId);
  if (!location) return [];

  const connected: (GameLocation | HubTown)[] = [];

  for (const connId of location.connections) {
    if (connId === data.hub.id) {
      connected.push(data.hub);
    } else {
      const connLoc = data.locations.find(loc => loc.id === connId);
      if (connLoc) {
        connected.push(connLoc);
      }
    }
  }

  return connected;
}

/**
 * Check if location is unlocked for player
 */
export function isLocationUnlocked(
  locationId: string,
  defeatedBosses: string[],
  completedActs: number[]
): boolean {
  const data = loadLocationData();

  // Hub is always unlocked
  if (data.hub.id === locationId) {
    return true;
  }

  const location = data.locations.find(loc => loc.id === locationId);
  if (!location) return false;

  // No unlock condition = always unlocked
  if (!location.unlockCondition) {
    return true;
  }

  const condition = location.unlockCondition;

  switch (condition.type) {
    case 'boss-defeated':
      return defeatedBosses.includes(condition.target as string);
    case 'act-complete':
      return completedActs.includes(condition.target as number);
    case 'quest-complete':
      // TODO: Implement quest check
      return false;
    default:
      return false;
  }
}

/**
 * Get location display name
 */
export function getLocationDisplayName(locationId: string): string {
  const location = getLocationById(locationId);
  if (!location) return locationId;
  return location.name;
}

/**
 * Get location monsters
 */
export function getLocationMonsters(locationId: string): string[] {
  const location = getLocationById(locationId);
  if (!location || !('monsters' in location)) return [];
  return (location as GameLocation).monsters;
}

/**
 * Get location difficulty
 */
export function getLocationDifficulty(locationId: string): string {
  const location = getLocationById(locationId);
  if (!location || !('difficulty' in location)) return 'safe';
  return (location as GameLocation).difficulty;
}

/**
 * Get location boss
 */
export function getLocationBoss(locationId: string): string | null {
  const location = getLocationById(locationId);
  if (!location || !('boss' in location)) return null;
  return (location as GameLocation).boss;
}

/**
 * Check if location is a town (safe zone)
 */
export function isTownLocation(locationId: string): boolean {
  const data = loadLocationData();
  return data.hub.id === locationId;
}

/**
 * Get act summary
 */
export function getActSummary(act: number): ActSummary | null {
  const data = loadLocationData();
  return data.actSummary[`act${act}`] || null;
}

/**
 * Get Act 1 locations (for initial playability)
 */
export function getAct1Locations(): GameLocation[] {
  return getLocationsByAct(1);
}

/**
 * Get recommended level for location
 */
export function getRecommendedLevel(locationId: string): [number, number] | null {
  const location = getLocationById(locationId);
  if (!location || !('recommendedLevel' in location)) return null;
  return (location as GameLocation).recommendedLevel;
}

/**
 * Check if player level is appropriate for location
 */
export function isLevelAppropriate(playerLevel: number, locationId: string): 'under' | 'appropriate' | 'over' {
  const recommended = getRecommendedLevel(locationId);
  if (!recommended) return 'appropriate';

  if (playerLevel < recommended[0]) return 'under';
  if (playerLevel > recommended[1] + 3) return 'over';
  return 'appropriate';
}
