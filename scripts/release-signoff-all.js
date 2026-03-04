import { spawnSync } from 'child_process';

const nodeCommand = process.execPath;
const scriptPath = 'scripts/release-signoff.js';
const roles = ['qa', 'engineering', 'release-manager'];

function readArg(flag) {
  const index = process.argv.indexOf(flag);
  if (index === -1) {
    return null;
  }
  return process.argv[index + 1] ?? null;
}

function main() {
  const by = readArg('--by') ?? process.env.USER ?? process.env.USERNAME ?? 'unknown';
  const notes = readArg('--notes');
  const report = readArg('--report');

  for (const role of roles) {
    const args = [scriptPath, '--role', role, '--by', by];
    if (notes) {
      args.push('--notes', notes);
    }
    if (report) {
      args.push('--report', report);
    }

    const result = spawnSync(nodeCommand, args, { stdio: 'inherit' });
    if (result.status !== 0) {
      process.exit(result.status ?? 1);
      return;
    }
  }

  console.log('[release-signoff-all] PASS: all sign-off roles approved.');
}

main();
