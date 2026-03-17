import {
  buildAiOpsBacklogContent,
  deriveAiOpsBacklog
} from '../src/systems/aiOpsBacklog';
import {
  parseAiTelemetryEvents,
  summarizeAiOpsInsights
} from '../src/systems/aiOpsInsights';

describe('AI Ops Backlog', () => {
  it('should derive prioritized draft items from telemetry and playtest notes', () => {
    const summary = summarizeAiOpsInsights(
      parseAiTelemetryEvents([
        JSON.stringify({
          eventType: 'ai_recommendation_shown',
          isoTime: '2026-03-12T01:00:00.000Z',
          context: { locationId: 'bit-town' },
          payload: {}
        }),
        JSON.stringify({
          eventType: 'ai_recommendation_dismissed',
          isoTime: '2026-03-12T01:00:03.000Z',
          context: { locationId: 'bit-town' },
          payload: { intentId: 'frontier:memory-forest', source: 'ai-card' }
        }),
        JSON.stringify({
          eventType: 'ai_recommendation_shown',
          isoTime: '2026-03-12T01:02:00.000Z',
          context: { locationId: 'bit-town' },
          payload: {}
        }),
        JSON.stringify({
          eventType: 'ai_recommendation_dismissed',
          isoTime: '2026-03-12T01:02:03.000Z',
          context: { locationId: 'bit-town' },
          payload: { intentId: 'frontier:cache-cave', source: 'ai-card' }
        }),
        JSON.stringify({
          eventType: 'encounter_director_decision',
          isoTime: '2026-03-12T01:05:00.000Z',
          context: { locationId: 'memory-forest' },
          payload: {
            mode: 'variety',
            outcome: 'event',
            encounterChancePercent: 28,
            preferredEventId: 'route-scan',
            challengeActive: false
          }
        }),
        JSON.stringify({
          eventType: 'encounter_director_decision',
          isoTime: '2026-03-12T01:06:00.000Z',
          context: { locationId: 'memory-forest' },
          payload: {
            mode: 'variety',
            outcome: 'event',
            encounterChancePercent: 28,
            preferredEventId: 'route-scan',
            challengeActive: false
          }
        }),
        JSON.stringify({
          eventType: 'encounter_director_decision',
          isoTime: '2026-03-12T01:07:00.000Z',
          context: { locationId: 'memory-forest' },
          payload: {
            mode: 'variety',
            outcome: 'event',
            encounterChancePercent: 28,
            preferredEventId: 'route-scan',
            challengeActive: false
          }
        })
      ].join('\n')),
      [{
        notePath: '/tmp/playtest/session-20260312-010000.md',
        content: [
          '# Session',
          '',
          '## Follow-ups',
          '- P0: Resume panel felt unclear and the AI recommendation was dismissed twice.',
          ''
        ].join('\n')
      }]
    );

    const items = deriveAiOpsBacklog(summary);

    expect(items[0]).toMatchObject({
      priority: 'P0',
      theme: 'resume',
      title: 'Resume clarity pass for AI-guided surfaces'
    });
    expect(items.some(item =>
      item.id === 'recommendation-dismiss' &&
      item.priority === 'P0'
    )).toBe(true);
    expect(items.some(item =>
      item.id === 'encounter-route-scan' &&
      item.priority === 'P1'
    )).toBe(true);
  });

  it('should build a grouped markdown backlog draft', () => {
    const content = buildAiOpsBacklogContent({
      generatedAtIso: '2026-03-12T02:00:00.000Z',
      telemetryPath: '/tmp/telemetry/events.ndjson',
      noteCount: 2,
      items: [{
        id: 'resume',
        priority: 'P0',
        theme: 'resume',
        title: 'Resume clarity pass for AI-guided surfaces',
        rationale: '재개 surface가 목표 이해를 놓치고 있습니다.',
        evidence: ['AI dismiss rate 100% (2/2)'],
        suggestedActions: ['Resume Brief와 CTA를 같은 목표 문장으로 정렬합니다.']
      }]
    });

    expect(content).toContain('# AI Ops Backlog');
    expect(content).toContain('Telemetry file: /tmp/telemetry/events.ndjson');
    expect(content).toContain('Playtest notes: 2');
    expect(content).toContain('## P0');
    expect(content).toContain('Resume clarity pass for AI-guided surfaces');
    expect(content).toContain('evidence: AI dismiss rate 100% (2/2)');
  });
});
