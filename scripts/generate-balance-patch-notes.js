import fs from 'fs';
import path from 'path';
import { spawnSync } from 'child_process';
import {
  extractBalancePatchMetrics,
  buildBalancePatchNotesContent
} from '../dist/systems/balancePatchNotes.js';
import { formatReleaseDate } from '../dist/systems/releasePackaging.js';

const DRY_RUN = process.argv.includes('--dry-run');
const PATCH_NOTES_DIR = path.join(process.cwd(), 'docs', 'patch-notes');
const LATEST_NOTES_FILE = 'latest.md';

const VALIDATION_STEPS = [
  {
    label: 'Quest balance',
    command: 'node',
    args: ['scripts/validate-quest-balance.js']
  },
  {
    label: 'Economy balance',
    command: 'node',
    args: ['scripts/validate-economy-balance.js']
  },
  {
    label: 'Playtime balance',
    command: 'node',
    args: ['scripts/validate-playtime-balance.js']
  }
];

function runStep(command, args) {
  const result = spawnSync(command, args, {
    encoding: 'utf-8'
  });

  const output = [
    result.stdout ?? '',
    result.stderr ?? ''
  ]
    .filter(chunk => chunk.trim().length > 0)
    .join('\n')
    .trim();

  if (result.status !== 0) {
    throw new Error(
      `${command} ${args.join(' ')} failed (exit=${result.status ?? 1})\n${output}`
    );
  }

  return output;
}

function main() {
  const outputs = {
    questOutput: '',
    economyOutput: '',
    playtimeOutput: ''
  };

  for (const step of VALIDATION_STEPS) {
    console.log(`[balance-notes] ${step.label}`);
    const output = runStep(step.command, step.args);
    if (step.label === 'Quest balance') {
      outputs.questOutput = output;
    } else if (step.label === 'Economy balance') {
      outputs.economyOutput = output;
    } else if (step.label === 'Playtime balance') {
      outputs.playtimeOutput = output;
    }
  }

  const releaseDate = formatReleaseDate();
  const generatedAtIso = new Date().toISOString();
  const metrics = extractBalancePatchMetrics(outputs);
  const content = buildBalancePatchNotesContent({
    releaseDate,
    generatedAtIso,
    metrics,
    outputs
  });
  const datedFileName = `${releaseDate}.md`;
  const datedPath = path.join(PATCH_NOTES_DIR, datedFileName);
  const latestPath = path.join(PATCH_NOTES_DIR, LATEST_NOTES_FILE);

  if (DRY_RUN) {
    console.log('[balance-notes] dry-run mode');
    console.log(`- target-date: ${releaseDate}`);
    console.log('\n--- preview ---\n');
    console.log(content);
    return;
  }

  fs.mkdirSync(PATCH_NOTES_DIR, { recursive: true });
  fs.writeFileSync(datedPath, content, 'utf-8');
  fs.writeFileSync(latestPath, content, 'utf-8');

  console.log('[balance-notes] patch notes generated');
  console.log(`- file: ${path.relative(process.cwd(), datedPath)}`);
  console.log(`- latest: ${path.relative(process.cwd(), latestPath)}`);
}

try {
  main();
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`[balance-notes] failed: ${message}`);
  process.exitCode = 1;
}
