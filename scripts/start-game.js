import { spawnSync } from 'child_process';
import { existsSync } from 'fs';
import { join } from 'path';

const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm';

function runStep(label, command, args) {
  console.log(`[start] ${label}`);
  const result = spawnSync(command, args, { stdio: 'inherit' });
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

function hasDependenciesInstalled() {
  return existsSync(join(process.cwd(), 'node_modules'));
}

function main() {
  if (!hasDependenciesInstalled()) {
    runStep('Installing dependencies', npmCommand, ['install']);
  } else {
    console.log('[start] Dependencies already installed');
  }

  runStep('Building project', npmCommand, ['run', 'build']);
  runStep('Launching game', npmCommand, ['start']);
}

main();
