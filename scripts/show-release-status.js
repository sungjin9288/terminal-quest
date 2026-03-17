import {
  formatReleaseStatusLines,
  readReleaseStatusSnapshot
} from './release-status-common.js';

const JSON_OUTPUT = process.argv.includes('--json');
const reportDirArgIndex = process.argv.indexOf('--report-dir');
const REPORT_DIR = reportDirArgIndex >= 0 ? process.argv[reportDirArgIndex + 1] : null;

function main() {
  const snapshot = readReleaseStatusSnapshot(process.cwd(), REPORT_DIR);

  if (JSON_OUTPUT) {
    console.log(JSON.stringify(snapshot, null, 2));
    return;
  }

  for (const line of formatReleaseStatusLines(snapshot)) {
    console.log(line);
  }
}

try {
  main();
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`[release-status] failed: ${message}`);
  process.exitCode = 1;
}
