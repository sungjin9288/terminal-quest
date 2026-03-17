import fs from 'fs';
import path from 'path';

describe('Distribution Scripts', () => {
  it('should expose one-command play launcher in package scripts', () => {
    const packageJsonPath = path.join(process.cwd(), 'package.json');
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8')) as {
      scripts?: Record<string, string>;
    };

    expect(packageJson.scripts?.play).toBe('node scripts/start-game.js');
    expect(packageJson.scripts?.['playtest:setup']).toBe('node scripts/setup-playtest-env.js');
    expect(packageJson.scripts?.['playtest:start']).toBe(
      'node scripts/start-frontend.js --playtest'
    );
    expect(packageJson.scripts?.['playtest:start:terminal']).toBe(
      'node scripts/start-playtest.js'
    );
    expect(packageJson.scripts?.['playtest:report']).toBe('node scripts/playtest-report.js');
    expect(packageJson.scripts?.['playtest:report:json']).toBe(
      'node scripts/playtest-report.js --json'
    );
    expect(packageJson.scripts?.['playtest:reset']).toBe('node scripts/reset-playtest-env.js');
    expect(packageJson.scripts?.['frontend:start']).toBe('node scripts/start-frontend.js');
    expect(packageJson.scripts?.['frontend:playtest']).toBe(
      'node scripts/start-frontend.js --playtest'
    );
    expect(packageJson.scripts?.['vercel:build']).toBe(
      'npm run build && node scripts/build-vercel-static.js'
    );
    expect(packageJson.scripts?.['test:achievements:smoke']).toBe(
      'jest tests/achievements.test.ts tests/playerMenu.test.ts tests/shop.test.ts tests/questSystem.test.ts tests/frontendRuntime.test.ts tests/frontendAppAchievements.test.ts tests/saveUi.test.ts tests/mainMenuRuntime.test.ts'
    );
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
    expect(packageJson.scripts?.['verify:vercel-static']).toBe(
      'npm run vercel:build && node scripts/verify-vercel-static.js'
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
    expect(packageJson.scripts?.['validate:ai-contracts']).toBe(
      'npm run build && node scripts/validate-ai-contract-balance.js'
    );
    expect(packageJson.scripts?.['validate:data']).toContain('node scripts/validate-ai-contract-balance.js');
    expect(packageJson.scripts?.['release:signoff']).toBe(
      'node scripts/release-signoff.js'
    );
    expect(packageJson.scripts?.['release:signoff:all']).toBe(
      'node scripts/release-signoff-all.js'
    );
    expect(packageJson.scripts?.['release:check:ops']).toBe(
      'node scripts/release-readiness-check.js --with-ops-doctor'
    );
    expect(packageJson.scripts?.['release:smoke:ops']).toBe(
      'node scripts/release-smoke-report.js --with-ops-doctor'
    );
    expect(packageJson.scripts?.['release:smoke:latest']).toBe(
      'node scripts/show-release-smoke-latest.js'
    );
    expect(packageJson.scripts?.['release:smoke:latest:json']).toBe(
      'node scripts/show-release-smoke-latest.js --json'
    );
    expect(packageJson.scripts?.['release:doctor']).toBe(
      'node scripts/release-doctor.js'
    );
    expect(packageJson.scripts?.['release:doctor:json']).toBe(
      'node scripts/release-doctor.js --json'
    );
    expect(packageJson.scripts?.['release:doctor:strict']).toBe(
      'node scripts/release-doctor.js --fail-on-warn'
    );
    expect(packageJson.scripts?.['release:doctor:latest']).toBe(
      'node scripts/show-release-doctor-latest.js'
    );
    expect(packageJson.scripts?.['release:doctor:latest:json']).toBe(
      'node scripts/show-release-doctor-latest.js --json'
    );
    expect(packageJson.scripts?.['release:status']).toBe(
      'node scripts/show-release-status.js'
    );
    expect(packageJson.scripts?.['release:status:json']).toBe(
      'node scripts/show-release-status.js --json'
    );
    expect(packageJson.scripts?.['release:candidate:ops']).toBe(
      'node scripts/release-candidate-gate.js --with-ops-doctor'
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
    expect(packageJson.scripts?.['ai:insights']).toBe(
      'npm run build && node scripts/generate-ai-insights-report.js'
    );
    expect(packageJson.scripts?.['ai:insights:dry']).toBe(
      'npm run build && node scripts/generate-ai-insights-report.js --dry-run'
    );
    expect(packageJson.scripts?.['ai:backlog']).toBe(
      'npm run build && node scripts/generate-ai-ops-backlog.js'
    );
    expect(packageJson.scripts?.['ai:backlog:dry']).toBe(
      'npm run build && node scripts/generate-ai-ops-backlog.js --dry-run'
    );
    expect(packageJson.scripts?.['ai:linear']).toBe(
      'npm run build && node scripts/generate-ai-ops-linear-drafts.js'
    );
    expect(packageJson.scripts?.['ai:linear:dry']).toBe(
      'npm run build && node scripts/generate-ai-ops-linear-drafts.js --dry-run'
    );
    expect(packageJson.scripts?.['ai:linear:export']).toBe(
      'npm run build && node scripts/export-ai-ops-linear.js --apply'
    );
    expect(packageJson.scripts?.['ai:linear:export:dry']).toBe(
      'npm run build && node scripts/export-ai-ops-linear.js --dry-run'
    );
    expect(packageJson.scripts?.['ai:linear:sync']).toBe(
      'npm run build && node scripts/sync-ai-ops-linear-status.js --apply'
    );
    expect(packageJson.scripts?.['ai:linear:sync:dry']).toBe(
      'npm run build && node scripts/sync-ai-ops-linear-status.js --dry-run'
    );
    expect(packageJson.scripts?.['ai:ops:cycle']).toBe(
      'npm run build && node scripts/run-ai-ops-cycle.js'
    );
    expect(packageJson.scripts?.['ai:ops:cycle:dry']).toBe(
      'npm run build && node scripts/run-ai-ops-cycle.js --dry-run'
    );
    expect(packageJson.scripts?.['ai:ops:cycle:apply']).toBe(
      'npm run build && node scripts/run-ai-ops-cycle.js --apply-linear'
    );
    expect(packageJson.scripts?.['ai:ops:cycle:gate']).toBe(
      'npm run build && node scripts/run-ai-ops-cycle.js --doctor-gate'
    );
    expect(packageJson.scripts?.['ai:ops:cycle:gate:strict']).toBe(
      'npm run build && node scripts/run-ai-ops-cycle.js --doctor-gate --doctor-fail-on-warn'
    );
    expect(packageJson.scripts?.['ai:ops:cycle:latest']).toBe(
      'npm run build && node scripts/show-ai-ops-cycle-latest.js'
    );
    expect(packageJson.scripts?.['ai:ops:cycle:latest:json']).toBe(
      'npm run build && node scripts/show-ai-ops-cycle-latest.js --json'
    );
    expect(packageJson.scripts?.['ai:ops:doctor']).toBe(
      'npm run build && node scripts/ai-ops-doctor.js'
    );
    expect(packageJson.scripts?.['ai:ops:doctor:json']).toBe(
      'npm run build && node scripts/ai-ops-doctor.js --json'
    );
    expect(packageJson.scripts?.['ai:ops:doctor:strict']).toBe(
      'npm run build && node scripts/ai-ops-doctor.js --fail-on-warn'
    );
  });

  it('should include start launcher script on disk', () => {
    const launcherPath = path.join(process.cwd(), 'scripts', 'start-game.js');
    expect(fs.existsSync(launcherPath)).toBe(true);
  });

  it('should include playtest environment scripts on disk', () => {
    expect(fs.existsSync(path.join(process.cwd(), 'scripts', 'setup-playtest-env.js'))).toBe(true);
    expect(fs.existsSync(path.join(process.cwd(), 'scripts', 'start-playtest.js'))).toBe(true);
    expect(fs.existsSync(path.join(process.cwd(), 'scripts', 'playtest-report.js'))).toBe(true);
    expect(fs.existsSync(path.join(process.cwd(), 'scripts', 'reset-playtest-env.js'))).toBe(true);
    expect(fs.existsSync(path.join(process.cwd(), 'scripts', 'start-frontend.js'))).toBe(true);
    expect(fs.existsSync(path.join(process.cwd(), 'scripts', 'build-vercel-static.js'))).toBe(true);
    expect(fs.existsSync(path.join(process.cwd(), 'scripts', 'generate-browser-data.js'))).toBe(true);
  });

  it('should include browser frontend assets on disk', () => {
    expect(fs.existsSync(path.join(process.cwd(), 'frontend', 'index.html'))).toBe(true);
    expect(fs.existsSync(path.join(process.cwd(), 'frontend', 'styles.css'))).toBe(true);
    expect(fs.existsSync(path.join(process.cwd(), 'frontend', 'app.js'))).toBe(true);
    expect(fs.existsSync(path.join(process.cwd(), 'frontend', 'runtime-adapter.js'))).toBe(true);
    expect(fs.existsSync(path.join(process.cwd(), 'vercel.json'))).toBe(true);
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

  it('should include vercel static verification script on disk', () => {
    const vercelStaticScriptPath = path.join(process.cwd(), 'scripts', 'verify-vercel-static.js');
    expect(fs.existsSync(vercelStaticScriptPath)).toBe(true);
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
    expect(fs.existsSync(path.join(process.cwd(), 'scripts', 'show-release-smoke-latest.js'))).toBe(true);
    expect(fs.existsSync(path.join(process.cwd(), 'scripts', 'release-doctor.js'))).toBe(true);
    expect(fs.existsSync(path.join(process.cwd(), 'scripts', 'show-release-doctor-latest.js'))).toBe(true);
    expect(fs.existsSync(path.join(process.cwd(), 'scripts', 'show-release-status.js'))).toBe(true);
  });

  it('should include release candidate gate script on disk', () => {
    const candidateScriptPath = path.join(process.cwd(), 'scripts', 'release-candidate-gate.js');
    expect(fs.existsSync(candidateScriptPath)).toBe(true);
  });

  it('should include balance patch notes generator script on disk', () => {
    const balanceScriptPath = path.join(process.cwd(), 'scripts', 'generate-balance-patch-notes.js');
    expect(fs.existsSync(balanceScriptPath)).toBe(true);
  });

  it('should include ai insights generator script on disk', () => {
    const insightsScriptPath = path.join(process.cwd(), 'scripts', 'generate-ai-insights-report.js');
    expect(fs.existsSync(insightsScriptPath)).toBe(true);
  });

  it('should include ai backlog generator script on disk', () => {
    const backlogScriptPath = path.join(process.cwd(), 'scripts', 'generate-ai-ops-backlog.js');
    expect(fs.existsSync(backlogScriptPath)).toBe(true);
  });

  it('should include ai linear draft generator script on disk', () => {
    const linearScriptPath = path.join(process.cwd(), 'scripts', 'generate-ai-ops-linear-drafts.js');
    expect(fs.existsSync(linearScriptPath)).toBe(true);
  });

  it('should include ai linear export script and config on disk', () => {
    expect(fs.existsSync(path.join(process.cwd(), 'scripts', 'export-ai-ops-linear.js'))).toBe(true);
    expect(fs.existsSync(path.join(process.cwd(), 'scripts', 'sync-ai-ops-linear-status.js'))).toBe(true);
    expect(fs.existsSync(path.join(process.cwd(), 'scripts', 'run-ai-ops-cycle.js'))).toBe(true);
    expect(fs.existsSync(path.join(process.cwd(), 'scripts', 'show-ai-ops-cycle-latest.js'))).toBe(true);
    expect(fs.existsSync(path.join(process.cwd(), 'scripts', 'ai-ops-doctor.js'))).toBe(true);
    expect(fs.existsSync(path.join(process.cwd(), 'config', 'ai-ops-linear.json'))).toBe(true);
  });

  it('should include prompt priority validator script on disk', () => {
    const validatorScriptPath = path.join(process.cwd(), 'scripts', 'validate-prompt-priority.js');
    expect(fs.existsSync(validatorScriptPath)).toBe(true);
  });

  it('should include ai contract balance validator script on disk', () => {
    const validatorScriptPath = path.join(process.cwd(), 'scripts', 'validate-ai-contract-balance.js');
    expect(fs.existsSync(validatorScriptPath)).toBe(true);
  });

  it('should include extended playtime validation in the release readiness gate', () => {
    const releaseCheckPath = path.join(process.cwd(), 'scripts', 'release-readiness-check.js');
    const content = fs.readFileSync(releaseCheckPath, 'utf-8');

    expect(content).toContain("['run', 'validate:data']");
    expect(content).toContain("['run', 'validate:playtime:extended']");
    expect(content).toContain("['run', 'verify:vercel-static']");
  });

  it('should copy browser frontend assets into release packages', () => {
    const releasePackagePath = path.join(process.cwd(), 'scripts', 'release-package.js');
    const content = fs.readFileSync(releasePackagePath, 'utf-8');

    expect(content).toContain("'frontend'");
    expect(content).toContain("'scripts'");
  });
});
