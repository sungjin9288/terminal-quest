/**
 * Save system type definitions for Terminal Quest
 */

import { GameState } from './game.js';
import type { AchievementTrackingMode } from './achievement.js';

/**
 * Save slot data
 */
export interface SaveSlot {
  /** Slot number (1-3) */
  slotNumber: number;
  /** Save schema version */
  schemaVersion?: string;
  /** Game state */
  gameState: GameState;
  /** Save timestamp */
  savedAt: number;
  /** Save location name */
  locationName: string;
  /** Player name */
  playerName: string;
  /** Player level */
  playerLevel: number;
  /** Total play time in seconds */
  playTime: number;
  /** Save type */
  saveType: SaveType;
}

/**
 * Save type
 */
export enum SaveType {
  Auto = 'auto',
  Manual = 'manual',
  Emergency = 'emergency'
}

/**
 * Save slot metadata (for list display)
 */
export interface SaveSlotMetadata {
  slotNumber: number;
  exists: boolean;
  schemaVersion?: string;
  savedAt?: number;
  locationName?: string;
  playerName?: string;
  playerLevel?: number;
  playTime?: number;
  saveType?: SaveType;
  achievementCount?: number;
  achievementTotal?: number;
  resumeTitle?: string;
  resumeHint?: string;
  achievementTrackingMode?: AchievementTrackingMode;
  achievementTrackingHistory?: string;
  achievementTrackingHistoryAt?: number;
  trackedAchievementTitle?: string;
  trackedAchievementProgress?: string;
  trackedAchievementHint?: string;
  nextAchievementTitle?: string;
  nextAchievementProgress?: string;
  nextAchievementHint?: string;
  achievementPerkSummary?: string[];
}

/**
 * Save result
 */
export interface SaveResult {
  success: boolean;
  message: string;
  slotNumber?: number;
}

/**
 * Load result
 */
export interface LoadResult {
  success: boolean;
  message: string;
  gameState?: GameState;
  saveSchemaVersion?: string;
}
