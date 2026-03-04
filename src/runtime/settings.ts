import fs from 'fs';
import path from 'path';
import chalk from 'chalk';
import {
  setTelemetryOptIn
} from './telemetrySettings.js';

export type TextSpeed = 'slow' | 'normal' | 'fast';
export type ColorMode = 'full' | 'mono';
export type ContinuePromptMode = 'classic' | 'streamlined';
export type ContinueAutoPace = 'snappy' | 'balanced' | 'cinematic';

export interface RuntimeSettings {
  textSpeed: TextSpeed;
  colorMode: ColorMode;
  continuePromptMode: ContinuePromptMode;
  continueAutoPace: ContinueAutoPace;
  showKeyHints: boolean;
  showContextHints: boolean;
  telemetryOptIn: boolean;
}

interface RuntimeSettingsStorageOptions {
  storage?: boolean;
}

export interface RuntimeSettingsMutationOptions
  extends RuntimeSettingsStorageOptions {}

export interface InitializeRuntimeSettingsOptions
  extends RuntimeSettingsStorageOptions {
  forceReload?: boolean;
  persistIfMissing?: boolean;
}

const DEFAULT_RUNTIME_SETTINGS: RuntimeSettings = {
  textSpeed: 'normal',
  colorMode: 'full',
  continuePromptMode: 'streamlined',
  continueAutoPace: 'balanced',
  showKeyHints: true,
  showContextHints: true,
  telemetryOptIn: false
};

const DEFAULT_SETTINGS_DIR = './saves';
const RUNTIME_SETTINGS_FILE_NAME = 'runtime-settings.json';
const defaultColorLevel = chalk.level;
let runtimeSettings: RuntimeSettings = { ...DEFAULT_RUNTIME_SETTINGS };
let runtimeSettingsInitialized = false;

function resolveRuntimeSettingsDirectory(): string {
  const customDir = process.env.TERMINAL_QUEST_SETTINGS_DIR;
  if (customDir && customDir.trim().length > 0) {
    return customDir;
  }
  return DEFAULT_SETTINGS_DIR;
}

function getRuntimeSettingsFilePath(): string {
  return path.join(resolveRuntimeSettingsDirectory(), RUNTIME_SETTINGS_FILE_NAME);
}

function shouldUseSettingsStorage(storage?: boolean): boolean {
  if (typeof storage === 'boolean') {
    return storage;
  }
  return process.env.JEST_WORKER_ID === undefined;
}

function applyColorMode(colorMode: ColorMode): void {
  chalk.level = colorMode === 'mono' ? 0 : defaultColorLevel;
}

function normalizeTextSpeed(value: string): TextSpeed {
  if (value === 'slow' || value === 'fast') {
    return value;
  }
  return 'normal';
}

function normalizeColorMode(value: string): ColorMode {
  if (value === 'mono') {
    return 'mono';
  }
  return 'full';
}

function normalizeContinuePromptMode(value: string): ContinuePromptMode {
  if (value === 'classic') {
    return 'classic';
  }
  return 'streamlined';
}

function normalizeContinueAutoPace(value: string): ContinueAutoPace {
  if (value === 'snappy' || value === 'cinematic') {
    return value;
  }
  return 'balanced';
}

function normalizeBoolean(value: unknown, fallback: boolean): boolean {
  return typeof value === 'boolean' ? value : fallback;
}

function buildRuntimeSettings(
  base: RuntimeSettings,
  updates: Partial<RuntimeSettings>
): RuntimeSettings {
  return {
    textSpeed: normalizeTextSpeed(updates.textSpeed ?? base.textSpeed),
    colorMode: normalizeColorMode(updates.colorMode ?? base.colorMode),
    continuePromptMode: normalizeContinuePromptMode(
      updates.continuePromptMode ?? base.continuePromptMode
    ),
    continueAutoPace: normalizeContinueAutoPace(
      updates.continueAutoPace ?? base.continueAutoPace
    ),
    showKeyHints: normalizeBoolean(updates.showKeyHints, base.showKeyHints),
    showContextHints: normalizeBoolean(updates.showContextHints, base.showContextHints),
    telemetryOptIn: normalizeBoolean(updates.telemetryOptIn, base.telemetryOptIn)
  };
}

function applyRuntimeSettings(settings: RuntimeSettings): RuntimeSettings {
  runtimeSettings = settings;
  setTelemetryOptIn(runtimeSettings.telemetryOptIn);
  applyColorMode(runtimeSettings.colorMode);
  return getRuntimeSettings();
}

function persistRuntimeSettings(
  options: RuntimeSettingsStorageOptions = {}
): void {
  if (!shouldUseSettingsStorage(options.storage)) {
    return;
  }

  try {
    const settingsDir = resolveRuntimeSettingsDirectory();
    if (!fs.existsSync(settingsDir)) {
      fs.mkdirSync(settingsDir, { recursive: true });
    }
    fs.writeFileSync(
      getRuntimeSettingsFilePath(),
      JSON.stringify(runtimeSettings, null, 2),
      'utf-8'
    );
  } catch {
    // Ignore persistence failures and continue with in-memory settings.
  }
}

function loadPersistedRuntimeSettings(
  options: RuntimeSettingsStorageOptions = {}
): RuntimeSettings | null {
  if (!shouldUseSettingsStorage(options.storage)) {
    return null;
  }

  try {
    const settingsPath = getRuntimeSettingsFilePath();
    if (!fs.existsSync(settingsPath)) {
      return null;
    }

    const raw = fs.readFileSync(settingsPath, 'utf-8');
    const parsed = JSON.parse(raw) as Partial<RuntimeSettings>;
    return buildRuntimeSettings(DEFAULT_RUNTIME_SETTINGS, parsed);
  } catch {
    return null;
  }
}

export function getRuntimeSettings(): RuntimeSettings {
  return { ...runtimeSettings };
}

export function initializeRuntimeSettings(
  options: InitializeRuntimeSettingsOptions = {}
): RuntimeSettings {
  if (runtimeSettingsInitialized && !options.forceReload) {
    return getRuntimeSettings();
  }

  runtimeSettingsInitialized = true;
  const persistedSettings = loadPersistedRuntimeSettings(options);
  if (persistedSettings) {
    return applyRuntimeSettings(persistedSettings);
  }

  const defaults = applyRuntimeSettings({ ...DEFAULT_RUNTIME_SETTINGS });
  if (options.persistIfMissing ?? true) {
    persistRuntimeSettings(options);
  }
  return defaults;
}

export function updateRuntimeSettings(
  updates: Partial<RuntimeSettings>,
  options: RuntimeSettingsMutationOptions = {}
): RuntimeSettings {
  const nextSettings = buildRuntimeSettings(runtimeSettings, updates);
  const appliedSettings = applyRuntimeSettings(nextSettings);
  persistRuntimeSettings(options);
  return appliedSettings;
}

export function resetRuntimeSettings(
  options: RuntimeSettingsMutationOptions = {}
): RuntimeSettings {
  const defaults = applyRuntimeSettings({ ...DEFAULT_RUNTIME_SETTINGS });
  persistRuntimeSettings(options);
  return defaults;
}

export function getLoadingProfile(
  settings: RuntimeSettings = getRuntimeSettings()
): {
  frameIntervalMs: number;
  durationMultiplier: number;
} {
  switch (settings.textSpeed) {
    case 'slow':
      return { frameIntervalMs: 120, durationMultiplier: 1.4 };
    case 'fast':
      return { frameIntervalMs: 50, durationMultiplier: 0.6 };
    default:
      return { frameIntervalMs: 80, durationMultiplier: 1.0 };
  }
}

export function getSettingsSummary(
  settings: RuntimeSettings = getRuntimeSettings()
): string {
  const textSpeedLabel =
    settings.textSpeed === 'slow'
      ? '느림'
      : settings.textSpeed === 'fast'
        ? '빠름'
        : '보통';
  const colorModeLabel = settings.colorMode === 'mono' ? '단색' : '컬러';
  const continuePromptLabel =
    settings.continuePromptMode === 'classic' ? '항상 확인' : '간소화';
  const continuePaceLabel =
    settings.continueAutoPace === 'snappy'
      ? '빠르게'
      : settings.continueAutoPace === 'cinematic'
        ? '몰입형'
        : '균형형';
  const keyHintsLabel = settings.showKeyHints ? '켜짐' : '꺼짐';
  const contextHintsLabel = settings.showContextHints ? '켜짐' : '꺼짐';
  const telemetryLabel = settings.telemetryOptIn ? '켜짐' : '꺼짐';

  return (
    `텍스트 속도: ${textSpeedLabel} | 색상: ${colorModeLabel} | ` +
    `진행 템포: ${continuePromptLabel} | 자동 진행 속도: ${continuePaceLabel} | ` +
    `키 힌트: ${keyHintsLabel} | 추천 가이드: ${contextHintsLabel} | 텔레메트리: ${telemetryLabel}`
  );
}
