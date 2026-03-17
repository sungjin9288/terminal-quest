import {
  buildReleaseSmokeLatestSnapshot,
  formatReleaseSmokeLatestLines,
  getReleaseSmokeLatestSummaryPath,
  readReleaseSmokeLatestSummary
} from './release-smoke-common.js';

const JSON_OUTPUT = process.argv.includes('--json');
const reportDirArgIndex = process.argv.indexOf('--report-dir');
const REPORT_DIR = reportDirArgIndex >= 0 ? process.argv[reportDirArgIndex + 1] : null;

function main() {
  const summaryPath = getReleaseSmokeLatestSummaryPath(process.cwd(), REPORT_DIR);
  const summary = readReleaseSmokeLatestSummary(process.cwd(), REPORT_DIR);
  const snapshot = buildReleaseSmokeLatestSnapshot(summaryPath, summary);

  if (JSON_OUTPUT) {
    console.log(JSON.stringify(snapshot, null, 2));
    return;
  }

  for (const line of formatReleaseSmokeLatestLines(snapshot)) {
    console.log(line);
  }
}

try {
  main();
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`[release-smoke-latest] failed: ${message}`);
  process.exitCode = 1;
}
