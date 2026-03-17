import {
  buildPlaytestReportSummary,
  formatPlaytestOpsNextCommandLines,
  formatPlaytestReportLines
} from '../src/systems/playtestReport';

describe('Playtest report formatting', () => {
  it('should build a structured report summary for json output', () => {
    const summary = buildPlaytestReportSummary({
      generatedAt: new Date('2026-03-12T00:00:00.000Z'),
      paths: {
        baseDir: '/workspace/playtest-data/active',
        notesDir: '/workspace/playtest-data/active/notes',
        telemetryFilePath: '/workspace/playtest-data/active/telemetry/events.ndjson'
      },
      saves: [
        {
          slot: 2,
          playerName: 'Aria',
          playerLevel: 5,
          locationName: 'Ironfront',
          savedAt: 1760000000000,
          saveType: 'manual'
        }
      ],
      telemetryEvents: [
        { eventType: 'session_start', isoTime: '2026-03-12T00:00:00.000Z' },
        { eventType: 'quest_completed', isoTime: '2026-03-12T00:05:00.000Z' },
        { eventType: 'quest_completed', isoTime: '2026-03-12T00:06:00.000Z' }
      ],
      notes: [
        { notePath: '/workspace/playtest-data/active/notes/session-1.md' },
        { notePath: '/workspace/playtest-data/active/notes/session-2.md' }
      ],
      opsPreview: {
        doctor: {
          status: 'fail',
          summaryPresent: true,
          freshnessLabel: 'stale · 30h',
          reasons: ['실패 단계: AI insights (status=1)'],
          recommendedCommand: 'npm run ai:ops:cycle:latest',
          opsStatus: {
            id: 'cycle-stale',
            label: 'Cycle stale',
            tone: 'warning',
            actionRequired: true,
            summary: '마지막 persisted cycle이 30h 전에 생성됐습니다.'
          }
        },
        status: {
          id: 'cycle-stale',
          label: 'Cycle stale',
          tone: 'warning',
          actionRequired: true,
          summary: '마지막 persisted cycle이 30h 전에 생성됐습니다.'
        },
        nextCommand: {
          label: 'backlog 생성',
          command: 'npm run ai:backlog:dry',
          reason: 'Linear draft가 아직 없습니다.',
          tone: 'recommended'
        },
        latestCycle: {
          generatedAtIso: '2026-03-11T18:00:00.000Z',
          mode: 'artifact',
          overallPass: false,
          stepsPassed: 5,
          stepsTotal: 6,
          stale: true,
          ageHours: 30,
          failedSteps: [
            {
              label: 'AI insights',
              status: 1,
              outputFileName: 'ai-insights.txt'
            }
          ],
          reportJsonPath: '/workspace/docs/ai-ops-cycle/20260311-180000/playtest-report.json',
          bundleDir: '/workspace/docs/ai-ops-cycle/20260311-180000',
          nextCommand: 'npm run ai:ops:cycle:latest'
        },
        latestCycleFollowUp: {
          label: 'cycle 갱신',
          command: 'npm run ai:ops:cycle',
          reason: '마지막 persisted cycle이 30h 전에 생성되어 오래됐습니다. 최신 artifact를 다시 생성하세요.',
          tone: 'warning'
        }
      },
      opsGuidanceAvailable: true
    });

    expect(summary.generatedAtIso).toBe('2026-03-12T00:00:00.000Z');
    expect(summary.saves.slotCount).toBe(1);
    expect(summary.paths.telemetryFilePath).toBe(
      '/workspace/playtest-data/active/telemetry/events.ndjson'
    );
    expect(summary.telemetry.totalEvents).toBe(3);
    expect(summary.telemetry.counts.quest_completed).toBe(2);
    expect(summary.notes.recentNotePaths).toEqual([
      'notes/session-1.md',
      'notes/session-2.md'
    ]);
    expect(summary.ops.nextCommand?.command).toBe('npm run ai:backlog:dry');
    expect(summary.ops.guidanceAvailable).toBe(true);
    expect(summary.ops.doctor).toMatchObject({
      status: 'fail',
      recommendedCommand: 'npm run ai:ops:cycle:latest'
    });
    expect(summary.ops.status).toMatchObject({
      id: 'cycle-stale',
      label: 'Cycle stale',
      actionRequired: true
    });
    expect(summary.ops.latestCycle).toMatchObject({
      stale: true,
      ageHours: 30,
      stepsPassed: 5,
      stepsTotal: 6
    });
    expect(summary.ops.latestCycleFollowUp?.command).toBe('npm run ai:ops:cycle');
  });

  it('should format next-command guidance with tone and reason', () => {
    const lines = formatPlaytestOpsNextCommandLines({
      nextCommand: {
        label: '원격 상태 재동기화',
        command: 'LINEAR_API_KEY=... npm run ai:linear:sync',
        reason: 'stale sync 1건이 있어 원격 상태를 다시 읽어야 합니다.',
        tone: 'warning'
      }
    });

    expect(lines).toEqual([
      '- [warning] 원격 상태 재동기화: LINEAR_API_KEY=... npm run ai:linear:sync',
      '- reason: stale sync 1건이 있어 원격 상태를 다시 읽어야 합니다.'
    ]);
  });

  it('should fall back when no actionable command exists', () => {
    expect(formatPlaytestOpsNextCommandLines(null)).toEqual([
      '- no actionable command yet'
    ]);
  });

  it('should format the full report with unavailable guidance fallback', () => {
    const lines = formatPlaytestReportLines(buildPlaytestReportSummary({
      generatedAt: new Date('2026-03-12T00:00:00.000Z'),
      paths: {
        baseDir: '/workspace/playtest-data/active',
        notesDir: '/workspace/playtest-data/active/notes',
        telemetryFilePath: '/workspace/playtest-data/active/telemetry/events.ndjson'
      },
      saves: [],
      telemetryEvents: [],
      notes: [],
      opsPreview: null,
      opsGuidanceAvailable: false
    }));

    expect(lines).toContain('[playtest-report] Save slots');
    expect(lines).toContain('- no playtest saves yet');
    expect(lines).toContain('[playtest-report] Telemetry');
    expect(lines).toContain('- no telemetry events captured yet');
    expect(lines).toContain('[playtest-report] Notes');
    expect(lines).toContain('- no playtest notes yet');
    expect(lines).toContain('[playtest-report] Ops next command');
    expect(lines).toContain(
      '- unavailable (run `npm run build` first to enable shared ops guidance)'
    );
    expect(lines).toContain('[playtest-report] Latest AI ops cycle');
    expect(lines).toContain('- no persisted cycle summary yet');
  });

  it('should format latest cycle health and follow-up in the full report', () => {
    const lines = formatPlaytestReportLines(buildPlaytestReportSummary({
      generatedAt: new Date('2026-03-12T00:00:00.000Z'),
      paths: {
        baseDir: '/workspace/playtest-data/active',
        notesDir: '/workspace/playtest-data/active/notes',
        telemetryFilePath: '/workspace/playtest-data/active/telemetry/events.ndjson'
      },
      saves: [],
      telemetryEvents: [],
      notes: [],
      opsPreview: {
        doctor: {
          status: 'fail',
          summaryPresent: true,
          freshnessLabel: 'stale · 30h',
          reasons: ['실패 단계: AI insights (status=1)'],
          recommendedCommand: 'npm run ai:ops:cycle:latest',
          opsStatus: {
            id: 'cycle-stale',
            label: 'Cycle stale',
            tone: 'warning',
            actionRequired: true,
            summary: '마지막 persisted cycle이 30h 전에 생성됐습니다.'
          }
        },
        status: {
          id: 'cycle-stale',
          label: 'Cycle stale',
          tone: 'warning',
          actionRequired: true,
          summary: '마지막 persisted cycle이 30h 전에 생성됐습니다.'
        },
        nextCommand: {
          label: 'backlog 생성',
          command: 'npm run ai:backlog:dry',
          reason: 'Linear draft가 아직 없습니다.',
          tone: 'recommended'
        },
        latestCycle: {
          generatedAtIso: '2026-03-11T18:00:00.000Z',
          mode: 'artifact',
          overallPass: false,
          stepsPassed: 5,
          stepsTotal: 6,
          stale: true,
          ageHours: 30,
          failedSteps: [
            {
              label: 'AI insights',
              status: 1,
              outputFileName: 'ai-insights.txt'
            }
          ],
          reportJsonPath: '/workspace/docs/ai-ops-cycle/20260311-180000/playtest-report.json',
          bundleDir: '/workspace/docs/ai-ops-cycle/20260311-180000',
          nextCommand: 'npm run ai:ops:cycle:latest'
        },
        latestCycleFollowUp: {
          label: 'cycle 갱신',
          command: 'npm run ai:ops:cycle',
          reason: '마지막 persisted cycle이 30h 전에 생성되어 오래됐습니다. 최신 artifact를 다시 생성하세요.',
          tone: 'warning'
        }
      },
      opsGuidanceAvailable: true
    }));

    expect(lines).toContain('[playtest-report] Latest AI ops cycle');
    expect(lines).toContain('[playtest-report] Ops doctor');
    expect(lines).toContain('- status: fail');
    expect(lines).toContain('- recommended command: npm run ai:ops:cycle:latest');
    expect(lines).toContain('[playtest-report] Ops status');
    expect(lines).toContain('- [warning] Cycle stale');
    expect(lines).toContain('- action required: yes');
    expect(lines).toContain('- overall: FAIL (artifact)');
    expect(lines).toContain('- freshness: stale · 30h');
    expect(lines).toContain('- failed steps: AI insights (status=1)');
    expect(lines).toContain('- follow-up: [warning] cycle 갱신: npm run ai:ops:cycle');
  });
});
