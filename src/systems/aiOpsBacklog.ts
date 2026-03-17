import type { AiOpsInsightsSummary, PlaytestObservation } from './aiOpsInsights.js';

export interface AiOpsBacklogItem {
  id: string;
  priority: 'P0' | 'P1' | 'P2';
  theme: 'resume' | 'recommendation' | 'quest' | 'combat' | 'fatigue' | 'endgame' | 'general';
  title: string;
  rationale: string;
  evidence: string[];
  suggestedActions: string[];
}

export interface BuildAiOpsBacklogInput {
  generatedAtIso: string;
  telemetryPath: string;
  noteCount: number;
  items: AiOpsBacklogItem[];
}

function toNoteFileLabel(notePath: string): string {
  const normalized = notePath.replace(/\\/g, '/');
  const parts = normalized.split('/');
  return parts[parts.length - 1] ?? notePath;
}

function getPrimaryTheme(observation: PlaytestObservation): AiOpsBacklogItem['theme'] {
  if (observation.tags.includes('resume')) {
    return 'resume';
  }
  if (observation.tags.includes('quest')) {
    return 'quest';
  }
  if (observation.tags.includes('combat')) {
    return 'combat';
  }
  if (observation.tags.includes('fatigue')) {
    return 'fatigue';
  }
  return 'general';
}

function pushEvidence(target: string[], line: string): void {
  if (!target.includes(line)) {
    target.push(line);
  }
}

function pushAction(target: string[], line: string): void {
  if (!target.includes(line)) {
    target.push(line);
  }
}

function comparePriority(left: AiOpsBacklogItem, right: AiOpsBacklogItem): number {
  const order = { P0: 0, P1: 1, P2: 2 };
  return order[left.priority] - order[right.priority] || left.title.localeCompare(right.title);
}

function buildObservationItem(observation: PlaytestObservation, summary: AiOpsInsightsSummary): AiOpsBacklogItem {
  const theme = getPrimaryTheme(observation);
  const evidence = [
    `Playtest note ${toNoteFileLabel(observation.notePath)} · ${observation.section}`,
    observation.text
  ];
  const suggestedActions: string[] = [];
  let title = 'Playtest priority follow-up';
  let rationale = 'Playtest note에서 직접 관찰된 friction을 먼저 정리해야 합니다.';

  if (theme === 'resume') {
    title = 'Resume clarity pass for AI-guided surfaces';
    rationale = '재개 문구와 추천 surface가 실제 플레이어 이해를 놓치고 있습니다.';
    pushAction(suggestedActions, 'Resume Brief, Resume Route, AI Director CTA 카피를 같은 목표 문장으로 정렬합니다.');
    pushAction(suggestedActions, '재개 직후 첫 액션까지의 telemetry와 dismiss spike를 함께 비교합니다.');
    if (summary.aiRecommendation.dismissRate !== null) {
      pushEvidence(
        evidence,
        `AI dismiss rate ${Math.round(summary.aiRecommendation.dismissRate * 100)}% (${summary.aiRecommendation.dismissed}/${summary.aiRecommendation.shown})`
      );
    }
  } else if (theme === 'quest') {
    title = 'Quest board comprehension follow-up';
    rationale = '퀘스트 관련 UI 또는 문구가 목표 이해를 늦추고 있습니다.';
    pushAction(suggestedActions, 'Quest board headline, lane label, CTA hierarchy를 다시 점검합니다.');
    pushAction(suggestedActions, '수락 전후에 목표/보상/다음 위치가 한 화면에서 읽히는지 확인합니다.');
  } else if (theme === 'combat' || theme === 'fatigue') {
    title = 'Combat fatigue and pacing review';
    rationale = '전투 루프가 지루하거나 압박이 과하게 느껴질 가능성이 있습니다.';
    pushAction(suggestedActions, 'Encounter Director variety/recovery 전환 시점을 다시 점검합니다.');
    pushAction(suggestedActions, '최근 전투 길이와 route-scan 발생 구간을 함께 비교합니다.');
    if (summary.encounterDirector.varietyRouteScanCount > 0) {
      pushEvidence(
        evidence,
        `Variety route-scan pivots ${summary.encounterDirector.varietyRouteScanCount}`
      );
    }
  } else {
    pushAction(suggestedActions, '해당 note를 기반으로 관련 surface를 좁혀 추가 playtest를 진행합니다.');
  }

  return {
    id: `playtest-${theme}-${observation.severity.toLowerCase()}`,
    priority: observation.severity,
    theme,
    title,
    rationale,
    evidence,
    suggestedActions
  };
}

export function deriveAiOpsBacklog(summary: AiOpsInsightsSummary): AiOpsBacklogItem[] {
  const items = new Map<string, AiOpsBacklogItem>();

  const topObservation = summary.playtestNotes.prioritizedObservations[0] ?? null;
  if (topObservation) {
    const item = buildObservationItem(topObservation, summary);
    items.set(item.id, item);
  }

  if (
    summary.aiRecommendation.shown >= 2 &&
    summary.aiRecommendation.dismissRate !== null &&
    summary.aiRecommendation.dismissRate >= 0.45
  ) {
    items.set('recommendation-dismiss', {
      id: 'recommendation-dismiss',
      priority: summary.aiRecommendation.dismissRate >= 0.7 ? 'P0' : 'P1',
      theme: 'recommendation',
      title: 'Tune AI recommendation targeting and surface weight',
      rationale: '추천 카드가 현재 세션의 실제 목적과 어긋나거나 과하게 노출되고 있습니다.',
      evidence: [
        `AI dismiss rate ${Math.round(summary.aiRecommendation.dismissRate * 100)}% (${summary.aiRecommendation.dismissed}/${summary.aiRecommendation.shown})`
      ],
      suggestedActions: [
        'AI Director rationale와 CTA target이 현재 location/quest/achievement state와 일치하는지 검토합니다.',
        'dismiss가 몰린 surface의 card priority 또는 copy density를 낮춥니다.'
      ]
    });
  }

  if (summary.encounterDirector.varietyRouteScanCount >= 3) {
    items.set('encounter-route-scan', {
      id: 'encounter-route-scan',
      priority: 'P1',
      theme: 'combat',
      title: 'Inspect repeated route-scan pivots in frontier pacing',
      rationale: '반복 전투 완화는 동작하지만, 특정 전선에서 루프 피로가 누적되고 있을 수 있습니다.',
      evidence: [
        `Variety route-scan pivots ${summary.encounterDirector.varietyRouteScanCount}`,
        ...summary.encounterDirector.topLocations
          .slice(0, 2)
          .map(entry => `Encounter hotspot ${entry.id} (${entry.count})`)
      ],
      suggestedActions: [
        '반복 전투가 몰리는 전선의 이벤트 풀과 보상 간격을 다시 조정합니다.',
        'route-scan 이후 실제 진행 전환율을 다음 playtest에서 확인합니다.'
      ]
    });
  }

  if (summary.encounterDirector.recoveryCount >= 3 && summary.friction.playerDeaths > 0) {
    items.set('recovery-pressure', {
      id: 'recovery-pressure',
      priority: 'P1',
      theme: 'fatigue',
      title: 'Review recovery intervention timing before collapse states',
      rationale: '회복 개입이 들어가도 실제 death를 막지 못하는 구간이 있습니다.',
      evidence: [
        `Recovery decisions ${summary.encounterDirector.recoveryCount}`,
        `Player deaths ${summary.friction.playerDeaths}`
      ],
      suggestedActions: [
        'HP/MP 저하 임계치와 recovery event 선호도를 앞당길지 검토합니다.',
        'death 직전 세션의 자원 붕괴 로그를 따로 샘플링합니다.'
      ]
    });
  }

  if (
    summary.encounterDirector.endgameCount >= 4 &&
    summary.encounterDirector.endgamePressureCount / summary.encounterDirector.endgameCount >= 0.8
  ) {
    items.set('endgame-pressure', {
      id: 'endgame-pressure',
      priority: 'P1',
      theme: 'endgame',
      title: 'Validate endgame pressure pacing in corruption-space',
      rationale: '심연 도전이 의도보다 압박 일변도로 흐를 수 있습니다.',
      evidence: [
        `Endgame pressure decisions ${summary.encounterDirector.endgamePressureCount}/${summary.encounterDirector.endgameCount}`,
        ...summary.encounterDirector.topModifiers
          .slice(0, 2)
          .map(entry => `Modifier hotspot ${entry.id} (${entry.count})`)
      ],
      suggestedActions: [
        'modifier별 휴지 구간과 보상 템포를 비교합니다.',
        'tier/streak가 높은 샘플에서 recovery/variety 진입 조건을 재검토합니다.'
      ]
    });
  }

  return [...items.values()].sort(comparePriority);
}

export function buildAiOpsBacklogContent(input: BuildAiOpsBacklogInput): string {
  const grouped = {
    P0: input.items.filter(item => item.priority === 'P0'),
    P1: input.items.filter(item => item.priority === 'P1'),
    P2: input.items.filter(item => item.priority === 'P2')
  };

  const renderGroup = (priority: 'P0' | 'P1' | 'P2'): string[] => {
    const items = grouped[priority];
    if (items.length === 0) {
      return ['- none'];
    }

    return items.flatMap(item => [
      `- ${item.title}`,
      `  rationale: ${item.rationale}`,
      `  evidence: ${item.evidence.join(' | ')}`,
      `  actions: ${item.suggestedActions.join(' | ')}`
    ]);
  };

  return [
    '# AI Ops Backlog',
    '',
    `Generated at: ${input.generatedAtIso}`,
    `Telemetry file: ${input.telemetryPath}`,
    `Playtest notes: ${input.noteCount}`,
    `Draft items: ${input.items.length}`,
    '',
    '## P0',
    ...renderGroup('P0'),
    '',
    '## P1',
    ...renderGroup('P1'),
    '',
    '## P2',
    ...renderGroup('P2'),
    ''
  ].join('\n');
}
