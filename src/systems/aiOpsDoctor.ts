import type { AiOpsCycleLatestSnapshot } from './aiOpsCycle.js';

export type AiOpsDoctorStatus = 'ok' | 'warn' | 'fail';

export interface AiOpsDoctorReport {
  status: AiOpsDoctorStatus;
  filePath: string;
  summaryPresent: boolean;
  freshnessLabel: string;
  opsStatus: {
    id: string;
    label: string;
    tone: 'recommended' | 'warning' | 'success';
    actionRequired: boolean;
    summary: string;
  } | null;
  reasons: string[];
  recommendedCommand: string | null;
}

export interface AiOpsDoctorGateOptions {
  failOnWarn?: boolean;
}

export interface AiOpsDoctorGateDecision {
  blocked: boolean;
  threshold: 'fail' | 'warn';
  reason: string | null;
}

function hasFailedCycle(snapshot: AiOpsCycleLatestSnapshot): boolean {
  return Boolean(snapshot.summary && (!snapshot.summary.overallPass || snapshot.failedSteps.length > 0));
}

export function buildAiOpsDoctorReport(snapshot: AiOpsCycleLatestSnapshot): AiOpsDoctorReport {
  if (!snapshot.summary) {
    return {
      status: 'warn',
      filePath: snapshot.filePath,
      summaryPresent: false,
      freshnessLabel: 'age unknown',
      opsStatus: null,
      reasons: ['persisted ai ops cycle summary가 아직 없습니다. cycle을 먼저 생성하세요.'],
      recommendedCommand: 'npm run ai:ops:cycle'
    };
  }

  const reasons: string[] = [];
  let status: AiOpsDoctorStatus = 'ok';

  if (hasFailedCycle(snapshot)) {
    status = 'fail';
    reasons.push(
      `실패 단계: ${snapshot.failedSteps.map(step => `${step.label} (status=${step.status})`).join(', ')}`
    );
  }

  if (snapshot.freshness?.stale) {
    if (status !== 'fail') {
      status = 'warn';
    }
    reasons.push(`latest cycle이 stale 상태입니다 (${snapshot.freshness.label}).`);
  }

  const persistedStatus = snapshot.summary.report.status;
  if (persistedStatus?.actionRequired) {
    if (status !== 'fail') {
      status = 'warn';
    }
    reasons.push(`Ops status ${persistedStatus.label}: ${persistedStatus.summary}`);
  }

  if (reasons.length === 0) {
    reasons.push('latest cycle이 fresh 상태이고 즉시 필요한 운영 조치가 없습니다.');
  }

  let recommendedCommand: string | null = null;
  if (status === 'fail') {
    recommendedCommand = 'npm run ai:ops:cycle:latest';
  } else if (snapshot.freshness?.stale) {
    recommendedCommand = 'npm run ai:ops:cycle';
  } else if (persistedStatus?.actionRequired) {
    recommendedCommand = snapshot.summary.report.nextCommand ?? null;
  }

  return {
    status,
    filePath: snapshot.filePath,
    summaryPresent: true,
    freshnessLabel: snapshot.freshness?.label ?? 'age unknown',
    opsStatus: persistedStatus ?? null,
    reasons,
    recommendedCommand
  };
}

export function evaluateAiOpsDoctorGate(
  report: AiOpsDoctorReport,
  options: AiOpsDoctorGateOptions = {}
): AiOpsDoctorGateDecision {
  const threshold: 'fail' | 'warn' = options.failOnWarn ? 'warn' : 'fail';

  if (report.status === 'fail') {
    return {
      blocked: true,
      threshold,
      reason: 'doctor status fail blocks this run.'
    };
  }

  if (report.status === 'warn' && options.failOnWarn) {
    return {
      blocked: true,
      threshold,
      reason: 'doctor status warn blocks this run because fail-on-warn is enabled.'
    };
  }

  return {
    blocked: false,
    threshold,
    reason: null
  };
}

export function formatAiOpsDoctorLines(report: AiOpsDoctorReport): string[] {
  const lines = [
    `[ai-ops-doctor] status: ${report.status}`,
    `- file: ${report.filePath}`,
    `- summary present: ${report.summaryPresent ? 'yes' : 'no'}`,
    `- freshness: ${report.freshnessLabel}`,
    `- ops status: ${report.opsStatus ? `[${report.opsStatus.tone}] ${report.opsStatus.label}` : 'n/a'}`
  ];

  for (const reason of report.reasons) {
    lines.push(`- reason: ${reason}`);
  }

  lines.push(`- recommended command: ${report.recommendedCommand ?? 'n/a'}`);
  return lines;
}

export function buildAiOpsDoctorMarkdown(report: AiOpsDoctorReport): string {
  return [
    '# AI Ops Doctor',
    '',
    `Status: ${report.status.toUpperCase()}`,
    `Summary present: ${report.summaryPresent ? 'yes' : 'no'}`,
    `Freshness: ${report.freshnessLabel}`,
    `Ops status: ${report.opsStatus ? `[${report.opsStatus.tone}] ${report.opsStatus.label}` : 'n/a'}`,
    `Recommended command: ${report.recommendedCommand ?? 'n/a'}`,
    '',
    '## Reasons',
    ...(report.reasons.length > 0 ? report.reasons.map(reason => `- ${reason}`) : ['- n/a']),
    ''
  ].join('\n');
}
