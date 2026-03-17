import { spawnSync } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';

function writeJson(filePath: string, payload: unknown) {
  fs.writeFileSync(filePath, `${JSON.stringify(payload, null, 2)}\n`, 'utf-8');
}

describe('Release doctor', () => {
  it('should build a warning report when sign-off is pending', () => {
    const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), 'terminal-quest-release-doctor-'));

    try {
      const reportDir = path.join(rootDir, 'releases', 'smoke-reports');
      fs.mkdirSync(reportDir, { recursive: true });
      writeJson(path.join(rootDir, 'package.json'), { version: '1.0.2' });
      writeJson(path.join(reportDir, 'release-smoke-latest.json'), {
        generatedAt: '2026-03-16T08:24:25.714Z',
        versionTag: 'v1.0.2',
        packageName: 'terminal-quest',
        branch: 'main',
        commit: 'abc1234',
        opsDoctorGate: true,
        opsDoctor: {
          status: 'ok',
          summaryPresent: true,
          freshnessLabel: 'fresh · 0h',
          reasons: [],
          recommendedCommand: null
        },
        reportPath: 'releases/smoke-reports/release-smoke-2026-03-16.md',
        overallPass: true,
        steps: []
      });
      writeJson(path.join(reportDir, 'release-signoff-latest.json'), {
        updatedAt: '2026-03-16T08:30:00.000Z',
        versionTag: 'v1.0.2',
        branch: 'main',
        commit: 'abc1234',
        reportPath: 'releases/smoke-reports/release-smoke-2026-03-16.md',
        allApproved: false,
        signoffs: {
          qa: { approved: true, signedBy: 'qa', signedAt: '2026-03-16T08:30:00.000Z' },
          engineering: { approved: false, signedBy: null, signedAt: null },
          releaseManager: { approved: false, signedBy: null, signedAt: null }
        }
      });

      const result = spawnSync(
        process.execPath,
        [path.join(process.cwd(), 'scripts', 'release-doctor.js'), '--json', '--report-dir', path.join('releases', 'smoke-reports')],
        {
          cwd: rootDir,
          encoding: 'utf-8'
        }
      );

      expect(result.status).toBe(0);
      expect(JSON.parse(result.stdout)).toMatchObject({
        status: 'warn',
        smokeSummaryPresent: true,
        signoffSummaryPresent: true,
        recommendedCommand: 'npm run release:signoff --status',
        signoffSnapshot: {
          allApproved: false,
          pendingRoles: ['engineering', 'release-manager']
        }
      });
      expect(fs.existsSync(path.join(reportDir, 'release-doctor-latest.json'))).toBe(true);
      expect(fs.existsSync(path.join(reportDir, 'release-doctor-latest.md'))).toBe(true);
      expect(
        fs.readdirSync(reportDir).some(fileName => /^release-doctor-\d{8}-\d{6}\.json$/.test(fileName))
      ).toBe(true);
      expect(
        fs.readdirSync(reportDir).some(fileName => /^release-doctor-\d{8}-\d{6}\.md$/.test(fileName))
      ).toBe(true);
    } finally {
      fs.rmSync(rootDir, { recursive: true, force: true });
    }
  });

  it('should fail with strict mode when release smoke is broken on the current repo state', () => {
    const result = spawnSync(
      process.execPath,
      [path.join(process.cwd(), 'scripts', 'release-doctor.js'), '--fail-on-warn'],
      {
        cwd: process.cwd(),
        encoding: 'utf-8'
      }
    );

    expect(result.status).toBe(1);
    expect(result.stdout).toContain('[release-doctor] status: fail');
  });
});
