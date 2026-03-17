import fs from 'fs';
import os from 'os';
import path from 'path';
import { spawnSync } from 'child_process';

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

describe('Release smoke latest helpers', () => {
  it('should build and format a latest smoke snapshot from summary json', () => {
    const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), 'terminal-quest-release-smoke-'));

    try {
      const reportDir = path.join(rootDir, 'releases', 'smoke-reports');
      fs.mkdirSync(reportDir, { recursive: true });
      fs.writeFileSync(
        path.join(reportDir, 'release-smoke-latest.json'),
        `${JSON.stringify({
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
            reasons: ['Ops status Backlog 준비: 아직 Linear draft가 없습니다.'],
            recommendedCommand: 'npm run ai:backlog:dry'
          },
          reportPath: 'releases/smoke-reports/release-smoke-2026-03-16.md',
          overallPass: false,
          steps: [
            {
              label: 'Release readiness gate with Ops doctor',
              ok: false,
              status: 1
            }
          ]
        }, null, 2)}\n`,
        'utf-8'
      );

      const stdout = runNodeModule(
        `
          import {
            buildReleaseSmokeLatestSnapshot,
            formatReleaseSmokeLatestLines,
            getReleaseSmokeLatestSummaryPath,
            readReleaseSmokeLatestSummary
          } from './scripts/release-smoke-common.js';

          const summaryPath = getReleaseSmokeLatestSummaryPath(${JSON.stringify(rootDir)});
          const summary = readReleaseSmokeLatestSummary(${JSON.stringify(rootDir)});
          const snapshot = buildReleaseSmokeLatestSnapshot(
            summaryPath,
            summary,
            new Date('2026-03-16T10:24:25.714Z').getTime()
          );

          console.log(JSON.stringify({
            snapshot,
            lines: formatReleaseSmokeLatestLines(snapshot)
          }));
        `,
        process.cwd()
      );

      const payload = JSON.parse(stdout);
      expect(payload.snapshot).toMatchObject({
        summaryPresent: true,
        overallPass: false,
        versionTag: 'v1.0.2',
        opsDoctorGate: true,
        opsDoctor: {
          status: 'warn',
          recommendedCommand: 'npm run ai:backlog:dry'
        },
        failedSteps: [
          {
            label: 'Release readiness gate with Ops doctor',
            status: 1
          }
        ]
      });
      expect(payload.lines).toContain('[release-smoke-latest] status: FAIL');
      expect(payload.lines).toContain('- ops next command: npm run ai:backlog:dry');
    } finally {
      fs.rmSync(rootDir, { recursive: true, force: true });
    }
  });

  it('should print latest smoke snapshot as json through the cli', () => {
    const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), 'terminal-quest-release-smoke-cli-'));

    try {
      const reportDir = path.join(rootDir, 'releases', 'smoke-reports');
      fs.mkdirSync(reportDir, { recursive: true });
      fs.writeFileSync(
        path.join(reportDir, 'release-smoke-latest.json'),
        `${JSON.stringify({
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
            reasons: ['Ops status Backlog 준비: 아직 Linear draft가 없습니다.'],
            recommendedCommand: 'npm run ai:backlog:dry'
          },
          reportPath: 'releases/smoke-reports/release-smoke-2026-03-16.md',
          overallPass: false,
          steps: []
        }, null, 2)}\n`,
        'utf-8'
      );

      const result = spawnSync(
        process.execPath,
        [
          path.join(process.cwd(), 'scripts', 'show-release-smoke-latest.js'),
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
        summaryPresent: true,
        opsDoctorGate: true,
        opsDoctor: {
          status: 'warn'
        }
      });
    } finally {
      fs.rmSync(rootDir, { recursive: true, force: true });
    }
  });
});
