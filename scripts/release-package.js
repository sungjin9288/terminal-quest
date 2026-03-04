import fs from 'fs';
import path from 'path';
import { createHash } from 'crypto';
import { spawnSync } from 'child_process';
import {
  formatReleaseDate,
  parseGitCommitLog,
  upsertChangelogContent,
  buildReleaseChangelogSection,
  getVersionTag
} from '../dist/systems/releasePackaging.js';

const RELEASES_DIR = 'releases';
const CHANGELOG_PATH = 'CHANGELOG.md';
const RELEASE_NOTES_FILE = 'RELEASE_NOTES.md';
const RELEASE_MANIFEST_FILE = 'release-manifest.json';
const DRY_RUN = process.argv.includes('--dry-run');

function runCommand(command, args, options = {}) {
  const result = spawnSync(command, args, {
    encoding: 'utf-8',
    ...options
  });

  if (result.status !== 0) {
    return {
      ok: false,
      stdout: result.stdout ?? '',
      stderr: result.stderr ?? '',
      status: result.status
    };
  }

  return {
    ok: true,
    stdout: (result.stdout ?? '').trim(),
    stderr: (result.stderr ?? '').trim(),
    status: result.status
  };
}

function readPackageJson() {
  const packageJsonPath = path.join(process.cwd(), 'package.json');
  return JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
}

function readFileIfExists(filePath) {
  return fs.existsSync(filePath)
    ? fs.readFileSync(filePath, 'utf-8')
    : '';
}

function getGitHeadShortHash() {
  const hashResult = runCommand('git', ['rev-parse', '--short', 'HEAD']);
  return hashResult.ok ? hashResult.stdout : 'unknown';
}

function getLatestTag() {
  const result = runCommand('git', ['describe', '--tags', '--abbrev=0']);
  return result.ok ? result.stdout : null;
}

function getReleaseCommits() {
  const latestTag = getLatestTag();
  const gitLogArgs = latestTag
    ? ['log', `${latestTag}..HEAD`, '--pretty=format:%h|%s']
    : ['log', '-n', '20', '--pretty=format:%h|%s'];

  const logResult = runCommand('git', gitLogArgs);
  if (!logResult.ok) {
    return [];
  }

  return parseGitCommitLog(logResult.stdout);
}

function ensurePathExists(relativePath) {
  const absolutePath = path.join(process.cwd(), relativePath);
  if (!fs.existsSync(absolutePath)) {
    throw new Error(`required path not found: ${relativePath}`);
  }
}

function copyReleaseAssets(targetDir) {
  const assets = [
    'dist',
    'data',
    'docs',
    'README.md',
    CHANGELOG_PATH,
    'package.json',
    'package-lock.json'
  ];

  for (const relativePath of assets) {
    const sourcePath = path.join(process.cwd(), relativePath);
    if (!fs.existsSync(sourcePath)) {
      continue;
    }

    const destinationPath = path.join(targetDir, relativePath);
    const stat = fs.statSync(sourcePath);
    if (stat.isDirectory()) {
      fs.cpSync(sourcePath, destinationPath, { recursive: true });
    } else {
      fs.mkdirSync(path.dirname(destinationPath), { recursive: true });
      fs.copyFileSync(sourcePath, destinationPath);
    }
  }
}

function writeManifest(targetDir, payload) {
  const manifestPath = path.join(targetDir, RELEASE_MANIFEST_FILE);
  fs.writeFileSync(manifestPath, `${JSON.stringify(payload, null, 2)}\n`, 'utf-8');
}

function computeFileSha256(filePath) {
  const buffer = fs.readFileSync(filePath);
  return createHash('sha256').update(buffer).digest('hex');
}

function writeChecksumFile(archivePath, sha256) {
  const checksumPath = `${archivePath}.sha256`;
  const line = `${sha256}  ${path.basename(archivePath)}\n`;
  fs.writeFileSync(checksumPath, line, 'utf-8');
  return checksumPath;
}

function createArchive(packageName, versionTag, releaseFolderName) {
  const archiveBaseName = `${packageName}-${versionTag}`;
  const releasesRoot = path.join(process.cwd(), RELEASES_DIR);

  if (process.platform === 'win32') {
    const zipPath = path.join(releasesRoot, `${archiveBaseName}.zip`);
    const result = runCommand(
      'powershell',
      [
        '-NoProfile',
        '-Command',
        `Compress-Archive -Path "${path.join(releasesRoot, releaseFolderName)}" -DestinationPath "${zipPath}" -Force`
      ],
      { stdio: 'pipe' }
    );
    if (!result.ok) {
      throw new Error(`zip packaging failed: ${result.stderr}`);
    }
    return zipPath;
  }

  const tarPath = path.join(releasesRoot, `${archiveBaseName}.tar.gz`);
  const result = runCommand(
    'tar',
    ['-czf', tarPath, '-C', releasesRoot, releaseFolderName],
    { stdio: 'pipe' }
  );
  if (!result.ok) {
    throw new Error(`tar packaging failed: ${result.stderr}`);
  }
  return tarPath;
}

function main() {
  const packageJson = readPackageJson();
  const version = packageJson.version;
  const packageName = packageJson.name ?? 'terminal-quest';
  const versionTag = getVersionTag(version);
  const releaseDate = formatReleaseDate();
  const commitHash = getGitHeadShortHash();
  const commits = getReleaseCommits();

  ensurePathExists('dist');

  const currentChangelog = readFileIfExists(path.join(process.cwd(), CHANGELOG_PATH));
  const changelogUpdate = upsertChangelogContent(
    currentChangelog,
    version,
    releaseDate,
    commits
  );

  const sectionPreview = buildReleaseChangelogSection(version, releaseDate, commits).trimEnd();

  if (DRY_RUN) {
    console.log('[release-package] dry-run mode');
    console.log(`[release-package] version=${versionTag}`);
    console.log(`[release-package] changelog-updated=${changelogUpdate.updated}`);
    console.log(`[release-package] commits=${commits.length}`);
    console.log('\n--- release section preview ---');
    console.log(sectionPreview);
    return;
  }

  if (changelogUpdate.updated) {
    fs.writeFileSync(path.join(process.cwd(), CHANGELOG_PATH), changelogUpdate.content, 'utf-8');
  }

  const releasesRoot = path.join(process.cwd(), RELEASES_DIR);
  const releaseFolderName = versionTag;
  const releaseFolderPath = path.join(releasesRoot, releaseFolderName);
  fs.rmSync(releaseFolderPath, { recursive: true, force: true });
  fs.mkdirSync(releaseFolderPath, { recursive: true });

  copyReleaseAssets(releaseFolderPath);

  const releaseNotes = `${sectionPreview}\n`;
  fs.writeFileSync(
    path.join(releaseFolderPath, RELEASE_NOTES_FILE),
    releaseNotes,
    'utf-8'
  );

  const archivePath = createArchive(packageName, versionTag, releaseFolderName);
  const archiveSha256 = computeFileSha256(archivePath);
  const checksumPath = writeChecksumFile(archivePath, archiveSha256);

  writeManifest(releaseFolderPath, {
    packageName,
    version,
    versionTag,
    releaseDate,
    commitHash,
    changelogUpdated: changelogUpdate.updated,
    releaseNotesFile: RELEASE_NOTES_FILE,
    archiveFile: path.basename(archivePath),
    archiveSha256,
    checksumFile: path.basename(checksumPath)
  });

  console.log('[release-package] release package created');
  console.log(`- version: ${versionTag}`);
  console.log(`- release-dir: ${path.relative(process.cwd(), releaseFolderPath)}`);
  console.log(`- archive: ${path.relative(process.cwd(), archivePath)}`);
  console.log(`- checksum: ${path.relative(process.cwd(), checksumPath)}`);
  console.log(`- sha256: ${archiveSha256}`);
  console.log(`- commit: ${commitHash}`);
  console.log(`- changelog-updated: ${changelogUpdate.updated}`);
}

try {
  main();
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`[release-package] failed: ${message}`);
  process.exitCode = 1;
}
