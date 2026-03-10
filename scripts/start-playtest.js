import { spawnSync } from 'child_process';
import { existsSync } from 'fs';
import { join } from 'path';
import {
  buildPlaytestEnvironment,
  createPlaytestSessionNote,
  ensurePlaytestWorkspace
} from './playtest-common.js';

const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const nodeCommand = process.execPath;
const args = new Set(process.argv.slice(2));

function runStep(label, command, stepArgs, env = process.env) {
  console.log(`[playtest-start] ${label}`);
  const result = spawnSync(command, stepArgs, {
    stdio: 'inherit',
    env
  });
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

function hasDependenciesInstalled() {
  return existsSync(join(process.cwd(), 'node_modules'));
}

function main() {
  const dryRun = args.has('--dry-run');
  const paths = ensurePlaytestWorkspace({
    rootDir: process.cwd(),
    overwriteSettings: false
  });
  const notePath = createPlaytestSessionNote(paths);
  const env = buildPlaytestEnvironment(paths);

  if (!hasDependenciesInstalled()) {
    runStep('Installing dependencies', npmCommand, ['install'], env);
  } else {
    console.log('[playtest-start] Dependencies already installed');
  }

  runStep('Building project', npmCommand, ['run', 'build'], env);

  console.log(`[playtest-start] session note: ${notePath}`);
  console.log(`[playtest-start] saves: ${paths.savesDir}`);
  console.log(`[playtest-start] telemetry: ${paths.telemetryDir}`);
  console.log(`[playtest-start] logs: ${paths.logsDir}`);

  if (dryRun) {
    console.log('[playtest-start] Dry run complete. Launch skipped.');
    return;
  }

  runStep('Launching game in playtest profile', nodeCommand, ['dist/index.js'], env);
}

main();
