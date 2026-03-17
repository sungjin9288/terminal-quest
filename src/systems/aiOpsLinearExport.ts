import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import type { AiOpsBacklogItem } from './aiOpsBacklog.js';
import type { AiOpsLinearDraft } from './aiOpsLinearDraft.js';
import type { AiOpsInsightsSummary } from './aiOpsInsights.js';

export type AiOpsLinearExportScope = 'P0' | 'P1' | 'P2';
export type AiOpsLinearExportStatus = 'draft' | 'exported' | 'updated' | 'closed';
export type AiOpsLinearExportAction = 'create' | 'update' | 'skip';
export type AiOpsLinearLifecycleStatus = 'draft' | 'sync-needed' | 'live' | 'closed' | 'shipped';
export type AiOpsLinearIssueStateType =
  | 'backlog'
  | 'unstarted'
  | 'started'
  | 'completed'
  | 'canceled'
  | 'unknown';

export interface AiOpsLinearExportConfig {
  teamName: string;
  projectName: string | null;
  defaultScope: AiOpsLinearExportScope[];
  defaultLabels: string[];
  priorityLabels: Partial<Record<AiOpsLinearExportScope, string>>;
  themeLabels: Partial<Record<AiOpsBacklogItem['theme'], string[]>>;
}

export interface AiOpsLinearExportStateEntry {
  draftId: string;
  fingerprint: string;
  status: AiOpsLinearExportStatus;
  linearIssueId: string | null;
  linearIssueIdentifier: string | null;
  linearIssueUrl: string | null;
  teamName: string;
  projectName: string | null;
  title: string;
  summary: string;
  exportedAtIso: string | null;
  updatedAtIso: string;
  effectBaseline: AiOpsLinearImpactBaseline | null;
  linearStateName: string | null;
  linearStateType: AiOpsLinearIssueStateType;
  lastSyncedAtIso: string | null;
}

export interface AiOpsLinearExportState {
  schemaVersion: '1';
  updatedAtIso: string;
  entries: AiOpsLinearExportStateEntry[];
}

export interface AiOpsLinearExportPlanItem {
  draftId: string;
  draft: AiOpsLinearDraft;
  key: string;
  fingerprint: string;
  action: AiOpsLinearExportAction;
  exportStatus: AiOpsLinearExportStatus;
  priority: AiOpsLinearExportScope;
  linearPriority: 1 | 2 | 3;
  labels: string[];
  teamName: string;
  projectName: string | null;
  title: string;
  description: string;
  summary: string;
  sourceBacklogIds: string[];
  stateEntry: AiOpsLinearExportStateEntry | null;
  issueIdentifier: string | null;
  issueUrl: string | null;
  lastExportedAtIso: string | null;
  linearStateName: string | null;
  linearStateType: AiOpsLinearIssueStateType;
  lastSyncedAtIso: string | null;
}

export interface AiOpsLinearIssueSnapshot {
  issueId: string;
  issueIdentifier: string | null;
  issueUrl: string | null;
  stateName: string | null;
  stateType: AiOpsLinearIssueStateType;
}

export interface AiOpsLinearImpactBaseline {
  telemetryEvents: number;
  noteCount: number;
  recommendationDismissRate: number | null;
  recommendationFollowRate: number | null;
  routeScanCount: number;
  recoveryCount: number;
  playerDeaths: number;
  endgamePressureRate: number | null;
}

export interface AiOpsLinearImpactSummary {
  trend: 'improved' | 'flat' | 'regressed' | 'unknown';
  summary: string;
}

const DEFAULT_CONFIG: AiOpsLinearExportConfig = {
  teamName: 'Sungjin-an',
  projectName: null,
  defaultScope: ['P0'],
  defaultLabels: ['ai-ops'],
  priorityLabels: {
    P0: 'p0',
    P1: 'p1',
    P2: 'p2'
  },
  themeLabels: {
    resume: ['resume', 'ux'],
    recommendation: ['ai-director', 'ux'],
    quest: ['quests', 'ux'],
    combat: ['combat', 'pacing'],
    fatigue: ['pacing', 'retention'],
    endgame: ['endgame', 'balance'],
    general: ['ux']
  }
};

const AI_OPS_SYNC_STALE_THRESHOLD_MS = 1000 * 60 * 60 * 72;

function dedupe(values: string[]): string[] {
  return [...new Set(values.filter(value => value.trim().length > 0))];
}

function asNullableNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function formatRate(value: number | null): string {
  return value === null ? 'n/a' : `${Math.round(value * 100)}%`;
}

function parseIsoTimestampMs(value: string | null): number | null {
  if (!value) {
    return null;
  }

  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function getEndgamePressureRate(summary: AiOpsInsightsSummary): number | null {
  return summary.encounterDirector.endgameCount > 0
    ? summary.encounterDirector.endgamePressureCount / summary.encounterDirector.endgameCount
    : null;
}

export function normalizeAiOpsLinearIssueStateType(value: unknown): AiOpsLinearIssueStateType {
  if (
    value === 'backlog' ||
    value === 'unstarted' ||
    value === 'started' ||
    value === 'completed' ||
    value === 'canceled'
  ) {
    return value;
  }

  return 'unknown';
}

function resolveOpsArtifactsDir(rootDir = process.cwd()): string {
  const override = process.env.TERMINAL_QUEST_AI_OPS_DIR?.trim();
  if (override) {
    return override;
  }

  return path.join(rootDir, 'docs', 'ai-linear-drafts');
}

export function getAiOpsLinearConfigPath(rootDir = process.cwd()): string {
  return path.join(rootDir, 'config', 'ai-ops-linear.json');
}

export function getAiOpsLinearExportStatePath(rootDir = process.cwd()): string {
  return path.join(resolveOpsArtifactsDir(rootDir), 'export-state.json');
}

function normalizeScope(scope: unknown): AiOpsLinearExportScope[] {
  if (!Array.isArray(scope)) {
    return DEFAULT_CONFIG.defaultScope;
  }

  const normalized = scope
    .filter((value): value is string => typeof value === 'string')
    .map(value => value.toUpperCase())
    .filter((value): value is AiOpsLinearExportScope =>
      value === 'P0' || value === 'P1' || value === 'P2'
    );

  return normalized.length > 0 ? normalized : DEFAULT_CONFIG.defaultScope;
}

function normalizeStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter((entry): entry is string => typeof entry === 'string')
    .map(entry => entry.trim())
    .filter(entry => entry.length > 0);
}

export function readAiOpsLinearExportConfig(rootDir = process.cwd()): AiOpsLinearExportConfig {
  const configPath = getAiOpsLinearConfigPath(rootDir);
  if (!fs.existsSync(configPath)) {
    return DEFAULT_CONFIG;
  }

  try {
    const parsed = JSON.parse(fs.readFileSync(configPath, 'utf-8')) as Partial<AiOpsLinearExportConfig>;
    return {
      teamName: typeof parsed.teamName === 'string' && parsed.teamName.trim().length > 0
        ? parsed.teamName.trim()
        : DEFAULT_CONFIG.teamName,
      projectName: typeof parsed.projectName === 'string' && parsed.projectName.trim().length > 0
        ? parsed.projectName.trim()
        : null,
      defaultScope: normalizeScope(parsed.defaultScope),
      defaultLabels: dedupe([
        ...DEFAULT_CONFIG.defaultLabels,
        ...normalizeStringArray(parsed.defaultLabels)
      ]),
      priorityLabels: {
        ...DEFAULT_CONFIG.priorityLabels,
        ...(parsed.priorityLabels ?? {})
      },
      themeLabels: {
        ...DEFAULT_CONFIG.themeLabels,
        ...(parsed.themeLabels ?? {})
      }
    };
  } catch {
    return DEFAULT_CONFIG;
  }
}

export function readAiOpsLinearExportState(rootDir = process.cwd()): AiOpsLinearExportState {
  const statePath = getAiOpsLinearExportStatePath(rootDir);
  if (!fs.existsSync(statePath)) {
    return {
      schemaVersion: '1',
      updatedAtIso: new Date(0).toISOString(),
      entries: []
    };
  }

  try {
    const parsed = JSON.parse(fs.readFileSync(statePath, 'utf-8')) as Partial<AiOpsLinearExportState>;
    const entries = Array.isArray(parsed.entries) ? parsed.entries.filter(Boolean) : [];
    return {
      schemaVersion: '1',
      updatedAtIso: typeof parsed.updatedAtIso === 'string'
        ? parsed.updatedAtIso
        : new Date(0).toISOString(),
      entries: entries.map(entry => {
        const typed = entry as Partial<AiOpsLinearExportStateEntry>;
        const effectBaselineRecord = typed.effectBaseline && typeof typed.effectBaseline === 'object'
          ? typed.effectBaseline as unknown as Record<string, unknown>
          : null;
        return {
          draftId: typeof typed.draftId === 'string' ? typed.draftId : 'unknown-draft',
          fingerprint: typeof typed.fingerprint === 'string' ? typed.fingerprint : '',
          status: typed.status === 'closed'
            ? 'closed'
            : typed.status === 'updated'
              ? 'updated'
              : typed.status === 'draft'
                ? 'draft'
                : 'exported',
          linearIssueId: typeof typed.linearIssueId === 'string' ? typed.linearIssueId : null,
          linearIssueIdentifier: typeof typed.linearIssueIdentifier === 'string'
            ? typed.linearIssueIdentifier
            : null,
          linearIssueUrl: typeof typed.linearIssueUrl === 'string' ? typed.linearIssueUrl : null,
          teamName: typeof typed.teamName === 'string' ? typed.teamName : DEFAULT_CONFIG.teamName,
          projectName: typeof typed.projectName === 'string' ? typed.projectName : null,
          title: typeof typed.title === 'string' ? typed.title : '',
          summary: typeof typed.summary === 'string' ? typed.summary : '',
          exportedAtIso: typeof typed.exportedAtIso === 'string' ? typed.exportedAtIso : null,
          updatedAtIso: typeof typed.updatedAtIso === 'string'
            ? typed.updatedAtIso
            : new Date(0).toISOString(),
          effectBaseline: effectBaselineRecord
            ? {
                telemetryEvents: asNullableNumber(effectBaselineRecord.telemetryEvents) ?? 0,
                noteCount: asNullableNumber(effectBaselineRecord.noteCount) ?? 0,
                recommendationDismissRate: asNullableNumber(effectBaselineRecord.recommendationDismissRate),
                recommendationFollowRate: asNullableNumber(effectBaselineRecord.recommendationFollowRate),
                routeScanCount: asNullableNumber(effectBaselineRecord.routeScanCount) ?? 0,
                recoveryCount: asNullableNumber(effectBaselineRecord.recoveryCount) ?? 0,
                playerDeaths: asNullableNumber(effectBaselineRecord.playerDeaths) ?? 0,
                endgamePressureRate: asNullableNumber(effectBaselineRecord.endgamePressureRate)
              }
            : null,
          linearStateName: typeof typed.linearStateName === 'string' ? typed.linearStateName : null,
          linearStateType: normalizeAiOpsLinearIssueStateType(typed.linearStateType),
          lastSyncedAtIso: typeof typed.lastSyncedAtIso === 'string' ? typed.lastSyncedAtIso : null
        };
      })
    };
  } catch {
    return {
      schemaVersion: '1',
      updatedAtIso: new Date(0).toISOString(),
      entries: []
    };
  }
}

export function writeAiOpsLinearExportState(
  state: AiOpsLinearExportState,
  rootDir = process.cwd()
): void {
  const statePath = getAiOpsLinearExportStatePath(rootDir);
  fs.mkdirSync(path.dirname(statePath), { recursive: true });
  fs.writeFileSync(statePath, `${JSON.stringify(state, null, 2)}\n`, 'utf-8');
}

function computeDraftFingerprint(draft: AiOpsLinearDraft, labels: string[]): string {
  const hash = crypto.createHash('sha1');
  hash.update(JSON.stringify({
    title: draft.title,
    summary: draft.summary,
    labels,
    body: draft.body,
    sources: draft.sourceBacklogIds
  }));
  return hash.digest('hex');
}

function getLinearPriority(priority: AiOpsLinearExportScope): 1 | 2 | 3 {
  if (priority === 'P0') {
    return 1;
  }
  if (priority === 'P1') {
    return 2;
  }
  return 3;
}

function getDraftLabels(
  draft: AiOpsLinearDraft,
  config: AiOpsLinearExportConfig
): string[] {
  return dedupe([
    ...config.defaultLabels,
    ...draft.labels,
    ...(config.priorityLabels[draft.priority] ? [config.priorityLabels[draft.priority] as string] : []),
    ...(config.themeLabels[draft.theme] ?? [])
  ]);
}

export function buildAiOpsLinearExportPlan(
  drafts: AiOpsLinearDraft[],
  config: AiOpsLinearExportConfig,
  state: AiOpsLinearExportState,
  scope = config.defaultScope
): AiOpsLinearExportPlanItem[] {
  const entryByDraftId = new Map(state.entries.map(entry => [entry.draftId, entry]));

  return drafts
    .filter(draft => scope.includes(draft.priority))
    .map(draft => {
      const labels = getDraftLabels(draft, config);
      const fingerprint = computeDraftFingerprint(draft, labels);
      const stateEntry = entryByDraftId.get(draft.id) ?? null;
      const action: AiOpsLinearExportAction = !stateEntry
        ? 'create'
        : stateEntry.fingerprint === fingerprint
          ? 'skip'
          : 'update';
      const exportStatus: AiOpsLinearExportStatus = !stateEntry
        ? 'draft'
        : action === 'update'
          ? 'updated'
          : stateEntry.status;

      return {
        draftId: draft.id,
        draft,
        key: `ai-ops/${draft.id}`,
        fingerprint,
        action,
        exportStatus,
        priority: draft.priority,
        linearPriority: getLinearPriority(draft.priority),
        labels,
        teamName: config.teamName,
        projectName: config.projectName,
        title: draft.title,
        description: draft.body,
        summary: draft.summary,
        sourceBacklogIds: draft.sourceBacklogIds,
        stateEntry,
        issueIdentifier: stateEntry?.linearIssueIdentifier ?? null,
        issueUrl: stateEntry?.linearIssueUrl ?? null,
        lastExportedAtIso: stateEntry?.exportedAtIso ?? null,
        linearStateName: stateEntry?.linearStateName ?? null,
        linearStateType: stateEntry?.linearStateType ?? 'unknown',
        lastSyncedAtIso: stateEntry?.lastSyncedAtIso ?? null
      };
    });
}

export function buildAiOpsLinearImpactBaseline(
  summary: AiOpsInsightsSummary
): AiOpsLinearImpactBaseline {
  return {
    telemetryEvents: summary.totalEvents,
    noteCount: summary.playtestNotes.noteCount,
    recommendationDismissRate: summary.aiRecommendation.dismissRate,
    recommendationFollowRate: summary.aiRecommendation.followRate,
    routeScanCount: summary.encounterDirector.varietyRouteScanCount,
    recoveryCount: summary.encounterDirector.recoveryCount,
    playerDeaths: summary.friction.playerDeaths,
    endgamePressureRate: getEndgamePressureRate(summary)
  };
}

export function evaluateAiOpsLinearImpact(
  theme: AiOpsBacklogItem['theme'],
  baseline: AiOpsLinearImpactBaseline | null,
  summary: AiOpsInsightsSummary
): AiOpsLinearImpactSummary {
  if (!baseline) {
    return {
      trend: 'unknown',
      summary: '효과 baseline이 아직 없습니다.'
    };
  }

  if (theme === 'resume' || theme === 'recommendation') {
    const currentDismissRate = summary.aiRecommendation.dismissRate;
    if (baseline.recommendationDismissRate === null || currentDismissRate === null) {
      return {
        trend: 'unknown',
        summary: `Dismiss ${formatRate(baseline.recommendationDismissRate)} -> ${formatRate(currentDismissRate)}`
      };
    }

    const delta = currentDismissRate - baseline.recommendationDismissRate;
    return {
      trend: delta <= -0.1 ? 'improved' : delta >= 0.1 ? 'regressed' : 'flat',
      summary: `Dismiss ${formatRate(baseline.recommendationDismissRate)} -> ${formatRate(currentDismissRate)}`
    };
  }

  if (theme === 'combat' || theme === 'fatigue') {
    const baselineScore = baseline.routeScanCount + baseline.playerDeaths * 2;
    const currentScore = summary.encounterDirector.varietyRouteScanCount + summary.friction.playerDeaths * 2;
    return {
      trend: currentScore < baselineScore ? 'improved' : currentScore > baselineScore ? 'regressed' : 'flat',
      summary: `Route-scan ${baseline.routeScanCount} -> ${summary.encounterDirector.varietyRouteScanCount} · Deaths ${baseline.playerDeaths} -> ${summary.friction.playerDeaths}`
    };
  }

  if (theme === 'endgame') {
    const currentPressureRate = getEndgamePressureRate(summary);
    if (baseline.endgamePressureRate === null || currentPressureRate === null) {
      return {
        trend: 'unknown',
        summary: `Pressure ${formatRate(baseline.endgamePressureRate)} -> ${formatRate(currentPressureRate)}`
      };
    }

    const delta = currentPressureRate - baseline.endgamePressureRate;
    return {
      trend: delta <= -0.1 ? 'improved' : delta >= 0.1 ? 'regressed' : 'flat',
      summary: `Pressure ${formatRate(baseline.endgamePressureRate)} -> ${formatRate(currentPressureRate)}`
    };
  }

  const currentNotes = summary.playtestNotes.noteCount;
  return {
    trend: currentNotes < baseline.noteCount ? 'improved' : currentNotes > baseline.noteCount ? 'regressed' : 'flat',
    summary: `Playtest notes ${baseline.noteCount} -> ${currentNotes}`
  };
}

export function mergeAiOpsLinearExportStateEntry(
  state: AiOpsLinearExportState,
  planItem: AiOpsLinearExportPlanItem,
  update: Pick<
    AiOpsLinearExportStateEntry,
    'status' | 'linearIssueId' | 'linearIssueIdentifier' | 'linearIssueUrl'
  >,
  updatedAtIso: string,
  effectBaseline?: AiOpsLinearImpactBaseline | null
): AiOpsLinearExportState {
  const nextEntry: AiOpsLinearExportStateEntry = {
    draftId: planItem.draftId,
    fingerprint: planItem.fingerprint,
    status: update.status,
    linearIssueId: update.linearIssueId,
    linearIssueIdentifier: update.linearIssueIdentifier,
    linearIssueUrl: update.linearIssueUrl,
    teamName: planItem.teamName,
    projectName: planItem.projectName,
    title: planItem.title,
    summary: planItem.summary,
    exportedAtIso: planItem.stateEntry?.exportedAtIso ?? updatedAtIso,
    updatedAtIso,
    effectBaseline: effectBaseline ?? planItem.stateEntry?.effectBaseline ?? null,
    linearStateName: planItem.stateEntry?.linearStateName ?? null,
    linearStateType: planItem.stateEntry?.linearStateType ?? 'unknown',
    lastSyncedAtIso: planItem.stateEntry?.lastSyncedAtIso ?? null
  };

  if (!planItem.stateEntry?.exportedAtIso) {
    nextEntry.exportedAtIso = updatedAtIso;
  }

  const entries = state.entries.filter(entry => entry.draftId !== planItem.draftId);
  entries.push(nextEntry);

  return {
    schemaVersion: '1',
    updatedAtIso,
    entries: entries.sort((left, right) => left.draftId.localeCompare(right.draftId))
  };
}

export function deriveAiOpsExportStatusFromIssueState(
  currentStatus: AiOpsLinearExportStatus,
  stateType: AiOpsLinearIssueStateType
): AiOpsLinearExportStatus {
  if (stateType === 'completed' || stateType === 'canceled') {
    return 'closed';
  }

  if (currentStatus === 'draft') {
    return 'draft';
  }

  if (currentStatus === 'updated') {
    return 'updated';
  }

  return 'exported';
}

export function deriveAiOpsLinearLifecycleStatus(
  exportStatus: AiOpsLinearExportStatus,
  stateType: AiOpsLinearIssueStateType,
  impactTrend: AiOpsLinearImpactSummary['trend']
): AiOpsLinearLifecycleStatus {
  if (exportStatus === 'draft') {
    return 'draft';
  }

  if (exportStatus === 'updated') {
    return 'sync-needed';
  }

  if (exportStatus === 'closed') {
    return stateType === 'completed' && impactTrend === 'improved'
      ? 'shipped'
      : 'closed';
  }

  return 'live';
}

export function isAiOpsLinearSyncStale(
  hasRemoteIssue: boolean,
  lastSyncedAtIso: string | null,
  nowMs = Date.now()
): boolean {
  if (!hasRemoteIssue) {
    return false;
  }

  const syncedAtMs = parseIsoTimestampMs(lastSyncedAtIso);
  if (syncedAtMs === null) {
    return true;
  }

  return nowMs - syncedAtMs >= AI_OPS_SYNC_STALE_THRESHOLD_MS;
}

export function syncAiOpsLinearIssueStateEntry(
  state: AiOpsLinearExportState,
  draftId: string,
  issueSnapshot: AiOpsLinearIssueSnapshot,
  syncedAtIso: string
): AiOpsLinearExportState {
  const entries = state.entries.map(entry => {
    if (entry.draftId !== draftId) {
      return entry;
    }

    return {
      ...entry,
      status: deriveAiOpsExportStatusFromIssueState(entry.status, issueSnapshot.stateType),
      linearIssueId: issueSnapshot.issueId,
      linearIssueIdentifier: issueSnapshot.issueIdentifier,
      linearIssueUrl: issueSnapshot.issueUrl,
      linearStateName: issueSnapshot.stateName,
      linearStateType: issueSnapshot.stateType,
      lastSyncedAtIso: syncedAtIso,
      updatedAtIso: syncedAtIso
    };
  });

  return {
    schemaVersion: '1',
    updatedAtIso: syncedAtIso,
    entries
  };
}
