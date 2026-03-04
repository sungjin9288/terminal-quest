import fs from 'fs';
import path from 'path';
import { createHash } from 'crypto';

function getVersionTag(version) {
  return version.startsWith('v') ? version : `v${version}`;
}

function getArchiveExtension() {
  return process.platform === 'win32' ? 'zip' : 'tar.gz';
}

function fail(message) {
  console.error(`[release-artifact-check] FAIL: ${message}`);
  process.exit(1);
}

function readPackageJson() {
  const packagePath = path.join(process.cwd(), 'package.json');
  return JSON.parse(fs.readFileSync(packagePath, 'utf-8'));
}

function computeFileSha256(filePath) {
  const buffer = fs.readFileSync(filePath);
  return createHash('sha256').update(buffer).digest('hex');
}

function parseChecksumLine(filePath) {
  const raw = fs.readFileSync(filePath, 'utf-8');
  const firstLine = raw
    .split(/\r?\n/)
    .map(line => line.trim())
    .find(line => line.length > 0);

  if (!firstLine) {
    fail(`checksum file is empty: ${path.relative(process.cwd(), filePath)}`);
    return null;
  }

  const match = firstLine.match(/^([a-fA-F0-9]{64})\s+\*?(.+)$/);
  if (!match) {
    fail(`invalid checksum format: ${firstLine}`);
    return null;
  }

  return {
    checksum: match[1].toLowerCase(),
    fileName: match[2].trim()
  };
}

function ensureExists(filePath, label) {
  if (!fs.existsSync(filePath)) {
    fail(`${label} not found: ${path.relative(process.cwd(), filePath)}`);
    return false;
  }
  return true;
}

function main() {
  const packageJson = readPackageJson();
  const packageName = String(packageJson.name ?? 'terminal-quest');
  const versionTag = getVersionTag(String(packageJson.version ?? '0.0.0'));
  const archiveExt = getArchiveExtension();

  const archiveName = `${packageName}-${versionTag}.${archiveExt}`;
  const archivePath = path.join(process.cwd(), 'releases', archiveName);
  const checksumPath = `${archivePath}.sha256`;
  const releaseDirPath = path.join(process.cwd(), 'releases', versionTag);
  const manifestPath = path.join(releaseDirPath, 'release-manifest.json');

  if (!ensureExists(releaseDirPath, 'release directory')) {
    return;
  }
  if (!ensureExists(archivePath, 'release archive')) {
    return;
  }
  if (!ensureExists(checksumPath, 'release checksum')) {
    return;
  }
  if (!ensureExists(manifestPath, 'release manifest')) {
    return;
  }

  const checksumRecord = parseChecksumLine(checksumPath);
  if (!checksumRecord) {
    return;
  }

  if (checksumRecord.fileName !== archiveName) {
    fail(
      `checksum filename mismatch (expected ${archiveName}, got ${checksumRecord.fileName})`
    );
    return;
  }

  const actualSha256 = computeFileSha256(archivePath);
  if (checksumRecord.checksum !== actualSha256) {
    fail(
      `checksum mismatch (expected ${checksumRecord.checksum}, actual ${actualSha256})`
    );
    return;
  }

  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
  if (manifest.versionTag !== versionTag) {
    fail(
      `manifest version mismatch (expected ${versionTag}, got ${manifest.versionTag ?? 'unknown'})`
    );
    return;
  }

  if (manifest.archiveFile !== archiveName) {
    fail(
      `manifest archiveFile mismatch (expected ${archiveName}, got ${manifest.archiveFile ?? 'unknown'})`
    );
    return;
  }

  const checksumName = path.basename(checksumPath);
  if (manifest.checksumFile !== checksumName) {
    fail(
      `manifest checksumFile mismatch (expected ${checksumName}, got ${manifest.checksumFile ?? 'unknown'})`
    );
    return;
  }

  const manifestSha256 = String(manifest.archiveSha256 ?? '').toLowerCase();
  if (manifestSha256 !== actualSha256) {
    fail(
      `manifest archiveSha256 mismatch (expected ${actualSha256}, got ${manifest.archiveSha256 ?? 'unknown'})`
    );
    return;
  }

  console.log('[release-artifact-check] PASS: release artifact integrity verified.');
  console.log(`- version: ${versionTag}`);
  console.log(`- archive: ${path.relative(process.cwd(), archivePath)}`);
  console.log(`- checksum: ${path.relative(process.cwd(), checksumPath)}`);
  console.log(`- sha256: ${actualSha256}`);
}

main();
