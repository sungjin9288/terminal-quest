import {
  ensurePlaytestWorkspace,
  getPlaytestPaths
} from './playtest-common.js';

function main() {
  const paths = ensurePlaytestWorkspace({
    rootDir: process.cwd(),
    overwriteSettings: true
  });

  console.log('[playtest-setup] Playtest workspace ready.');
  console.log(`[playtest-setup] saves: ${paths.savesDir}`);
  console.log(`[playtest-setup] settings: ${paths.settingsDir}`);
  console.log(`[playtest-setup] telemetry: ${paths.telemetryDir}`);
  console.log(`[playtest-setup] logs: ${paths.logsDir}`);
  console.log(`[playtest-setup] notes: ${paths.notesDir}`);
  console.log(`[playtest-setup] runtime settings: ${getPlaytestPaths().runtimeSettingsPath}`);
  console.log('[playtest-setup] default launch: npm run playtest:start (browser frontend at http://localhost:4310)');
  console.log('[playtest-setup] terminal fallback: npm run playtest:start:terminal');
}

main();
