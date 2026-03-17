import fs from 'fs';
import os from 'os';
import path from 'path';
import { spawnSync } from 'child_process';

function writeJson(filePath: string, payload: unknown) {
  fs.writeFileSync(filePath, `${JSON.stringify(payload, null, 2)}\n`, 'utf-8');
}

function runNodeModule(source: string, cwd: string) {
  const result = spawnSync(process.execPath, ['--input-type=module', '-e', source], {
    cwd,
    encoding: 'utf-8'
  });

  if (result.status !== 0) {
    throw new Error(result.stderr || result.stdout || `node exited with ${result.status}`);
  }

  return (result.stdout ?? '').trim();
}

describe('Release status latest helpers', () => {
  it('should build a ready snapshot from persisted release artifacts', () => {
    const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), 'terminal-quest-release-status-'));

    try {
      const reportDir = path.join(rootDir, 'releases', 'smoke-reports');
      fs.mkdirSync(reportDir, { recursive: true });
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
      writeJson(path.join(reportDir, 'release-doctor-latest.json'), {
        status: 'ok',
        smokeSummaryPresent: true,
        signoffSummaryPresent: true,
        currentVersionTag: 'v1.0.2',
        currentBranch: 'main',
        currentCommit: 'abc1234',
        smokeSnapshot: {
          overallPass: true,
          versionTag: 'v1.0.2',
          branch: 'main',
          commit: 'abc1234',
          opsDoctorGate: true,
          opsDoctor: null,
          failedSteps: []
        },
        signoffSnapshot: {
          versionTag: 'v1.0.2',
          branch: 'main',
          commit: 'abc1234',
          allApproved: true,
          pendingRoles: []
        },
        reasons: ['ready'],
        recommendedCommand: null
      });
      writeJson(path.join(reportDir, 'release-signoff-latest.json'), {
        updatedAt: '2026-03-16T08:30:00.000Z',
        versionTag: 'v1.0.2',
        branch: 'main',
        commit: 'abc1234',
        reportPath: 'releases/smoke-reports/release-smoke-2026-03-16.md',
        allApproved: true,
        signoffs: {
          qa: { approved: true, signedBy: 'qa', signedAt: '2026-03-16T08:30:00.000Z' },
          engineering: { approved: true, signedBy: 'eng', signedAt: '2026-03-16T08:31:00.000Z' },
          releaseManager: { approved: true, signedBy: 'rm', signedAt: '2026-03-16T08:32:00.000Z' }
        }
      });

      const stdout = runNodeModule(
        `
          import { readReleaseStatusSnapshot, formatReleaseStatusLines } from './scripts/release-status-common.js';
          const snapshot = readReleaseStatusSnapshot(${JSON.stringify(rootDir)});
          console.log(JSON.stringify({ snapshot, lines: formatReleaseStatusLines(snapshot) }));
        `,
        process.cwd()
      );

      const payload = JSON.parse(stdout);
      expect(payload.snapshot).toMatchObject({
        status: 'ready',
        recommendedCommand: null,
        smoke: { status: 'PASS', opsDoctorGate: true },
        doctor: { status: 'ok' },
        signoff: { status: 'APPROVED', pendingRoles: [] },
        latestVersionTag: 'v1.0.2',
        latestBranch: 'main',
        latestCommit: 'abc1234'
      });
      expect(payload.lines).toContain('[release-status] status: ready');
      expect(payload.lines).toContain('- sign-off: APPROVED');
    } finally {
      fs.rmSync(rootDir, { recursive: true, force: true });
    }
  });

  it('should print a blocked status snapshot as json through the cli', () => {
    const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), 'terminal-quest-release-status-cli-'));

    try {
      const reportDir = path.join(rootDir, 'releases', 'smoke-reports');
      fs.mkdirSync(reportDir, { recursive: true });
      writeJson(path.join(reportDir, 'release-smoke-latest.json'), {
        generatedAt: '2026-03-16T08:24:25.714Z',
        versionTag: 'v1.0.2',
        packageName: 'terminal-quest',
        branch: 'main',
        commit: 'abc1234',
        opsDoctorGate: true,
        opsDoctor: {
          status: 'warn',
          summaryPresent: true,
          freshnessLabel: 'fresh · 0h',
          reasons: ['Backlog 준비'],
          recommendedCommand: 'npm run ai:backlog:dry'
        },
        reportPath: 'releases/smoke-reports/release-smoke-2026-03-16.md',
        overallPass: false,
        steps: [{ label: 'Release readiness gate with Ops doctor', ok: false, status: 1 }]
      });
      writeJson(path.join(reportDir, 'release-doctor-latest.json'), {
        status: 'fail',
        smokeSummaryPresent: true,
        signoffSummaryPresent: true,
        currentVersionTag: 'v1.0.2',
        currentBranch: 'master',
        currentCommit: 'ffe2f56',
        smokeSnapshot: {
          overallPass: false,
          versionTag: 'v1.0.2',
          branch: 'master',
          commit: 'ffe2f56',
          opsDoctorGate: true,
          opsDoctor: {
            status: 'warn',
            freshnessLabel: 'fresh · 0h',
            recommendedCommand: 'npm run ai:backlog:dry',
            reasons: ['Ops status Backlog 준비']
          },
          failedSteps: [{ label: 'Release readiness gate with Ops doctor', status: 1 }]
        },
        signoffSnapshot: {
          versionTag: 'v1.0.2',
          branch: 'master',
          commit: '187bdcd',
          allApproved: true,
          pendingRoles: []
        },
        reasons: ['latest release smoke summary가 FAIL 상태입니다.'],
        recommendedCommand: 'npm run ai:backlog:dry'
      });
      writeJson(path.join(reportDir, 'release-signoff-latest.json'), {
        updatedAt: '2026-03-16T08:30:00.000Z',
        versionTag: 'v1.0.2',
        branch: 'master',
        commit: '187bdcd',
        reportPath: 'releases/smoke-reports/release-smoke-2026-03-16.md',
        allApproved: true,
        signoffs: {
          qa: { approved: true, signedBy: 'qa', signedAt: '2026-03-16T08:30:00.000Z' },
          engineering: { approved: true, signedBy: 'eng', signedAt: '2026-03-16T08:31:00.000Z' },
          releaseManager: { approved: true, signedBy: 'rm', signedAt: '2026-03-16T08:32:00.000Z' }
        }
      });

      const result = spawnSync(
        process.execPath,
        [
          path.join(process.cwd(), 'scripts', 'show-release-status.js'),
          '--json',
          '--report-dir',
          path.join('releases', 'smoke-reports')
        ],
        {
          cwd: rootDir,
          encoding: 'utf-8'
        }
      );

      expect(result.status).toBe(0);
      expect(JSON.parse(result.stdout)).toMatchObject({
        status: 'blocked',
        recommendedCommand: 'npm run ai:backlog:dry',
        doctor: { status: 'fail' },
        signoff: { status: 'APPROVED' }
      });
    } finally {
      fs.rmSync(rootDir, { recursive: true, force: true });
    }
  });
});
