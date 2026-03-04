import fs from 'fs';
import path from 'path';
import { spawnSync } from 'child_process';

const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm';

function hasFlag(flag) {
  return process.argv.includes(flag);
}

function readArg(flag) {
  const index = process.argv.indexOf(flag);
  if (index === -1) {
    return null;
  }
  return process.argv[index + 1] ?? null;
}

function runCommand(label, command, args) {
  console.log(`\n[release-candidate] ${label}`);
  console.log(`$ ${command} ${args.join(' ')}`);

  const result = spawnSync(command, args, { stdio: 'inherit' });
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

function readJsonOrNull(filePath) {
  if (!fs.existsSync(filePath)) {
    return null;
  }

  try {
    const raw = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function readPackageVersionTag() {
  const packagePath = path.join(process.cwd(), 'package.json');
  const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf-8'));
  const version = String(packageJson.version ?? '0.0.0');
  return version.startsWith('v') ? version : `v${version}`;
}

function safeGitValue(args, fallback = 'unknown') {
  const result = spawnSync('git', args, { encoding: 'utf-8' });
  if (result.status !== 0) {
    return fallback;
  }
  const value = (result.stdout ?? '').trim();
  return value.length > 0 ? value : fallback;
}

function exitWithError(message) {
  console.error(`[release-candidate] FAIL: ${message}`);
  process.exit(1);
}

function getPendingRoles(signoffSummary) {
  const signoffs = signoffSummary?.signoffs ?? {};
  const pending = [];

  if (!signoffs?.qa?.approved) {
    pending.push('qa');
  }
  if (!signoffs?.engineering?.approved) {
    pending.push('engineering');
  }
  if (!signoffs?.releaseManager?.approved) {
    pending.push('release-manager');
  }

  return pending;
}

function main() {
  const skipSmoke = hasFlag('--skip-smoke');
  const reportDirArg = readArg('--report-dir');
  const reportDir = reportDirArg
    ? path.resolve(process.cwd(), reportDirArg)
    : path.join(process.cwd(), 'releases', 'smoke-reports');
  const releaseSmokeLatestSummaryPath = path.join(reportDir, 'release-smoke-latest.json');
  const releaseSignoffLatestPath = path.join(reportDir, 'release-signoff-latest.json');
  const expectedVersionTag = readPackageVersionTag();
  const currentBranch = safeGitValue(['branch', '--show-current']);
  const currentCommit = safeGitValue(['rev-parse', '--short', 'HEAD']);

  if (!skipSmoke) {
    runCommand('Run smoke flow', npmCommand, ['run', 'release:smoke']);
  }

  const smokeSummary = readJsonOrNull(releaseSmokeLatestSummaryPath);
  if (!smokeSummary) {
    exitWithError(
      `missing smoke summary: ${path.relative(process.cwd(), releaseSmokeLatestSummaryPath)}`
    );
    return;
  }

  if (!smokeSummary.overallPass) {
    exitWithError('release smoke summary reports overallPass=false');
    return;
  }

  if (smokeSummary.versionTag !== expectedVersionTag) {
    exitWithError(
      `smoke summary version mismatch (expected ${expectedVersionTag}, got ${smokeSummary.versionTag ?? 'unknown'})`
    );
    return;
  }

  if (smokeSummary.commit !== currentCommit) {
    exitWithError(
      `smoke summary commit mismatch (expected ${currentCommit}, got ${smokeSummary.commit ?? 'unknown'})`
    );
    return;
  }

  if (smokeSummary.branch !== currentBranch) {
    exitWithError(
      `smoke summary branch mismatch (expected ${currentBranch}, got ${smokeSummary.branch ?? 'unknown'})`
    );
    return;
  }

  const smokeReportPath = smokeSummary.reportPath
    ? path.resolve(process.cwd(), smokeSummary.reportPath)
    : null;
  if (!smokeReportPath || !fs.existsSync(smokeReportPath)) {
    exitWithError(
      `smoke summary reportPath is missing or unreadable: ${smokeSummary.reportPath ?? 'null'}`
    );
    return;
  }

  const signoffSummary = readJsonOrNull(releaseSignoffLatestPath);
  if (!signoffSummary) {
    exitWithError(
      `missing sign-off summary: ${path.relative(process.cwd(), releaseSignoffLatestPath)}`
    );
    return;
  }

  if (signoffSummary.versionTag !== expectedVersionTag) {
    exitWithError(
      `sign-off version mismatch (expected ${expectedVersionTag}, got ${signoffSummary.versionTag ?? 'unknown'})`
    );
    return;
  }

  if (signoffSummary.commit !== currentCommit) {
    exitWithError(
      `sign-off commit mismatch (expected ${currentCommit}, got ${signoffSummary.commit ?? 'unknown'})`
    );
    return;
  }

  if (signoffSummary.branch !== currentBranch) {
    exitWithError(
      `sign-off branch mismatch (expected ${currentBranch}, got ${signoffSummary.branch ?? 'unknown'})`
    );
    return;
  }

  const signoffReportPath = signoffSummary.reportPath
    ? path.resolve(process.cwd(), signoffSummary.reportPath)
    : null;
  if (!signoffReportPath || !fs.existsSync(signoffReportPath)) {
    exitWithError(
      `sign-off reportPath is missing or unreadable: ${signoffSummary.reportPath ?? 'null'}`
    );
    return;
  }

  const normalizedSmokeReportPath = path.normalize(smokeReportPath);
  const normalizedSignoffReportPath = path.normalize(signoffReportPath);
  if (normalizedSmokeReportPath !== normalizedSignoffReportPath) {
    exitWithError(
      `smoke/sign-off report mismatch (${smokeSummary.reportPath} != ${signoffSummary.reportPath})`
    );
    return;
  }

  const pendingRoles = getPendingRoles(signoffSummary);
  if (pendingRoles.length > 0 || !signoffSummary.allApproved) {
    const pendingLabel = pendingRoles.length > 0 ? pendingRoles.join(', ') : 'unknown';
    exitWithError(
      `sign-off incomplete for: ${pendingLabel}. Run npm run release:signoff -- --role <role> --by \"<name>\"`
    );
    return;
  }

  runCommand('Verify release artifact integrity', npmCommand, ['run', 'verify:release-artifacts']);

  console.log('\n[release-candidate] PASS: release candidate gate passed.');
  console.log(
    `[release-candidate] smoke-summary: ${path.relative(process.cwd(), releaseSmokeLatestSummaryPath)}`
  );
  console.log(
    `[release-candidate] signoff-summary: ${path.relative(process.cwd(), releaseSignoffLatestPath)}`
  );
}

main();
