import path from 'path';

export interface PlaytestReportNextCommand {
  label: string;
  command: string;
  reason: string;
  tone: 'recommended' | 'warning' | 'success';
}

export interface PlaytestReportOpsPreview {
  nextCommand?: PlaytestReportNextCommand | null;
  doctor?: {
    status: 'ok' | 'warn' | 'fail';
    summaryPresent: boolean;
    freshnessLabel: string;
    reasons: string[];
    recommendedCommand: string | null;
    opsStatus: {
      id: string;
      label: string;
      tone: 'recommended' | 'warning' | 'success';
      actionRequired: boolean;
      summary: string;
    } | null;
  } | null;
  status?: {
    id: string;
    label: string;
    tone: 'recommended' | 'warning' | 'success';
    actionRequired: boolean;
    summary: string;
  } | null;
  latestCycle?: {
    generatedAtIso: string;
    mode: 'dry-run' | 'artifact' | 'apply-linear';
    overallPass: boolean;
    stepsPassed: number;
    stepsTotal: number;
    stale: boolean;
    ageHours: number | null;
    failedSteps: Array<{
      label: string;
      status: number;
      outputFileName: string;
    }>;
    reportJsonPath: string;
    bundleDir: string | null;
    nextCommand: string | null;
  } | null;
  latestCycleFollowUp?: PlaytestReportNextCommand | null;
}

export interface PlaytestReportSaveSlotSummary {
  slot: number;
  playerName?: string;
  playerLevel?: number;
  locationName?: string;
  savedAt?: number;
  saveType?: string;
  corrupted?: boolean;
}

export interface PlaytestReportTelemetryEventSummary {
  eventType: string;
  isoTime: string;
}

export interface PlaytestReportNoteSummary {
  notePath: string;
}

export interface PlaytestReportSummary {
  generatedAtIso: string;
  paths: {
    baseDir: string;
    notesDir: string;
    telemetryFilePath?: string;
  };
  saves: {
    slotCount: number;
    slots: PlaytestReportSaveSlotSummary[];
  };
  telemetry: {
    totalEvents: number;
    firstEvent: PlaytestReportTelemetryEventSummary | null;
    lastEvent: PlaytestReportTelemetryEventSummary | null;
    counts: Record<string, number>;
    recentEvents: PlaytestReportTelemetryEventSummary[];
  };
  notes: {
    totalNotes: number;
    recentNotePaths: string[];
  };
  ops: {
    guidanceAvailable: boolean;
    doctor: PlaytestReportOpsPreview['doctor'];
    status: PlaytestReportOpsPreview['status'];
    nextCommand: PlaytestReportNextCommand | null;
    latestCycle: PlaytestReportOpsPreview['latestCycle'];
    latestCycleFollowUp: PlaytestReportNextCommand | null;
  };
}

export interface BuildPlaytestReportSummaryInput {
  generatedAt?: Date;
  paths: {
    baseDir: string;
    notesDir: string;
    telemetryFilePath?: string;
  };
  saves: PlaytestReportSaveSlotSummary[];
  telemetryEvents: PlaytestReportTelemetryEventSummary[];
  notes: PlaytestReportNoteSummary[];
  opsPreview?: PlaytestReportOpsPreview | null;
  opsGuidanceAvailable?: boolean;
}

function getToneLabel(tone: PlaytestReportNextCommand['tone']): string {
  if (tone === 'warning') {
    return 'warning';
  }
  if (tone === 'success') {
    return 'success';
  }
  return 'recommended';
}

export function formatPlaytestOpsNextCommandLines(
  preview: PlaytestReportOpsPreview | null
): string[] {
  if (!preview?.nextCommand) {
    return ['- no actionable command yet'];
  }

  return [
    `- [${getToneLabel(preview.nextCommand.tone)}] ${preview.nextCommand.label}: ${preview.nextCommand.command}`,
    `- reason: ${preview.nextCommand.reason}`
  ];
}

function formatTimestamp(timestamp?: number): string {
  if (typeof timestamp !== 'number' || !Number.isFinite(timestamp)) {
    return 'unknown';
  }
  return new Date(timestamp).toISOString();
}

function buildTelemetryCounts(
  telemetryEvents: PlaytestReportTelemetryEventSummary[]
): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const event of telemetryEvents) {
    counts[event.eventType] = (counts[event.eventType] ?? 0) + 1;
  }
  return counts;
}

function toRelativeNotePath(baseDir: string, notePath: string): string {
  const relativePath = path.relative(baseDir, notePath);
  return relativePath.length > 0 ? relativePath : notePath;
}

export function buildPlaytestReportSummary(
  input: BuildPlaytestReportSummaryInput
): PlaytestReportSummary {
  return {
    generatedAtIso: (input.generatedAt ?? new Date()).toISOString(),
    paths: {
      baseDir: input.paths.baseDir,
      notesDir: input.paths.notesDir,
      telemetryFilePath: input.paths.telemetryFilePath
    },
    saves: {
      slotCount: input.saves.length,
      slots: input.saves
    },
    telemetry: {
      totalEvents: input.telemetryEvents.length,
      firstEvent: input.telemetryEvents[0] ?? null,
      lastEvent: input.telemetryEvents[input.telemetryEvents.length - 1] ?? null,
      counts: buildTelemetryCounts(input.telemetryEvents),
      recentEvents: input.telemetryEvents.slice(-8)
    },
    notes: {
      totalNotes: input.notes.length,
      recentNotePaths: input.notes
        .slice(-3)
        .map(note => toRelativeNotePath(input.paths.baseDir, note.notePath))
    },
    ops: {
      guidanceAvailable: input.opsGuidanceAvailable ?? false,
      doctor: input.opsPreview?.doctor ?? null,
      status: input.opsPreview?.status ?? null,
      nextCommand: input.opsPreview?.nextCommand ?? null,
      latestCycle: input.opsPreview?.latestCycle ?? null,
      latestCycleFollowUp: input.opsPreview?.latestCycleFollowUp ?? null
    }
  };
}

export function formatPlaytestReportLines(summary: PlaytestReportSummary): string[] {
  const lines = [
    '[playtest-report] Active playtest workspace',
    `[playtest-report] base: ${summary.paths.baseDir}`,
    `[playtest-report] notes: ${summary.paths.notesDir}`,
    '',
    '[playtest-report] Save slots'
  ];

  if (summary.saves.slots.length === 0) {
    lines.push('- no playtest saves yet');
  } else {
    for (const save of summary.saves.slots) {
      if (save.corrupted) {
        lines.push(`- slot ${save.slot}: corrupted`);
        continue;
      }

      lines.push(
        `- slot ${save.slot}: ${save.playerName} Lv${save.playerLevel} @ ${save.locationName} ` +
        `(${save.saveType}, ${formatTimestamp(save.savedAt)})`
      );
    }
  }

  lines.push('', '[playtest-report] Telemetry');
  if (summary.telemetry.totalEvents === 0) {
    lines.push('- no telemetry events captured yet');
  } else {
    lines.push(`- total events: ${summary.telemetry.totalEvents}`);
    lines.push(
      `- first event: ${summary.telemetry.firstEvent?.eventType ?? 'unknown'} @ ${summary.telemetry.firstEvent?.isoTime ?? 'unknown'}`
    );
    lines.push(
      `- last event: ${summary.telemetry.lastEvent?.eventType ?? 'unknown'} @ ${summary.telemetry.lastEvent?.isoTime ?? 'unknown'}`
    );

    const importantOrder = [
      'session_start',
      'session_end',
      'quest_accepted',
      'quest_completed',
      'boss_defeated',
      'player_death',
      'save_created'
    ];

    for (const eventType of importantOrder) {
      lines.push(`- ${eventType}: ${summary.telemetry.counts[eventType] ?? 0}`);
    }

    lines.push('- recent events:');
    for (const event of summary.telemetry.recentEvents) {
      lines.push(`  • ${event.isoTime} | ${event.eventType}`);
    }
  }

  lines.push('', '[playtest-report] Notes');
  if (summary.notes.totalNotes === 0) {
    lines.push('- no playtest notes yet');
  } else {
    lines.push(`- note files: ${summary.notes.totalNotes}`);
    for (const notePath of summary.notes.recentNotePaths) {
      lines.push(`- ${notePath}`);
    }
  }

  lines.push('', '[playtest-report] Ops doctor');
  if (!summary.ops.guidanceAvailable && !summary.ops.doctor) {
    lines.push('- unavailable (run `npm run build` first to enable shared ops guidance)');
  } else if (summary.ops.doctor) {
    lines.push(
      `- status: ${summary.ops.doctor.status}`,
      `- summary present: ${summary.ops.doctor.summaryPresent ? 'yes' : 'no'}`,
      `- freshness: ${summary.ops.doctor.freshnessLabel}`,
      `- ops status: ${summary.ops.doctor.opsStatus ? `[${getToneLabel(summary.ops.doctor.opsStatus.tone)}] ${summary.ops.doctor.opsStatus.label}` : 'n/a'}`
    );
    for (const reason of summary.ops.doctor.reasons) {
      lines.push(`- reason: ${reason}`);
    }
    lines.push(`- recommended command: ${summary.ops.doctor.recommendedCommand ?? 'n/a'}`);
  } else {
    lines.push('- no doctor verdict yet');
  }

  lines.push('', '[playtest-report] Ops status');
  if (!summary.ops.guidanceAvailable && !summary.ops.status) {
    lines.push('- unavailable (run `npm run build` first to enable shared ops guidance)');
  } else if (summary.ops.status) {
    lines.push(
      `- [${getToneLabel(summary.ops.status.tone)}] ${summary.ops.status.label}`,
      `- action required: ${summary.ops.status.actionRequired ? 'yes' : 'no'}`,
      `- summary: ${summary.ops.status.summary}`
    );
  } else {
    lines.push('- no status yet');
  }

  lines.push('', '[playtest-report] Ops next command');
  if (!summary.ops.guidanceAvailable && !summary.ops.nextCommand) {
    lines.push('- unavailable (run `npm run build` first to enable shared ops guidance)');
  } else {
    lines.push(
      ...formatPlaytestOpsNextCommandLines({
        nextCommand: summary.ops.nextCommand
      })
    );
  }

  lines.push('', '[playtest-report] Latest AI ops cycle');
  if (!summary.ops.latestCycle) {
    lines.push('- no persisted cycle summary yet');
  } else {
    lines.push(
      `- overall: ${summary.ops.latestCycle.overallPass ? 'PASS' : 'FAIL'} (${summary.ops.latestCycle.mode})`,
      `- freshness: ${summary.ops.latestCycle.stale ? 'stale' : 'fresh'} · ${typeof summary.ops.latestCycle.ageHours === 'number' ? `${summary.ops.latestCycle.ageHours}h` : 'age unknown'}`,
      `- steps: ${summary.ops.latestCycle.stepsPassed}/${summary.ops.latestCycle.stepsTotal} passed`,
      `- failed steps: ${summary.ops.latestCycle.failedSteps.length > 0 ? summary.ops.latestCycle.failedSteps.map(step => `${step.label} (status=${step.status})`).join(', ') : 'none'}`,
      `- report: ${summary.ops.latestCycle.reportJsonPath}`,
      `- next command snapshot: ${summary.ops.latestCycle.nextCommand ?? 'n/a'}`
    );

    if (summary.ops.latestCycleFollowUp) {
      lines.push(
        `- follow-up: [${getToneLabel(summary.ops.latestCycleFollowUp.tone)}] ${summary.ops.latestCycleFollowUp.label}: ${summary.ops.latestCycleFollowUp.command}`,
        `- follow-up reason: ${summary.ops.latestCycleFollowUp.reason}`
      );
    }
  }

  return lines;
}
