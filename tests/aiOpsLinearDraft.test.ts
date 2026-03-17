import {
  buildAiOpsLinearDraftBundleContent,
  deriveAiOpsLinearDrafts
} from '../src/systems/aiOpsLinearDraft';
import type { AiOpsBacklogItem } from '../src/systems/aiOpsBacklog';

describe('AI Ops Linear Drafts', () => {
  it('should derive deterministic issue drafts from backlog items', () => {
    const drafts = deriveAiOpsLinearDrafts([{
      id: 'playtest-resume-p0',
      priority: 'P0',
      theme: 'resume',
      title: 'Resume clarity pass for AI-guided surfaces',
      rationale: '재개 surface가 목표 이해를 놓치고 있습니다.',
      evidence: ['AI dismiss rate 100% (2/2)'],
      suggestedActions: ['Resume Brief와 CTA를 같은 목표 문장으로 정렬합니다.']
    } satisfies AiOpsBacklogItem]);

    expect(drafts).toHaveLength(1);
    expect(drafts[0]).toMatchObject({
      id: 'linear-playtest-resume-p0',
      priority: 'P0',
      theme: 'resume',
      title: '[AI Ops][P0] Resume clarity pass for AI-guided surfaces',
      labels: expect.arrayContaining(['ai-ops', 'p0', 'resume', 'ux']),
      summary: 'Resume Brief와 CTA를 같은 목표 문장으로 정렬합니다.',
      sourceBacklogIds: ['playtest-resume-p0']
    });
    expect(drafts[0]?.body).toContain('## Validation');
    expect(drafts[0]?.body).toContain('AI dismiss rate');
  });

  it('should build a markdown bundle with issue-ready sections', () => {
    const content = buildAiOpsLinearDraftBundleContent({
      generatedAtIso: '2026-03-12T04:00:00.000Z',
      telemetryPath: '/tmp/telemetry/events.ndjson',
      noteCount: 2,
      drafts: [{
        id: 'linear-playtest-resume-p0',
        priority: 'P0',
        theme: 'resume',
        title: '[AI Ops][P0] Resume clarity pass for AI-guided surfaces',
        labels: ['ai-ops', 'p0', 'resume', 'ux'],
        summary: 'Resume Brief와 CTA를 같은 목표 문장으로 정렬합니다.',
        body: [
          '## Summary',
          '재개 surface가 목표 이해를 놓치고 있습니다.',
          '',
          '## Validation',
          '- 같은 continue/resume 시나리오를 다시 돌려 dismiss rate를 비교합니다.',
          ''
        ].join('\n'),
        sourceBacklogIds: ['playtest-resume-p0']
      }]
    });

    expect(content).toContain('# AI Ops Linear Drafts');
    expect(content).toContain('Telemetry file: /tmp/telemetry/events.ndjson');
    expect(content).toContain('Drafts: 1');
    expect(content).toContain('## [AI Ops][P0] Resume clarity pass for AI-guided surfaces');
    expect(content).toContain('Labels: ai-ops, p0, resume, ux');
    expect(content).toContain('### Draft Body');
    expect(content).toContain('## Validation');
  });
});
