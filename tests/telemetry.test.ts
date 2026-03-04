import './helpers/moduleMocks';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { createTestGameState } from './helpers/gameStateFactory';
import {
  getTelemetryFilePath,
  trackTelemetryEvent
} from '../src/systems/telemetry';
import {
  resetRuntimeSettings,
  updateRuntimeSettings
} from '../src/runtime/settings';

const TEST_TELEMETRY_DIR = path.join(
  os.tmpdir(),
  `terminal-quest-telemetry-${process.pid}`
);

describe('Telemetry', () => {
  beforeEach(() => {
    process.env.TERMINAL_QUEST_TELEMETRY_DIR = TEST_TELEMETRY_DIR;
    fs.rmSync(TEST_TELEMETRY_DIR, { recursive: true, force: true });
    resetRuntimeSettings();
  });

  afterEach(() => {
    resetRuntimeSettings();
    fs.rmSync(TEST_TELEMETRY_DIR, { recursive: true, force: true });
    delete process.env.TERMINAL_QUEST_TELEMETRY_DIR;
  });

  it('should not write telemetry when opt-in is disabled', () => {
    const state = createTestGameState();

    const tracked = trackTelemetryEvent('session_start', state, { source: 'unit-test' });

    expect(tracked).toBe(false);
    expect(fs.existsSync(getTelemetryFilePath())).toBe(false);
  });

  it('should write non-PII telemetry events when opt-in is enabled', () => {
    const state = createTestGameState();
    updateRuntimeSettings({ telemetryOptIn: true });

    const tracked = trackTelemetryEvent('quest_completed', state, {
      questId: 'forest-survey',
      rewardGold: 120,
      characterName: 'Alice',
      freeText: '사용자 자유 텍스트',
      source: 'unit-test'
    });

    expect(tracked).toBe(true);

    const telemetryPath = getTelemetryFilePath();
    expect(fs.existsSync(telemetryPath)).toBe(true);

    const lines = fs.readFileSync(telemetryPath, 'utf-8')
      .trim()
      .split('\n');
    expect(lines).toHaveLength(1);

    const record = JSON.parse(lines[0]) as {
      eventType: string;
      context: Record<string, unknown>;
      payload: Record<string, unknown>;
    };

    expect(record.eventType).toBe('quest_completed');
    expect(record.context.gameVersion).toBe(state.gameVersion);
    expect(record.context.playerLevel).toBe(state.player.level);
    expect(record.payload.questId).toBe('forest-survey');
    expect(record.payload.rewardGold).toBe(120);
    expect(record.payload.source).toBe('unit-test');
    expect(record.payload.characterName).toBeUndefined();
    expect(record.payload.freeText).toBeUndefined();
  });
});
