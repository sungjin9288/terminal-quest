import { spawnSync } from 'child_process';

const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm';

function runStep(label, args) {
  console.log(`\n[save-migration-check] ${label}`);
  const result = spawnSync(npmCommand, args, { stdio: 'inherit' });
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

function main() {
  runStep('legacy save migration tests', [
    'test',
    '--',
    '--runInBand',
    'tests/saveMigration.e2e.test.ts',
    'tests/loadGame.e2e.test.ts'
  ]);

  console.log('\n[save-migration-check] PASS: migration verification complete.');
}

main();
