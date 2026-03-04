import { spawnSync } from 'child_process';
import { existsSync } from 'fs';
import { join } from 'path';

const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm';

const steps = [
  { label: 'TypeScript build', command: [npmCommand, ['run', 'build']] },
  { label: 'Test suite', command: [npmCommand, ['test', '--', '--runInBand']] },
  { label: 'Save migration verification', command: [npmCommand, ['run', 'verify:save-migration']] },
  { label: 'Data validation', command: [npmCommand, ['run', 'validate:data']] }
];

const requiredDocs = [
  'docs/paid-release-roadmap.md',
  'CHANGELOG.md',
  'docs/support-policy.md',
  'docs/live-balance-cadence.md',
  'docs/seasonal-events.md',
  'docs/release-smoke-checklist.md',
  'docs/save-migration-verification.md'
];

function runStep(label, command, args) {
  console.log(`\n[release-check] ${label}`);
  const result = spawnSync(command, args, { stdio: 'inherit' });
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

function checkRequiredDocs() {
  const missing = requiredDocs.filter(relativePath =>
    !existsSync(join(process.cwd(), relativePath))
  );

  if (missing.length > 0) {
    console.error('\n[release-check] missing required docs:');
    missing.forEach(relativePath => console.error(`- ${relativePath}`));
    process.exit(1);
  }

  console.log('\n[release-check] required docs check passed.');
}

function main() {
  checkRequiredDocs();

  for (const step of steps) {
    const [command, args] = step.command;
    runStep(step.label, command, args);
  }

  console.log('\n[release-check] PASS: release readiness gate complete.');
}

main();
