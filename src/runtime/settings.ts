import chalk from 'chalk';
import {
  setTelemetryOptIn,
  resetTelemetryOptIn
} from './telemetrySettings.js';

export type TextSpeed = 'slow' | 'normal' | 'fast';
export type ColorMode = 'full' | 'mono';

export interface RuntimeSettings {
  textSpeed: TextSpeed;
  colorMode: ColorMode;
  showKeyHints: boolean;
  telemetryOptIn: boolean;
}

const DEFAULT_RUNTIME_SETTINGS: RuntimeSettings = {
  textSpeed: 'normal',
  colorMode: 'full',
  showKeyHints: true,
  telemetryOptIn: false
};

const defaultColorLevel = chalk.level;
let runtimeSettings: RuntimeSettings = { ...DEFAULT_RUNTIME_SETTINGS };

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

export function getRuntimeSettings(): RuntimeSettings {
  return { ...runtimeSettings };
}

export function updateRuntimeSettings(
  updates: Partial<RuntimeSettings>
): RuntimeSettings {
  runtimeSettings = {
    textSpeed: normalizeTextSpeed(updates.textSpeed ?? runtimeSettings.textSpeed),
    colorMode: normalizeColorMode(updates.colorMode ?? runtimeSettings.colorMode),
    showKeyHints: updates.showKeyHints ?? runtimeSettings.showKeyHints,
    telemetryOptIn: updates.telemetryOptIn ?? runtimeSettings.telemetryOptIn
  };

  setTelemetryOptIn(runtimeSettings.telemetryOptIn);
  applyColorMode(runtimeSettings.colorMode);
  return getRuntimeSettings();
}

export function resetRuntimeSettings(): RuntimeSettings {
  runtimeSettings = { ...DEFAULT_RUNTIME_SETTINGS };
  resetTelemetryOptIn();
  applyColorMode(runtimeSettings.colorMode);
  return getRuntimeSettings();
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
      ? 'Slow'
      : settings.textSpeed === 'fast'
        ? 'Fast'
        : 'Normal';
  const colorModeLabel = settings.colorMode === 'mono' ? 'Mono' : 'Full';
  const keyHintsLabel = settings.showKeyHints ? 'On' : 'Off';
  const telemetryLabel = settings.telemetryOptIn ? 'On' : 'Off';

  return (
    `Text Speed: ${textSpeedLabel} | Color: ${colorModeLabel} | ` +
    `Key Hints: ${keyHintsLabel} | Telemetry: ${telemetryLabel}`
  );
}
