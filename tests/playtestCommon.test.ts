import fs from 'fs';
import os from 'os';
import path from 'path';
import { spawnSync } from 'child_process';
import { pathToFileURL } from 'url';

describe('Playtest common helpers', () => {
  it('should generate a frontend-focused session note template', () => {
    const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), 'terminal-quest-playtest-'));

    try {
      const scriptPath = pathToFileURL(
        path.join(process.cwd(), 'scripts', 'playtest-common.js')
      ).href;
      const script = `
        import fs from 'fs';
        import {
          createPlaytestSessionNote,
          ensurePlaytestWorkspace
        } from ${JSON.stringify(scriptPath)};

        const paths = ensurePlaytestWorkspace({
          rootDir: ${JSON.stringify(rootDir)},
          overwriteSettings: true
        });
        const notePath = createPlaytestSessionNote(
          paths,
          new Date('2026-03-10T10:00:00.000Z')
        );
        const content = fs.readFileSync(notePath, 'utf-8');

        process.stdout.write(JSON.stringify({
          notePath,
          notesDir: paths.notesDir,
          content
        }));
      `;
      const result = spawnSync(
        process.execPath,
        ['--input-type=module', '-e', script],
        {
          cwd: process.cwd(),
          encoding: 'utf-8'
        }
      );

      expect(result.status).toBe(0);
      const payload = JSON.parse(result.stdout.trim()) as {
        notePath: string;
        notesDir: string;
        content: string;
      };

      expect(payload.notePath.startsWith(payload.notesDir)).toBe(true);
      expect(payload.content).toContain('## Frontend Signals');
      expect(payload.content).toContain('One-screen layout stayed clear without page scrolling');
      expect(payload.content).toContain('## Resume & Preview');
      expect(payload.content).toContain('Did preview execution result match expectation?');
      expect(payload.content).toContain('## Session Scores');
      expect(payload.content).toContain('Stop / continue confidence (1-5):');
    } finally {
      fs.rmSync(rootDir, { recursive: true, force: true });
    }
  });

  it('should read markdown playtest notes from the active notes directory', () => {
    const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), 'terminal-quest-playtest-notes-'));

    try {
      const scriptPath = pathToFileURL(
        path.join(process.cwd(), 'scripts', 'playtest-common.js')
      ).href;
      const script = `
        import fs from 'fs';
        import path from 'path';
        import {
          ensurePlaytestWorkspace,
          readPlaytestNotes
        } from ${JSON.stringify(scriptPath)};

        const paths = ensurePlaytestWorkspace({
          rootDir: ${JSON.stringify(rootDir)},
          overwriteSettings: true
        });
        fs.writeFileSync(path.join(paths.notesDir, 'session-b.md'), '# B\\n', 'utf-8');
        fs.writeFileSync(path.join(paths.notesDir, 'session-a.md'), '# A\\n', 'utf-8');

        process.stdout.write(JSON.stringify(readPlaytestNotes(paths)));
      `;
      const result = spawnSync(
        process.execPath,
        ['--input-type=module', '-e', script],
        {
          cwd: process.cwd(),
          encoding: 'utf-8'
        }
      );

      expect(result.status).toBe(0);
      const notes = JSON.parse(result.stdout.trim()) as Array<{
        notePath: string;
        content: string;
      }>;

      expect(notes).toHaveLength(2);
      expect(notes[0]?.notePath.endsWith('session-a.md')).toBe(true);
      expect(notes[1]?.notePath.endsWith('session-b.md')).toBe(true);
      expect(notes[0]?.content).toBe('# A\n');
    } finally {
      fs.rmSync(rootDir, { recursive: true, force: true });
    }
  });

  it('should resolve telemetry and notes paths from a playtest report json file', () => {
    const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), 'terminal-quest-playtest-report-'));

    try {
      const scriptPath = pathToFileURL(
        path.join(process.cwd(), 'scripts', 'playtest-common.js')
      ).href;
      const script = `
        import fs from 'fs';
        import path from 'path';
        import {
          ensurePlaytestWorkspace,
          resolvePlaytestOpsInputs
        } from ${JSON.stringify(scriptPath)};

        const paths = ensurePlaytestWorkspace({
          rootDir: ${JSON.stringify(rootDir)},
          overwriteSettings: true
        });
        const reportPath = path.join(paths.baseDir, 'report.json');
        fs.writeFileSync(reportPath, JSON.stringify({
          paths: {
            notesDir: paths.notesDir,
            telemetryFilePath: paths.telemetryFilePath
          }
        }), 'utf-8');

        process.stdout.write(JSON.stringify(resolvePlaytestOpsInputs({
          rootDir: ${JSON.stringify(rootDir)},
          reportJsonPath: reportPath
        })));
      `;
      const result = spawnSync(
        process.execPath,
        ['--input-type=module', '-e', script],
        {
          cwd: process.cwd(),
          encoding: 'utf-8'
        }
      );

      expect(result.status).toBe(0);
      const payload = JSON.parse(result.stdout.trim()) as {
        telemetryPath: string;
        notesDir: string;
        reportJsonPath: string;
      };

      expect(payload.reportJsonPath.endsWith('report.json')).toBe(true);
      expect(payload.telemetryPath.endsWith(path.join('telemetry', 'events.ndjson'))).toBe(true);
      expect(payload.notesDir.endsWith(path.join('notes'))).toBe(true);
    } finally {
      fs.rmSync(rootDir, { recursive: true, force: true });
    }
  });
});
