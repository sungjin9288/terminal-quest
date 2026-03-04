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

  it('should include balance patch notes generator script on disk', () => {
    const balanceScriptPath = path.join(process.cwd(), 'scripts', 'generate-balance-patch-notes.js');
    expect(fs.existsSync(balanceScriptPath)).toBe(true);
  });
});
