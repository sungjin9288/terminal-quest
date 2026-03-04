import './helpers/moduleMocks';
import {
  getLoadingProfile,
  getRuntimeSettings,
  getSettingsSummary,
  resetRuntimeSettings,
  updateRuntimeSettings
} from '../src/runtime/settings';

describe('Runtime Settings', () => {
  afterEach(() => {
    resetRuntimeSettings();
  });

  it('should expose default settings', () => {
    const settings = resetRuntimeSettings();

    expect(settings.textSpeed).toBe('normal');
    expect(settings.colorMode).toBe('full');
    expect(settings.showKeyHints).toBe(true);
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
      showKeyHints: false,
      telemetryOptIn: true
    });

    const settings = getRuntimeSettings();
    const summary = getSettingsSummary(settings);

    expect(settings.showKeyHints).toBe(false);
    expect(settings.telemetryOptIn).toBe(true);
    expect(summary).toContain('Text Speed: Slow');
    expect(summary).toContain('Color: Mono');
    expect(summary).toContain('Key Hints: Off');
    expect(summary).toContain('Telemetry: On');
  });
});
