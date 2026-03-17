import type { AiOpsBacklogItem } from './aiOpsBacklog.js';

export interface AiOpsLinearDraft {
  id: string;
  priority: 'P0' | 'P1' | 'P2';
  theme: AiOpsBacklogItem['theme'];
  title: string;
  labels: string[];
  summary: string;
  body: string;
  sourceBacklogIds: string[];
}

export interface BuildAiOpsLinearDraftBundleInput {
  generatedAtIso: string;
  telemetryPath: string;
  noteCount: number;
  drafts: AiOpsLinearDraft[];
}

function dedupe(values: string[]): string[] {
  return [...new Set(values)];
}

function getThemeLabels(theme: AiOpsBacklogItem['theme']): string[] {
  switch (theme) {
    case 'resume':
      return ['resume', 'ux'];
    case 'recommendation':
      return ['ai-director', 'ux'];
    case 'quest':
      return ['quests', 'ux'];
    case 'combat':
      return ['combat', 'pacing'];
    case 'fatigue':
      return ['pacing', 'retention'];
    case 'endgame':
      return ['endgame', 'balance'];
    default:
      return ['ux'];
  }
}

function getValidationLines(item: AiOpsBacklogItem): string[] {
  switch (item.theme) {
    case 'resume':
    case 'recommendation':
      return [
        '같은 continue/resume 시나리오를 다시 돌려 AI dismiss rate와 첫 액션까지 걸린 시간을 비교합니다.',
        'Resume Brief, Route, AI Director CTA가 같은 목표 문장을 공유하는지 브라우저와 터미널에서 함께 확인합니다.'
      ];
    case 'quest':
      return [
        '퀘스트 보드 진입부터 수락까지를 재생성해 목표, 보상, 다음 위치가 한 화면에서 읽히는지 확인합니다.',
        '수락 직후 첫 이동/정산까지 플레이어가 별도 설명 없이 이어갈 수 있는지 playtest note로 재확인합니다.'
      ];
    case 'combat':
    case 'fatigue':
      return [
        '같은 전선 샘플을 다시 돌려 route-scan 발생 비중과 전투 길이 체감이 내려가는지 확인합니다.',
        'change 이후 death, recovery, 반복 탐험 루프가 한쪽으로 쏠리지 않는지 telemetry를 비교합니다.'
      ];
    case 'endgame':
      return [
        'corruption-space 샘플을 다시 돌려 modifier별 pressure/recovery 분포가 한쪽으로 치우치지 않는지 확인합니다.',
        'tier/streak가 높은 샘플에서도 보상 기대와 휴지 구간이 유지되는지 playtest note를 수집합니다.'
      ];
    default:
      return [
        '같은 playtest 시나리오를 재현해 friction note가 다시 발생하는지 확인합니다.'
      ];
  }
}

function buildDraftTitle(item: AiOpsBacklogItem): string {
  return `[AI Ops][${item.priority}] ${item.title}`;
}

function buildDraftSummary(item: AiOpsBacklogItem): string {
  return item.suggestedActions[0] ?? item.rationale;
}

function buildDraftBody(item: AiOpsBacklogItem): string {
  return [
    '## Summary',
    item.rationale,
    '',
    '## Why Now',
    `- Priority: ${item.priority}`,
    `- Theme: ${item.theme}`,
    `- Source backlog: ${item.id}`,
    '',
    '## Evidence',
    ...(item.evidence.length > 0
      ? item.evidence.map(line => `- ${line}`)
      : ['- 추가 evidence 정리가 필요합니다.']),
    '',
    '## Suggested Actions',
    ...(item.suggestedActions.length > 0
      ? item.suggestedActions.map(line => `- ${line}`)
      : ['- 후속 조치가 아직 비어 있습니다.']),
    '',
    '## Validation',
    ...getValidationLines(item).map(line => `- ${line}`),
    ''
  ].join('\n');
}

export function deriveAiOpsLinearDrafts(items: AiOpsBacklogItem[]): AiOpsLinearDraft[] {
  return items.map(item => ({
    id: `linear-${item.id}`,
    priority: item.priority,
    theme: item.theme,
    title: buildDraftTitle(item),
    labels: dedupe([
      'ai-ops',
      item.priority.toLowerCase(),
      ...getThemeLabels(item.theme)
    ]),
    summary: buildDraftSummary(item),
    body: buildDraftBody(item),
    sourceBacklogIds: [item.id]
  }));
}

export function buildAiOpsLinearDraftBundleContent(
  input: BuildAiOpsLinearDraftBundleInput
): string {
  const draftLines = input.drafts.length > 0
    ? input.drafts.flatMap(draft => [
        `## ${draft.title}`,
        `Priority: ${draft.priority}`,
        `Labels: ${draft.labels.join(', ')}`,
        `Source backlog: ${draft.sourceBacklogIds.join(', ')}`,
        `Summary: ${draft.summary}`,
        '',
        '### Draft Body',
        draft.body.trimEnd(),
        ''
      ])
    : ['## Drafts', '- none', ''];

  return [
    '# AI Ops Linear Drafts',
    '',
    `Generated at: ${input.generatedAtIso}`,
    `Telemetry file: ${input.telemetryPath}`,
    `Playtest notes: ${input.noteCount}`,
    `Drafts: ${input.drafts.length}`,
    '',
    ...draftLines
  ].join('\n');
}
