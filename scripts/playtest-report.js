import {
  getPlaytestPaths,
  readPlaytestSaveSummaries,
  readPlaytestTelemetry
} from './playtest-common.js';

function formatTimestamp(timestamp) {
  if (typeof timestamp !== 'number' || !Number.isFinite(timestamp)) {
    return 'unknown';
  }
  return new Date(timestamp).toISOString();
}

function printSaveSummary(paths) {
  const saves = readPlaytestSaveSummaries(paths);
  console.log('\n[playtest-report] Save slots');

  if (saves.length === 0) {
    console.log('- no playtest saves yet');
    return;
  }

  for (const save of saves) {
    if (save.corrupted) {
      console.log(`- slot ${save.slot}: corrupted`);
      continue;
    }

    console.log(
      `- slot ${save.slot}: ${save.playerName} Lv${save.playerLevel} @ ${save.locationName} ` +
      `(${save.saveType}, ${formatTimestamp(save.savedAt)})`
    );
  }
}

function printTelemetrySummary(paths) {
  const events = readPlaytestTelemetry(paths);
  console.log('\n[playtest-report] Telemetry');

  if (events.length === 0) {
    console.log('- no telemetry events captured yet');
    return;
  }

  const counts = new Map();
  for (const event of events) {
    counts.set(event.eventType, (counts.get(event.eventType) ?? 0) + 1);
  }

  console.log(`- total events: ${events.length}`);
  console.log(`- first event: ${events[0].eventType} @ ${events[0].isoTime}`);
  console.log(`- last event: ${events[events.length - 1].eventType} @ ${events[events.length - 1].isoTime}`);

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
    console.log(`- ${eventType}: ${counts.get(eventType) ?? 0}`);
  }

  console.log('- recent events:');
  for (const event of events.slice(-8)) {
    console.log(`  • ${event.isoTime} | ${event.eventType}`);
  }
}

function main() {
  const paths = getPlaytestPaths(process.cwd());
  console.log('[playtest-report] Active playtest workspace');
  console.log(`[playtest-report] base: ${paths.baseDir}`);
  console.log(`[playtest-report] notes: ${paths.notesDir}`);

  printSaveSummary(paths);
  printTelemetrySummary(paths);
}

main();
