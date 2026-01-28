/**
 * Game state and system type definitions for Terminal Quest
 */

import { Player } from './character.js';
import { AnyItem } from './item.js';
import { Monster, MonsterInstance } from './monster.js';
import { Location, SavePoint, PlayerPosition, FastTravelPoint } from './location.js';

/**
 * Game difficulty modes
 */
export enum GameMode {
  /** Easy mode - balanced for story experience */
  Story = 'story',
  /** Normal mode - standard challenge */
  Adventure = 'adventure',
  /** Hard mode - increased difficulty */
  Challenge = 'challenge',
  /** Extreme mode - permadeath enabled */
  Hardcore = 'hardcore'
}

/**
 * Game mode configuration
 */
export interface GameModeConfig {
  /** Mode identifier */
  mode: GameMode;
  /** Display name */
  name: string;
  /** Description */
  description: string;
  /** Damage taken multiplier */
  damageTakenMultiplier: number;
  /** Damage dealt multiplier */
  damageDealtMultiplier: number;
  /** Experience gain multiplier */
  expMultiplier: number;
  /** Gold gain multiplier */
  goldMultiplier: number;
  /** Drop rate multiplier */
  dropRateMultiplier: number;
  /** Permadeath enabled */
  permadeath: boolean;
  /** Save restrictions */
  saveRestrictions: boolean;
}

/**
 * Quest objective types
 */
export enum QuestObjectiveType {
  Kill = 'kill',
  Collect = 'collect',
  Explore = 'explore',
  Talk = 'talk',
  Escort = 'escort',
  Survive = 'survive'
}

/**
 * Quest objective
 */
export interface QuestObjective {
  /** Objective description */
  description: string;
  /** Objective type */
  type: QuestObjectiveType;
  /** Target ID (monster/item/location/NPC) */
  targetId: string;
  /** Required amount */
  requiredAmount: number;
  /** Current progress */
  currentAmount: number;
  /** Is completed */
  completed: boolean;
}

/**
 * Quest status
 */
export enum QuestStatus {
  NotStarted = 'not-started',
  Active = 'active',
  Completed = 'completed',
  Failed = 'failed'
}

/**
 * Quest definition
 */
export interface Quest {
  /** Quest identifier */
  id: string;
  /** Display name */
  name: string;
  /** Quest description */
  description: string;
  /** Quest giver NPC */
  questGiver: string;
  /** Required level */
  requiredLevel: number;
  /** Prerequisites (quest IDs) */
  prerequisites: string[];
  /** Quest objectives */
  objectives: QuestObjective[];
  /** Rewards */
  rewards: {
    /** Experience reward */
    exp: number;
    /** Gold reward */
    gold: number;
    /** Item rewards */
    items: string[];
    /** Unlocked locations */
    unlocksLocations?: string[];
  };
  /** Quest status */
  status: QuestStatus;
  /** Is main story quest */
  isMainQuest: boolean;
  /** Is repeatable */
  repeatable: boolean;
  /** Time limit in seconds (if any) */
  timeLimit?: number;
  /** Failure conditions */
  failureConditions?: string[];
}

/**
 * Combat state
 */
export enum CombatState {
  PlayerTurn = 'player-turn',
  EnemyTurn = 'enemy-turn',
  Victory = 'victory',
  Defeat = 'defeat',
  Escaped = 'escaped'
}

/**
 * Combat encounter
 */
export interface CombatEncounter {
  /** Encounter ID */
  id: string;
  /** Enemy instances */
  enemies: MonsterInstance[];
  /** Combat turn counter */
  turn: number;
  /** Current combat state */
  state: CombatState;
  /** Turn order queue */
  turnOrder: string[];
  /** Is boss fight */
  isBossFight: boolean;
  /** Can escape from combat */
  canEscape: boolean;
  /** Background/location */
  location: string;
}

/**
 * Game state machine states
 */
export enum GameStateType {
  MainMenu = 'main-menu',
  CharacterCreation = 'character-creation',
  Exploration = 'exploration',
  Combat = 'combat',
  Inventory = 'inventory',
  Shop = 'shop',
  Dialog = 'dialog',
  Quest = 'quest',
  SaveLoad = 'save-load',
  GameOver = 'game-over',
  Paused = 'paused'
}

/**
 * Statistics tracking
 */
export interface GameStatistics {
  /** Total play time in seconds */
  totalPlayTime: number;
  /** Enemies defeated by type */
  enemiesDefeated: Record<string, number>;
  /** Total damage dealt */
  totalDamageDealt: number;
  /** Total damage taken */
  totalDamageTaken: number;
  /** Bosses defeated */
  bossesDefeated: string[];
  /** Quests completed */
  questsCompleted: number;
  /** Items collected */
  itemsCollected: number;
  /** Locations discovered */
  locationsDiscovered: number;
  /** Gold earned */
  goldEarned: number;
  /** Gold spent */
  goldSpent: number;
  /** Deaths */
  deaths: number;
  /** Highest level reached */
  highestLevel: number;
  /** Fastest boss kill (in turns) */
  fastestBossKill?: number;
}

/**
 * Main game state
 */
export interface GameState {
  /** Game state type */
  stateType: GameStateType;
  /** Game mode/difficulty */
  gameMode: GameMode;
  /** Player data */
  player: Player;
  /** Current position */
  position: PlayerPosition;
  /** Active combat encounter (if any) */
  activeCombat?: CombatEncounter;
  /** All game items (database) */
  items: Record<string, AnyItem>;
  /** All monsters (database) */
  monsters: Record<string, Monster>;
  /** All locations (database) */
  locations: Record<string, Location>;
  /** All save points */
  savePoints: Record<string, SavePoint>;
  /** All quests */
  quests: Record<string, Quest>;
  /** Fast travel points */
  fastTravelPoints: FastTravelPoint[];
  /** Game statistics */
  statistics: GameStatistics;
  /** Game flags (for events/triggers) */
  flags: Record<string, boolean>;
  /** Save file name */
  saveFileName?: string;
  /** Last save timestamp */
  lastSaveTime?: number;
  /** Game version */
  gameVersion: string;
}

/**
 * Save data structure
 */
export interface SaveData {
  /** Save file version */
  version: string;
  /** Save file name */
  fileName: string;
  /** Save timestamp */
  timestamp: number;
  /** Game mode */
  gameMode: GameMode;
  /** Player data */
  player: Player;
  /** Current position */
  position: PlayerPosition;
  /** Completed quests */
  completedQuests: string[];
  /** Active quests */
  activeQuests: string[];
  /** Unlocked locations */
  unlockedLocations: string[];
  /** Discovered save points */
  discoveredSavePoints: string[];
  /** Fast travel points */
  fastTravelPoints: FastTravelPoint[];
  /** Game statistics */
  statistics: GameStatistics;
  /** Game flags */
  flags: Record<string, boolean>;
  /** Auto-save flag */
  isAutoSave: boolean;
}

/**
 * Save file metadata (for save/load menu)
 */
export interface SaveFileMetadata {
  /** File name */
  fileName: string;
  /** Character name */
  characterName: string;
  /** Character level */
  level: number;
  /** Current location name */
  locationName: string;
  /** Play time */
  playTime: number;
  /** Save timestamp */
  timestamp: number;
  /** Game mode */
  gameMode: GameMode;
  /** Is auto-save */
  isAutoSave: boolean;
}

/**
 * Game configuration
 */
export interface GameConfig {
  /** Game title */
  title: string;
  /** Game version */
  version: string;
  /** Auto-save enabled */
  autoSave: boolean;
  /** Auto-save interval (seconds) */
  autoSaveInterval: number;
  /** Maximum save slots */
  maxSaveSlots: number;
  /** Combat animation speed */
  animationSpeed: number;
  /** Text display speed */
  textSpeed: number;
  /** Starting location */
  startingLocation: string;
}
