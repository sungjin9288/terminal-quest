import fs from 'fs';
import os from 'os';
import path from 'path';
import {
  buildAiOpsLinearImpactBaseline,
  buildAiOpsLinearExportPlan,
  deriveAiOpsLinearLifecycleStatus,
  deriveAiOpsExportStatusFromIssueState,
  evaluateAiOpsLinearImpact,
  getAiOpsLinearConfigPath,
  getAiOpsLinearExportStatePath,
  isAiOpsLinearSyncStale,
  mergeAiOpsLinearExportStateEntry,
  syncAiOpsLinearIssueStateEntry,
  readAiOpsLinearExportConfig,
  readAiOpsLinearExportState,
  writeAiOpsLinearExportState
} from '../src/systems/aiOpsLinearExport';
import type { AiOpsLinearExportState } from '../src/systems/aiOpsLinearExport';
import type { AiOpsLinearDraft } from '../src/systems/aiOpsLinearDraft';
import type { AiOpsInsightsSummary } from '../src/systems/aiOpsInsights';

describe('AI Ops Linear Export', () => {
  let rootDir: string;

  beforeEach(() => {
    rootDir = fs.mkdtempSync(path.join(os.tmpdir(), 'terminal-quest-ai-linear-'));
    fs.mkdirSync(path.join(rootDir, 'config'), { recursive: true });
    fs.writeFileSync(
      getAiOpsLinearConfigPath(rootDir),
      `${JSON.stringify({
        teamName: 'Sungjin-an',
        projectName: null,
        defaultScope: ['P0'],
        defaultLabels: ['ai-ops']
      }, null, 2)}\n`,
      'utf-8'
    );
  });

  afterEach(() => {
    fs.rmSync(rootDir, { recursive: true, force: true });
  });

  it('should read config with P0 default scope and no project', () => {
    const config = readAiOpsLinearExportConfig(rootDir);

    expect(config.teamName).toBe('Sungjin-an');
    expect(config.projectName).toBeNull();
    expect(config.defaultScope).toEqual(['P0']);
    expect(config.defaultLabels).toContain('ai-ops');
  });

  it('should build create and update plans from drafts plus export state', () => {
    const config = readAiOpsLinearExportConfig(rootDir);
    const drafts: AiOpsLinearDraft[] = [{
      id: 'linear-playtest-resume-p0',
      priority: 'P0',
      theme: 'resume',
      title: '[AI Ops][P0] Resume clarity pass for AI-guided surfaces',
      labels: ['ai-ops', 'resume'],
      summary: 'Resume Brief와 CTA를 같은 목표 문장으로 정렬합니다.',
      body: '## Summary\n재개 surface가 목표 이해를 놓치고 있습니다.\n',
      sourceBacklogIds: ['playtest-resume-p0']
    }];

    const initialPlan = buildAiOpsLinearExportPlan(drafts, config, readAiOpsLinearExportState(rootDir));
    expect(initialPlan[0]).toMatchObject({
      action: 'create',
      exportStatus: 'draft',
      teamName: 'Sungjin-an',
      projectName: null
    });

    const nextState = mergeAiOpsLinearExportStateEntry(
      readAiOpsLinearExportState(rootDir),
      initialPlan[0],
      {
        status: 'exported',
        linearIssueId: 'issue-1',
        linearIssueIdentifier: 'SUN-101',
        linearIssueUrl: 'https://linear.app/example/issue/SUN-101'
      },
      '2026-03-12T04:30:00.000Z'
    );
    writeAiOpsLinearExportState(nextState, rootDir);

    const unchangedPlan = buildAiOpsLinearExportPlan(drafts, config, readAiOpsLinearExportState(rootDir));
    expect(unchangedPlan[0]).toMatchObject({
      action: 'skip',
      exportStatus: 'exported',
      issueIdentifier: 'SUN-101'
    });

    const updatedDrafts: AiOpsLinearDraft[] = [{
      ...drafts[0],
      summary: 'Resume Brief, Route, CTA를 같은 목표 문장으로 정렬합니다.'
    }];
    const updatedPlan = buildAiOpsLinearExportPlan(updatedDrafts, config, readAiOpsLinearExportState(rootDir));

    expect(updatedPlan[0]).toMatchObject({
      action: 'update',
      exportStatus: 'updated',
      issueIdentifier: 'SUN-101'
    });
  });

  it('should persist export state to the ops artifact directory', () => {
    const state: AiOpsLinearExportState = {
      schemaVersion: '1' as const,
      updatedAtIso: '2026-03-12T05:00:00.000Z',
      entries: [{
        draftId: 'linear-playtest-resume-p0',
        fingerprint: 'abc123',
        status: 'exported' as const,
        linearIssueId: 'issue-1',
        linearIssueIdentifier: 'SUN-101',
        linearIssueUrl: 'https://linear.app/example/issue/SUN-101',
        teamName: 'Sungjin-an',
        projectName: null,
        title: '[AI Ops][P0] Resume clarity pass for AI-guided surfaces',
        summary: 'Resume Brief와 CTA를 같은 목표 문장으로 정렬합니다.',
        exportedAtIso: '2026-03-12T05:00:00.000Z',
        updatedAtIso: '2026-03-12T05:00:00.000Z',
        effectBaseline: {
          telemetryEvents: 12,
          noteCount: 1,
          recommendationDismissRate: 0.8,
          recommendationFollowRate: 0.2,
          routeScanCount: 0,
          recoveryCount: 0,
          playerDeaths: 0,
          endgamePressureRate: null
        },
        linearStateName: 'Todo',
        linearStateType: 'unstarted',
        lastSyncedAtIso: '2026-03-12T05:00:00.000Z'
      }]
    };

    writeAiOpsLinearExportState(state, rootDir);

    expect(fs.existsSync(getAiOpsLinearExportStatePath(rootDir))).toBe(true);
    expect(readAiOpsLinearExportState(rootDir)).toMatchObject(state);
  });

  it('should compare current telemetry to export baseline for impact tracking', () => {
    const summary = {
      totalEvents: 20,
      sessionStarts: 1,
      aiRecommendation: {
        shown: 10,
        followed: 7,
        dismissed: 3,
        followRate: 0.7,
        dismissRate: 0.3
      },
      encounterDirector: {
        total: 6,
        modeCounts: {
          steady: 2,
          recovery: 1,
          variety: 2,
          pressure: 1
        },
        averageEncounterChancePercent: 38,
        recoveryCount: 1,
        varietyRouteScanCount: 1,
        endgameCount: 0,
        endgamePressureCount: 0,
        topLocations: [],
        topModifiers: []
      },
      friction: {
        playerDeaths: 0,
        endgameClears: 0
      },
      playtestNotes: {
        noteCount: 1,
        prioritizedObservations: []
      },
      findings: [],
      recentSignals: []
    } satisfies AiOpsInsightsSummary;

    const baseline = buildAiOpsLinearImpactBaseline({
      ...summary,
      aiRecommendation: {
        ...summary.aiRecommendation,
        dismissRate: 0.7
      }
    });

    expect(evaluateAiOpsLinearImpact('resume', baseline, summary)).toMatchObject({
      trend: 'improved',
      summary: 'Dismiss 70% -> 30%'
    });
  });

  it('should mark completed or canceled remote issues as closed during sync', () => {
    expect(deriveAiOpsExportStatusFromIssueState('exported', 'completed')).toBe('closed');
    expect(deriveAiOpsExportStatusFromIssueState('updated', 'canceled')).toBe('closed');
    expect(deriveAiOpsExportStatusFromIssueState('updated', 'started')).toBe('updated');
  });

  it('should derive shipped lifecycle only after completion plus improved impact', () => {
    expect(deriveAiOpsLinearLifecycleStatus('closed', 'completed', 'improved')).toBe('shipped');
    expect(deriveAiOpsLinearLifecycleStatus('closed', 'completed', 'flat')).toBe('closed');
    expect(deriveAiOpsLinearLifecycleStatus('updated', 'started', 'regressed')).toBe('sync-needed');
    expect(deriveAiOpsLinearLifecycleStatus('exported', 'started', 'unknown')).toBe('live');
  });

  it('should treat missing or old sync timestamps as stale for exported issues', () => {
    expect(isAiOpsLinearSyncStale(false, null, Date.parse('2026-03-12T12:00:00.000Z'))).toBe(false);
    expect(isAiOpsLinearSyncStale(true, null, Date.parse('2026-03-12T12:00:00.000Z'))).toBe(true);
    expect(
      isAiOpsLinearSyncStale(
        true,
        '2026-03-09T11:59:59.000Z',
        Date.parse('2026-03-12T12:00:00.000Z')
      )
    ).toBe(true);
    expect(
      isAiOpsLinearSyncStale(
        true,
        '2026-03-11T12:00:01.000Z',
        Date.parse('2026-03-12T12:00:00.000Z')
      )
    ).toBe(false);
  });

  it('should sync remote Linear state into the local export state', () => {
    const synced = syncAiOpsLinearIssueStateEntry({
      schemaVersion: '1',
      updatedAtIso: '2026-03-12T05:00:00.000Z',
      entries: [{
        draftId: 'linear-playtest-resume-p0',
        fingerprint: 'abc123',
        status: 'exported',
        linearIssueId: 'issue-1',
        linearIssueIdentifier: 'SUN-101',
        linearIssueUrl: 'https://linear.app/example/issue/SUN-101',
        teamName: 'Sungjin-an',
        projectName: null,
        title: '[AI Ops][P0] Resume clarity pass for AI-guided surfaces',
        summary: 'Resume Brief와 CTA를 같은 목표 문장으로 정렬합니다.',
        exportedAtIso: '2026-03-12T05:00:00.000Z',
        updatedAtIso: '2026-03-12T05:00:00.000Z',
        effectBaseline: null,
        linearStateName: 'Todo',
        linearStateType: 'unstarted',
        lastSyncedAtIso: '2026-03-12T05:00:00.000Z'
      }]
    }, 'linear-playtest-resume-p0', {
      issueId: 'issue-1',
      issueIdentifier: 'SUN-101',
      issueUrl: 'https://linear.app/example/issue/SUN-101',
      stateName: 'Done',
      stateType: 'completed'
    }, '2026-03-12T06:00:00.000Z');

    expect(synced.entries[0]).toMatchObject({
      status: 'closed',
      linearStateName: 'Done',
      linearStateType: 'completed',
      lastSyncedAtIso: '2026-03-12T06:00:00.000Z'
    });
  });
});
