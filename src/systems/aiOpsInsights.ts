export interface AiTelemetryEventRecord {
  eventType: string;
  timestamp?: number;
  isoTime?: string;
  context?: Record<string, unknown>;
  payload?: Record<string, unknown>;
}

export interface PlaytestNoteInput {
  notePath: string;
  content: string;
}

export interface PlaytestObservation {
  severity: 'P0' | 'P1' | 'P2';
  text: string;
  notePath: string;
  section: string;
  tags: string[];
  score: number;
}

export interface AiOpsInsightsSummary {
  totalEvents: number;
  sessionStarts: number;
  aiRecommendation: {
    shown: number;
    followed: number;
    dismissed: number;
    followRate: number | null;
    dismissRate: number | null;
  };
  encounterDirector: {
    total: number;
    modeCounts: Record<'steady' | 'recovery' | 'variety' | 'pressure', number>;
    averageEncounterChancePercent: number | null;
    recoveryCount: number;
    varietyRouteScanCount: number;
    endgameCount: number;
    endgamePressureCount: number;
    topLocations: Array<{ id: string; count: number }>;
    topModifiers: Array<{ id: string; count: number }>;
  };
  friction: {
    playerDeaths: number;
    endgameClears: number;
  };
  playtestNotes: {
    noteCount: number;
    prioritizedObservations: PlaytestObservation[];
  };
  findings: string[];
  recentSignals: Array<{
    isoTime: string;
    eventType: string;
    summary: string;
  }>;
}

export interface BuildAiOpsInsightsReportInput {
  generatedAtIso: string;
  telemetryPath: string;
  summary: AiOpsInsightsSummary;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === 'object' && value !== null
    ? value as Record<string, unknown>
    : null;
}

function asFiniteNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value)
    ? value
    : null;
}

function asString(value: unknown): string | null {
  return typeof value === 'string' && value.trim().length > 0
    ? value
    : null;
}

function formatPercent(value: number | null): string {
  return value === null ? 'n/a' : `${Math.round(value * 100)}%`;
}

function formatAveragePercent(value: number | null): string {
  return value === null ? 'n/a' : `${Math.round(value)}%`;
}

function inferObservationTags(text: string): string[] {
  const normalized = text.toLowerCase();
  const tags: string[] = [];

  if (
    normalized.includes('resume') ||
    normalized.includes('preview') ||
    normalized.includes('continue') ||
    normalized.includes('이어') ||
    normalized.includes('재개')
  ) {
    tags.push('resume');
  }
  if (
    normalized.includes('quest') ||
    normalized.includes('board') ||
    normalized.includes('의뢰') ||
    normalized.includes('퀘스트')
  ) {
    tags.push('quest');
  }
  if (
    normalized.includes('combat') ||
    normalized.includes('battle') ||
    normalized.includes('전투') ||
    normalized.includes('dungeon')
  ) {
    tags.push('combat');
  }
  if (
    normalized.includes('fatigue') ||
    normalized.includes('bored') ||
    normalized.includes('tired') ||
    normalized.includes('피곤') ||
    normalized.includes('지루')
  ) {
    tags.push('fatigue');
  }
  if (
    normalized.includes('confus') ||
    normalized.includes('hesitat') ||
    normalized.includes('unclear') ||
    normalized.includes('막') ||
    normalized.includes('헷갈') ||
    normalized.includes('혼란') ||
    normalized.includes('멈칫')
  ) {
    tags.push('clarity');
  }

  return tags;
}

function getObservationScore(severity: 'P0' | 'P1' | 'P2', tags: string[]): number {
  const base = severity === 'P0' ? 300 : severity === 'P1' ? 200 : 100;
  return base +
    (tags.includes('resume') ? 25 : 0) +
    (tags.includes('clarity') ? 20 : 0) +
    (tags.includes('fatigue') ? 15 : 0) +
    (tags.includes('combat') ? 10 : 0) +
    (tags.includes('quest') ? 10 : 0);
}

function toNoteFileLabel(notePath: string): string {
  const normalized = notePath.replace(/\\/g, '/');
  const parts = normalized.split('/');
  return parts[parts.length - 1] ?? notePath;
}

function summarizeRecentSignal(record: AiTelemetryEventRecord): string {
  const payload = asRecord(record.payload) ?? {};
  const context = asRecord(record.context) ?? {};

  if (record.eventType === 'encounter_director_decision') {
    const locationId = asString(context.locationId) ?? 'unknown-location';
    const mode = asString(payload.mode) ?? 'unknown-mode';
    const outcome = asString(payload.outcome) ?? 'unknown-outcome';
    const encounterChance = asFiniteNumber(payload.encounterChancePercent);
    const modifierId = asString(payload.challengeModifierId);
    return modifierId
      ? `${mode} @ ${locationId} -> ${outcome} (${formatAveragePercent(encounterChance)}, ${modifierId})`
      : `${mode} @ ${locationId} -> ${outcome} (${formatAveragePercent(encounterChance)})`;
  }

  if (
    record.eventType === 'ai_recommendation_followed' ||
    record.eventType === 'ai_recommendation_dismissed'
  ) {
    const intentId = asString(payload.intentId) ?? 'unknown-intent';
    const source = asString(payload.source) ?? 'unknown-source';
    return `${record.eventType} ${intentId} via ${source}`;
  }

  if (record.eventType === 'player_death') {
    return `death @ ${asString(context.locationId) ?? 'unknown-location'}`;
  }

  if (record.eventType === 'endgame_challenge_cleared') {
    return `endgame clear tier ${asFiniteNumber(payload.tier) ?? 0} streak ${asFiniteNumber(payload.streak) ?? 0}`;
  }

  return record.eventType;
}

function buildFindings(summary: AiOpsInsightsSummary): string[] {
  const findings: string[] = [];

  if (summary.encounterDirector.total === 0) {
    findings.push('Encounter Director telemetry가 아직 없습니다. telemetry opt-in 상태로 탐험 세션을 먼저 수집하세요.');
  }

  if (
    summary.aiRecommendation.shown >= 5 &&
    summary.aiRecommendation.followRate !== null &&
    summary.aiRecommendation.followRate < 0.35
  ) {
    findings.push('AI recommendation follow rate가 35% 미만입니다. 브리프 카피나 CTA 타깃 정밀도를 다시 확인해야 합니다.');
  }

  if (
    summary.aiRecommendation.shown >= 2 &&
    summary.aiRecommendation.dismissRate !== null &&
    summary.aiRecommendation.dismissRate >= 0.45
  ) {
    findings.push('AI recommendation dismiss 비중이 높습니다. 노출 빈도 또는 카드 우선순위가 과한지 검토가 필요합니다.');
  }

  if (summary.encounterDirector.varietyRouteScanCount >= 3) {
    findings.push('Route-scan pivot가 자주 발생합니다. 반복 전투 루프가 특정 전선에 몰리는지 확인하세요.');
  }

  if (summary.encounterDirector.recoveryCount >= 3 && summary.friction.playerDeaths > 0) {
    findings.push('Recovery intervention과 death가 함께 높습니다. 자원 붕괴 구간이 너무 늦게 감지되는지 볼 필요가 있습니다.');
  }

  if (
    summary.encounterDirector.endgameCount >= 4 &&
    summary.encounterDirector.endgamePressureCount / summary.encounterDirector.endgameCount >= 0.8
  ) {
    findings.push('Endgame encounter 대부분이 pressure 모드입니다. `corruption-space`의 긴장감은 유지하되 휴지 구간이 충분한지 플레이테스트로 확인하세요.');
  }

  const topObservation = summary.playtestNotes.prioritizedObservations[0] ?? null;
  if (topObservation) {
    findings.push(
      `Playtest top priority: [${topObservation.severity}] ${topObservation.text} (${toNoteFileLabel(topObservation.notePath)})`
    );
  }

  if (
    topObservation &&
    topObservation.tags.includes('resume') &&
    summary.aiRecommendation.dismissRate !== null &&
    summary.aiRecommendation.dismissRate >= 0.45
  ) {
    findings.push('Playtest note와 telemetry가 함께 resume/recommendation friction을 가리킵니다. resume brief와 recommendation surface를 같이 점검하세요.');
  }

  if (findings.length === 0) {
    findings.push('현재 telemetry 샘플에서는 긴급한 AI friction 신호가 보이지 않습니다.');
  }

  return findings;
}

function sortCounter(counter: Map<string, number>, limit: number): Array<{ id: string; count: number }> {
  return [...counter.entries()]
    .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))
    .slice(0, limit)
    .map(([id, count]) => ({ id, count }));
}

export function parseAiTelemetryEvents(content: string): AiTelemetryEventRecord[] {
  return content
    .split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0)
    .flatMap(line => {
      try {
        const parsed = JSON.parse(line) as unknown;
        const record = asRecord(parsed);
        if (!record) {
          return [];
        }

        return [{
          eventType: asString(record.eventType) ?? 'unknown',
          timestamp: asFiniteNumber(record.timestamp) ?? undefined,
          isoTime: asString(record.isoTime) ?? undefined,
          context: asRecord(record.context) ?? {},
          payload: asRecord(record.payload) ?? {}
        }];
      } catch {
        return [];
      }
    });
}

export function extractPlaytestObservations(notes: PlaytestNoteInput[]): PlaytestObservation[] {
  const observations: PlaytestObservation[] = [];

  for (const note of notes) {
    const lines = note.content.split('\n');
    let currentSection = 'General';

    for (const rawLine of lines) {
      const line = rawLine.trim();
      if (line.startsWith('## ')) {
        currentSection = line.slice(3).trim();
        continue;
      }

      const severityMatch = line.match(/^- (P[012]):\s*(.+)$/);
      if (severityMatch) {
        const text = severityMatch[2].trim();
        if (text.length === 0) {
          continue;
        }
        const tags = inferObservationTags(text);
        observations.push({
          severity: severityMatch[1] as 'P0' | 'P1' | 'P2',
          text,
          notePath: note.notePath,
          section: currentSection,
          tags,
          score: getObservationScore(severityMatch[1] as 'P0' | 'P1' | 'P2', tags)
        });
        continue;
      }

      const informativeSection =
        currentSection === 'Friction' ||
        currentSection === 'Exit Questions' ||
        currentSection === 'Timeline' ||
        currentSection === 'Resume & Preview';
      if (!informativeSection || !line.startsWith('- ')) {
        continue;
      }

      const separatorIndex = line.lastIndexOf(':');
      if (separatorIndex <= 2) {
        continue;
      }

      const text = line.slice(separatorIndex + 1).trim();
      if (text.length === 0) {
        continue;
      }

      const tags = inferObservationTags(text);
      const severity = currentSection === 'Friction' ? 'P1' : 'P2';
      observations.push({
        severity,
        text,
        notePath: note.notePath,
        section: currentSection,
        tags,
        score: getObservationScore(severity, tags)
      });
    }
  }

  return observations
    .sort((left, right) => right.score - left.score || left.text.localeCompare(right.text))
    .slice(0, 8);
}

export function summarizeAiOpsInsights(
  records: AiTelemetryEventRecord[],
  notes: PlaytestNoteInput[] = []
): AiOpsInsightsSummary {
  const shown = records.filter(record => record.eventType === 'ai_recommendation_shown').length;
  const followed = records.filter(record => record.eventType === 'ai_recommendation_followed').length;
  const dismissed = records.filter(record => record.eventType === 'ai_recommendation_dismissed').length;
  const encounterRecords = records.filter(record => record.eventType === 'encounter_director_decision');
  const modeCounts = {
    steady: 0,
    recovery: 0,
    variety: 0,
    pressure: 0
  };
  const locationCounter = new Map<string, number>();
  const modifierCounter = new Map<string, number>();
  let encounterChanceTotal = 0;
  let encounterChanceCount = 0;
  let varietyRouteScanCount = 0;
  let endgameCount = 0;
  let endgamePressureCount = 0;

  for (const record of encounterRecords) {
    const payload = asRecord(record.payload) ?? {};
    const context = asRecord(record.context) ?? {};
    const mode = asString(payload.mode);
    const locationId = asString(context.locationId);
    const encounterChance = asFiniteNumber(payload.encounterChancePercent);
    const preferredEventId = asString(payload.preferredEventId);
    const modifierId = asString(payload.challengeModifierId);
    const challengeActive = payload.challengeActive === true;

    if (mode === 'steady' || mode === 'recovery' || mode === 'variety' || mode === 'pressure') {
      modeCounts[mode] += 1;
    }
    if (locationId) {
      locationCounter.set(locationId, (locationCounter.get(locationId) ?? 0) + 1);
    }
    if (modifierId) {
      modifierCounter.set(modifierId, (modifierCounter.get(modifierId) ?? 0) + 1);
    }
    if (typeof encounterChance === 'number') {
      encounterChanceTotal += encounterChance;
      encounterChanceCount += 1;
    }
    if (mode === 'variety' && preferredEventId === 'route-scan') {
      varietyRouteScanCount += 1;
    }
    if (challengeActive) {
      endgameCount += 1;
      if (mode === 'pressure') {
        endgamePressureCount += 1;
      }
    }
  }

  const summary: AiOpsInsightsSummary = {
    totalEvents: records.length,
    sessionStarts: records.filter(record => record.eventType === 'session_start').length,
    aiRecommendation: {
      shown,
      followed,
      dismissed,
      followRate: shown > 0 ? followed / shown : null,
      dismissRate: shown > 0 ? dismissed / shown : null
    },
    encounterDirector: {
      total: encounterRecords.length,
      modeCounts,
      averageEncounterChancePercent: encounterChanceCount > 0
        ? encounterChanceTotal / encounterChanceCount
        : null,
      recoveryCount: modeCounts.recovery,
      varietyRouteScanCount,
      endgameCount,
      endgamePressureCount,
      topLocations: sortCounter(locationCounter, 3),
      topModifiers: sortCounter(modifierCounter, 3)
    },
    friction: {
      playerDeaths: records.filter(record => record.eventType === 'player_death').length,
      endgameClears: records.filter(record => record.eventType === 'endgame_challenge_cleared').length
    },
    playtestNotes: {
      noteCount: notes.length,
      prioritizedObservations: extractPlaytestObservations(notes)
    },
    findings: [],
    recentSignals: records
      .filter(record =>
        record.eventType === 'encounter_director_decision' ||
        record.eventType === 'ai_recommendation_followed' ||
        record.eventType === 'ai_recommendation_dismissed' ||
        record.eventType === 'player_death' ||
        record.eventType === 'endgame_challenge_cleared'
      )
      .slice(-8)
      .map(record => ({
        isoTime: record.isoTime ?? 'unknown-time',
        eventType: record.eventType,
        summary: summarizeRecentSignal(record)
      }))
  };

  summary.findings = buildFindings(summary);
  return summary;
}

export function buildAiOpsInsightsReport(
  input: BuildAiOpsInsightsReportInput
): string {
  const { generatedAtIso, telemetryPath, summary } = input;
  const topLocationLines = summary.encounterDirector.topLocations.length > 0
    ? summary.encounterDirector.topLocations.map(entry => `- ${entry.id}: ${entry.count}`).join('\n')
    : '- n/a';
  const topModifierLines = summary.encounterDirector.topModifiers.length > 0
    ? summary.encounterDirector.topModifiers.map(entry => `- ${entry.id}: ${entry.count}`).join('\n')
    : '- n/a';
  const recentSignalLines = summary.recentSignals.length > 0
    ? summary.recentSignals
      .map(signal => `- ${signal.isoTime} | ${signal.eventType} | ${signal.summary}`)
      .join('\n')
    : '- n/a';
  const playtestPriorityLines = summary.playtestNotes.prioritizedObservations.length > 0
    ? summary.playtestNotes.prioritizedObservations
      .map(observation =>
        `- [${observation.severity}] ${observation.text} ` +
        `(${toNoteFileLabel(observation.notePath)} · ${observation.section}${observation.tags.length > 0 ? ` · ${observation.tags.join(', ')}` : ''})`
      )
      .join('\n')
    : '- n/a';

  return [
    '# AI Ops Insights',
    '',
    `Generated at: ${generatedAtIso}`,
    `Telemetry file: ${telemetryPath}`,
    '',
    '## Snapshot',
    `- Total telemetry events: ${summary.totalEvents}`,
    `- Session starts: ${summary.sessionStarts}`,
    `- AI recommendation follow rate: ${formatPercent(summary.aiRecommendation.followRate)} ` +
      `(${summary.aiRecommendation.followed}/${summary.aiRecommendation.shown})`,
    `- AI recommendation dismiss rate: ${formatPercent(summary.aiRecommendation.dismissRate)} ` +
      `(${summary.aiRecommendation.dismissed}/${summary.aiRecommendation.shown})`,
    `- Encounter Director decisions: ${summary.encounterDirector.total}`,
    `- Encounter modes: steady=${summary.encounterDirector.modeCounts.steady}, ` +
      `recovery=${summary.encounterDirector.modeCounts.recovery}, ` +
      `variety=${summary.encounterDirector.modeCounts.variety}, ` +
      `pressure=${summary.encounterDirector.modeCounts.pressure}`,
    `- Average encounter chance: ${formatAveragePercent(summary.encounterDirector.averageEncounterChancePercent)}`,
    `- Variety route-scan pivots: ${summary.encounterDirector.varietyRouteScanCount}`,
    `- Endgame encounter decisions: ${summary.encounterDirector.endgameCount}`,
    `- Endgame pressure decisions: ${summary.encounterDirector.endgamePressureCount}`,
    `- Player deaths: ${summary.friction.playerDeaths}`,
    `- Endgame clears: ${summary.friction.endgameClears}`,
    `- Playtest notes read: ${summary.playtestNotes.noteCount}`,
    '',
    '## Hotspots',
    '- Top encounter locations:',
    topLocationLines,
    '- Top endgame modifiers:',
    topModifierLines,
    '',
    '## Findings',
    ...summary.findings.map(finding => `- ${finding}`),
    '',
    '## Playtest Priorities',
    playtestPriorityLines,
    '',
    '## Recent AI Signals',
    recentSignalLines,
    ''
  ].join('\n');
}
