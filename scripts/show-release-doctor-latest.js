import {
  buildReleaseDoctorLatestSnapshot,
  formatReleaseDoctorLatestLines,
  getReleaseDoctorLatestJsonPath,
  readReleaseDoctorLatestReport
} from './release-doctor-common.js';

const JSON_OUTPUT = process.argv.includes('--json');
const reportDirArgIndex = process.argv.indexOf('--report-dir');
const REPORT_DIR = reportDirArgIndex >= 0 ? process.argv[reportDirArgIndex + 1] : null;

function main() {
  const reportPath = getReleaseDoctorLatestJsonPath(process.cwd(), REPORT_DIR);
  const report = readReleaseDoctorLatestReport(process.cwd(), REPORT_DIR);
  const snapshot = buildReleaseDoctorLatestSnapshot(reportPath, report);

  if (JSON_OUTPUT) {
    console.log(JSON.stringify(snapshot, null, 2));
    return;
  }

  for (const line of formatReleaseDoctorLatestLines(snapshot)) {
    console.log(line);
  }
}

try {
  main();
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`[release-doctor-latest] failed: ${message}`);
  process.exitCode = 1;
}
