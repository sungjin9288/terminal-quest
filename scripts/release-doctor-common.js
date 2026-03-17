import fs from 'fs';
import path from 'path';

function buildPendingRoles(signoffSummary) {
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

export function buildReleaseDoctorReport({
  smokeSnapshot,
  signoffSummary,
  currentVersionTag,
  currentBranch,
  currentCommit
}) {
  const reasons = [];
  let status = 'ok';
  let recommendedCommand = null;

  if (!smokeSnapshot.summaryPresent) {
    status = 'warn';
    reasons.push('latest release smoke summary가 아직 없습니다.');
    recommendedCommand = 'npm run release:smoke';
  } else {
    if (!smokeSnapshot.overallPass) {
      status = 'fail';
      reasons.push('latest release smoke summary가 FAIL 상태입니다.');
      if (smokeSnapshot.failedSteps.length > 0) {
        reasons.push(
          `실패 단계: ${smokeSnapshot.failedSteps
            .map(step => `${step.label} (status=${step.status})`)
            .join(', ')}`
        );
      }
      recommendedCommand =
        smokeSnapshot.opsDoctor?.recommendedCommand ??
        (smokeSnapshot.opsDoctorGate ? 'npm run release:smoke:ops' : 'npm run release:smoke');
    }

    if (smokeSnapshot.versionTag && currentVersionTag && smokeSnapshot.versionTag !== currentVersionTag) {
      status = 'fail';
      reasons.push(
        `smoke version mismatch: latest=${smokeSnapshot.versionTag}, current=${currentVersionTag}`
      );
      recommendedCommand = smokeSnapshot.opsDoctorGate ? 'npm run release:smoke:ops' : 'npm run release:smoke';
    }

    if (smokeSnapshot.branch && currentBranch && smokeSnapshot.branch !== currentBranch) {
      status = 'fail';
      reasons.push(`smoke branch mismatch: latest=${smokeSnapshot.branch}, current=${currentBranch}`);
      recommendedCommand = smokeSnapshot.opsDoctorGate ? 'npm run release:smoke:ops' : 'npm run release:smoke';
    }

    if (smokeSnapshot.commit && currentCommit && smokeSnapshot.commit !== currentCommit) {
      status = 'fail';
      reasons.push(`smoke commit mismatch: latest=${smokeSnapshot.commit}, current=${currentCommit}`);
      recommendedCommand = smokeSnapshot.opsDoctorGate ? 'npm run release:smoke:ops' : 'npm run release:smoke';
    }
  }

  const signoffPresent = Boolean(signoffSummary);
  const pendingRoles = signoffPresent ? buildPendingRoles(signoffSummary) : ['qa', 'engineering', 'release-manager'];

  if (!signoffPresent) {
    if (status !== 'fail') {
      status = 'warn';
    }
    reasons.push('latest release sign-off summary가 아직 없습니다.');
    recommendedCommand ??= 'npm run release:signoff --status';
  } else {
    if (signoffSummary.versionTag && currentVersionTag && signoffSummary.versionTag !== currentVersionTag) {
      if (status !== 'fail') {
        status = 'warn';
      }
      reasons.push(
        `sign-off version mismatch: latest=${signoffSummary.versionTag}, current=${currentVersionTag}`
      );
      recommendedCommand ??= 'npm run release:signoff --status';
    }

    if (signoffSummary.branch && currentBranch && signoffSummary.branch !== currentBranch) {
      if (status !== 'fail') {
        status = 'warn';
      }
      reasons.push(`sign-off branch mismatch: latest=${signoffSummary.branch}, current=${currentBranch}`);
      recommendedCommand ??= 'npm run release:signoff --status';
    }

    if (signoffSummary.commit && currentCommit && signoffSummary.commit !== currentCommit) {
      if (status !== 'fail') {
        status = 'warn';
      }
      reasons.push(`sign-off commit mismatch: latest=${signoffSummary.commit}, current=${currentCommit}`);
      recommendedCommand ??= 'npm run release:signoff --status';
    }

    if (!signoffSummary.allApproved || pendingRoles.length > 0) {
      if (status !== 'fail') {
        status = 'warn';
      }
      reasons.push(`sign-off pending: ${pendingRoles.join(', ')}`);
      recommendedCommand ??= 'npm run release:signoff --status';
    }
  }

  if (reasons.length === 0) {
    reasons.push('latest smoke/sign-off snapshot이 현재 checkout 기준으로 정합하며 release candidate 준비가 완료됐습니다.');
  }

  return {
    status,
    smokeSummaryPresent: smokeSnapshot.summaryPresent,
    signoffSummaryPresent: signoffPresent,
    currentVersionTag,
    currentBranch,
    currentCommit,
    smokeSnapshot: {
      overallPass: smokeSnapshot.overallPass,
      versionTag: smokeSnapshot.versionTag,
      branch: smokeSnapshot.branch,
      commit: smokeSnapshot.commit,
      opsDoctorGate: smokeSnapshot.opsDoctorGate,
      opsDoctor: smokeSnapshot.opsDoctor,
      failedSteps: smokeSnapshot.failedSteps
    },
    signoffSnapshot: signoffPresent
      ? {
          versionTag: signoffSummary.versionTag ?? null,
          branch: signoffSummary.branch ?? null,
          commit: signoffSummary.commit ?? null,
          allApproved: Boolean(signoffSummary.allApproved),
          pendingRoles
        }
      : null,
    reasons,
    recommendedCommand
  };
}

export function evaluateReleaseDoctorGate(report, { failOnWarn = false } = {}) {
  if (report.status === 'fail') {
    return {
      blocked: true,
      threshold: failOnWarn ? 'warn' : 'fail'
    };
  }

  if (report.status === 'warn' && failOnWarn) {
    return {
      blocked: true,
      threshold: 'warn'
    };
  }

  return {
    blocked: false,
    threshold: failOnWarn ? 'warn' : 'fail'
  };
}

export function formatReleaseDoctorLines(report) {
  return [
    `[release-doctor] status: ${report.status}`,
    `- smoke summary present: ${report.smokeSummaryPresent ? 'yes' : 'no'}`,
    `- signoff summary present: ${report.signoffSummaryPresent ? 'yes' : 'no'}`,
    `- current version: ${report.currentVersionTag ?? 'unknown'}`,
    `- current branch: ${report.currentBranch ?? 'unknown'}`,
    `- current commit: ${report.currentCommit ?? 'unknown'}`,
    `- smoke ops gate: ${report.smokeSnapshot.opsDoctorGate ? 'enabled' : 'disabled'}`,
    `- recommended command: ${report.recommendedCommand ?? 'n/a'}`,
    ...report.reasons.map(reason => `- reason: ${reason}`)
  ];
}

export function buildReleaseDoctorMarkdown(report) {
  return [
    '# Release Doctor',
    '',
    `Status: ${report.status.toUpperCase()}`,
    `Smoke summary present: ${report.smokeSummaryPresent ? 'yes' : 'no'}`,
    `Sign-off summary present: ${report.signoffSummaryPresent ? 'yes' : 'no'}`,
    `Current version: ${report.currentVersionTag ?? 'unknown'}`,
    `Current branch: ${report.currentBranch ?? 'unknown'}`,
    `Current commit: ${report.currentCommit ?? 'unknown'}`,
    `Smoke ops gate: ${report.smokeSnapshot.opsDoctorGate ? 'enabled' : 'disabled'}`,
    `Recommended command: ${report.recommendedCommand ?? 'n/a'}`,
    '',
    '## Reasons',
    ...(report.reasons.length > 0 ? report.reasons.map(reason => `- ${reason}`) : ['- n/a']),
    ''
  ].join('\n');
}

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

export function getReleaseDoctorArtifactsDir(rootDir = process.cwd(), reportDir = null) {
  return reportDir
    ? path.resolve(rootDir, reportDir)
    : path.join(rootDir, 'releases', 'smoke-reports');
}

export function getReleaseDoctorLatestJsonPath(rootDir = process.cwd(), reportDir = null) {
  return path.join(getReleaseDoctorArtifactsDir(rootDir, reportDir), 'release-doctor-latest.json');
}

export function readReleaseDoctorLatestReport(rootDir = process.cwd(), reportDir = null) {
  const filePath = getReleaseDoctorLatestJsonPath(rootDir, reportDir);
  if (!fs.existsSync(filePath)) {
    return null;
  }

  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  } catch {
    return null;
  }
}

export function buildReleaseDoctorLatestSnapshot(filePath, report) {
  if (!report || typeof report !== 'object') {
    return {
      filePath,
      reportPresent: false,
      status: null,
      recommendedCommand: null,
      smokeSummaryPresent: false,
      signoffSummaryPresent: false,
      currentVersionTag: null,
      currentBranch: null,
      currentCommit: null,
      reasonCount: 0
    };
  }

  return {
    filePath,
    reportPresent: true,
    status:
      report.status === 'ok' || report.status === 'warn' || report.status === 'fail'
        ? report.status
        : null,
    recommendedCommand:
      typeof report.recommendedCommand === 'string' && report.recommendedCommand.trim().length > 0
        ? report.recommendedCommand
        : null,
    smokeSummaryPresent: Boolean(report.smokeSummaryPresent),
    signoffSummaryPresent: Boolean(report.signoffSummaryPresent),
    currentVersionTag:
      typeof report.currentVersionTag === 'string' ? report.currentVersionTag : null,
    currentBranch:
      typeof report.currentBranch === 'string' ? report.currentBranch : null,
    currentCommit:
      typeof report.currentCommit === 'string' ? report.currentCommit : null,
    reasonCount: Array.isArray(report.reasons) ? report.reasons.length : 0
  };
}

export function formatReleaseDoctorLatestLines(snapshot) {
  if (!snapshot.reportPresent) {
    return [
      '[release-doctor-latest] status: missing',
      `- file: ${snapshot.filePath}`,
      '- report present: no'
    ];
  }

  return [
    `[release-doctor-latest] status: ${snapshot.status ?? 'unknown'}`,
    `- file: ${snapshot.filePath}`,
    `- smoke summary present: ${snapshot.smokeSummaryPresent ? 'yes' : 'no'}`,
    `- signoff summary present: ${snapshot.signoffSummaryPresent ? 'yes' : 'no'}`,
    `- current version: ${snapshot.currentVersionTag ?? 'unknown'}`,
    `- current branch: ${snapshot.currentBranch ?? 'unknown'}`,
    `- current commit: ${snapshot.currentCommit ?? 'unknown'}`,
    `- recommended command: ${snapshot.recommendedCommand ?? 'n/a'}`,
    `- reason count: ${snapshot.reasonCount}`
  ];
}

export function writeReleaseDoctorArtifacts(report, rootDir = process.cwd(), reportDir = null) {
  const artifactsDir = getReleaseDoctorArtifactsDir(rootDir, reportDir);
  ensureDir(artifactsDir);

  const stamp = formatStamp();
  const latestJsonPath = path.join(artifactsDir, 'release-doctor-latest.json');
  const latestMdPath = path.join(artifactsDir, 'release-doctor-latest.md');
  const stampedJsonPath = path.join(artifactsDir, `release-doctor-${stamp}.json`);
  const stampedMdPath = path.join(artifactsDir, `release-doctor-${stamp}.md`);
  const markdown = buildReleaseDoctorMarkdown(report);

  writeJson(latestJsonPath, report);
  writeText(latestMdPath, markdown);
  writeJson(stampedJsonPath, report);
  writeText(stampedMdPath, markdown);

  return {
    artifactsDir,
    latestJsonPath,
    latestMdPath,
    stampedJsonPath,
    stampedMdPath
  };
}
