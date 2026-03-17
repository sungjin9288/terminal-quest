import fs from 'fs';
import path from 'path';
import type { PlaytestReportSummary } from './playtestReport.js';

export type AiOpsCycleMode = 'dry-run' | 'artifact' | 'apply-linear';
export const AI_OPS_CYCLE_STALE_HOURS = 24;

export interface AiOpsCycleStepSummary {
  id: string;
  label: string;
  command: string;
  ok: boolean;
  status: number;
  outputFileName: string;
}

export interface AiOpsCycleSummary {
  generatedAtIso: string;
  mode: AiOpsCycleMode;
  overallPass: boolean;
  bundleDir: string | null;
  reportJsonPath: string;
  latestSummaryPath: string | null;
  latestReportJsonPath: string | null;
  report: {
    telemetryFilePath: string | null;
    notesDir: string;
    totalEvents: number;
    totalNotes: number;
    status: {
      id: string;
      label: string;
      tone: 'recommended' | 'warning' | 'success';
      actionRequired: boolean;
      summary: string;
    } | null;
    nextCommand: string | null;
  };
  steps: AiOpsCycleStepSummary[];
}

export interface AiOpsCycleFreshness {
  stale: boolean;
  ageHours: number | null;
  label: string;
}

export interface AiOpsCycleLatestSnapshot {
  filePath: string;
  summary: AiOpsCycleSummary | null;
  freshness: AiOpsCycleFreshness | null;
  passedSteps: number;
  totalSteps: number;
  failedSteps: Array<{
    label: string;
    status: number;
    outputFileName: string;
  }>;
}

export interface BuildAiOpsCycleSummaryInput {
  generatedAtIso: string;
  mode: AiOpsCycleMode;
  bundleDir?: string | null;
  reportJsonPath: string;
  latestSummaryPath?: string | null;
  latestReportJsonPath?: string | null;
  report: PlaytestReportSummary;
  steps: AiOpsCycleStepSummary[];
}

export function buildAiOpsCycleSummary(
  input: BuildAiOpsCycleSummaryInput
): AiOpsCycleSummary {
  return {
    generatedAtIso: input.generatedAtIso,
    mode: input.mode,
    overallPass: input.steps.every(step => step.ok),
    bundleDir: input.bundleDir ?? null,
    reportJsonPath: input.reportJsonPath,
    latestSummaryPath: input.latestSummaryPath ?? null,
    latestReportJsonPath: input.latestReportJsonPath ?? null,
    report: {
      telemetryFilePath: input.report.paths.telemetryFilePath ?? null,
      notesDir: input.report.paths.notesDir,
      totalEvents: input.report.telemetry.totalEvents,
      totalNotes: input.report.notes.totalNotes,
      status: input.report.ops.status ?? null,
      nextCommand: input.report.ops.nextCommand?.command ?? null
    },
    steps: input.steps
  };
}

export function buildAiOpsCycleMarkdown(summary: AiOpsCycleSummary): string {
  return [
    '# AI Ops Cycle',
    '',
    `Generated at: ${summary.generatedAtIso}`,
    `Mode: ${summary.mode}`,
    `Overall: ${summary.overallPass ? 'PASS' : 'FAIL'}`,
    `Bundle dir: ${summary.bundleDir ?? 'dry-run (no persistent bundle)'}`,
    `Report JSON: ${summary.reportJsonPath}`,
    `Latest summary: ${summary.latestSummaryPath ?? 'n/a'}`,
    `Latest report JSON: ${summary.latestReportJsonPath ?? 'n/a'}`,
    '',
    '## Report Snapshot',
    `- Telemetry file: ${summary.report.telemetryFilePath ?? 'n/a'}`,
    `- Notes dir: ${summary.report.notesDir}`,
    `- Total events: ${summary.report.totalEvents}`,
    `- Total notes: ${summary.report.totalNotes}`,
    `- Ops status: ${summary.report.status ? `[${summary.report.status.tone}] ${summary.report.status.label}` : 'n/a'}`,
    `- Ops action required: ${summary.report.status ? (summary.report.status.actionRequired ? 'yes' : 'no') : 'n/a'}`,
    `- Ops summary: ${summary.report.status?.summary ?? 'n/a'}`,
    `- Next command: ${summary.report.nextCommand ?? 'n/a'}`,
    '',
    '## Steps',
    ...summary.steps.map(step =>
      `- ${step.ok ? '[pass]' : '[fail]'} ${step.label} · status=${step.status} · ${step.outputFileName}`
    ),
    ''
  ].join('\n');
}

export function getAiOpsCycleFreshness(
  summary: Pick<AiOpsCycleSummary, 'generatedAtIso'> | null,
  nowMs = Date.now()
): AiOpsCycleFreshness {
  if (!summary?.generatedAtIso) {
    return {
      stale: false,
      ageHours: null,
      label: 'age unknown'
    };
  }

  const generatedAtMs = new Date(summary.generatedAtIso).getTime();
  if (!Number.isFinite(generatedAtMs)) {
    return {
      stale: false,
      ageHours: null,
      label: 'age unknown'
    };
  }

  const ageHours = Math.max(0, Math.floor((nowMs - generatedAtMs) / (60 * 60 * 1000)));
  const stale = ageHours >= AI_OPS_CYCLE_STALE_HOURS;
  return {
    stale,
    ageHours,
    label: `${stale ? 'stale' : 'fresh'} · ${ageHours}h`
  };
}

export function getAiOpsCycleArtifactsDir(
  rootDir = process.cwd(),
  overrideDir = process.env.TERMINAL_QUEST_AI_OPS_CYCLE_DIR?.trim() ?? null
): string {
  const resolvedOverride = overrideDir ?? process.env.TERMINAL_QUEST_AI_OPS_CYCLE_DIR?.trim() ?? null;
  return resolvedOverride
    ? path.resolve(rootDir, resolvedOverride)
    : path.join(rootDir, 'docs', 'ai-ops-cycle');
}

export function getAiOpsCycleLatestSummaryPath(
  rootDir = process.cwd(),
  overrideDir = process.env.TERMINAL_QUEST_AI_OPS_CYCLE_DIR?.trim() ?? null
): string {
  const resolvedOverride = overrideDir ?? process.env.TERMINAL_QUEST_AI_OPS_CYCLE_DIR?.trim() ?? null;
  return path.join(getAiOpsCycleArtifactsDir(rootDir, resolvedOverride), 'latest.json');
}

export function readAiOpsCycleLatestSummary(
  rootDir = process.cwd(),
  overrideDir = process.env.TERMINAL_QUEST_AI_OPS_CYCLE_DIR?.trim() ?? null
): AiOpsCycleSummary | null {
  const resolvedOverride = overrideDir ?? process.env.TERMINAL_QUEST_AI_OPS_CYCLE_DIR?.trim() ?? null;
  const summaryPath = getAiOpsCycleLatestSummaryPath(rootDir, resolvedOverride);
  if (!fs.existsSync(summaryPath)) {
    return null;
  }

  try {
    return JSON.parse(fs.readFileSync(summaryPath, 'utf-8')) as AiOpsCycleSummary;
  } catch {
    return null;
  }
}

export function buildAiOpsCycleLatestSnapshot(
  summaryPath: string,
  summary: AiOpsCycleSummary | null,
  nowMs = Date.now()
): AiOpsCycleLatestSnapshot {
  const failedSteps = summary
    ? summary.steps
      .filter(step => !step.ok)
      .map(step => ({
        label: step.label,
        status: step.status,
        outputFileName: step.outputFileName
      }))
    : [];

  return {
    filePath: summaryPath,
    summary,
    freshness: summary ? getAiOpsCycleFreshness(summary, nowMs) : null,
    passedSteps: summary ? summary.steps.filter(step => step.ok).length : 0,
    totalSteps: summary?.steps.length ?? 0,
    failedSteps
  };
}

export function formatAiOpsCycleLatestLines(
  summary: AiOpsCycleSummary | null,
  nowMs = Date.now()
): string[] {
  const snapshot = buildAiOpsCycleLatestSnapshot('latest.json', summary, nowMs);
  if (!snapshot.summary) {
    return ['- no persisted cycle summary yet'];
  }

  const currentSummary = snapshot.summary;
  const freshness = snapshot.freshness;
  return [
    `- overall: ${currentSummary.overallPass ? 'PASS' : 'FAIL'} (${currentSummary.mode})`,
    `- steps: ${snapshot.passedSteps}/${snapshot.totalSteps} passed`,
    `- freshness: ${freshness?.label ?? 'age unknown'}`,
    `- failed steps: ${snapshot.failedSteps.length > 0 ? snapshot.failedSteps.map(step => `${step.label} (status=${step.status})`).join(', ') : 'none'}`,
    `- ops status snapshot: ${currentSummary.report.status ? `[${currentSummary.report.status.tone}] ${currentSummary.report.status.label}` : 'n/a'}`,
    `- ops action required: ${currentSummary.report.status ? (currentSummary.report.status.actionRequired ? 'yes' : 'no') : 'n/a'}`,
    `- ops summary snapshot: ${currentSummary.report.status?.summary ?? 'n/a'}`,
    `- report: ${currentSummary.reportJsonPath}`,
    `- next command snapshot: ${currentSummary.report.nextCommand ?? 'n/a'}`
  ];
}
