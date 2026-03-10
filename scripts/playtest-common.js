import fs from 'fs';
import path from 'path';

export const PLAYTEST_PROFILE_SETTINGS = {
  textSpeed: 'normal',
  colorMode: 'full',
  continuePromptMode: 'streamlined',
  continueAutoPace: 'balanced',
  showKeyHints: true,
  showContextHints: true,
  telemetryOptIn: true
};

export function getPlaytestPaths(rootDir = process.cwd()) {
  const baseDir = path.join(rootDir, 'playtest-data', 'active');
  return {
    baseDir,
    savesDir: path.join(baseDir, 'saves'),
    settingsDir: path.join(baseDir, 'settings'),
    telemetryDir: path.join(baseDir, 'telemetry'),
    logsDir: path.join(baseDir, 'logs'),
    notesDir: path.join(baseDir, 'notes'),
    runtimeSettingsPath: path.join(baseDir, 'settings', 'runtime-settings.json'),
    telemetryFilePath: path.join(baseDir, 'telemetry', 'events.ndjson')
  };
}

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function buildSessionNoteContent(notePath, createdAt = new Date()) {
  return [
    '# Terminal Quest Playtest Session',
    '',
    `- Created: ${createdAt.toISOString()}`,
    `- Note file: ${notePath}`,
    '- Tester:',
    '- Build:',
    '- Session goal:',
    '',
    '## Milestones',
    '- [ ] First goal understood within 10 minutes',
    '- [ ] First quest accepted without assistance',
    '- [ ] First dungeon entered without confusion',
    '- [ ] First reward turn-in felt clear',
    '- [ ] Wanted to continue after the first hour',
    '',
    '## Frontend Signals',
    '- [ ] One-screen layout stayed clear without page scrolling',
    '- [ ] Next Move and Session Plan made the next action obvious',
    '- [ ] Priority Intel and Reward Horizon felt useful',
    '- [ ] Save / Continue flow felt obvious on the frontend',
    '',
    '## Resume & Preview',
    '- Could the player explain current / next / stop without help?',
    '- Did Preview Command feel different from normal execute?',
    '- Did preview execution result match expectation?',
    '- If blocked, did the recovery CTA explain what to do next?',
    '',
    '## Timeline',
    '- 00:00 First click:',
    '- 10:00 Goal comprehension:',
    '- 20:00 First friction spike:',
    '- 45:00 Strongest hook:',
    '- Session end reason:',
    '',
    '## Friction',
    '- Where did the player hesitate?',
    '- Where did the player look fatigued or bored?',
    '- Which text did the player skip or rush?',
    '',
    '## Highlights',
    '- Best moment:',
    '- Most memorable quest/event:',
    '- Most confusing menu or loop:',
    '',
    '## Session Scores',
    '- Onboarding clarity (1-5):',
    '- Navigation clarity (1-5):',
    '- Resume / preview clarity (1-5):',
    '- Combat readability (1-5):',
    '- Stop / continue confidence (1-5):',
    '',
    '## Follow-ups',
    '- P0:',
    '- P1:',
    '- P2:',
    ''
  ].join('\n');
}

export function ensurePlaytestWorkspace(
  options = {}
) {
  const {
    rootDir = process.cwd(),
    reset = false,
    overwriteSettings = false
  } = options;
  const paths = getPlaytestPaths(rootDir);

  if (reset) {
    fs.rmSync(paths.baseDir, { recursive: true, force: true });
  }

  ensureDir(paths.baseDir);
  ensureDir(paths.savesDir);
  ensureDir(paths.settingsDir);
  ensureDir(paths.telemetryDir);
  ensureDir(paths.logsDir);
  ensureDir(paths.notesDir);

  if (overwriteSettings || !fs.existsSync(paths.runtimeSettingsPath)) {
    fs.writeFileSync(
      paths.runtimeSettingsPath,
      `${JSON.stringify(PLAYTEST_PROFILE_SETTINGS, null, 2)}\n`,
      'utf-8'
    );
  }

  return paths;
}

function formatTimestampForFile(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');
  return `${year}${month}${day}-${hours}${minutes}${seconds}`;
}

export function createPlaytestSessionNote(
  paths,
  createdAt = new Date()
) {
  const notePath = path.join(
    paths.notesDir,
    `session-${formatTimestampForFile(createdAt)}.md`
  );

  if (!fs.existsSync(notePath)) {
    fs.writeFileSync(
      notePath,
      buildSessionNoteContent(notePath, createdAt),
      'utf-8'
    );
  }

  return notePath;
}

export function buildPlaytestEnvironment(paths, baseEnv = process.env) {
  return {
    ...baseEnv,
    TERMINAL_QUEST_SAVE_DIR: paths.savesDir,
    TERMINAL_QUEST_SETTINGS_DIR: paths.settingsDir,
    TERMINAL_QUEST_TELEMETRY_DIR: paths.telemetryDir,
    TERMINAL_QUEST_LOGS_DIR: paths.logsDir
  };
}

export function readPlaytestTelemetry(paths) {
  if (!fs.existsSync(paths.telemetryFilePath)) {
    return [];
  }

  return fs.readFileSync(paths.telemetryFilePath, 'utf-8')
    .split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0)
    .map(line => JSON.parse(line));
}

export function readPlaytestSaveSummaries(paths) {
  const summaries = [];

  for (let slot = 1; slot <= 3; slot += 1) {
    const filePath = path.join(paths.savesDir, `slot${slot}.json`);
    if (!fs.existsSync(filePath)) {
      continue;
    }

    try {
      const raw = fs.readFileSync(filePath, 'utf-8');
      const parsed = JSON.parse(raw);
      summaries.push({
        slot,
        playerName: parsed.playerName,
        playerLevel: parsed.playerLevel,
        locationName: parsed.locationName,
        savedAt: parsed.savedAt,
        saveType: parsed.saveType
      });
    } catch {
      summaries.push({
        slot,
        corrupted: true
      });
    }
  }

  return summaries;
}
