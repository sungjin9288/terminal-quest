import { spawnSync } from 'child_process';

function runReleaseOpsSnippet(source: string) {
  const result = spawnSync(
    process.execPath,
    ['--input-type=module', '-e', source],
    {
      cwd: process.cwd(),
      encoding: 'utf-8'
    }
  );

  if (result.status !== 0) {
    throw new Error(result.stderr || result.stdout || `node exited with ${result.status}`);
  }

  return (result.stdout ?? '').trim();
}

describe('Release ops common helpers', () => {
  it('should normalize a valid ops doctor snapshot', () => {
    const stdout = runReleaseOpsSnippet(`
      import { normalizeReleaseOpsDoctorSnapshot } from './scripts/release-ops-common.js';
      const snapshot = normalizeReleaseOpsDoctorSnapshot({
        status: 'warn',
        summaryPresent: true,
        freshnessLabel: 'fresh · 0h',
        reasons: ['Ops status Backlog 준비: 아직 Linear draft가 없습니다.'],
        recommendedCommand: 'npm run ai:backlog:dry',
        opsStatus: {
          label: 'Backlog 준비',
          tone: 'recommended',
          actionRequired: true,
          summary: '아직 Linear draft가 없습니다.'
        }
      });
      console.log(JSON.stringify(snapshot));
    `);

    expect(JSON.parse(stdout)).toMatchObject({
      status: 'warn',
      freshnessLabel: 'fresh · 0h',
      recommendedCommand: 'npm run ai:backlog:dry',
      opsStatus: {
        label: 'Backlog 준비',
        tone: 'recommended',
        actionRequired: true
      }
    });
  });

  it('should reject invalid ops doctor payloads', () => {
    const stdout = runReleaseOpsSnippet(`
      import { normalizeReleaseOpsDoctorSnapshot } from './scripts/release-ops-common.js';
      console.log(JSON.stringify([
        normalizeReleaseOpsDoctorSnapshot(null),
        normalizeReleaseOpsDoctorSnapshot({ status: 'unknown' })
      ]));
    `);

    expect(JSON.parse(stdout)).toEqual([null, null]);
  });

  it('should format inline doctor detail for release failures', () => {
    const stdout = runReleaseOpsSnippet(`
      import {
        buildReleaseOpsFailureMessage,
        formatReleaseOpsDoctorInline,
        normalizeReleaseOpsDoctorSnapshot
      } from './scripts/release-ops-common.js';

      const snapshot = normalizeReleaseOpsDoctorSnapshot({
        status: 'warn',
        summaryPresent: true,
        freshnessLabel: 'stale · 30h',
        reasons: ['latest cycle이 stale 상태입니다 (stale · 30h).'],
        recommendedCommand: 'npm run ai:ops:cycle',
        opsStatus: {
          label: 'Cycle stale',
          tone: 'warning',
          actionRequired: true,
          summary: '마지막 persisted cycle이 오래됐습니다.'
        }
      });

      console.log(JSON.stringify({
        inline: formatReleaseOpsDoctorInline(snapshot),
        message: buildReleaseOpsFailureMessage('release smoke summary reports overallPass=false', snapshot)
      }));
    `);

    const payload = JSON.parse(stdout);
    expect(payload.inline).toBe(
      'ops doctor warn · stale · 30h · ops Cycle stale · latest cycle이 stale 상태입니다 (stale · 30h). · next npm run ai:ops:cycle'
    );
    expect(payload.message).toContain('ops doctor warn');
  });
});
