import './helpers/moduleMocks';
import fs from 'fs';
import os from 'os';
import path from 'path';
import {
  getLoadingProfile,
  getRuntimeSettings,
  initializeRuntimeSettings,
  getSettingsSummary,
  resetRuntimeSettings,
  updateRuntimeSettings
} from '../src/runtime/settings';

describe('Runtime Settings', () => {
  let originalSettingsDirEnv: string | undefined;

  beforeEach(() => {
    originalSettingsDirEnv = process.env.TERMINAL_QUEST_SETTINGS_DIR;
  });

  afterEach(() => {
    resetRuntimeSettings();
    if (originalSettingsDirEnv === undefined) {
      delete process.env.TERMINAL_QUEST_SETTINGS_DIR;
    } else {
      process.env.TERMINAL_QUEST_SETTINGS_DIR = originalSettingsDirEnv;
    }
  });

  it('should expose default settings', () => {
    const settings = resetRuntimeSettings();

    expect(settings.textSpeed).toBe('normal');
    expect(settings.colorMode).toBe('full');
    expect(settings.continuePromptMode).toBe('streamlined');
    expect(settings.continueAutoPace).toBe('balanced');
    expect(settings.showKeyHints).toBe(true);
    expect(settings.showContextHints).toBe(true);
    expect(settings.telemetryOptIn).toBe(false);
  });

  it('should apply fast text speed profile', () => {
    updateRuntimeSettings({ textSpeed: 'fast' });

    const profile = getLoadingProfile();
    expect(profile.frameIntervalMs).toBe(50);
    expect(profile.durationMultiplier).toBe(0.6);
  });

  it('should toggle key hints and summarize settings', () => {
    updateRuntimeSettings({
      textSpeed: 'slow',
      colorMode: 'mono',
      continuePromptMode: 'classic',
      continueAutoPace: 'cinematic',
      showKeyHints: false,
      showContextHints: false,
      telemetryOptIn: true
    });

    const settings = getRuntimeSettings();
    const summary = getSettingsSummary(settings);

    expect(settings.showKeyHints).toBe(false);
    expect(settings.showContextHints).toBe(false);
    expect(settings.telemetryOptIn).toBe(true);
    expect(summary).toContain('텍스트 속도: 느림');
    expect(summary).toContain('색상: 단색');
    expect(summary).toContain('진행 템포: 항상 확인');
    expect(summary).toContain('자동 진행 속도: 몰입형');
    expect(summary).toContain('키 힌트: 꺼짐');
    expect(summary).toContain('추천 가이드: 꺼짐');
    expect(summary).toContain('텔레메트리: 켜짐');
  });

  it('should persist and reload settings across runtime initialization', () => {
    const tempSettingsDir = fs.mkdtempSync(
      path.join(os.tmpdir(), 'terminal-quest-settings-')
    );
    process.env.TERMINAL_QUEST_SETTINGS_DIR = tempSettingsDir;

    resetRuntimeSettings({ storage: false });
    updateRuntimeSettings(
      {
        textSpeed: 'fast',
        colorMode: 'mono',
        continuePromptMode: 'classic',
        continueAutoPace: 'snappy',
        showKeyHints: false,
        showContextHints: false,
        telemetryOptIn: true
      },
      { storage: true }
    );

    const settingsFilePath = path.join(tempSettingsDir, 'runtime-settings.json');
    expect(fs.existsSync(settingsFilePath)).toBe(true);

    resetRuntimeSettings({ storage: false });
    const loaded = initializeRuntimeSettings({
      forceReload: true,
      persistIfMissing: false,
      storage: true
    });

    expect(loaded.textSpeed).toBe('fast');
    expect(loaded.colorMode).toBe('mono');
    expect(loaded.continuePromptMode).toBe('classic');
    expect(loaded.continueAutoPace).toBe('snappy');
    expect(loaded.showKeyHints).toBe(false);
    expect(loaded.showContextHints).toBe(false);
    expect(loaded.telemetryOptIn).toBe(true);

    fs.rmSync(tempSettingsDir, { recursive: true, force: true });
  });
});
