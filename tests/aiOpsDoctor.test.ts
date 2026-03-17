import {
  buildAiOpsCycleLatestSnapshot,
  type AiOpsCycleSummary
} from '../src/systems/aiOpsCycle';
import {
  buildAiOpsDoctorReport,
  buildAiOpsDoctorMarkdown,
  evaluateAiOpsDoctorGate,
  formatAiOpsDoctorLines
} from '../src/systems/aiOpsDoctor';

function makeSummary(overrides: Partial<AiOpsCycleSummary> = {}): AiOpsCycleSummary {
  return {
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
      }
    ],
    ...overrides
  };
}

describe('AI Ops Doctor', () => {
  it('should warn when no persisted summary exists', () => {
    const report = buildAiOpsDoctorReport(
      buildAiOpsCycleLatestSnapshot('/workspace/docs/ai-ops-cycle/latest.json', null)
    );

    expect(report.status).toBe('warn');
    expect(report.recommendedCommand).toBe('npm run ai:ops:cycle');
    expect(report.reasons[0]).toContain('persisted ai ops cycle summary');
  });

  it('should fail when the latest cycle contains failed steps', () => {
    const report = buildAiOpsDoctorReport(
      buildAiOpsCycleLatestSnapshot(
        '/workspace/docs/ai-ops-cycle/latest.json',
        {
          ...makeSummary(),
          overallPass: false,
          report: {
            ...makeSummary().report,
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
              id: 'ai-insights',
              label: 'AI insights',
              command: 'node scripts/generate-ai-insights-report.js --dry-run',
              ok: false,
              status: 1,
              outputFileName: 'ai-insights.txt'
            }
          ]
        },
        new Date('2026-03-16T05:00:00.000Z').getTime()
      )
    );

    expect(report.status).toBe('fail');
    expect(report.recommendedCommand).toBe('npm run ai:ops:cycle:latest');
    expect(report.reasons.join(' ')).toContain('AI insights');
  });

  it('should warn when the latest cycle is stale', () => {
    const report = buildAiOpsDoctorReport(
      buildAiOpsCycleLatestSnapshot(
        '/workspace/docs/ai-ops-cycle/latest.json',
        makeSummary(),
        new Date('2026-03-17T10:00:00.000Z').getTime()
      )
    );

    expect(report.status).toBe('warn');
    expect(report.recommendedCommand).toBe('npm run ai:ops:cycle');
    expect(report.reasons.join(' ')).toContain('stale');
  });

  it('should warn when persisted ops status still requires action', () => {
    const report = buildAiOpsDoctorReport(
      buildAiOpsCycleLatestSnapshot(
        '/workspace/docs/ai-ops-cycle/latest.json',
        {
          ...makeSummary(),
          report: {
            ...makeSummary().report,
            status: {
              id: 'export-pending',
              label: 'Export 대기',
              tone: 'recommended',
              actionRequired: true,
              summary: '미수출 draft가 있습니다.'
            },
            nextCommand: 'npm run ai:linear:export:dry'
          }
        },
        new Date('2026-03-16T05:00:00.000Z').getTime()
      )
    );

    expect(report.status).toBe('warn');
    expect(report.recommendedCommand).toBe('npm run ai:linear:export:dry');
    expect(report.reasons.join(' ')).toContain('Export 대기');
  });

  it('should report ok when the latest cycle is fresh and stable', () => {
    const report = buildAiOpsDoctorReport(
      buildAiOpsCycleLatestSnapshot(
        '/workspace/docs/ai-ops-cycle/latest.json',
        makeSummary(),
        new Date('2026-03-16T05:00:00.000Z').getTime()
      )
    );

    expect(report.status).toBe('ok');
    expect(report.recommendedCommand).toBeNull();
    expect(formatAiOpsDoctorLines(report)).toContain(
      '- reason: latest cycle이 fresh 상태이고 즉시 필요한 운영 조치가 없습니다.'
    );
  });

  it('should block on fail and optionally on warn when evaluating doctor gate', () => {
    expect(
      evaluateAiOpsDoctorGate({
        status: 'fail',
        filePath: '/workspace/docs/ai-ops-cycle/latest.json',
        summaryPresent: true,
        freshnessLabel: 'fresh · 1h',
        opsStatus: null,
        reasons: ['failed step'],
        recommendedCommand: 'npm run ai:ops:cycle:latest'
      })
    ).toMatchObject({
      blocked: true,
      threshold: 'fail'
    });

    expect(
      evaluateAiOpsDoctorGate({
        status: 'warn',
        filePath: '/workspace/docs/ai-ops-cycle/latest.json',
        summaryPresent: true,
        freshnessLabel: 'stale · 30h',
        opsStatus: null,
        reasons: ['stale cycle'],
        recommendedCommand: 'npm run ai:ops:cycle'
      })
    ).toMatchObject({
      blocked: false,
      threshold: 'fail'
    });

    expect(
      evaluateAiOpsDoctorGate(
        {
          status: 'warn',
          filePath: '/workspace/docs/ai-ops-cycle/latest.json',
          summaryPresent: true,
          freshnessLabel: 'stale · 30h',
          opsStatus: null,
          reasons: ['stale cycle'],
          recommendedCommand: 'npm run ai:ops:cycle'
        },
        { failOnWarn: true }
      )
    ).toMatchObject({
      blocked: true,
      threshold: 'warn'
    });
  });

  it('should render a readable markdown doctor summary', () => {
    const markdown = buildAiOpsDoctorMarkdown({
      status: 'warn',
      filePath: '/workspace/docs/ai-ops-cycle/latest.json',
      summaryPresent: true,
      freshnessLabel: 'stale · 30h',
      opsStatus: {
        id: 'cycle-stale',
        label: 'Cycle stale',
        tone: 'warning',
        actionRequired: true,
        summary: '마지막 persisted cycle이 30h 전에 생성됐습니다.'
      },
      reasons: ['latest cycle이 stale 상태입니다 (stale · 30h).'],
      recommendedCommand: 'npm run ai:ops:cycle'
    });

    expect(markdown).toContain('# AI Ops Doctor');
    expect(markdown).toContain('Status: WARN');
    expect(markdown).toContain('Ops status: [warning] Cycle stale');
    expect(markdown).toContain('Recommended command: npm run ai:ops:cycle');
    expect(markdown).toContain('- latest cycle이 stale 상태입니다 (stale · 30h).');
  });
});
