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
  console.log(`[frontend-start] ${label}`);
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
  const usePlaytestProfile = args.has('--playtest');
  const dryRun = args.has('--dry-run');
  let env = process.env;

  if (usePlaytestProfile) {
    const paths = ensurePlaytestWorkspace({
      rootDir: process.cwd(),
      overwriteSettings: false
    });
    const notePath = createPlaytestSessionNote(paths);
    env = buildPlaytestEnvironment(paths);
    console.log(`[frontend-start] playtest note: ${notePath}`);
    console.log(`[frontend-start] playtest saves: ${paths.savesDir}`);
    console.log(`[frontend-start] playtest telemetry: ${paths.telemetryDir}`);
  }

  if (!hasDependenciesInstalled()) {
    runStep('Installing dependencies', npmCommand, ['install'], env);
  } else {
    console.log('[frontend-start] Dependencies already installed');
  }

  runStep('Building project', npmCommand, ['run', 'build'], env);

  if (dryRun) {
    console.log('[frontend-start] Dry run complete. Server launch skipped.');
    return;
  }

  runStep('Launching browser app server', nodeCommand, ['dist/frontend/server.js'], env);
}

main();
