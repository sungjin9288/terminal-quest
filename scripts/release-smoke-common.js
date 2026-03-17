import fs from 'fs';
import path from 'path';

function normalizeOpsDoctor(value) {
  if (!value || typeof value !== 'object') {
    return null;
  }

  const status = value.status;
  if (status !== 'ok' && status !== 'warn' && status !== 'fail') {
    return null;
  }

  return {
    status,
    freshnessLabel:
      typeof value.freshnessLabel === 'string' && value.freshnessLabel.trim().length > 0
        ? value.freshnessLabel
        : 'age unknown',
    recommendedCommand:
      typeof value.recommendedCommand === 'string' && value.recommendedCommand.trim().length > 0
        ? value.recommendedCommand
        : null,
    reasons: Array.isArray(value.reasons)
      ? value.reasons.filter(item => typeof item === 'string' && item.trim().length > 0)
      : []
  };
}

export function getReleaseSmokeLatestSummaryPath(rootDir = process.cwd(), reportDir = null) {
  const baseDir = reportDir
    ? path.resolve(rootDir, reportDir)
    : path.join(rootDir, 'releases', 'smoke-reports');
  return path.join(baseDir, 'release-smoke-latest.json');
}

export function readReleaseSmokeLatestSummary(rootDir = process.cwd(), reportDir = null) {
  const filePath = getReleaseSmokeLatestSummaryPath(rootDir, reportDir);
  if (!fs.existsSync(filePath)) {
    return null;
  }

  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  } catch {
    return null;
  }
}

export function buildReleaseSmokeLatestSnapshot(
  filePath,
  summary,
  now = Date.now()
) {
  if (!summary || typeof summary !== 'object') {
    return {
      filePath,
      summaryPresent: false,
      overallPass: null,
      freshness: null,
      versionTag: null,
      branch: null,
      commit: null,
      reportPath: null,
      opsDoctorGate: false,
      opsDoctor: null,
      failedSteps: []
    };
  }

  const generatedAt = typeof summary.generatedAt === 'string' ? summary.generatedAt : null;
  const generatedAtMs = generatedAt ? Date.parse(generatedAt) : Number.NaN;
  const ageHours = Number.isFinite(generatedAtMs)
    ? Math.max(0, Math.round((now - generatedAtMs) / (1000 * 60 * 60)))
    : null;

  return {
    filePath,
    summaryPresent: true,
    overallPass: Boolean(summary.overallPass),
    freshness:
      ageHours === null
        ? null
        : {
            ageHours,
            label: `${ageHours}h`
          },
    versionTag: typeof summary.versionTag === 'string' ? summary.versionTag : null,
    branch: typeof summary.branch === 'string' ? summary.branch : null,
    commit: typeof summary.commit === 'string' ? summary.commit : null,
    reportPath: typeof summary.reportPath === 'string' ? summary.reportPath : null,
    opsDoctorGate: Boolean(summary.opsDoctorGate),
    opsDoctor: normalizeOpsDoctor(summary.opsDoctor),
    failedSteps: Array.isArray(summary.steps)
      ? summary.steps
          .filter(step => step && typeof step === 'object' && step.ok === false)
          .map(step => ({
            label: typeof step.label === 'string' ? step.label : 'unknown',
            status: typeof step.status === 'number' ? step.status : 1
          }))
      : []
  };
}

export function formatReleaseSmokeLatestLines(snapshot) {
  if (!snapshot.summaryPresent) {
    return [
      '[release-smoke-latest] status: missing',
      `- file: ${snapshot.filePath}`,
      '- summary present: no'
    ];
  }

  return [
    `[release-smoke-latest] status: ${snapshot.overallPass ? 'PASS' : 'FAIL'}`,
    `- file: ${snapshot.filePath}`,
    `- version: ${snapshot.versionTag ?? 'unknown'}`,
    `- branch: ${snapshot.branch ?? 'unknown'}`,
    `- commit: ${snapshot.commit ?? 'unknown'}`,
    `- report: ${snapshot.reportPath ?? 'n/a'}`,
    `- age: ${snapshot.freshness?.label ?? 'unknown'}`,
    `- ops doctor gate: ${snapshot.opsDoctorGate ? 'enabled' : 'disabled'}`,
    `- ops doctor: ${snapshot.opsDoctor ? snapshot.opsDoctor.status : 'n/a'}`,
    `- ops next command: ${snapshot.opsDoctor?.recommendedCommand ?? 'n/a'}`,
    `- failed steps: ${
      snapshot.failedSteps.length > 0
        ? snapshot.failedSteps.map(step => `${step.label} (status=${step.status})`).join(', ')
        : 'none'
    }`
  ];
}
