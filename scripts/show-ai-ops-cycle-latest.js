import {
  buildAiOpsCycleLatestSnapshot,
  formatAiOpsCycleLatestLines,
  getAiOpsCycleLatestSummaryPath,
  readAiOpsCycleLatestSummary
} from '../dist/systems/aiOpsCycle.js';

const artifactsDirArgIndex = process.argv.indexOf('--artifacts-dir');
const ARTIFACTS_DIR = artifactsDirArgIndex >= 0
  ? process.argv[artifactsDirArgIndex + 1]
  : null;
const JSON_OUTPUT = process.argv.includes('--json');

function main() {
  const summaryPath = getAiOpsCycleLatestSummaryPath(process.cwd(), ARTIFACTS_DIR);
  const summary = readAiOpsCycleLatestSummary(process.cwd(), ARTIFACTS_DIR);
  const snapshot = buildAiOpsCycleLatestSnapshot(summaryPath, summary);

  if (JSON_OUTPUT) {
    console.log(JSON.stringify(snapshot, null, 2));
    return;
  }

  console.log('[ai-ops-cycle-latest] latest summary');
  console.log(`- file: ${summaryPath}`);
  for (const line of formatAiOpsCycleLatestLines(summary)) {
    console.log(line);
  }
}

try {
  main();
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`[ai-ops-cycle-latest] failed: ${message}`);
  process.exitCode = 1;
}
