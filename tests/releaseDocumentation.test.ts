import fs from 'fs';
import path from 'path';

describe('Release Documentation', () => {
  it('should include required commercial readiness documents', () => {
    const requiredDocs = [
      'CHANGELOG.md',
      'docs/paid-release-roadmap.md',
      'docs/support-policy.md',
      'docs/live-balance-cadence.md',
      'docs/seasonal-events.md',
      'docs/release-smoke-checklist.md',
      'docs/save-migration-verification.md'
    ];

    for (const relativePath of requiredDocs) {
      expect(fs.existsSync(path.join(process.cwd(), relativePath))).toBe(true);
    }
  });

  it('should include refund and SLA sections in support policy', () => {
    const policyPath = path.join(process.cwd(), 'docs', 'support-policy.md');
    const content = fs.readFileSync(policyPath, 'utf-8');

    expect(content).toContain('## Refund Policy');
    expect(content).toContain('## Response And Patch SLA');
  });
});
