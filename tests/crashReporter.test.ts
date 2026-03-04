import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { writeCrashReport } from '../src/runtime/crashReporter';

describe('Crash Reporter', () => {
  it('should write crash report file with event metadata', () => {
    const logsDir = mkdtempSync(join(tmpdir(), 'terminal-quest-crash-'));

    try {
      const reportPath = writeCrashReport(
        'runtimeError',
        { error: new Error('runtime crash') },
        {
          logsDir,
          occurredAt: new Date('2026-03-03T00:00:00.000Z')
        }
      );

      expect(reportPath).not.toBeNull();
      if (!reportPath) {
        throw new Error('reportPath should not be null');
      }

      const content = readFileSync(reportPath, 'utf-8');
      expect(content).toContain('eventType: runtimeError');
      expect(content).toContain('timestamp: 2026-03-03T00:00:00.000Z');
      expect(content).toContain('runtime crash');
    } finally {
      rmSync(logsDir, { recursive: true, force: true });
    }
  });

  it('should return null when logsDir points to an existing file', () => {
    const rootDir = mkdtempSync(join(tmpdir(), 'terminal-quest-crash-'));
    const notDirectoryPath = join(rootDir, 'occupied-path');
    writeFileSync(notDirectoryPath, 'occupied', 'utf-8');

    try {
      const reportPath = writeCrashReport('bootstrapError', { reason: 'failure' }, {
        logsDir: notDirectoryPath
      });
      expect(reportPath).toBeNull();
    } finally {
      rmSync(rootDir, { recursive: true, force: true });
    }
  });
});
