export interface ReleaseOpsDoctorSnapshot {
  status: 'ok' | 'warn' | 'fail';
  summaryPresent: boolean;
  freshnessLabel: string;
  reasons: string[];
  recommendedCommand: string | null;
  opsStatus: {
    label: string;
    tone: string;
    actionRequired: boolean;
    summary: string;
  } | null;
}

export function normalizeReleaseOpsDoctorSnapshot(
  value: unknown
): ReleaseOpsDoctorSnapshot | null;

export function formatReleaseOpsDoctorInline(
  snapshot: ReleaseOpsDoctorSnapshot | null
): string | null;

export function buildReleaseOpsFailureMessage(
  baseMessage: string,
  snapshot: ReleaseOpsDoctorSnapshot | null
): string;
