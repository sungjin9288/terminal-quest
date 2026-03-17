import fs from 'fs';
import os from 'os';
import path from 'path';
import {
  buildAiOpsCycleLatestSnapshot,
  buildAiOpsCycleMarkdown,
  buildAiOpsCycleSummary,
  formatAiOpsCycleLatestLines,
  getAiOpsCycleLatestSummaryPath,
  readAiOpsCycleLatestSummary
} from '../src/systems/aiOpsCycle';

describe('AI Ops Cycle', () => {
  it('should build a summary from report snapshot and step results', () => {
    const summary = buildAiOpsCycleSummary({
      generatedAtIso: '2026-03-16T04:00:00.000Z',
      mode: 'artifact',
      bundleDir: '/workspace/docs/ai-ops-cycle/20260316-040000',
      reportJsonPath: '/workspace/docs/ai-ops-cycle/20260316-040000/playtest-report.json',
      latestSummaryPath: '/workspace/docs/ai-ops-cycle/latest.json',
      latestReportJsonPath: '/workspace/docs/ai-ops-cycle/latest-playtest-report.json',
      report: {
        generatedAtIso: '2026-03-16T04:00:00.000Z',
        paths: {
          baseDir: '/workspace/playtest-data/active',
          notesDir: '/workspace/playtest-data/active/notes',
          telemetryFilePath: '/workspace/playtest-data/active/telemetry/events.ndjson'
        },
        saves: {
          slotCount: 0,
          slots: []
        },
        telemetry: {
          totalEvents: 12,
          firstEvent: null,
          lastEvent: null,
          counts: {},
          recentEvents: []
        },
        notes: {
          totalNotes: 3,
          recentNotePaths: ['notes/session-a.md']
        },
        ops: {
          guidanceAvailable: true,
          doctor: null,
          status: {
            id: 'export-pending',
            label: 'Export 대기',
            tone: 'recommended',
            actionRequired: true,
            summary: '미수출 또는 갱신 필요 draft가 있습니다.'
          },
          nextCommand: {
            label: 'backlog 생성',
            command: 'npm run ai:backlog:dry',
            reason: 'draft가 아직 없습니다.',
            tone: 'recommended'
          },
          latestCycle: null,
          latestCycleFollowUp: null
        }
      },
      steps: [
        {
          id: 'playtest-report',
          label: 'Playtest report JSON',
          command: 'node scripts/playtest-report.js --json',
          ok: true,
          status: 0,
          outputFileName: 'playtest-report.json'
        },
        {
          id: 'ai-linear-export',
          label: 'AI linear export preview',
          command: 'node scripts/export-ai-ops-linear.js --dry-run --report-json /tmp/report.json',
          ok: true,
          status: 0,
          outputFileName: 'ai-linear-export.txt'
        }
      ]
    });

    expect(summary.overallPass).toBe(true);
    expect(summary.report.totalEvents).toBe(12);
    expect(summary.report.totalNotes).toBe(3);
    expect(summary.report.status).toMatchObject({
      id: 'export-pending',
      label: 'Export 대기',
      actionRequired: true
    });
    expect(summary.report.nextCommand).toBe('npm run ai:backlog:dry');
  });

  it('should render a readable markdown summary', () => {
    const markdown = buildAiOpsCycleMarkdown({
      generatedAtIso: '2026-03-16T04:00:00.000Z',
      mode: 'dry-run',
      overallPass: false,
      bundleDir: null,
      reportJsonPath: '/tmp/playtest-report.json',
      latestSummaryPath: null,
      latestReportJsonPath: null,
      report: {
        telemetryFilePath: '/workspace/playtest-data/active/telemetry/events.ndjson',
        notesDir: '/workspace/playtest-data/active/notes',
        totalEvents: 0,
        totalNotes: 7,
        status: {
          id: 'cycle-stale',
          label: 'Cycle stale',
          tone: 'warning',
          actionRequired: true,
          summary: '마지막 persisted cycle이 오래됐습니다.'
        },
        nextCommand: 'npm run ai:backlog:dry'
      },
      steps: [
        {
          id: 'ai-insights',
          label: 'AI insights',
          command: 'node scripts/generate-ai-insights-report.js --dry-run',
          ok: false,
          status: 1,
          outputFileName: 'ai-insights.txt'
        }
      ]
    });

    expect(markdown).toContain('Mode: dry-run');
    expect(markdown).toContain('Overall: FAIL');
    expect(markdown).toContain('Ops status: [warning] Cycle stale');
    expect(markdown).toContain('Ops action required: yes');
    expect(markdown).toContain('Ops summary: 마지막 persisted cycle이 오래됐습니다.');
    expect(markdown).toContain('Next command: npm run ai:backlog:dry');
    expect(markdown).toContain('- [fail] AI insights · status=1 · ai-insights.txt');
  });

  it('should read and format the latest persisted cycle summary', () => {
    const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), 'terminal-quest-ai-ops-cycle-'));

    try {
      const artifactsDir = path.join(rootDir, 'docs', 'ai-ops-cycle');
      fs.mkdirSync(artifactsDir, { recursive: true });
      fs.writeFileSync(
        getAiOpsCycleLatestSummaryPath(rootDir),
        `${JSON.stringify({
          generatedAtIso: '2026-03-16T04:00:00.000Z',
          mode: 'artifact',
          overallPass: true,
          bundleDir: '/workspace/docs/ai-ops-cycle/20260316-040000',
          reportJsonPath: '/workspace/docs/ai-ops-cycle/20260316-040000/playtest-report.json',
          latestSummaryPath: '/workspace/docs/ai-ops-cycle/latest.json',
          latestReportJsonPath: '/workspace/docs/ai-ops-cycle/latest-playtest-report.json',
          report: {
            telemetryFilePath: '/workspace/playtest-data/active/telemetry/events.ndjson',
            notesDir: '/workspace/playtest-data/active/notes',
            totalEvents: 10,
            totalNotes: 2,
            status: {
              id: 'stable',
              label: 'Stable',
              tone: 'success',
              actionRequired: false,
              summary: '현재 즉시 조치가 필요한 운영 항목이 없습니다.'
            },
            nextCommand: 'npm run ai:linear:export:dry'
          },
          steps: [
            {
              id: 'playtest-report',
              label: 'Playtest report JSON',
              command: 'node scripts/playtest-report.js --json',
              ok: true,
              status: 0,
              outputFileName: 'playtest-report.json'
            },
            {
              id: 'ai-insights',
              label: 'AI insights',
              command: 'node scripts/generate-ai-insights-report.js --dry-run',
              ok: true,
              status: 0,
              outputFileName: 'ai-insights.txt'
            }
          ]
        }, null, 2)}\n`,
        'utf-8'
      );

      const summary = readAiOpsCycleLatestSummary(rootDir);
      const lines = formatAiOpsCycleLatestLines(summary, new Date('2026-03-16T08:00:00.000Z').getTime());

      expect(summary?.overallPass).toBe(true);
      expect(lines).toContain('- overall: PASS (artifact)');
      expect(lines).toContain('- steps: 2/2 passed');
      expect(lines).toContain('- freshness: fresh · 4h');
      expect(lines).toContain('- failed steps: none');
      expect(lines).toContain('- ops status snapshot: [success] Stable');
      expect(lines).toContain('- ops action required: no');
      expect(lines).toContain('- ops summary snapshot: 현재 즉시 조치가 필요한 운영 항목이 없습니다.');
      expect(lines).toContain('- next command snapshot: npm run ai:linear:export:dry');
    } finally {
      fs.rmSync(rootDir, { recursive: true, force: true });
    }
  });

  it('should include failed step details when formatting a failed latest cycle summary', () => {
    const lines = formatAiOpsCycleLatestLines({
      generatedAtIso: '2026-03-16T04:00:00.000Z',
      mode: 'artifact',
      overallPass: false,
      bundleDir: '/workspace/docs/ai-ops-cycle/20260316-040000',
      reportJsonPath: '/workspace/docs/ai-ops-cycle/20260316-040000/playtest-report.json',
      latestSummaryPath: '/workspace/docs/ai-ops-cycle/latest.json',
      latestReportJsonPath: '/workspace/docs/ai-ops-cycle/latest-playtest-report.json',
      report: {
        telemetryFilePath: '/workspace/playtest-data/active/telemetry/events.ndjson',
        notesDir: '/workspace/playtest-data/active/notes',
        totalEvents: 4,
        totalNotes: 1,
        status: {
          id: 'cycle-failed',
          label: 'Cycle 실패',
          tone: 'warning',
          actionRequired: true,
          summary: '최근 persisted cycle에 실패 단계가 있습니다.'
        },
        nextCommand: 'npm run ai:ops:cycle:latest'
      },
      steps: [
        {
          id: 'playtest-report',
          label: 'Playtest report JSON',
          command: 'node scripts/playtest-report.js --json',
          ok: true,
          status: 0,
          outputFileName: 'playtest-report.json'
        },
        {
          id: 'ai-insights',
          label: 'AI insights',
          command: 'node scripts/generate-ai-insights-report.js --dry-run',
          ok: false,
          status: 1,
          outputFileName: 'ai-insights.txt'
        }
      ]
    }, new Date('2026-03-17T10:00:00.000Z').getTime());

    expect(lines).toContain('- overall: FAIL (artifact)');
    expect(lines).toContain('- freshness: stale · 30h');
    expect(lines).toContain('- failed steps: AI insights (status=1)');
    expect(lines).toContain('- ops status snapshot: [warning] Cycle 실패');
    expect(lines).toContain('- ops action required: yes');
    expect(lines).toContain('- ops summary snapshot: 최근 persisted cycle에 실패 단계가 있습니다.');
  });

  it('should build a machine-readable latest snapshot for automation', () => {
    const snapshot = buildAiOpsCycleLatestSnapshot(
      '/workspace/docs/ai-ops-cycle/latest.json',
      {
        generatedAtIso: '2026-03-16T04:00:00.000Z',
        mode: 'artifact',
        overallPass: true,
        bundleDir: '/workspace/docs/ai-ops-cycle/20260316-040000',
        reportJsonPath: '/workspace/docs/ai-ops-cycle/20260316-040000/playtest-report.json',
        latestSummaryPath: '/workspace/docs/ai-ops-cycle/latest.json',
        latestReportJsonPath: '/workspace/docs/ai-ops-cycle/latest-playtest-report.json',
        report: {
          telemetryFilePath: '/workspace/playtest-data/active/telemetry/events.ndjson',
          notesDir: '/workspace/playtest-data/active/notes',
          totalEvents: 10,
          totalNotes: 2,
          status: {
            id: 'stable',
            label: 'Stable',
            tone: 'success',
            actionRequired: false,
            summary: '현재 즉시 조치가 필요한 운영 항목이 없습니다.'
          },
          nextCommand: 'npm run playtest:report'
        },
        steps: [
          {
            id: 'playtest-report',
            label: 'Playtest report JSON',
            command: 'node scripts/playtest-report.js --json',
            ok: true,
            status: 0,
            outputFileName: 'playtest-report.json'
          },
          {
            id: 'ai-insights',
            label: 'AI insights',
            command: 'node scripts/generate-ai-insights-report.js --dry-run',
            ok: true,
            status: 0,
            outputFileName: 'ai-insights.txt'
          }
        ]
      },
      new Date('2026-03-16T08:00:00.000Z').getTime()
    );

    expect(snapshot.filePath).toBe('/workspace/docs/ai-ops-cycle/latest.json');
    expect(snapshot.passedSteps).toBe(2);
    expect(snapshot.totalSteps).toBe(2);
    expect(snapshot.failedSteps).toEqual([]);
    expect(snapshot.freshness).toMatchObject({
      stale: false,
      ageHours: 4,
      label: 'fresh · 4h'
    });
    expect(snapshot.summary?.report.status).toMatchObject({
      id: 'stable',
      label: 'Stable'
    });
  });
});
