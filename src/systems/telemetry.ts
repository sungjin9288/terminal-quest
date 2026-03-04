import fs from 'fs';
import path from 'path';
import { GameState } from '../types/game.js';
import { getTelemetryOptIn } from '../runtime/telemetrySettings.js';

export type TelemetryEventType =
  | 'new_game_started'
  | 'game_loaded'
  | 'session_start'
  | 'session_end'
  | 'quest_accepted'
  | 'quest_completed'
  | 'boss_defeated'
  | 'act_completed'
  | 'endgame_challenge_unlocked'
  | 'endgame_challenge_cleared'
  | 'player_death'
  | 'save_created';

type TelemetryValue = string | number | boolean | null | string[];

interface TelemetryEventRecord {
  schemaVersion: '1';
  timestamp: number;
  isoTime: string;
  eventType: TelemetryEventType;
  context: {
    gameVersion?: string;
    gameMode?: string;
    playerLevel?: number;
    locationId?: string;
    questsCompleted?: number;
    bossesDefeated?: number;
    deaths?: number;
  };
  payload: Record<string, TelemetryValue>;
}

const TELEMETRY_DIR_NAME = 'telemetry';
const TELEMETRY_FILE_NAME = 'events.ndjson';
const SAFE_STRING_PATTERN = /^[a-z0-9._:-]{1,64}$/i;
const BLOCKED_PAYLOAD_KEYS: ReadonlySet<string> = new Set([
  'playerName',
  'characterName',
  'email',
  'phone',
  'displayName'
]);

function resolveTelemetryDir(): string {
  const override = process.env.TERMINAL_QUEST_TELEMETRY_DIR?.trim();
  if (override && override.length > 0) {
    return override;
  }

  return path.join(process.cwd(), TELEMETRY_DIR_NAME);
}

export function getTelemetryFilePath(): string {
  return path.join(resolveTelemetryDir(), TELEMETRY_FILE_NAME);
}

function ensureTelemetryDir(): void {
  fs.mkdirSync(resolveTelemetryDir(), { recursive: true });
}

function sanitizeString(value: string): string | null {
  const normalized = value.trim();
  if (!SAFE_STRING_PATTERN.test(normalized)) {
    return null;
  }
  return normalized;
}

function sanitizePayload(payload: Record<string, unknown>): Record<string, TelemetryValue> {
  const sanitized: Record<string, TelemetryValue> = {};

  for (const [key, rawValue] of Object.entries(payload)) {
    if (BLOCKED_PAYLOAD_KEYS.has(key)) {
      continue;
    }

    if (typeof rawValue === 'string') {
      const normalized = sanitizeString(rawValue);
      if (normalized !== null) {
        sanitized[key] = normalized;
      }
      continue;
    }

    if (typeof rawValue === 'number') {
      if (Number.isFinite(rawValue)) {
        sanitized[key] = rawValue;
      }
      continue;
    }

    if (typeof rawValue === 'boolean' || rawValue === null) {
      sanitized[key] = rawValue;
      continue;
    }

    if (Array.isArray(rawValue)) {
      const normalizedArray = rawValue
        .filter((value): value is string => typeof value === 'string')
        .map(sanitizeString)
        .filter((value): value is string => value !== null)
        .slice(0, 20);
      sanitized[key] = normalizedArray;
    }
  }

  return sanitized;
}

export function isTelemetryEnabled(): boolean {
  return getTelemetryOptIn();
}

function buildTelemetryContext(gameState?: GameState): TelemetryEventRecord['context'] {
  if (!gameState) {
    return {};
  }

  return {
    gameVersion: gameState.gameVersion,
    gameMode: gameState.gameMode,
    playerLevel: gameState.player.level,
    locationId: gameState.player.currentLocation,
    questsCompleted: gameState.statistics.questsCompleted,
    bossesDefeated: gameState.statistics.bossesDefeated.length,
    deaths: gameState.statistics.deaths
  };
}

export function trackTelemetryEvent(
  eventType: TelemetryEventType,
  gameState?: GameState,
  payload: Record<string, unknown> = {}
): boolean {
  if (!isTelemetryEnabled()) {
    return false;
  }

  try {
    ensureTelemetryDir();

    const now = Date.now();
    const eventRecord: TelemetryEventRecord = {
      schemaVersion: '1',
      timestamp: now,
      isoTime: new Date(now).toISOString(),
      eventType,
      context: buildTelemetryContext(gameState),
      payload: sanitizePayload(payload)
    };

    fs.appendFileSync(
      getTelemetryFilePath(),
      `${JSON.stringify(eventRecord)}\n`,
      'utf-8'
    );

    return true;
  } catch {
    return false;
  }
}
