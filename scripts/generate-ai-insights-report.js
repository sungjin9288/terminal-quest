import fs from 'fs';
import path from 'path';
import { readPlaytestNotes, resolvePlaytestOpsInputs } from './playtest-common.js';
import {
  parseAiTelemetryEvents,
  summarizeAiOpsInsights,
  buildAiOpsInsightsReport
} from '../dist/systems/aiOpsInsights.js';
import { getTelemetryFilePath } from '../dist/systems/telemetry.js';
import { formatReleaseDate } from '../dist/systems/releasePackaging.js';

const DRY_RUN = process.argv.includes('--dry-run');
const inputArgIndex = process.argv.indexOf('--input');
const INPUT_PATH = inputArgIndex >= 0 ? process.argv[inputArgIndex + 1] : null;
const notesDirArgIndex = process.argv.indexOf('--notes-dir');
const NOTES_DIR_PATH = notesDirArgIndex >= 0 ? process.argv[notesDirArgIndex + 1] : null;
const reportJsonArgIndex = process.argv.indexOf('--report-json');
const REPORT_JSON_PATH = reportJsonArgIndex >= 0 ? process.argv[reportJsonArgIndex + 1] : null;
const REPORTS_DIR = path.join(process.cwd(), 'docs', 'ai-insights');
const LATEST_REPORT_FILE = 'latest.md';

function readTelemetry(telemetryPath) {
  if (!fs.existsSync(telemetryPath)) {
    return '';
  }

  return fs.readFileSync(telemetryPath, 'utf-8');
}

function main() {
  const resolvedInputs = resolvePlaytestOpsInputs({
    rootDir: process.cwd(),
    reportJsonPath: REPORT_JSON_PATH,
    telemetryPath: INPUT_PATH ?? getTelemetryFilePath(),
    notesDir: NOTES_DIR_PATH
  });
  const telemetryPath = resolvedInputs.telemetryPath;
  const notesDir = resolvedInputs.notesDir;
  const telemetryContent = readTelemetry(telemetryPath);
  const records = parseAiTelemetryEvents(telemetryContent);
  const notes = readPlaytestNotes({
    ...resolvedInputs.playtestPaths,
    notesDir
  });
  const summary = summarizeAiOpsInsights(records, notes);
  const releaseDate = formatReleaseDate();
  const generatedAtIso = new Date().toISOString();
  const content = buildAiOpsInsightsReport({
    generatedAtIso,
    telemetryPath,
    summary
  });
  const datedPath = path.join(REPORTS_DIR, `${releaseDate}.md`);
  const latestPath = path.join(REPORTS_DIR, LATEST_REPORT_FILE);

  if (DRY_RUN) {
    console.log('[ai-insights] dry-run mode');
    if (resolvedInputs.reportJsonPath) {
      console.log(`- report-json: ${resolvedInputs.reportJsonPath}`);
    }
    console.log(`- telemetry: ${telemetryPath}`);
    console.log(`- records: ${records.length}`);
    console.log(`- notes: ${notesDir}`);
    console.log(`- notes read: ${notes.length}`);
    console.log('\n--- preview ---\n');
    console.log(content);
    return;
  }

  fs.mkdirSync(REPORTS_DIR, { recursive: true });
  fs.writeFileSync(datedPath, content, 'utf-8');
  fs.writeFileSync(latestPath, content, 'utf-8');

  console.log('[ai-insights] report generated');
  console.log(`- telemetry: ${telemetryPath}`);
  console.log(`- notes: ${notesDir}`);
  console.log(`- file: ${path.relative(process.cwd(), datedPath)}`);
  console.log(`- latest: ${path.relative(process.cwd(), latestPath)}`);
}

try {
  main();
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`[ai-insights] failed: ${message}`);
  process.exitCode = 1;
}
