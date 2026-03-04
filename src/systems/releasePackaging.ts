export interface ReleaseCommit {
  hash: string;
  subject: string;
}

export interface ChangelogUpdateResult {
  content: string;
  updated: boolean;
}

export const RELEASE_CHANGELOG_HEADER =
  '# Changelog\n\n' +
  'All notable changes to this project will be documented in this file.\n';

function trimTrailingNewlines(value: string): string {
  return value.replace(/\s+$/g, '');
}

export function normalizeVersion(version: string): string {
  const trimmed = version.trim();
  return trimmed.startsWith('v') ? trimmed.slice(1) : trimmed;
}

export function getVersionTag(version: string): string {
  return `v${normalizeVersion(version)}`;
}

export function formatReleaseDate(value: Date = new Date()): string {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, '0');
  const day = String(value.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function sanitizeCommitSubject(subject: string): string {
  return subject.replace(/\s+/g, ' ').trim();
}

export function parseGitCommitLog(logOutput: string): ReleaseCommit[] {
  return logOutput
    .split('\n')
    .map(line => line.trim())
    .filter(Boolean)
    .map(line => {
      const separatorIndex = line.indexOf('|');
      if (separatorIndex < 0) {
        return null;
      }

      const hash = line.slice(0, separatorIndex).trim();
      const subject = sanitizeCommitSubject(line.slice(separatorIndex + 1));
      if (!hash || !subject) {
        return null;
      }

      return { hash, subject };
    })
    .filter((commit): commit is ReleaseCommit => Boolean(commit));
}

export function buildReleaseChangelogSection(
  version: string,
  releaseDate: string,
  commits: ReleaseCommit[]
): string {
  const lines = [
    `## [${getVersionTag(version)}] - ${releaseDate}`,
    '### Highlights'
  ];

  if (commits.length === 0) {
    lines.push('- Internal maintenance updates.');
  } else {
    for (const commit of commits) {
      lines.push(`- ${commit.hash} ${commit.subject}`);
    }
  }

  return `${lines.join('\n')}\n`;
}

export function changelogHasVersion(content: string, version: string): boolean {
  const escapedVersion = normalizeVersion(version).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const pattern = new RegExp(`^## \\[v${escapedVersion}\\](?:\\s|-|$)`, 'm');
  return pattern.test(content);
}

export function ensureChangelogHeader(content: string): string {
  const trimmed = content.trim();
  if (trimmed.length === 0) {
    return `${RELEASE_CHANGELOG_HEADER}\n`;
  }

  if (/^#\s+Changelog\b/m.test(content)) {
    return `${trimTrailingNewlines(content)}\n`;
  }

  return `${RELEASE_CHANGELOG_HEADER}\n${trimmed}\n`;
}

export function upsertChangelogContent(
  existingContent: string,
  version: string,
  releaseDate: string,
  commits: ReleaseCommit[]
): ChangelogUpdateResult {
  const normalized = ensureChangelogHeader(existingContent);
  if (changelogHasVersion(normalized, version)) {
    return { content: normalized, updated: false };
  }

  const section = buildReleaseChangelogSection(version, releaseDate, commits).trimEnd();
  const firstVersionSectionIndex = normalized.indexOf('\n## ');

  if (firstVersionSectionIndex < 0) {
    return {
      content: `${trimTrailingNewlines(normalized)}\n\n${section}\n`,
      updated: true
    };
  }

  const prefix = trimTrailingNewlines(normalized.slice(0, firstVersionSectionIndex));
  const suffix = normalized.slice(firstVersionSectionIndex + 1).trimStart();

  return {
    content: `${prefix}\n\n${section}\n\n${trimTrailingNewlines(suffix)}\n`,
    updated: true
  };
}
