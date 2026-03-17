export type ReleaseStatusSnapshot = {
  status: 'ready' | 'pending' | 'blocked';
  summary: string;
  recommendedCommand: string | null;
  smoke: {
    status: 'PASS' | 'FAIL' | 'missing';
    filePath: string;
    reportPath: string | null;
    opsDoctorGate: boolean;
  };
  doctor: {
    status: 'ok' | 'warn' | 'fail' | 'missing' | 'unknown';
    filePath: string;
    reasonCount: number;
  };
  signoff: {
    status: 'APPROVED' | 'PENDING' | 'missing';
    filePath: string;
    reportPath: string | null;
    pendingRoles: string[];
  };
  latestVersionTag: string | null;
  latestBranch: string | null;
  latestCommit: string | null;
};

export function getReleaseSignoffLatestJsonPath(rootDir?: string, reportDir?: string | null): string;
export function readReleaseSignoffLatestSummary(rootDir?: string, reportDir?: string | null): unknown | null;
export function buildReleaseSignoffLatestSnapshot(
  filePath: string,
  summary: unknown
): {
  filePath: string;
  summaryPresent: boolean;
  allApproved: boolean;
  versionTag: string | null;
  branch: string | null;
  commit: string | null;
  reportPath: string | null;
  pendingRoles: string[];
};
export function buildReleaseStatusSnapshot(input: {
  smokeSnapshot: {
    summaryPresent: boolean;
    overallPass: boolean | null;
    filePath: string;
    reportPath: string | null;
    opsDoctorGate: boolean;
    versionTag: string | null;
    branch: string | null;
    commit: string | null;
  };
  doctorSnapshot: {
    reportPresent: boolean;
    status: 'ok' | 'warn' | 'fail' | null;
    recommendedCommand: string | null;
    filePath: string;
    reasonCount: number;
    currentVersionTag: string | null;
    currentBranch: string | null;
    currentCommit: string | null;
  };
  signoffSnapshot: {
    summaryPresent: boolean;
    allApproved: boolean;
    filePath: string;
    reportPath: string | null;
    pendingRoles: string[];
    versionTag: string | null;
    branch: string | null;
    commit: string | null;
  };
}): ReleaseStatusSnapshot;
export function readReleaseStatusSnapshot(rootDir?: string, reportDir?: string | null): ReleaseStatusSnapshot;
export function formatReleaseStatusLines(snapshot: ReleaseStatusSnapshot): string[];
export function evaluateReleaseStatusGate(
  snapshot: ReleaseStatusSnapshot,
  options?: { failOnPending?: boolean }
): {
  blocked: boolean;
  threshold: 'pending' | 'blocked';
};
