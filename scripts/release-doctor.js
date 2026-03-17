import fs from 'fs';
import path from 'path';
import { spawnSync } from 'child_process';
import {
  buildReleaseSmokeLatestSnapshot,
  getReleaseSmokeLatestSummaryPath,
  readReleaseSmokeLatestSummary
} from './release-smoke-common.js';
import {
  buildReleaseDoctorReport,
  evaluateReleaseDoctorGate,
  formatReleaseDoctorLines,
  writeReleaseDoctorArtifacts
} from './release-doctor-common.js';

const JSON_OUTPUT = process.argv.includes('--json');
const FAIL_ON_WARN = process.argv.includes('--fail-on-warn');
const reportDirArgIndex = process.argv.indexOf('--report-dir');
const REPORT_DIR = reportDirArgIndex >= 0 ? process.argv[reportDirArgIndex + 1] : null;

function safeGitValue(args, fallback = null) {
  const result = spawnSync('git', args, { encoding: 'utf-8' });
  if (result.status !== 0) {
    return fallback;
  }
  const value = (result.stdout ?? '').trim();
  return value.length > 0 ? value : fallback;
}

function readPackageVersionTag() {
  try {
    const packageJson = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'package.json'), 'utf-8'));
    const version = String(packageJson.version ?? '0.0.0');
    return version.startsWith('v') ? version : `v${version}`;
  } catch {
    return null;
  }
}

function readReleaseSignoffLatestSummary(reportDir = null) {
  const baseDir = reportDir
    ? path.resolve(process.cwd(), reportDir)
    : path.join(process.cwd(), 'releases', 'smoke-reports');
  const filePath = path.join(baseDir, 'release-signoff-latest.json');
  if (!fs.existsSync(filePath)) {
    return null;
  }

  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  } catch {
    return null;
  }
}

function main() {
  const smokeSummaryPath = getReleaseSmokeLatestSummaryPath(process.cwd(), REPORT_DIR);
  const smokeSummary = readReleaseSmokeLatestSummary(process.cwd(), REPORT_DIR);
  const smokeSnapshot = buildReleaseSmokeLatestSnapshot(smokeSummaryPath, smokeSummary);
  const signoffSummary = readReleaseSignoffLatestSummary(REPORT_DIR);

  const report = buildReleaseDoctorReport({
    smokeSnapshot,
    signoffSummary,
    currentVersionTag: readPackageVersionTag(),
    currentBranch: safeGitValue(['branch', '--show-current']),
    currentCommit: safeGitValue(['rev-parse', '--short', 'HEAD'])
  });
  const artifactPaths = writeReleaseDoctorArtifacts(report, process.cwd(), REPORT_DIR);

  if (JSON_OUTPUT) {
    console.log(JSON.stringify(report, null, 2));
  } else {
    for (const line of formatReleaseDoctorLines(report)) {
      console.log(line);
    }
    console.log(`- latest doctor json: ${artifactPaths.latestJsonPath}`);
    console.log(`- latest doctor md: ${artifactPaths.latestMdPath}`);
  }

  const gate = evaluateReleaseDoctorGate(report, { failOnWarn: FAIL_ON_WARN });
  if (gate.blocked) {
    process.exitCode = 1;
  }
}

try {
  main();
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`[release-doctor] failed: ${message}`);
  process.exitCode = 1;
}
