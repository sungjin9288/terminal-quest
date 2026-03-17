export interface ReleaseDoctorReport {
  status: 'ok' | 'warn' | 'fail';
  smokeSummaryPresent: boolean;
  signoffSummaryPresent: boolean;
  currentVersionTag: string | null;
  currentBranch: string | null;
  currentCommit: string | null;
  smokeSnapshot: {
    overallPass: boolean | null;
    versionTag: string | null;
    branch: string | null;
    commit: string | null;
    opsDoctorGate: boolean;
    opsDoctor: {
      status: 'ok' | 'warn' | 'fail';
      freshnessLabel: string;
      recommendedCommand: string | null;
      reasons: string[];
    } | null;
    failedSteps: Array<{
      label: string;
      status: number;
    }>;
  };
  signoffSnapshot: {
    versionTag: string | null;
    branch: string | null;
    commit: string | null;
    allApproved: boolean;
    pendingRoles: string[];
  } | null;
  reasons: string[];
  recommendedCommand: string | null;
}

export function buildReleaseDoctorReport(input: {
  smokeSnapshot: {
    summaryPresent: boolean;
    overallPass: boolean | null;
    versionTag: string | null;
    branch: string | null;
    commit: string | null;
    opsDoctorGate: boolean;
    opsDoctor: {
      status: 'ok' | 'warn' | 'fail';
      freshnessLabel: string;
      recommendedCommand: string | null;
      reasons: string[];
    } | null;
    failedSteps: Array<{
      label: string;
      status: number;
    }>;
  };
  signoffSummary: unknown;
  currentVersionTag: string | null;
  currentBranch: string | null;
  currentCommit: string | null;
}): ReleaseDoctorReport;

export function evaluateReleaseDoctorGate(
  report: ReleaseDoctorReport,
  options?: {
    failOnWarn?: boolean;
  }
): {
  blocked: boolean;
  threshold: 'fail' | 'warn';
};

export function formatReleaseDoctorLines(report: ReleaseDoctorReport): string[];

export function buildReleaseDoctorMarkdown(report: ReleaseDoctorReport): string;

export function getReleaseDoctorArtifactsDir(
  rootDir?: string,
  reportDir?: string | null
): string;

export function getReleaseDoctorLatestJsonPath(
  rootDir?: string,
  reportDir?: string | null
): string;

export function readReleaseDoctorLatestReport(
  rootDir?: string,
  reportDir?: string | null
): ReleaseDoctorReport | null;

export function buildReleaseDoctorLatestSnapshot(
  filePath: string,
  report: ReleaseDoctorReport | null
): {
  filePath: string;
  reportPresent: boolean;
  status: 'ok' | 'warn' | 'fail' | null;
  recommendedCommand: string | null;
  smokeSummaryPresent: boolean;
  signoffSummaryPresent: boolean;
  currentVersionTag: string | null;
  currentBranch: string | null;
  currentCommit: string | null;
  reasonCount: number;
};

export function formatReleaseDoctorLatestLines(snapshot: {
  filePath: string;
  reportPresent: boolean;
  status: 'ok' | 'warn' | 'fail' | null;
  recommendedCommand: string | null;
  smokeSummaryPresent: boolean;
  signoffSummaryPresent: boolean;
  currentVersionTag: string | null;
  currentBranch: string | null;
  currentCommit: string | null;
  reasonCount: number;
}): string[];

export function writeReleaseDoctorArtifacts(
  report: ReleaseDoctorReport,
  rootDir?: string,
  reportDir?: string | null
): {
  artifactsDir: string;
  latestJsonPath: string;
  latestMdPath: string;
  stampedJsonPath: string;
  stampedMdPath: string;
};
