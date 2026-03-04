import fs from 'fs';
import path from 'path';
import { spawnSync } from 'child_process';

const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const REPORT_DIR = path.join(process.cwd(), 'releases', 'smoke-reports');
const LATEST_REPORT_PATH = path.join(REPORT_DIR, 'runtime-smoke-latest.json');

const scenarioGroups = [
  {
    id: 'new-game-and-encounter',
    label: 'new game + first encounter flow',
    tests: ['tests/newGameFlow.test.ts', 'tests/encounterFlow.test.ts'],
    covers: ['first_combat_encounter', 'boss_progression']
  },
  {
    id: 'save-and-load',
    label: 'save + reload flow',
    tests: ['tests/saveFlow.test.ts', 'tests/loadGame.e2e.test.ts'],
    covers: ['save_reload']
  },
  {
    id: 'quest-reward',
    label: 'quest completion reward flow',
    tests: ['tests/questSystem.test.ts'],
    covers: ['quest_reward']
  },
  {
    id: 'settings-behavior',
    label: 'settings toggle behavior',
    tests: [
      'tests/settingsRuntime.test.ts',
      'tests/continuePromptBehavior.test.ts',
      'tests/gameplayLoop.test.ts'
    ],
    covers: ['settings_behavior']
  },
  {
    id: 'critical-checkpoints',
    label: 'critical checkpoint acknowledgment',
    tests: [
      'tests/continuePromptBehavior.test.ts',
      'tests/deathFlow.test.ts',
      'tests/gameRuntime.test.ts'
    ],
    covers: ['critical_ack']
  }
];

const scenarioDefinitions = [
  {
    id: 'first_combat_encounter',
    label: 'Start new game and reach first combat encounter.'
  },
  {
    id: 'save_reload',
    label: 'Save in town and reload successfully.'
  },
  {
    id: 'quest_reward',
    label: 'Complete one quest and verify reward application.'
  },
  {
    id: 'boss_progression',
    label: 'Defeat one boss and verify progression unlock.'
  },
  {
    id: 'settings_behavior',
    label: 'Toggle progression tempo/auto pace/context hints and verify behavior changes.'
  },
  {
    id: 'critical_ack',
    label: 'Verify runtime error/death checkpoints require explicit Enter acknowledgment.'
  }
];

function ensureReportDir() {
  if (!fs.existsSync(REPORT_DIR)) {
    fs.mkdirSync(REPORT_DIR, { recursive: true });
  }
}

function runGroup(group) {
  const args = ['test', '--', '--runInBand', ...group.tests];
  console.log(`\n[runtime-smoke-check] ${group.label}`);
  console.log(`[runtime-smoke-check] $ ${npmCommand} ${args.join(' ')}`);

  const startedAt = Date.now();
  const result = spawnSync(npmCommand, args, { stdio: 'inherit' });
  const elapsedMs = Date.now() - startedAt;
  const status = result.status ?? 1;

  return {
    ...group,
    status,
    passed: status === 0,
    elapsedMs
  };
}

function buildScenarioResults(groupResults) {
  return scenarioDefinitions.map((scenario) => {
    const linkedGroups = groupResults.filter((group) =>
      group.covers.includes(scenario.id)
    );
    const passed =
      linkedGroups.length > 0 &&
      linkedGroups.every((group) => group.passed);

    return {
      ...scenario,
      passed,
      coveredBy: linkedGroups.map((group) => group.id)
    };
  });
}

function writeReports(payload) {
  ensureReportDir();

  fs.writeFileSync(
    LATEST_REPORT_PATH,
    `${JSON.stringify(payload, null, 2)}\n`,
    'utf-8'
  );

  const stampedPath = path.join(
    REPORT_DIR,
    `runtime-smoke-${payload.generatedAt.replace(/[:.]/g, '-')}.json`
  );
  fs.writeFileSync(
    stampedPath,
    `${JSON.stringify(payload, null, 2)}\n`,
    'utf-8'
  );

  return {
    latestPath: LATEST_REPORT_PATH,
    stampedPath
  };
}

function main() {
  const generatedAt = new Date().toISOString();
  const groupResults = [];

  for (const group of scenarioGroups) {
    const result = runGroup(group);
    groupResults.push(result);
  }

  const scenarios = buildScenarioResults(groupResults);
  const overallPass = groupResults.every((group) => group.passed);
  const payload = {
    generatedAt,
    overallPass,
    groups: groupResults,
    scenarios
  };
  const reportPaths = writeReports(payload);

  console.log(
    `\n[runtime-smoke-check] report written: ${path.relative(process.cwd(), reportPaths.latestPath)}`
  );
  console.log(
    `[runtime-smoke-check] snapshot written: ${path.relative(process.cwd(), reportPaths.stampedPath)}`
  );
  console.log(`[runtime-smoke-check] result: ${overallPass ? 'PASS' : 'FAIL'}`);

  if (!overallPass) {
    process.exitCode = 1;
    return;
  }

  console.log('\n[runtime-smoke-check] PASS: runtime smoke verification complete.');
}

main();
