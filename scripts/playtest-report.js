import {
  getPlaytestPaths,
  readPlaytestNotes,
  readPlaytestSaveSummaries,
  readPlaytestTelemetry
} from './playtest-common.js';
import path from 'path';
import { pathToFileURL } from 'url';

function buildTelemetryCounts(events) {
  const counts = {};
  for (const event of events) {
    counts[event.eventType] = (counts[event.eventType] ?? 0) + 1;
  }
  return counts;
}

function buildFallbackReport(paths, saves, events, notes, opsPreview, opsGuidanceAvailable) {
  return {
    generatedAtIso: new Date().toISOString(),
    paths: {
      baseDir: paths.baseDir,
      notesDir: paths.notesDir,
      telemetryFilePath: paths.telemetryFilePath
    },
    saves: {
      slotCount: saves.length,
      slots: saves
    },
    telemetry: {
      totalEvents: events.length,
      firstEvent: events[0] ?? null,
      lastEvent: events[events.length - 1] ?? null,
      counts: buildTelemetryCounts(events),
      recentEvents: events.slice(-8).map(event => ({
        eventType: event.eventType,
        isoTime: event.isoTime
      }))
    },
    notes: {
      totalNotes: notes.length,
      recentNotePaths: notes
        .slice(-3)
        .map(note => path.relative(paths.baseDir, note.notePath))
    },
    ops: {
      guidanceAvailable: opsGuidanceAvailable,
      doctor: opsPreview?.doctor ?? null,
      status: opsPreview?.status ?? null,
      nextCommand: opsPreview?.nextCommand ?? null,
      latestCycle: opsPreview?.latestCycle ?? null,
      latestCycleFollowUp: opsPreview?.latestCycleFollowUp ?? null
    }
  };
}

function formatFallbackReportLines(report) {
  const lines = [
    '[playtest-report] Active playtest workspace',
    `[playtest-report] base: ${report.paths.baseDir}`,
    `[playtest-report] notes: ${report.paths.notesDir}`,
    '',
    '[playtest-report] Save slots'
  ];

  if (report.saves.slots.length === 0) {
    lines.push('- no playtest saves yet');
  } else {
    for (const save of report.saves.slots) {
      if (save.corrupted) {
        lines.push(`- slot ${save.slot}: corrupted`);
        continue;
      }

      const savedAt = typeof save.savedAt === 'number' && Number.isFinite(save.savedAt)
        ? new Date(save.savedAt).toISOString()
        : 'unknown';
      lines.push(
        `- slot ${save.slot}: ${save.playerName} Lv${save.playerLevel} @ ${save.locationName} ` +
        `(${save.saveType}, ${savedAt})`
      );
    }
  }

  lines.push('', '[playtest-report] Telemetry');
  if (report.telemetry.totalEvents === 0) {
    lines.push('- no telemetry events captured yet');
  } else {
    lines.push(`- total events: ${report.telemetry.totalEvents}`);
    lines.push(
      `- first event: ${report.telemetry.firstEvent?.eventType ?? 'unknown'} @ ${report.telemetry.firstEvent?.isoTime ?? 'unknown'}`
    );
    lines.push(
      `- last event: ${report.telemetry.lastEvent?.eventType ?? 'unknown'} @ ${report.telemetry.lastEvent?.isoTime ?? 'unknown'}`
    );

    for (const eventType of [
      'session_start',
      'session_end',
      'quest_accepted',
      'quest_completed',
      'boss_defeated',
      'player_death',
      'save_created'
    ]) {
      lines.push(`- ${eventType}: ${report.telemetry.counts[eventType] ?? 0}`);
    }

    lines.push('- recent events:');
    for (const event of report.telemetry.recentEvents) {
      lines.push(`  • ${event.isoTime} | ${event.eventType}`);
    }
  }

  lines.push('', '[playtest-report] Notes');
  if (report.notes.totalNotes === 0) {
    lines.push('- no playtest notes yet');
  } else {
    lines.push(`- note files: ${report.notes.totalNotes}`);
    for (const notePath of report.notes.recentNotePaths) {
      lines.push(`- ${notePath}`);
    }
  }

  lines.push('', '[playtest-report] Ops doctor');
  if (!report.ops.guidanceAvailable && !report.ops.doctor) {
    lines.push('- unavailable (run `npm run build` first to enable shared ops guidance)');
  } else if (report.ops.doctor) {
    lines.push(
      `- status: ${report.ops.doctor.status}`,
      `- summary present: ${report.ops.doctor.summaryPresent ? 'yes' : 'no'}`,
      `- freshness: ${report.ops.doctor.freshnessLabel}`,
      `- ops status: ${report.ops.doctor.opsStatus ? `[${report.ops.doctor.opsStatus.tone}] ${report.ops.doctor.opsStatus.label}` : 'n/a'}`
    );
    for (const reason of report.ops.doctor.reasons) {
      lines.push(`- reason: ${reason}`);
    }
    lines.push(`- recommended command: ${report.ops.doctor.recommendedCommand ?? 'n/a'}`);
  } else {
    lines.push('- no doctor verdict yet');
  }

  lines.push('', '[playtest-report] Ops next command');
  if (!report.ops.guidanceAvailable && !report.ops.nextCommand) {
    lines.push('- unavailable (run `npm run build` first to enable shared ops guidance)');
  } else if (report.ops.nextCommand) {
    lines.push(
      `- [${report.ops.nextCommand.tone}] ${report.ops.nextCommand.label}: ${report.ops.nextCommand.command}`,
      `- reason: ${report.ops.nextCommand.reason}`
    );
  } else {
    lines.push('- no actionable command yet');
  }

  return lines;
}

async function readOpsPreview(paths) {
  const previewModulePath = pathToFileURL(
    path.join(process.cwd(), 'dist', 'systems', 'aiOpsPreview.js')
  ).href;

  const previousTelemetryDir = process.env.TERMINAL_QUEST_TELEMETRY_DIR;
  const previousNotesDir = process.env.TERMINAL_QUEST_PLAYTEST_NOTES_DIR;

  try {
    process.env.TERMINAL_QUEST_TELEMETRY_DIR = paths.telemetryDir;
    process.env.TERMINAL_QUEST_PLAYTEST_NOTES_DIR = paths.notesDir;
    const module = await import(previewModulePath);
    return {
      guidanceAvailable: true,
      preview: module.buildAiOpsPreview?.() ?? null
    };
  } catch {
    return {
      guidanceAvailable: false,
      preview: null
    };
  } finally {
    if (previousTelemetryDir === undefined) {
      delete process.env.TERMINAL_QUEST_TELEMETRY_DIR;
    } else {
      process.env.TERMINAL_QUEST_TELEMETRY_DIR = previousTelemetryDir;
    }

    if (previousNotesDir === undefined) {
      delete process.env.TERMINAL_QUEST_PLAYTEST_NOTES_DIR;
    } else {
      process.env.TERMINAL_QUEST_PLAYTEST_NOTES_DIR = previousNotesDir;
    }
  }
}

async function loadPlaytestReportModule() {
  try {
    const modulePath = pathToFileURL(
      path.join(process.cwd(), 'dist', 'systems', 'playtestReport.js')
    ).href;
    return await import(modulePath);
  } catch {
    return null;
  }
}

async function buildReport(paths) {
  const [reportModule, opsResult] = await Promise.all([
    loadPlaytestReportModule(),
    readOpsPreview(paths)
  ]);
  const saves = readPlaytestSaveSummaries(paths);
  const events = readPlaytestTelemetry(paths);
  const notes = readPlaytestNotes(paths);

  const report = reportModule?.buildPlaytestReportSummary
    ? reportModule.buildPlaytestReportSummary({
      paths: {
        baseDir: paths.baseDir,
        notesDir: paths.notesDir,
        telemetryFilePath: paths.telemetryFilePath
      },
      saves,
      telemetryEvents: events.map(event => ({
        eventType: event.eventType,
        isoTime: event.isoTime
      })),
      notes,
      opsPreview: opsResult.preview,
      opsGuidanceAvailable: opsResult.guidanceAvailable
    })
    : buildFallbackReport(
      paths,
      saves,
      events,
      notes,
      opsResult.preview,
      opsResult.guidanceAvailable
    );

  return {
    report,
    formatLines: reportModule?.formatPlaytestReportLines ?? formatFallbackReportLines
  };
}

async function main() {
  const outputJson = process.argv.slice(2).includes('--json');
  const paths = getPlaytestPaths(process.cwd());
  const { report, formatLines } = await buildReport(paths);

  if (outputJson) {
    console.log(JSON.stringify(report, null, 2));
    return;
  }

  for (const line of formatLines(report)) {
    console.log(line);
  }
}

await main();
