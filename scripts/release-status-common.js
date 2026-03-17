import fs from 'fs';
import path from 'path';
import {
  buildReleaseSmokeLatestSnapshot,
  getReleaseSmokeLatestSummaryPath,
  readReleaseSmokeLatestSummary
} from './release-smoke-common.js';
import {
  buildReleaseDoctorLatestSnapshot,
  getReleaseDoctorLatestJsonPath,
  readReleaseDoctorLatestReport
} from './release-doctor-common.js';

const DEFAULT_PENDING_ROLES = ['qa', 'engineering', 'release-manager'];

function getReportDir(rootDir = process.cwd(), reportDir = null) {
  return reportDir
    ? path.resolve(rootDir, reportDir)
    : path.join(rootDir, 'releases', 'smoke-reports');
}

function pickFirstString(...values) {
  for (const value of values) {
    if (typeof value === 'string' && value.trim().length > 0) {
      return value;
    }
  }
  return null;
}

export function getReleaseSignoffLatestJsonPath(rootDir = process.cwd(), reportDir = null) {
  return path.join(getReportDir(rootDir, reportDir), 'release-signoff-latest.json');
}

export function readReleaseSignoffLatestSummary(rootDir = process.cwd(), reportDir = null) {
  const filePath = getReleaseSignoffLatestJsonPath(rootDir, reportDir);
  if (!fs.existsSync(filePath)) {
    return null;
  }

  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  } catch {
    return null;
  }
}

export function buildReleaseSignoffLatestSnapshot(filePath, summary) {
  if (!summary || typeof summary !== 'object') {
    return {
      filePath,
      summaryPresent: false,
      allApproved: false,
      versionTag: null,
      branch: null,
      commit: null,
      reportPath: null,
      pendingRoles: [...DEFAULT_PENDING_ROLES]
    };
  }

  const signoffs = summary.signoffs ?? {};
  const pendingRoles = [];

  if (!signoffs?.qa?.approved) {
    pendingRoles.push('qa');
  }
  if (!signoffs?.engineering?.approved) {
    pendingRoles.push('engineering');
  }
  if (!signoffs?.releaseManager?.approved) {
    pendingRoles.push('release-manager');
  }

  return {
    filePath,
    summaryPresent: true,
    allApproved: Boolean(summary.allApproved) && pendingRoles.length === 0,
    versionTag: typeof summary.versionTag === 'string' ? summary.versionTag : null,
    branch: typeof summary.branch === 'string' ? summary.branch : null,
    commit: typeof summary.commit === 'string' ? summary.commit : null,
    reportPath: typeof summary.reportPath === 'string' ? summary.reportPath : null,
    pendingRoles
  };
}

export function buildReleaseStatusSnapshot({
  smokeSnapshot,
  doctorSnapshot,
  signoffSnapshot
}) {
  let status = 'pending';
  let summary = 'Release candidate 준비 중';
  let recommendedCommand = doctorSnapshot.recommendedCommand;

  if (!smokeSnapshot.summaryPresent) {
    status = 'blocked';
    summary = '최신 smoke summary가 없습니다.';
    recommendedCommand ??= 'npm run release:smoke';
  } else if (!doctorSnapshot.reportPresent) {
    status = 'pending';
    summary = '최신 release doctor snapshot이 없습니다.';
    recommendedCommand ??= 'npm run release:doctor';
  } else if (!smokeSnapshot.overallPass || doctorSnapshot.status === 'fail') {
    status = 'blocked';
    summary = 'Release candidate가 smoke/doctor gate에 막혀 있습니다.';
    recommendedCommand ??= smokeSnapshot.summaryPresent ? 'npm run release:doctor' : 'npm run release:smoke';
  } else if (!signoffSnapshot.summaryPresent || !signoffSnapshot.allApproved || doctorSnapshot.status === 'warn') {
    status = 'pending';
    summary = 'Sign-off 또는 doctor 경고가 남아 있습니다.';
    recommendedCommand ??=
      !signoffSnapshot.summaryPresent || !signoffSnapshot.allApproved
        ? 'npm run release:signoff --status'
        : 'npm run release:doctor';
  } else {
    status = 'ready';
    summary = 'Persisted release artifacts 기준으로 candidate 준비가 완료됐습니다.';
  }

  return {
    status,
    summary,
    recommendedCommand,
    smoke: {
      status: smokeSnapshot.summaryPresent ? (smokeSnapshot.overallPass ? 'PASS' : 'FAIL') : 'missing',
      filePath: smokeSnapshot.filePath,
      reportPath: smokeSnapshot.reportPath,
      opsDoctorGate: smokeSnapshot.opsDoctorGate
    },
    doctor: {
      status: doctorSnapshot.reportPresent ? (doctorSnapshot.status ?? 'unknown') : 'missing',
      filePath: doctorSnapshot.filePath,
      reasonCount: doctorSnapshot.reasonCount
    },
    signoff: {
      status: signoffSnapshot.summaryPresent
        ? signoffSnapshot.allApproved
          ? 'APPROVED'
          : 'PENDING'
        : 'missing',
      filePath: signoffSnapshot.filePath,
      reportPath: signoffSnapshot.reportPath,
      pendingRoles: signoffSnapshot.pendingRoles
    },
    latestVersionTag: pickFirstString(
      doctorSnapshot.currentVersionTag,
      smokeSnapshot.versionTag,
      signoffSnapshot.versionTag
    ),
    latestBranch: pickFirstString(
      doctorSnapshot.currentBranch,
      smokeSnapshot.branch,
      signoffSnapshot.branch
    ),
    latestCommit: pickFirstString(
      doctorSnapshot.currentCommit,
      smokeSnapshot.commit,
      signoffSnapshot.commit
    )
  };
}

export function readReleaseStatusSnapshot(rootDir = process.cwd(), reportDir = null) {
  const smokePath = getReleaseSmokeLatestSummaryPath(rootDir, reportDir);
  const doctorPath = getReleaseDoctorLatestJsonPath(rootDir, reportDir);
  const signoffPath = getReleaseSignoffLatestJsonPath(rootDir, reportDir);

  const smokeSnapshot = buildReleaseSmokeLatestSnapshot(
    smokePath,
    readReleaseSmokeLatestSummary(rootDir, reportDir)
  );
  const doctorSnapshot = buildReleaseDoctorLatestSnapshot(
    doctorPath,
    readReleaseDoctorLatestReport(rootDir, reportDir)
  );
  const signoffSnapshot = buildReleaseSignoffLatestSnapshot(
    signoffPath,
    readReleaseSignoffLatestSummary(rootDir, reportDir)
  );

  return buildReleaseStatusSnapshot({
    smokeSnapshot,
    doctorSnapshot,
    signoffSnapshot
  });
}

export function formatReleaseStatusLines(snapshot) {
  return [
    `[release-status] status: ${snapshot.status}`,
    `- summary: ${snapshot.summary}`,
    `- smoke: ${snapshot.smoke.status}`,
    `- doctor: ${snapshot.doctor.status}`,
    `- sign-off: ${snapshot.signoff.status}`,
    `- pending roles: ${
      snapshot.signoff.pendingRoles.length > 0 ? snapshot.signoff.pendingRoles.join(', ') : 'none'
    }`,
    `- latest version: ${snapshot.latestVersionTag ?? 'unknown'}`,
    `- latest branch: ${snapshot.latestBranch ?? 'unknown'}`,
    `- latest commit: ${snapshot.latestCommit ?? 'unknown'}`,
    `- smoke ops gate: ${snapshot.smoke.opsDoctorGate ? 'enabled' : 'disabled'}`,
    `- recommended command: ${snapshot.recommendedCommand ?? 'n/a'}`
  ];
}
