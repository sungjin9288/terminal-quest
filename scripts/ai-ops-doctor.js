import {
  buildAiOpsCycleLatestSnapshot,
  getAiOpsCycleLatestSummaryPath,
  readAiOpsCycleLatestSummary
} from '../dist/systems/aiOpsCycle.js';
import {
  buildAiOpsDoctorReport,
  evaluateAiOpsDoctorGate,
  formatAiOpsDoctorLines
} from '../dist/systems/aiOpsDoctor.js';

const artifactsDirArgIndex = process.argv.indexOf('--artifacts-dir');
const ARTIFACTS_DIR = artifactsDirArgIndex >= 0
  ? process.argv[artifactsDirArgIndex + 1]
  : null;
const JSON_OUTPUT = process.argv.includes('--json');
const FAIL_ON_WARN = process.argv.includes('--fail-on-warn');

function main() {
  const summaryPath = getAiOpsCycleLatestSummaryPath(process.cwd(), ARTIFACTS_DIR);
  const summary = readAiOpsCycleLatestSummary(process.cwd(), ARTIFACTS_DIR);
  const snapshot = buildAiOpsCycleLatestSnapshot(summaryPath, summary);
  const report = buildAiOpsDoctorReport(snapshot);

  if (JSON_OUTPUT) {
    console.log(JSON.stringify(report, null, 2));
  } else {
    for (const line of formatAiOpsDoctorLines(report)) {
      console.log(line);
    }
  }

  const gate = evaluateAiOpsDoctorGate(report, { failOnWarn: FAIL_ON_WARN });
  if (gate.blocked) {
    process.exitCode = 1;
  }
}

try {
  main();
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`[ai-ops-doctor] failed: ${message}`);
  process.exitCode = 1;
}
