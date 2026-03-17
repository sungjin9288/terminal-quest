export interface ReleaseSmokeLatestSnapshot {
  filePath: string;
  summaryPresent: boolean;
  overallPass: boolean | null;
  freshness: {
    ageHours: number;
    label: string;
  } | null;
  versionTag: string | null;
  branch: string | null;
  commit: string | null;
  reportPath: string | null;
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
}

export function getReleaseSmokeLatestSummaryPath(
  rootDir?: string,
  reportDir?: string | null
): string;

export function readReleaseSmokeLatestSummary(
  rootDir?: string,
  reportDir?: string | null
): unknown;

export function buildReleaseSmokeLatestSnapshot(
  filePath: string,
  summary: unknown,
  now?: number
): ReleaseSmokeLatestSnapshot;

export function formatReleaseSmokeLatestLines(
  snapshot: ReleaseSmokeLatestSnapshot
): string[];
