import {
  GameState,
  QuestHistoryEntry,
  QuestHistoryType
} from '../types/game.js';
import { ensureEndgameChallengeState } from './endgameChallenge.js';
import { ensureQuestState } from './quest.js';

const BASE_MIGRATION_VERSION = '0.0.0';
export const CURRENT_GAME_STATE_VERSION = '1.0.0';
export const CURRENT_SAVE_SCHEMA_VERSION = '1.0.0';
export const QUEST_HISTORY_LIMIT = 60;

const QUEST_HISTORY_TYPES: ReadonlySet<QuestHistoryType> = new Set([
  'accepted',
  'progress',
  'ready',
  'completed',
  'reward',
  'system'
]);

function isQuestHistoryType(value: unknown): value is QuestHistoryType {
  return typeof value === 'string' && QUEST_HISTORY_TYPES.has(value as QuestHistoryType);
}

function normalizeQuestHistoryEntry(value: unknown): QuestHistoryEntry | null {
  if (typeof value !== 'object' || value === null) {
    return null;
  }

  const raw = value as Record<string, unknown>;
  const message = typeof raw.message === 'string' ? raw.message.trim() : '';
  if (message.length === 0) {
    return null;
  }

  const timestamp = typeof raw.timestamp === 'number' && Number.isFinite(raw.timestamp)
    ? raw.timestamp
    : Date.now();
  const type: QuestHistoryType = isQuestHistoryType(raw.type) ? raw.type : 'system';
  const questId = typeof raw.questId === 'string' && raw.questId.trim().length > 0
    ? raw.questId.trim()
    : undefined;

  return {
    timestamp,
    type,
    message,
    questId
  };
}

function parseVersion(version: string): [number, number, number] | null {
  const match = version.match(/^(\d+)\.(\d+)\.(\d+)$/);
  if (!match) {
    return null;
  }

  return [Number(match[1]), Number(match[2]), Number(match[3])];
}

function normalizeVersion(version?: string): string {
  if (!version) {
    return BASE_MIGRATION_VERSION;
  }

  return parseVersion(version) ? version : BASE_MIGRATION_VERSION;
}

function compareVersions(a: string, b: string): number {
  const aParts = parseVersion(a) ?? [0, 0, 0];
  const bParts = parseVersion(b) ?? [0, 0, 0];

  if (aParts[0] !== bParts[0]) return aParts[0] - bParts[0];
  if (aParts[1] !== bParts[1]) return aParts[1] - bParts[1];
  return aParts[2] - bParts[2];
}

/**
 * Ensure quest history state exists and sanitize malformed entries from legacy saves.
 */
export function ensureQuestHistoryState(gameState: GameState): void {
  const legacyGameState = gameState as GameState & { questHistory?: unknown };
  if (!Array.isArray(legacyGameState.questHistory)) {
    gameState.questHistory = [];
    return;
  }

  const normalizedHistory = legacyGameState.questHistory
    .map(normalizeQuestHistoryEntry)
    .filter((entry): entry is QuestHistoryEntry => entry !== null)
    .slice(0, QUEST_HISTORY_LIMIT);

  gameState.questHistory = normalizedHistory;
}

function migrateToV1_0_0(gameState: GameState): void {
  const legacyGameState = gameState as GameState & { quests?: Record<string, unknown> };
  if (!legacyGameState.quests || typeof legacyGameState.quests !== 'object') {
    legacyGameState.quests = {};
  }
}

interface MigrationStep {
  id: string;
  fromVersion: string;
  toVersion: string;
  apply: (gameState: GameState) => void;
}

const MIGRATION_STEPS: MigrationStep[] = [
  {
    id: 'v0-to-v1',
    fromVersion: BASE_MIGRATION_VERSION,
    toVersion: CURRENT_SAVE_SCHEMA_VERSION,
    apply: migrateToV1_0_0
  }
];

export interface GameStateMigrationResult {
  sourceVersion: string;
  targetVersion: string;
  appliedMigrations: string[];
}

/**
 * Apply all backwards-compatible runtime migrations for loaded game states.
 */
export function migrateLoadedGameState(
  gameState: GameState,
  sourceVersion?: string
): GameStateMigrationResult {
  const normalizedSourceVersion = normalizeVersion(sourceVersion ?? gameState.gameVersion);
  let currentVersion = normalizedSourceVersion;
  const appliedMigrations: string[] = [];

  const sortedSteps = [...MIGRATION_STEPS]
    .sort((a, b) => compareVersions(a.toVersion, b.toVersion));

  for (const step of sortedSteps) {
    const canApply =
      compareVersions(currentVersion, step.fromVersion) >= 0 &&
      compareVersions(currentVersion, step.toVersion) < 0;

    if (!canApply) {
      continue;
    }

    step.apply(gameState);
    currentVersion = step.toVersion;
    appliedMigrations.push(step.id);
  }

  // Safety net for partially-corrupted saves: always normalize quest/runtime fields.
  ensureQuestState(gameState);
  ensureQuestHistoryState(gameState);
  ensureEndgameChallengeState(gameState);

  gameState.gameVersion = CURRENT_GAME_STATE_VERSION;

  return {
    sourceVersion: normalizedSourceVersion,
    targetVersion: CURRENT_SAVE_SCHEMA_VERSION,
    appliedMigrations
  };
}
