import fs from 'fs';
import path from 'path';
import { getTelemetryFilePath } from './telemetry.js';
import {
  parseAiTelemetryEvents,
  summarizeAiOpsInsights,
  type PlaytestNoteInput
} from './aiOpsInsights.js';
import { deriveAiOpsBacklog } from './aiOpsBacklog.js';
import { deriveAiOpsLinearDrafts } from './aiOpsLinearDraft.js';
import {
  deriveAiOpsLinearLifecycleStatus,
  evaluateAiOpsLinearImpact,
  buildAiOpsLinearExportPlan,
  isAiOpsLinearSyncStale,
  readAiOpsLinearExportConfig,
  readAiOpsLinearExportState
} from './aiOpsLinearExport.js';
import {
  buildAiOpsCycleLatestSnapshot,
  getAiOpsCycleFreshness,
  getAiOpsCycleLatestSummaryPath,
  readAiOpsCycleLatestSummary
} from './aiOpsCycle.js';
import { buildAiOpsDoctorReport } from './aiOpsDoctor.js';

export interface AiOpsPreview {
  telemetryEvents: number;
  playtestNotes: number;
  topFinding: string | null;
  topObservation: {
    severity: 'P0' | 'P1' | 'P2';
    text: string;
  } | null;
  topBacklog: {
    priority: 'P0' | 'P1' | 'P2';
    title: string;
    theme: string;
  } | null;
  backlogCounts: {
    P0: number;
    P1: number;
    P2: number;
  };
  findings: string[];
  observations: Array<{
    severity: 'P0' | 'P1' | 'P2';
    text: string;
    noteLabel: string;
    section: string;
    tags: string[];
  }>;
  backlog: Array<{
    id: string;
    priority: 'P0' | 'P1' | 'P2';
    theme: string;
    title: string;
    rationale: string;
    evidence: string[];
    suggestedActions: string[];
  }>;
  linearDrafts: Array<{
    id: string;
    priority: 'P0' | 'P1' | 'P2';
    theme: string;
    title: string;
    labels: string[];
    summary: string;
    exportStatus: 'draft' | 'exported' | 'updated' | 'closed';
    issueIdentifier: string | null;
    issueUrl: string | null;
    lastExportedAtIso: string | null;
    linearStateName: string | null;
    linearStateType: 'backlog' | 'unstarted' | 'started' | 'completed' | 'canceled' | 'unknown';
    lastSyncedAtIso: string | null;
    lifecycleStatus: 'draft' | 'sync-needed' | 'live' | 'closed' | 'shipped';
    staleSync: boolean;
    impactTrend: 'improved' | 'flat' | 'regressed' | 'unknown';
    impactSummary: string | null;
  }>;
  recentSignals: Array<{
    isoTime: string;
    eventType: string;
    summary: string;
  }>;
  nextCommand: {
    label: string;
    command: string;
    reason: string;
    tone: 'recommended' | 'warning' | 'success';
  } | null;
  doctor: {
    status: 'ok' | 'warn' | 'fail';
    summaryPresent: boolean;
    freshnessLabel: string;
    reasons: string[];
    recommendedCommand: string | null;
    opsStatus: {
      id: string;
      label: string;
      tone: 'recommended' | 'warning' | 'success';
      actionRequired: boolean;
      summary: string;
    } | null;
  };
  status: {
    id: string;
    label: string;
    tone: 'recommended' | 'warning' | 'success';
    actionRequired: boolean;
    summary: string;
  };
  latestCycleFollowUp: {
    label: string;
    command: string;
    reason: string;
    tone: 'recommended' | 'warning' | 'success';
  } | null;
  latestCycle: {
    generatedAtIso: string;
    mode: 'dry-run' | 'artifact' | 'apply-linear';
    overallPass: boolean;
    stepsPassed: number;
    stepsTotal: number;
    stale: boolean;
    ageHours: number | null;
    failedSteps: Array<{
      label: string;
      status: number;
      outputFileName: string;
    }>;
    reportJsonPath: string;
    bundleDir: string | null;
    nextCommand: string | null;
  } | null;
  recommendationDismissRate: number | null;
  encounterDecisionCount: number;
}

function toNoteLabel(notePath: string): string {
  const normalized = notePath.replace(/\\/g, '/');
  const parts = normalized.split('/');
  return parts[parts.length - 1] ?? notePath;
}

function readFileSafely(filePath: string): string {
  if (!fs.existsSync(filePath)) {
    return '';
  }

  try {
    return fs.readFileSync(filePath, 'utf-8');
  } catch {
    return '';
  }
}

function resolvePlaytestNotesDir(): string | null {
  const explicit = process.env.TERMINAL_QUEST_PLAYTEST_NOTES_DIR?.trim();
  if (explicit) {
    return explicit;
  }

  const telemetryDir = process.env.TERMINAL_QUEST_TELEMETRY_DIR?.trim();
  if (!telemetryDir) {
    return null;
  }

  return path.join(path.dirname(telemetryDir), 'notes');
}

function readPlaytestNotes(notesDir: string | null): PlaytestNoteInput[] {
  if (!notesDir || !fs.existsSync(notesDir)) {
    return [];
  }

  return fs.readdirSync(notesDir)
    .filter(entry => entry.endsWith('.md'))
    .sort((left, right) => left.localeCompare(right))
    .map(entry => {
      const notePath = path.join(notesDir, entry);
      return {
        notePath,
        content: readFileSafely(notePath)
      };
    })
    .filter(note => note.content.trim().length > 0);
}

function buildAiOpsNextCommand(
  linearDrafts: AiOpsPreview['linearDrafts']
): AiOpsPreview['nextCommand'] {
  const staleCount = linearDrafts.filter(draft => draft.staleSync).length;
  if (staleCount > 0) {
    return {
      label: '원격 상태 재동기화',
      command: 'LINEAR_API_KEY=... npm run ai:linear:sync',
      reason: `stale sync ${staleCount}건이 있어 원격 상태를 다시 읽어야 합니다.`,
      tone: 'warning'
    };
  }

  const pendingCount = linearDrafts.filter(
    draft => draft.lifecycleStatus === 'draft' || draft.lifecycleStatus === 'sync-needed'
  ).length;
  if (pendingCount > 0) {
    return {
      label: 'export 대상 점검',
      command: 'npm run ai:linear:export:dry',
      reason: `미수출 또는 갱신 필요 draft ${pendingCount}건이 있습니다.`,
      tone: 'recommended'
    };
  }

  const closedCount = linearDrafts.filter(draft => draft.lifecycleStatus === 'closed').length;
  if (closedCount > 0) {
    return {
      label: '효과 재측정',
      command: 'npm run ai:insights:dry',
      reason: `완료된 이슈 ${closedCount}건이 아직 shipped로 확인되지 않았습니다.`,
      tone: 'recommended'
    };
  }

  const shippedCount = linearDrafts.filter(draft => draft.lifecycleStatus === 'shipped').length;
  if (shippedCount > 0) {
    return {
      label: '운영 요약 유지',
      command: 'npm run playtest:report',
      reason: `shipped 항목 ${shippedCount}건의 후속 telemetry를 계속 관찰합니다.`,
      tone: 'success'
    };
  }

  if (linearDrafts.length > 0) {
    return {
      label: 'issue draft 확인',
      command: 'npm run ai:linear:dry',
      reason: '생성된 Linear draft를 먼저 검토합니다.',
      tone: 'recommended'
    };
  }

  return {
    label: 'backlog 생성',
    command: 'npm run ai:backlog:dry',
    reason: '아직 Linear draft가 없으므로 backlog 초안부터 생성합니다.',
    tone: 'recommended'
  };
}

function buildLatestCycleFollowUp(
  latestCycle: AiOpsPreview['latestCycle'],
  nextCommand: AiOpsPreview['nextCommand']
): AiOpsPreview['latestCycleFollowUp'] {
  if (!latestCycle) {
    return null;
  }

  const snapshotCommand = latestCycle.nextCommand?.trim() || 'npm run ai:ops:cycle:latest';
  if (!latestCycle.overallPass) {
    return {
      label: 'cycle 실패 조치',
      command: snapshotCommand,
      reason: '가장 최근 persisted cycle이 FAIL 상태입니다. snapshot command부터 다시 확인하세요.',
      tone: 'warning'
    };
  }

  if (latestCycle.stale) {
    return {
      label: 'cycle 갱신',
      command: 'npm run ai:ops:cycle',
      reason: `마지막 persisted cycle이 ${latestCycle.ageHours ?? 'n/a'}h 전에 생성되어 오래됐습니다. 최신 artifact를 다시 생성하세요.`,
      tone: 'warning'
    };
  }

  if (
    nextCommand &&
    latestCycle.nextCommand &&
    latestCycle.nextCommand.trim() &&
    latestCycle.nextCommand.trim() !== nextCommand.command
  ) {
    return {
      label: 'cycle snapshot 비교',
      command: latestCycle.nextCommand.trim(),
      reason: '최근 cycle snapshot의 권고가 현재 Ops next command와 다릅니다. 차이를 먼저 비교하세요.',
      tone: 'recommended'
    };
  }

  return null;
}

function buildAiOpsStatus(
  linearDrafts: AiOpsPreview['linearDrafts'],
  latestCycle: AiOpsPreview['latestCycle'],
  nextCommand: AiOpsPreview['nextCommand']
): AiOpsPreview['status'] {
  const staleSyncCount = linearDrafts.filter(draft => draft.staleSync).length;
  if (latestCycle && !latestCycle.overallPass) {
    return {
      id: 'cycle-failed',
      label: 'Cycle 실패',
      tone: 'warning',
      actionRequired: true,
      summary: '가장 최근 persisted ops cycle이 실패했습니다.'
    };
  }

  if (latestCycle?.stale) {
    return {
      id: 'cycle-stale',
      label: 'Cycle stale',
      tone: 'warning',
      actionRequired: true,
      summary: `마지막 persisted cycle이 ${latestCycle.ageHours ?? 'n/a'}h 전에 생성됐습니다.`
    };
  }

  if (staleSyncCount > 0) {
    return {
      id: 'sync-needed',
      label: 'Sync 필요',
      tone: 'warning',
      actionRequired: true,
      summary: `원격 Linear state stale sync ${staleSyncCount}건이 남아 있습니다.`
    };
  }

  const pendingDraftCount = linearDrafts.filter(
    draft => draft.lifecycleStatus === 'draft' || draft.lifecycleStatus === 'sync-needed'
  ).length;
  if (pendingDraftCount > 0) {
    return {
      id: 'export-pending',
      label: 'Export 대기',
      tone: 'recommended',
      actionRequired: true,
      summary: `미수출 또는 갱신 필요 draft ${pendingDraftCount}건이 있습니다.`
    };
  }

  const closedCount = linearDrafts.filter(draft => draft.lifecycleStatus === 'closed').length;
  if (closedCount > 0) {
    return {
      id: 'impact-review',
      label: '효과 재측정',
      tone: 'recommended',
      actionRequired: true,
      summary: `완료됐지만 shipped 확인 전인 이슈 ${closedCount}건이 있습니다.`
    };
  }

  const shippedCount = linearDrafts.filter(draft => draft.lifecycleStatus === 'shipped').length;
  if (shippedCount > 0) {
    return {
      id: 'stable',
      label: '안정',
      tone: 'success',
      actionRequired: false,
      summary: `shipped 상태 이슈 ${shippedCount}건을 추적 중입니다.`
    };
  }

  if (linearDrafts.length > 0) {
    return {
      id: 'draft-review',
      label: 'Draft 검토',
      tone: nextCommand?.tone ?? 'recommended',
      actionRequired: true,
      summary: nextCommand?.reason ?? '생성된 draft를 먼저 검토해야 합니다.'
    };
  }

  return {
    id: 'backlog-seed',
    label: 'Backlog 준비',
    tone: nextCommand?.tone ?? 'recommended',
    actionRequired: true,
    summary: nextCommand?.reason ?? '추가 backlog draft 생성을 먼저 진행하세요.'
  };
}

export function buildAiOpsPreview(): AiOpsPreview | null {
  const notesDir = resolvePlaytestNotesDir();
  const telemetryDir = process.env.TERMINAL_QUEST_TELEMETRY_DIR?.trim();

  if (!notesDir && !telemetryDir) {
    return null;
  }

  const telemetryContent = readFileSafely(getTelemetryFilePath());
  const notes = readPlaytestNotes(notesDir);
  const summary = summarizeAiOpsInsights(parseAiTelemetryEvents(telemetryContent), notes);
  const backlog = deriveAiOpsBacklog(summary);
  const linearDrafts = deriveAiOpsLinearDrafts(backlog);
  const exportConfig = readAiOpsLinearExportConfig();
  const exportState = readAiOpsLinearExportState();
  const exportPlan = buildAiOpsLinearExportPlan(linearDrafts, exportConfig, exportState);
  const latestCycleSummaryPath = getAiOpsCycleLatestSummaryPath();
  const latestCycleSummary = readAiOpsCycleLatestSummary();
  const latestCycleFreshness = getAiOpsCycleFreshness(latestCycleSummary);
  const latestCycle = latestCycleSummary
    ? {
        generatedAtIso: latestCycleSummary.generatedAtIso,
        mode: latestCycleSummary.mode,
        overallPass: latestCycleSummary.overallPass,
        stepsPassed: latestCycleSummary.steps.filter(step => step.ok).length,
        stepsTotal: latestCycleSummary.steps.length,
        stale: latestCycleFreshness.stale,
        ageHours: latestCycleFreshness.ageHours,
        failedSteps: latestCycleSummary.steps
          .filter(step => !step.ok)
          .map(step => ({
            label: step.label,
            status: step.status,
            outputFileName: step.outputFileName
          })),
        reportJsonPath: latestCycleSummary.reportJsonPath,
        bundleDir: latestCycleSummary.bundleDir,
        nextCommand: latestCycleSummary.report.nextCommand
      }
    : null;

  const previewLinearDrafts = exportPlan.slice(0, 4).map(draft => {
    const impact = evaluateAiOpsLinearImpact(
      draft.draft.theme,
      draft.stateEntry?.effectBaseline ?? null,
      summary
    );
    const hasRemoteIssue = Boolean(draft.issueIdentifier || draft.issueUrl);

    return {
      id: draft.draftId,
      priority: draft.priority,
      theme: draft.draft.theme,
      title: draft.title,
      labels: draft.labels,
      summary: draft.summary,
      exportStatus: draft.exportStatus,
      issueIdentifier: draft.issueIdentifier,
      issueUrl: draft.issueUrl,
      lastExportedAtIso: draft.lastExportedAtIso,
      linearStateName: draft.linearStateName,
      linearStateType: draft.linearStateType,
      lastSyncedAtIso: draft.lastSyncedAtIso,
      lifecycleStatus: deriveAiOpsLinearLifecycleStatus(
        draft.exportStatus,
        draft.linearStateType,
        impact.trend
      ),
      staleSync: isAiOpsLinearSyncStale(hasRemoteIssue, draft.lastSyncedAtIso),
      impactTrend: impact.trend,
      impactSummary: impact.summary
    };
  });
  const nextCommand = buildAiOpsNextCommand(previewLinearDrafts);
  const status = buildAiOpsStatus(previewLinearDrafts, latestCycle, nextCommand);
  const latestCycleFollowUp = buildLatestCycleFollowUp(latestCycle, nextCommand);
  const doctor = buildAiOpsDoctorReport(
    buildAiOpsCycleLatestSnapshot(latestCycleSummaryPath, latestCycleSummary)
  );

  return {
    telemetryEvents: summary.totalEvents,
    playtestNotes: summary.playtestNotes.noteCount,
    topFinding: summary.findings[0] ?? null,
    topObservation: summary.playtestNotes.prioritizedObservations[0]
      ? {
          severity: summary.playtestNotes.prioritizedObservations[0].severity,
          text: summary.playtestNotes.prioritizedObservations[0].text
        }
      : null,
    topBacklog: backlog[0]
      ? {
          priority: backlog[0].priority,
          title: backlog[0].title,
          theme: backlog[0].theme
        }
      : null,
    backlogCounts: {
      P0: backlog.filter(item => item.priority === 'P0').length,
      P1: backlog.filter(item => item.priority === 'P1').length,
      P2: backlog.filter(item => item.priority === 'P2').length
    },
    findings: summary.findings,
    observations: summary.playtestNotes.prioritizedObservations.slice(0, 6).map(observation => ({
      severity: observation.severity,
      text: observation.text,
      noteLabel: toNoteLabel(observation.notePath),
      section: observation.section,
      tags: observation.tags
    })),
    backlog: backlog.slice(0, 6).map(item => ({
      id: item.id,
      priority: item.priority,
      theme: item.theme,
      title: item.title,
      rationale: item.rationale,
      evidence: item.evidence,
      suggestedActions: item.suggestedActions
    })),
    linearDrafts: previewLinearDrafts,
    recentSignals: summary.recentSignals.slice(0, 6),
    nextCommand,
    doctor: {
      status: doctor.status,
      summaryPresent: doctor.summaryPresent,
      freshnessLabel: doctor.freshnessLabel,
      reasons: doctor.reasons,
      recommendedCommand: doctor.recommendedCommand,
      opsStatus: doctor.opsStatus
    },
    status,
    latestCycleFollowUp,
    latestCycle,
    recommendationDismissRate: summary.aiRecommendation.dismissRate,
    encounterDecisionCount: summary.encounterDirector.total
  };
}
