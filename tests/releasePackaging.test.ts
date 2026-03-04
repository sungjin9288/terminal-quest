import './helpers/moduleMocks';
import {
  formatReleaseDate,
  parseGitCommitLog,
  upsertChangelogContent,
  buildReleaseChangelogSection,
  changelogHasVersion
} from '../src/systems/releasePackaging';

describe('Release Packaging', () => {
  it('should format release date as YYYY-MM-DD', () => {
    const date = new Date('2026-03-04T12:34:56Z');
    expect(formatReleaseDate(date)).toBe('2026-03-04');
  });

  it('should parse git log output into commit list', () => {
    const commits = parseGitCommitLog(
      [
        'abc1234|feat: add release packaging',
        'def5678|fix: tighten changelog insertion',
        'invalid-line'
      ].join('\n')
    );

    expect(commits).toEqual([
      { hash: 'abc1234', subject: 'feat: add release packaging' },
      { hash: 'def5678', subject: 'fix: tighten changelog insertion' }
    ]);
  });

  it('should build release section with highlights list', () => {
    const section = buildReleaseChangelogSection('1.2.3', '2026-03-04', [
      { hash: 'abc123', subject: 'feat: something' }
    ]);

    expect(section).toContain('## [v1.2.3] - 2026-03-04');
    expect(section).toContain('### Highlights');
    expect(section).toContain('- abc123 feat: something');
  });

  it('should prepend a new version section when missing', () => {
    const existing =
      '# Changelog\n\n' +
      'All notable changes to this project will be documented in this file.\n\n' +
      '## [v0.9.0] - 2026-02-28\n' +
      '### Highlights\n' +
      '- old change\n';

    const result = upsertChangelogContent(existing, '1.0.0', '2026-03-04', [
      { hash: 'abc123', subject: 'feat: add endgame loop' }
    ]);

    expect(result.updated).toBe(true);
    expect(result.content.indexOf('## [v1.0.0]')).toBeLessThan(
      result.content.indexOf('## [v0.9.0]')
    );
  });

  it('should keep changelog unchanged when version already exists', () => {
    const existing =
      '# Changelog\n\n' +
      'All notable changes to this project will be documented in this file.\n\n' +
      '## [v1.0.0] - 2026-03-04\n' +
      '### Highlights\n' +
      '- current release\n';

    const result = upsertChangelogContent(existing, '1.0.0', '2026-03-04', []);

    expect(result.updated).toBe(false);
    expect(changelogHasVersion(result.content, '1.0.0')).toBe(true);
    expect((result.content.match(/## \[v1\.0\.0\]/g) ?? []).length).toBe(1);
  });
});
