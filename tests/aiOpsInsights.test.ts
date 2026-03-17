import {
  buildAiOpsInsightsReport,
  extractPlaytestObservations,
  parseAiTelemetryEvents,
  summarizeAiOpsInsights
} from '../src/systems/aiOpsInsights';

describe('AI Ops Insights', () => {
  it('should parse telemetry lines and summarize recommendation plus encounter metrics', () => {
    const telemetryContent = [
      JSON.stringify({
        eventType: 'session_start',
        isoTime: '2026-03-10T10:00:00.000Z',
        context: { locationId: 'bit-town' },
        payload: {}
      }),
      'not-json',
      JSON.stringify({
        eventType: 'ai_recommendation_shown',
        isoTime: '2026-03-10T10:01:00.000Z',
        context: { locationId: 'bit-town' },
        payload: {}
      }),
      JSON.stringify({
        eventType: 'ai_recommendation_followed',
        isoTime: '2026-03-10T10:01:05.000Z',
        context: { locationId: 'bit-town' },
        payload: { intentId: 'new-quest:town', source: 'ai-card' }
      }),
      JSON.stringify({
        eventType: 'encounter_director_decision',
        isoTime: '2026-03-10T10:10:00.000Z',
        context: { locationId: 'memory-forest' },
        payload: {
          mode: 'variety',
          outcome: 'event',
          encounterChancePercent: 30,
          preferredEventId: 'route-scan',
          challengeActive: false,
          repeatActionCount: 3,
          consecutiveCombats: 3,
          consecutiveNonProgressLoops: 3
        }
      }),
      JSON.stringify({
        eventType: 'encounter_director_decision',
        isoTime: '2026-03-10T10:20:00.000Z',
        context: { locationId: 'corruption-space' },
        payload: {
          mode: 'pressure',
          outcome: 'combat',
          encounterChancePercent: 88,
          preferredEventId: null,
          challengeActive: true,
          challengeTier: 3,
          challengeStreak: 4,
          challengeModifierId: 'volatile-jackpot',
          repeatActionCount: 1,
          consecutiveCombats: 1,
          consecutiveNonProgressLoops: 1
        }
      }),
      JSON.stringify({
        eventType: 'player_death',
        isoTime: '2026-03-10T10:22:00.000Z',
        context: { locationId: 'corruption-space' },
        payload: {}
      })
    ].join('\n');

    const records = parseAiTelemetryEvents(telemetryContent);
    const summary = summarizeAiOpsInsights(records);

    expect(records).toHaveLength(6);
    expect(summary.sessionStarts).toBe(1);
    expect(summary.aiRecommendation.followRate).toBe(1);
    expect(summary.encounterDirector.total).toBe(2);
    expect(summary.encounterDirector.modeCounts.variety).toBe(1);
    expect(summary.encounterDirector.modeCounts.pressure).toBe(1);
    expect(summary.encounterDirector.varietyRouteScanCount).toBe(1);
    expect(summary.encounterDirector.endgameCount).toBe(1);
    expect(summary.encounterDirector.topLocations[0]).toMatchObject({
      id: 'corruption-space',
      count: 1
    });
    expect(summary.encounterDirector.topModifiers[0]).toMatchObject({
      id: 'volatile-jackpot',
      count: 1
    });
  });

  it('should build a markdown report with findings and recent signals', () => {
    const summary = summarizeAiOpsInsights(parseAiTelemetryEvents([
      JSON.stringify({
        eventType: 'session_start',
        isoTime: '2026-03-10T10:00:00.000Z',
        context: { locationId: 'bit-town' },
        payload: {}
      }),
      JSON.stringify({
        eventType: 'ai_recommendation_shown',
        isoTime: '2026-03-10T10:00:05.000Z',
        context: { locationId: 'bit-town' },
        payload: {}
      }),
      JSON.stringify({
        eventType: 'ai_recommendation_dismissed',
        isoTime: '2026-03-10T10:00:10.000Z',
        context: { locationId: 'bit-town' },
        payload: { intentId: 'frontier:memory-forest', source: 'ai-card' }
      }),
      JSON.stringify({
        eventType: 'ai_recommendation_shown',
        isoTime: '2026-03-10T10:01:00.000Z',
        context: { locationId: 'bit-town' },
        payload: {}
      }),
      JSON.stringify({
        eventType: 'ai_recommendation_dismissed',
        isoTime: '2026-03-10T10:01:10.000Z',
        context: { locationId: 'bit-town' },
        payload: { intentId: 'frontier:cache-cave', source: 'ai-card' }
      }),
      JSON.stringify({
        eventType: 'encounter_director_decision',
        isoTime: '2026-03-10T10:05:00.000Z',
        context: { locationId: 'memory-forest' },
        payload: {
          mode: 'recovery',
          outcome: 'event',
          encounterChancePercent: 22,
          preferredEventId: 'maintenance-niche',
          challengeActive: false,
          repeatActionCount: 2,
          consecutiveCombats: 1,
          consecutiveNonProgressLoops: 2
        }
      }),
      JSON.stringify({
        eventType: 'player_death',
        isoTime: '2026-03-10T10:06:00.000Z',
        context: { locationId: 'memory-forest' },
        payload: {}
      })
    ].join('\n')));

    const markdown = buildAiOpsInsightsReport({
      generatedAtIso: '2026-03-10T12:00:00.000Z',
      telemetryPath: '/tmp/telemetry/events.ndjson',
      summary
    });

    expect(markdown).toContain('# AI Ops Insights');
    expect(markdown).toContain('Telemetry file: /tmp/telemetry/events.ndjson');
    expect(markdown).toContain('Encounter Director decisions: 1');
    expect(markdown).toContain('AI recommendation dismiss rate: 100% (2/2)');
    expect(markdown).toContain('dismiss 비중이 높습니다');
    expect(markdown).toContain('death @ memory-forest');
  });

  it('should prioritize playtest observations and combine them with telemetry findings', () => {
    const records = parseAiTelemetryEvents([
      JSON.stringify({
        eventType: 'ai_recommendation_shown',
        isoTime: '2026-03-11T02:00:00.000Z',
        context: { locationId: 'bit-town' },
        payload: {}
      }),
      JSON.stringify({
        eventType: 'ai_recommendation_dismissed',
        isoTime: '2026-03-11T02:00:05.000Z',
        context: { locationId: 'bit-town' },
        payload: { intentId: 'frontier:memory-forest', source: 'ai-card' }
      }),
      JSON.stringify({
        eventType: 'ai_recommendation_shown',
        isoTime: '2026-03-11T02:01:00.000Z',
        context: { locationId: 'bit-town' },
        payload: {}
      }),
      JSON.stringify({
        eventType: 'ai_recommendation_dismissed',
        isoTime: '2026-03-11T02:01:05.000Z',
        context: { locationId: 'bit-town' },
        payload: { intentId: 'frontier:cache-cave', source: 'ai-card' }
      })
    ].join('\n'));
    const notes = [{
      notePath: '/tmp/playtest/session-20260311-020000.md',
      content: [
        '# Session',
        '',
        '## Friction',
        '- Where did the player hesitate?: Resume cue felt unclear after continue.',
        '',
        '## Follow-ups',
        '- P0: Resume preview felt confusing and the player dismissed the AI card twice.',
        '- P1: Quest board copy was clear once they reached it.',
        ''
      ].join('\n')
    }];

    const summary = summarizeAiOpsInsights(records, notes);

    expect(summary.playtestNotes.noteCount).toBe(1);
    expect(summary.playtestNotes.prioritizedObservations[0]).toMatchObject({
      severity: 'P0',
      text: 'Resume preview felt confusing and the player dismissed the AI card twice.',
      section: 'Follow-ups'
    });
    expect(summary.playtestNotes.prioritizedObservations[0]?.tags).toEqual(
      expect.arrayContaining(['resume', 'clarity'])
    );
    expect(summary.findings).toEqual(expect.arrayContaining([
      expect.stringContaining('Playtest top priority: [P0] Resume preview felt confusing'),
      expect.stringContaining('resume/recommendation friction')
    ]));

    const markdown = buildAiOpsInsightsReport({
      generatedAtIso: '2026-03-11T03:00:00.000Z',
      telemetryPath: '/tmp/telemetry/events.ndjson',
      summary
    });

    expect(markdown).toContain('Playtest notes read: 1');
    expect(markdown).toContain('## Playtest Priorities');
    expect(markdown).toContain('[P0] Resume preview felt confusing and the player dismissed the AI card twice.');
    expect(markdown).toContain('session-20260311-020000.md · Follow-ups · resume, clarity');
  });

  it('should extract prioritized observations from follow-up and friction sections', () => {
    const observations = extractPlaytestObservations([{
      notePath: '/tmp/playtest/session-20260311-040000.md',
      content: [
        '# Session',
        '',
        '## Timeline',
        '- 20:00 First friction spike: Combat loop started to feel tired.',
        '',
        '## Follow-ups',
        '- P2: Minor copy cleanup in market card.',
        '- P1: Quest goal was clear but resume route still felt unclear.',
        ''
      ].join('\n')
    }]);

    expect(observations[0]).toMatchObject({
      severity: 'P1',
      text: 'Quest goal was clear but resume route still felt unclear.',
      section: 'Follow-ups'
    });
    expect(observations[0]?.tags).toEqual(expect.arrayContaining(['resume', 'clarity', 'quest']));
    expect(observations.some(observation =>
      observation.text === 'Combat loop started to feel tired.' &&
      observation.section === 'Timeline'
    )).toBe(true);
  });
});
