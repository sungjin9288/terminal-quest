import fs from 'fs';
import path from 'path';

describe('Distribution Scripts', () => {
  it('should expose one-command play launcher in package scripts', () => {
    const packageJsonPath = path.join(process.cwd(), 'package.json');
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8')) as {
      scripts?: Record<string, string>;
    };

    expect(packageJson.scripts?.play).toBe('node scripts/start-game.js');
  });

  it('should expose release package scripts in package scripts', () => {
    const packageJsonPath = path.join(process.cwd(), 'package.json');
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8')) as {
      scripts?: Record<string, string>;
    };

    expect(packageJson.scripts?.['release:package']).toBe(
      'npm run build && node scripts/release-package.js'
    );
    expect(packageJson.scripts?.['release:package:dry']).toBe(
      'npm run build && node scripts/release-package.js --dry-run'
    );
    expect(packageJson.scripts?.['verify:save-migration']).toBe(
      'node scripts/verify-save-migration.js'
    );
    expect(packageJson.scripts?.['verify:package-launch']).toBe(
      'node scripts/verify-package-launch.js'
    );
    expect(packageJson.scripts?.['verify:runtime-smoke']).toBe(
      'node scripts/verify-runtime-smoke.js'
    );
    expect(packageJson.scripts?.['verify:release-artifacts']).toBe(
      'node scripts/verify-release-artifacts.js'
    );
    expect(packageJson.scripts?.['validate:playtime:extended']).toBe(
      'npm run build && node scripts/validate-playtime-balance.js --profile extended'
    );
    expect(packageJson.scripts?.['release:signoff']).toBe(
      'node scripts/release-signoff.js'
    );
    expect(packageJson.scripts?.['release:signoff:all']).toBe(
      'node scripts/release-signoff-all.js'
    );
    expect(packageJson.scripts?.['release:smoke']).toBe(
      'node scripts/release-smoke-report.js'
    );
    expect(packageJson.scripts?.['release:candidate']).toBe(
      'node scripts/release-candidate-gate.js'
    );
    expect(packageJson.scripts?.['validate:prompt-priority']).toBe(
      'node scripts/validate-prompt-priority.js'
    );
    expect(packageJson.scripts?.['balance:notes']).toBe(
      'npm run build && node scripts/generate-balance-patch-notes.js'
    );
    expect(packageJson.scripts?.['balance:notes:dry']).toBe(
      'npm run build && node scripts/generate-balance-patch-notes.js --dry-run'
    );
  });

  it('should include start launcher script on disk', () => {
    const launcherPath = path.join(process.cwd(), 'scripts', 'start-game.js');
    expect(fs.existsSync(launcherPath)).toBe(true);
  });

  it('should include release package script on disk', () => {
    const releaseScriptPath = path.join(process.cwd(), 'scripts', 'release-package.js');
    expect(fs.existsSync(releaseScriptPath)).toBe(true);
  });

  it('should include save migration verification script on disk', () => {
    const verificationScriptPath = path.join(process.cwd(), 'scripts', 'verify-save-migration.js');
    expect(fs.existsSync(verificationScriptPath)).toBe(true);
  });

  it('should include package launch verification script on disk', () => {
    const packageLaunchScriptPath = path.join(process.cwd(), 'scripts', 'verify-package-launch.js');
    expect(fs.existsSync(packageLaunchScriptPath)).toBe(true);
  });

  it('should include runtime smoke verification script on disk', () => {
    const runtimeSmokeScriptPath = path.join(process.cwd(), 'scripts', 'verify-runtime-smoke.js');
    expect(fs.existsSync(runtimeSmokeScriptPath)).toBe(true);
  });

  it('should include release artifact verification script on disk', () => {
    const artifactScriptPath = path.join(process.cwd(), 'scripts', 'verify-release-artifacts.js');
    expect(fs.existsSync(artifactScriptPath)).toBe(true);
  });

  it('should include release sign-off script on disk', () => {
    const signoffScriptPath = path.join(process.cwd(), 'scripts', 'release-signoff.js');
    expect(fs.existsSync(signoffScriptPath)).toBe(true);
  });

  it('should include release sign-off all script on disk', () => {
    const signoffAllScriptPath = path.join(process.cwd(), 'scripts', 'release-signoff-all.js');
    expect(fs.existsSync(signoffAllScriptPath)).toBe(true);
  });

  it('should include release smoke report script on disk', () => {
    const smokeScriptPath = path.join(process.cwd(), 'scripts', 'release-smoke-report.js');
    expect(fs.existsSync(smokeScriptPath)).toBe(true);
  });

  it('should include release candidate gate script on disk', () => {
    const candidateScriptPath = path.join(process.cwd(), 'scripts', 'release-candidate-gate.js');
    expect(fs.existsSync(candidateScriptPath)).toBe(true);
  });

  it('should include balance patch notes generator script on disk', () => {
    const balanceScriptPath = path.join(process.cwd(), 'scripts', 'generate-balance-patch-notes.js');
    expect(fs.existsSync(balanceScriptPath)).toBe(true);
  });

  it('should include prompt priority validator script on disk', () => {
    const validatorScriptPath = path.join(process.cwd(), 'scripts', 'validate-prompt-priority.js');
    expect(fs.existsSync(validatorScriptPath)).toBe(true);
  });
});
