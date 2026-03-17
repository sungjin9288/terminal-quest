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

describe('Release doctor latest helpers', () => {
  it('should build and format a latest doctor snapshot from persisted json', () => {
    const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), 'terminal-quest-release-doctor-latest-'));

    try {
      const reportDir = path.join(rootDir, 'releases', 'smoke-reports');
      fs.mkdirSync(reportDir, { recursive: true });
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
        reasons: [
          'latest release smoke summary가 FAIL 상태입니다.',
          'sign-off commit mismatch: latest=187bdcd, current=ffe2f56'
        ],
        recommendedCommand: 'npm run ai:backlog:dry'
      });

      const stdout = runNodeModule(
        `
          import {
            buildReleaseDoctorLatestSnapshot,
            formatReleaseDoctorLatestLines,
            getReleaseDoctorLatestJsonPath,
            readReleaseDoctorLatestReport
          } from './scripts/release-doctor-common.js';

          const reportPath = getReleaseDoctorLatestJsonPath(${JSON.stringify(rootDir)});
          const report = readReleaseDoctorLatestReport(${JSON.stringify(rootDir)});
          const snapshot = buildReleaseDoctorLatestSnapshot(reportPath, report);

          console.log(JSON.stringify({
            snapshot,
            lines: formatReleaseDoctorLatestLines(snapshot)
          }));
        `,
        process.cwd()
      );

      const payload = JSON.parse(stdout);
      expect(payload.snapshot).toMatchObject({
        reportPresent: true,
        status: 'fail',
        recommendedCommand: 'npm run ai:backlog:dry',
        smokeSummaryPresent: true,
        signoffSummaryPresent: true,
        reasonCount: 2
      });
      expect(payload.lines).toContain('[release-doctor-latest] status: fail');
      expect(payload.lines).toContain('- recommended command: npm run ai:backlog:dry');
    } finally {
      fs.rmSync(rootDir, { recursive: true, force: true });
    }
  });

  it('should print latest doctor snapshot as json through the cli', () => {
    const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), 'terminal-quest-release-doctor-cli-'));

    try {
      const reportDir = path.join(rootDir, 'releases', 'smoke-reports');
      fs.mkdirSync(reportDir, { recursive: true });
      writeJson(path.join(reportDir, 'release-doctor-latest.json'), {
        status: 'warn',
        smokeSummaryPresent: true,
        signoffSummaryPresent: false,
        currentVersionTag: 'v1.0.2',
        currentBranch: 'main',
        currentCommit: 'abc1234',
        smokeSnapshot: {
          overallPass: true,
          versionTag: 'v1.0.2',
          branch: 'main',
          commit: 'abc1234',
          opsDoctorGate: false,
          opsDoctor: null,
          failedSteps: []
        },
        signoffSnapshot: null,
        reasons: ['latest release sign-off summary가 아직 없습니다.'],
        recommendedCommand: 'npm run release:signoff --status'
      });

      const result = spawnSync(
        process.execPath,
        [
          path.join(process.cwd(), 'scripts', 'show-release-doctor-latest.js'),
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
        reportPresent: true,
        status: 'warn',
        recommendedCommand: 'npm run release:signoff --status'
      });
    } finally {
      fs.rmSync(rootDir, { recursive: true, force: true });
    }
  });
});
