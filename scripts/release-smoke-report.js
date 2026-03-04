import fs from 'fs';
import path from 'path';
import { spawnSync } from 'child_process';

const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const REPORT_DIR = path.join(process.cwd(), 'releases', 'smoke-reports');
const LOG_TAIL_LINES = 220;
const RUNTIME_SMOKE_SUMMARY_PATH = path.join(REPORT_DIR, 'runtime-smoke-latest.json');
const RELEASE_SIGNOFF_SUMMARY_PATH = path.join(REPORT_DIR, 'release-signoff-latest.json');
const RELEASE_SMOKE_LATEST_SUMMARY_PATH = path.join(REPORT_DIR, 'release-smoke-latest.json');

function getVersionTag(version) {
  return version.startsWith('v') ? version : `v${version}`;
}

function getArchiveExtension() {
  return process.platform === 'win32' ? 'zip' : 'tar.gz';
}

function runCommand(label, command, args) {
  const startedAt = Date.now();
  console.log(`\n[release-smoke] ${label}`);
  console.log(`$ ${command} ${args.join(' ')}`);

  const result = spawnSync(command, args, {
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

  const elapsedMs = Date.now() - startedAt;
  const status = result.status ?? 1;
  const ok = status === 0;

  if (!ok) {
    console.error(`[release-smoke] ${label} failed with status=${status}`);
  }

  return {
    label,
    command: [command, ...args].join(' '),
    ok,
    status,
    elapsedMs,
    output
  };
}

function safeGitValue(args, fallback = 'unknown') {
  const result = spawnSync('git', args, { encoding: 'utf-8' });
  if (result.status !== 0) {
    return fallback;
  }
  const value = (result.stdout ?? '').trim();
  return value.length > 0 ? value : fallback;
}

function tailLines(text, maxLines = LOG_TAIL_LINES) {
  const lines = text.split('\n');
  if (lines.length <= maxLines) {
    return text;
  }
  return lines.slice(lines.length - maxLines).join('\n');
}

function ensureDir(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

function writeJson(filePath, payload) {
  fs.writeFileSync(filePath, `${JSON.stringify(payload, null, 2)}\n`, 'utf-8');
}

function readRuntimeSmokeSummary() {
  if (!fs.existsSync(RUNTIME_SMOKE_SUMMARY_PATH)) {
    return null;
  }

  try {
    const raw = fs.readFileSync(RUNTIME_SMOKE_SUMMARY_PATH, 'utf-8');
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function readReleaseSignoffSummary() {
  if (!fs.existsSync(RELEASE_SIGNOFF_SUMMARY_PATH)) {
    return null;
  }

  try {
    const raw = fs.readFileSync(RELEASE_SIGNOFF_SUMMARY_PATH, 'utf-8');
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function getSignoffEntry(summary, roleKey) {
  if (!summary || typeof summary !== 'object' || typeof summary.signoffs !== 'object') {
    return null;
  }
  return summary.signoffs[roleKey] ?? null;
}

function isSignoffApproved(summary, roleKey) {
  const entry = getSignoffEntry(summary, roleKey);
  return Boolean(entry?.approved);
}

function formatSignoffSuffix(summary, roleKey) {
  const entry = getSignoffEntry(summary, roleKey);
  if (!entry?.approved) {
    return '';
  }

  const signedBy = entry.signedBy ?? 'unknown';
  const signedAt = entry.signedAt ?? 'unknown-time';
  return ` (${signedBy} @ ${signedAt})`;
}

function getScenarioPass(summary, scenarioId) {
  if (!summary || !Array.isArray(summary.scenarios)) {
    return false;
  }

  const scenario = summary.scenarios.find((item) => item.id === scenarioId);
  return Boolean(scenario?.passed);
}

function toCheckbox(value) {
  return value ? '[x]' : '[ ]';
}

function formatDuration(ms) {
  if (ms < 1000) {
    return `${ms}ms`;
  }
  return `${(ms / 1000).toFixed(2)}s`;
}

function buildSummaryPayload({
  generatedAtIso,
  versionTag,
  packageName,
  branch,
  commit,
  reportPath,
  steps,
  runtimeSmokeSummary,
  releaseSignoffSummary
}) {
  const overallPass = steps.every(step => step.ok);
  return {
    generatedAt: generatedAtIso,
    versionTag,
    packageName,
    branch,
    commit,
    reportPath: path.relative(process.cwd(), reportPath),
    overallPass,
    steps: steps.map(step => ({
      label: step.label,
      command: step.command,
      ok: step.ok,
      status: step.status,
      elapsedMs: step.elapsedMs
    })),
    runtimeSmoke: {
      summaryPath: path.relative(process.cwd(), RUNTIME_SMOKE_SUMMARY_PATH),
      available: Boolean(runtimeSmokeSummary),
      overallPass: Boolean(runtimeSmokeSummary?.overallPass),
      generatedAt: runtimeSmokeSummary?.generatedAt ?? null
    },
    signoff: {
      summaryPath: path.relative(process.cwd(), RELEASE_SIGNOFF_SUMMARY_PATH),
      available: Boolean(releaseSignoffSummary),
      allApproved: Boolean(releaseSignoffSummary?.allApproved),
      updatedAt: releaseSignoffSummary?.updatedAt ?? null,
      versionTag: releaseSignoffSummary?.versionTag ?? null
    }
  };
}

function buildReportContent({
  generatedAtIso,
  branch,
  commit,
  versionTag,
  packageName,
  nodeVersion,
  platform,
  steps,
  runtimeSmokeSummary,
  releaseSignoffSummary,
  releaseDirPath,
  archivePath
}) {
  const overallPass = steps.every(step => step.ok);
  const releaseDirExists = fs.existsSync(releaseDirPath);
  const archiveExists = fs.existsSync(archivePath);
  const checksumPath = `${archivePath}.sha256`;
  const checksumExists = fs.existsSync(checksumPath);
  const runtimeSmokePass =
    steps.some(step => step.label === 'Runtime smoke verification' && step.ok);
  const packageLaunchPass =
    steps.some(step => step.label === 'Package launch verification' && step.ok);
  const qaSignoffApproved = isSignoffApproved(releaseSignoffSummary, 'qa');
  const engineeringSignoffApproved = isSignoffApproved(releaseSignoffSummary, 'engineering');
  const releaseManagerSignoffApproved = isSignoffApproved(
    releaseSignoffSummary,
    'releaseManager'
  );

  const stepRows = steps.map(step => {
    const mark = step.ok ? 'PASS' : `FAIL(${step.status})`;
    return `| ${step.label} | \`${step.command}\` | ${mark} | ${formatDuration(step.elapsedMs)} |`;
  }).join('\n');

  const logs = steps.map(step => {
    const clipped = tailLines(step.output);
    return (
      `### ${step.label}\n` +
      '```text\n' +
      (clipped.length > 0 ? clipped : '(no output)') +
      '\n```\n'
    );
  }).join('\n');

  return (
    `# Release Smoke Report - ${versionTag}\n\n` +
    `## Summary\n` +
    `- Result: ${overallPass ? 'PASS' : 'FAIL'}\n` +
    `- Generated at: ${generatedAtIso}\n` +
    `- Branch: ${branch}\n` +
    `- Commit: ${commit}\n` +
    `- Version: ${versionTag}\n` +
    `- Package: ${packageName}\n` +
    `- Node: ${nodeVersion}\n` +
    `- Platform: ${platform}\n\n` +
    `## Automated Steps\n` +
    `| Step | Command | Result | Duration |\n` +
    `|---|---|---|---|\n` +
    `${stepRows}\n\n` +
    `## Runtime Smoke Coverage (Automated)\n` +
    `- Summary file: \`${path.relative(process.cwd(), RUNTIME_SMOKE_SUMMARY_PATH)}\`\n` +
    `- Summary generated at: ${runtimeSmokeSummary?.generatedAt ?? 'unavailable'}\n` +
    `- Group result: ${runtimeSmokeSummary?.overallPass ? 'PASS' : 'UNAVAILABLE/FAIL'}\n\n` +
    `## Sign-Off Coverage (Automated)\n` +
    `- Summary file: \`${path.relative(process.cwd(), RELEASE_SIGNOFF_SUMMARY_PATH)}\`\n` +
    `- Summary generated at: ${releaseSignoffSummary?.updatedAt ?? 'unavailable'}\n` +
    `- Aggregate result: ${releaseSignoffSummary?.allApproved ? 'PASS' : 'PENDING'}\n\n` +
    `## Packaging Artifacts\n` +
    `- ${releaseDirExists ? '[x]' : '[ ]'} \`${path.relative(process.cwd(), releaseDirPath)}\`\n` +
    `- ${archiveExists ? '[x]' : '[ ]'} \`${path.relative(process.cwd(), archivePath)}\`\n` +
    `- ${checksumExists ? '[x]' : '[ ]'} \`${path.relative(process.cwd(), checksumPath)}\`\n\n` +
    `## Runtime Smoke (Manual)\n` +
    `- ${toCheckbox(runtimeSmokePass)} \`npm run verify:runtime-smoke\` passes.\n` +
    `- ${toCheckbox(packageLaunchPass)} Launch game from package: \`node dist/index.js\`\n` +
    `- ${toCheckbox(getScenarioPass(runtimeSmokeSummary, 'first_combat_encounter'))} Start new game and reach first combat encounter.\n` +
    `- ${toCheckbox(getScenarioPass(runtimeSmokeSummary, 'save_reload'))} Save in town and reload successfully.\n` +
    `- ${toCheckbox(getScenarioPass(runtimeSmokeSummary, 'quest_reward'))} Complete one quest and verify reward application.\n` +
    `- ${toCheckbox(getScenarioPass(runtimeSmokeSummary, 'boss_progression'))} Defeat one boss and verify progression unlock.\n` +
    `- ${toCheckbox(getScenarioPass(runtimeSmokeSummary, 'settings_behavior'))} Toggle \`진행 템포\`, \`자동 진행 속도\`, \`추천 가이드\` in settings and confirm behavior changes.\n` +
    `- ${toCheckbox(getScenarioPass(runtimeSmokeSummary, 'critical_ack'))} Verify runtime error/death checkpoints still require explicit Enter acknowledgment.\n\n` +
    `## Sign-Off\n` +
    `- ${toCheckbox(qaSignoffApproved)} QA sign-off${formatSignoffSuffix(releaseSignoffSummary, 'qa')}\n` +
    `- ${toCheckbox(engineeringSignoffApproved)} Engineering sign-off${formatSignoffSuffix(releaseSignoffSummary, 'engineering')}\n` +
    `- ${toCheckbox(releaseManagerSignoffApproved)} Release manager sign-off${formatSignoffSuffix(releaseSignoffSummary, 'releaseManager')}\n\n` +
    `## Command Logs (Tail)\n\n` +
    `${logs}`
  );
}

function main() {
  const packageJsonPath = path.join(process.cwd(), 'package.json');
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
  const versionTag = getVersionTag(String(packageJson.version ?? '0.0.0'));
  const packageName = String(packageJson.name ?? 'terminal-quest');
  const archiveExt = getArchiveExtension();
  const releaseDirPath = path.join(process.cwd(), 'releases', versionTag);
  const archivePath = path.join(
    process.cwd(),
    'releases',
    `${packageName}-${versionTag}.${archiveExt}`
  );

  const steps = [];
  steps.push(runCommand('Release readiness gate', npmCommand, ['run', 'release:check']));
  if (steps[steps.length - 1].ok) {
    steps.push(runCommand('Package launch verification', npmCommand, ['run', 'verify:package-launch']));
  }
  if (steps[steps.length - 1].ok) {
    steps.push(runCommand('Runtime smoke verification', npmCommand, ['run', 'verify:runtime-smoke']));
  }
  if (steps[steps.length - 1].ok) {
    steps.push(runCommand('Release package dry-run', npmCommand, ['run', 'release:package:dry']));
  }
  if (steps[steps.length - 1].ok) {
    steps.push(runCommand('Release package build', npmCommand, ['run', 'release:package']));
  }
  if (steps[steps.length - 1].ok) {
    steps.push(runCommand('Release artifact integrity check', npmCommand, ['run', 'verify:release-artifacts']));
  }

  const generatedAtIso = new Date().toISOString();
  const branch = safeGitValue(['branch', '--show-current']);
  const commit = safeGitValue(['rev-parse', '--short', 'HEAD']);
  const runtimeSmokeSummary = readRuntimeSmokeSummary();
  const releaseSignoffSummary = readReleaseSignoffSummary();
  const reportContent = buildReportContent({
    generatedAtIso,
    branch,
    commit,
    versionTag,
    packageName,
    nodeVersion: process.version,
    platform: process.platform,
    steps,
    runtimeSmokeSummary,
    releaseSignoffSummary,
    releaseDirPath,
    archivePath
  });

  ensureDir(REPORT_DIR);
  const stamp = generatedAtIso.replace(/[:.]/g, '-');
  const reportPath = path.join(REPORT_DIR, `release-smoke-${stamp}.md`);
  fs.writeFileSync(reportPath, reportContent, 'utf-8');

  const overallPass = steps.every(step => step.ok);
  const summaryPayload = buildSummaryPayload({
    generatedAtIso,
    versionTag,
    packageName,
    branch,
    commit,
    reportPath,
    steps,
    runtimeSmokeSummary,
    releaseSignoffSummary
  });
  const summaryStampedPath = path.join(REPORT_DIR, `release-smoke-${stamp}.json`);
  writeJson(RELEASE_SMOKE_LATEST_SUMMARY_PATH, summaryPayload);
  writeJson(summaryStampedPath, summaryPayload);

  console.log(`\n[release-smoke] report generated: ${path.relative(process.cwd(), reportPath)}`);
  console.log(
    `[release-smoke] summary generated: ${path.relative(process.cwd(), RELEASE_SMOKE_LATEST_SUMMARY_PATH)}`
  );
  console.log(`[release-smoke] result: ${overallPass ? 'PASS' : 'FAIL'}`);

  if (!overallPass) {
    process.exitCode = 1;
  }
}

main();
