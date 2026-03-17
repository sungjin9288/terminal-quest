import fs from 'fs';
import os from 'os';
import path from 'path';
import { spawnSync } from 'child_process';
import {
  buildAiOpsCycleLatestSnapshot,
  buildAiOpsCycleMarkdown,
  buildAiOpsCycleSummary
} from '../dist/systems/aiOpsCycle.js';
import {
  buildAiOpsDoctorMarkdown,
  buildAiOpsDoctorReport,
  evaluateAiOpsDoctorGate
} from '../dist/systems/aiOpsDoctor.js';

const APPLY_LINEAR = process.argv.includes('--apply-linear');
const DRY_RUN = process.argv.includes('--dry-run');
const DOCTOR_FAIL_ON_WARN = process.argv.includes('--doctor-fail-on-warn');
const DOCTOR_GATE = process.argv.includes('--doctor-gate') || DOCTOR_FAIL_ON_WARN;
const artifactsDirArgIndex = process.argv.indexOf('--artifacts-dir');
const ARTIFACTS_DIR = artifactsDirArgIndex >= 0
  ? path.resolve(process.cwd(), process.argv[artifactsDirArgIndex + 1])
  : path.join(process.cwd(), 'docs', 'ai-ops-cycle');
const scopeArgIndex = process.argv.indexOf('--scope');
const SCOPE_ARG = scopeArgIndex >= 0 ? process.argv[scopeArgIndex + 1] : null;
const draftIdArgIndex = process.argv.indexOf('--draft-id');
const DRAFT_ID = draftIdArgIndex >= 0 ? process.argv[draftIdArgIndex + 1] : null;
const nodeCommand = process.execPath;

function ensureDir(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

function writeText(filePath, content) {
  fs.writeFileSync(filePath, content.endsWith('\n') ? content : `${content}\n`, 'utf-8');
}

function writeJson(filePath, payload) {
  fs.writeFileSync(filePath, `${JSON.stringify(payload, null, 2)}\n`, 'utf-8');
}

function formatStamp(date = new Date()) {
  const year = String(date.getFullYear());
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');
  return `${year}${month}${day}-${hours}${minutes}${seconds}`;
}

function runStep(label, args, outputPath) {
  console.log(`\n[ai-ops-cycle] ${label}`);
  console.log(`$ ${nodeCommand} ${args.join(' ')}`);

  const result = spawnSync(nodeCommand, args, {
    cwd: process.cwd(),
    encoding: 'utf-8',
    env: process.env
  });

  const stdout = result.stdout ?? '';
  const stderr = result.stderr ?? '';
  const output = [stdout.trimEnd(), stderr.trimEnd()]
    .filter(part => part.length > 0)
    .join('\n');

  if (output.length > 0) {
    console.log(output);
  }

  if (outputPath) {
    writeText(outputPath, output);
  }

  return {
    ok: (result.status ?? 1) === 0,
    status: result.status ?? 1,
    output
  };
}

function getMode() {
  if (APPLY_LINEAR && DRY_RUN) {
    throw new Error('`--apply-linear` and `--dry-run` cannot be used together');
  }
  if (APPLY_LINEAR) {
    return 'apply-linear';
  }
  if (DRY_RUN) {
    return 'dry-run';
  }
  return 'artifact';
}

function buildStepArgs(reportPath) {
  const exportArgs = [
    'scripts/export-ai-ops-linear.js',
    APPLY_LINEAR ? '--apply' : '--dry-run',
    '--report-json',
    reportPath
  ];
  if (SCOPE_ARG) {
    exportArgs.push('--scope', SCOPE_ARG);
  }
  if (DRAFT_ID) {
    exportArgs.push('--draft-id', DRAFT_ID);
  }

  return [
    {
      id: 'ai-insights',
      label: 'AI insights',
      args: ['scripts/generate-ai-insights-report.js', '--dry-run', '--report-json', reportPath],
      outputFileName: 'ai-insights.txt'
    },
    {
      id: 'ai-backlog',
      label: 'AI backlog',
      args: ['scripts/generate-ai-ops-backlog.js', '--dry-run', '--report-json', reportPath],
      outputFileName: 'ai-backlog.txt'
    },
    {
      id: 'ai-linear-drafts',
      label: 'AI linear drafts',
      args: ['scripts/generate-ai-ops-linear-drafts.js', '--dry-run', '--report-json', reportPath],
      outputFileName: 'ai-linear-drafts.txt'
    },
    {
      id: 'ai-linear-export',
      label: APPLY_LINEAR ? 'AI linear export apply' : 'AI linear export preview',
      args: exportArgs,
      outputFileName: 'ai-linear-export.txt'
    },
    {
      id: 'ai-linear-sync',
      label: APPLY_LINEAR ? 'AI linear sync apply' : 'AI linear sync preview',
      args: ['scripts/sync-ai-ops-linear-status.js', APPLY_LINEAR ? '--apply' : '--dry-run'],
      outputFileName: 'ai-linear-sync.txt'
    }
  ];
}

async function main() {
  const mode = getMode();
  const generatedAtIso = new Date().toISOString();
  const stamp = formatStamp(new Date(generatedAtIso));
  const bundleDir = mode === 'dry-run'
    ? fs.mkdtempSync(path.join(os.tmpdir(), 'terminal-quest-ai-ops-cycle-'))
    : path.join(ARTIFACTS_DIR, stamp);
  ensureDir(bundleDir);

  const reportPath = path.join(bundleDir, 'playtest-report.json');
  const reportResult = runStep(
    'Playtest report JSON',
    ['scripts/playtest-report.js', '--json'],
    reportPath
  );

  if (!reportResult.ok) {
    process.exitCode = 1;
    return;
  }

  const report = JSON.parse(fs.readFileSync(reportPath, 'utf-8'));
  const steps = [{
    id: 'playtest-report',
    label: 'Playtest report JSON',
    command: `${nodeCommand} scripts/playtest-report.js --json`,
    ok: true,
    status: 0,
    outputFileName: path.basename(reportPath)
  }];

  for (const step of buildStepArgs(reportPath)) {
    const outputPath = path.join(bundleDir, step.outputFileName);
    const result = runStep(step.label, step.args, outputPath);
    steps.push({
      id: step.id,
      label: step.label,
      command: `${nodeCommand} ${step.args.join(' ')}`,
      ok: result.ok,
      status: result.status,
      outputFileName: step.outputFileName
    });

    if (!result.ok) {
      break;
    }
  }

  const latestSummaryPath = mode === 'dry-run'
    ? null
    : path.join(ARTIFACTS_DIR, 'latest.json');
  const latestReportJsonPath = mode === 'dry-run'
    ? null
    : path.join(ARTIFACTS_DIR, 'latest-playtest-report.json');

  const summary = buildAiOpsCycleSummary({
    generatedAtIso,
    mode,
    bundleDir: mode === 'dry-run' ? null : bundleDir,
    reportJsonPath: reportPath,
    latestSummaryPath,
    latestReportJsonPath,
    report,
    steps
  });

  const markdown = buildAiOpsCycleMarkdown(summary);
  const summaryJsonPath = path.join(bundleDir, 'summary.json');
  const summaryMdPath = path.join(bundleDir, 'summary.md');
  const doctorJsonPath = path.join(bundleDir, 'doctor.json');
  const doctorMdPath = path.join(bundleDir, 'doctor.md');
  const bundleDoctor = buildAiOpsDoctorReport(
    buildAiOpsCycleLatestSnapshot(summaryJsonPath, summary)
  );
  const bundleDoctorMarkdown = buildAiOpsDoctorMarkdown(bundleDoctor);
  const doctorGate = evaluateAiOpsDoctorGate(bundleDoctor, {
    failOnWarn: DOCTOR_FAIL_ON_WARN
  });

  if (mode !== 'dry-run') {
    ensureDir(ARTIFACTS_DIR);
    writeJson(summaryJsonPath, summary);
    writeText(summaryMdPath, markdown);
    writeJson(doctorJsonPath, bundleDoctor);
    writeText(doctorMdPath, bundleDoctorMarkdown);
    writeJson(latestSummaryPath, summary);
    writeText(path.join(ARTIFACTS_DIR, 'latest.md'), markdown);
    writeJson(latestReportJsonPath, report);
    const latestDoctorJsonPath = path.join(ARTIFACTS_DIR, 'latest-doctor.json');
    const latestDoctorMdPath = path.join(ARTIFACTS_DIR, 'latest-doctor.md');
    const latestDoctor = buildAiOpsDoctorReport(
      buildAiOpsCycleLatestSnapshot(latestSummaryPath, summary)
    );
    writeJson(latestDoctorJsonPath, latestDoctor);
    writeText(latestDoctorMdPath, buildAiOpsDoctorMarkdown(latestDoctor));
  }

  console.log(`\n[ai-ops-cycle] mode: ${mode}`);
  console.log(`[ai-ops-cycle] overall: ${summary.overallPass ? 'PASS' : 'FAIL'}`);
  console.log(`[ai-ops-cycle] doctor: ${bundleDoctor.status.toUpperCase()}`);
  if (DOCTOR_GATE) {
    console.log(
      `[ai-ops-cycle] doctor gate: ${doctorGate.blocked ? 'BLOCKED' : 'PASS'} (threshold=${doctorGate.threshold})`
    );
    if (doctorGate.reason) {
      console.log(`[ai-ops-cycle] doctor gate reason: ${doctorGate.reason}`);
    }
  }
  console.log(`[ai-ops-cycle] report: ${reportPath}`);
  if (mode !== 'dry-run') {
    console.log(`[ai-ops-cycle] bundle: ${bundleDir}`);
    console.log(`[ai-ops-cycle] latest summary: ${latestSummaryPath}`);
    console.log(`[ai-ops-cycle] bundle doctor: ${doctorJsonPath}`);
  }

  if (!summary.overallPass) {
    process.exitCode = 1;
  }

  if (DOCTOR_GATE && doctorGate.blocked) {
    process.exitCode = 1;
  }
}

try {
  await main();
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`[ai-ops-cycle] failed: ${message}`);
  process.exitCode = 1;
}
