/**
 * Location and map type definitions for Terminal Quest
 */

import { MonsterSpawn, EnemyParty } from './monster.js';

/**
 * Location types
 */
export enum LocationType {
  Town = 'town',
  Dungeon = 'dungeon',
  Forest = 'forest',
  Cave = 'cave',
  Mountain = 'mountain',
  Plains = 'plains',
  Ruins = 'ruins',
  Castle = 'castle',
  Temple = 'temple',
  Wilderness = 'wilderness'
}

/**
 * Location difficulty tier
 */
export enum LocationDifficulty {
  Beginner = 'beginner',
  Easy = 'easy',
  Normal = 'normal',
  Hard = 'hard',
  Expert = 'expert',
  Master = 'master',
  Nightmare = 'nightmare'
}

/**
 * Point of interest within a location
 */
export interface PointOfInterest {
  /** POI identifier */
  id: string;
  /** Display name */
  name: string;
  /** Description */
  description: string;
  /** Type of POI */
  type: 'merchant' | 'trainer' | 'quest-giver' | 'treasure' | 'boss' | 'save-point' | 'exit';
  /** Is currently accessible */
  accessible: boolean;
  /** Required quest completion (if any) */
  requiredQuest?: string;
  /** Associated NPC (if any) */
  npcId?: string;
}

/**
 * Save point definition
 */
export interface SavePoint {
  /** Save point identifier */
  id: string;
  /** Display name */
  name: string;
  /** Location description */
  description: string;
  /** Location ID where this save point is */
  locationId: string;
  /** Restores HP/MP on use */
  restoresHealth: boolean;
  /** Removes debuffs on use */
  clearsDebuffs: boolean;
  /** Can fast travel from here */
  allowsFastTravel: boolean;
  /** Is currently discovered */
  discovered: boolean;
}

/**
 * Location connection/exit
 */
export interface LocationConnection {
  /** Target location ID */
  targetLocationId: string;
  /** Display name for the connection */
  name: string;
  /** Description of the path */
  description: string;
  /** Required level to access */
  requiredLevel: number;
  /** Required quest completion (if any) */
  requiredQuest?: string;
  /** Is locked/blocked */
  locked: boolean;
  /** Key item required to unlock (if any) */
  requiredKey?: string;
}

/**
 * Environmental hazard
 */
export interface EnvironmentalHazard {
  /** Hazard type */
  type: 'poison' | 'fire' | 'cold' | 'dark' | 'curse';
  /** Damage per step/turn */
  damagePerTurn: number;
  /** Can be resisted with equipment */
  resistable: boolean;
  /** Description */
  description: string;
}

/**
 * Location definition
 */
export interface Location {
  /** Unique location identifier */
  id: string;
  /** Display name */
  name: string;
  /** Location description */
  description: string;
  /** Location type */
  type: LocationType;
  /** Difficulty tier */
  difficulty: LocationDifficulty;
  /** Recommended player level */
  recommendedLevel: number;
  /** Minimum level to enter */
  minLevel: number;
  /** Monster spawns in this location */
  monsterSpawns: MonsterSpawn[];
  /** Enemy party configurations */
  enemyParties: EnemyParty[];
  /** Boss monster ID (if any) */
  bossId?: string;
  /** Points of interest */
  pointsOfInterest: PointOfInterest[];
  /** Save points in this location */
  savePoints: string[];
  /** Connected locations */
  connections: LocationConnection[];
  /** Environmental hazards */
  hazards: EnvironmentalHazard[];
  /** Background music track */
  musicTrack?: string;
  /** Is safe zone (no random encounters) */
  isSafeZone: boolean;
  /** Has merchant/shop */
  hasMerchant: boolean;
  /** Has inn/rest area */
  hasInn: boolean;
  /** Has quest givers */
  hasQuests: boolean;
  /** Is currently discovered */
  discovered: boolean;
  /** Icon/emoji for display */
  icon: string;
  /** Flavor text for atmosphere */
  atmosphereText: string[];
}

/**
 * World map region
 */
export interface Region {
  /** Region identifier */
  id: string;
  /** Display name */
  name: string;
  /** Description */
  description: string;
  /** Locations in this region */
  locationIds: string[];
  /** Is currently discovered */
  discovered: boolean;
  /** Completion percentage */
  completionPercentage: number;
}

/**
 * Fast travel point
 */
export interface FastTravelPoint {
  /** Save point ID */
  savePointId: string;
  /** Display name */
  name: string;
  /** Location ID */
  locationId: string;
  /** Is unlocked */
  unlocked: boolean;
  /** Cost to travel (if any) */
  travelCost: number;
}

/**
 * Player's current position
 */
export interface PlayerPosition {
  /** Current location ID */
  locationId: string;
  /** Last save point ID */
  lastSavePointId?: string;
  /** Area within location (if applicable) */
  area?: string;
  /** Steps taken in this location */
  stepsTaken: number;
}
