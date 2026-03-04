import fs from 'fs';
import path from 'path';
import { spawnSync } from 'child_process';

const REPORT_DIR = path.join(process.cwd(), 'releases', 'smoke-reports');
const LATEST_SIGNOFF_PATH = path.join(REPORT_DIR, 'release-signoff-latest.json');

const ROLE_MAP = {
  qa: 'qa',
  engineering: 'engineering',
  'release-manager': 'releaseManager',
  release_manager: 'releaseManager',
  releasemanager: 'releaseManager'
};

function readArg(flag) {
  const index = process.argv.indexOf(flag);
  if (index === -1) {
    return null;
  }
  return process.argv[index + 1] ?? null;
}

function hasFlag(flag) {
  return process.argv.includes(flag);
}

function safeGitValue(args, fallback = 'unknown') {
  const result = spawnSync('git', args, { encoding: 'utf-8' });
  if (result.status !== 0) {
    return fallback;
  }
  const value = (result.stdout ?? '').trim();
  return value.length > 0 ? value : fallback;
}

function normalizeRole(rawRole) {
  if (!rawRole) {
    return null;
  }
  return ROLE_MAP[rawRole.toLowerCase()] ?? null;
}

function createEmptyEntry() {
  return {
    approved: false,
    signedBy: null,
    signedAt: null,
    notes: null
  };
}

function readPackageVersionTag() {
  try {
    const packagePath = path.join(process.cwd(), 'package.json');
    const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf-8'));
    const version = String(packageJson.version ?? '0.0.0');
    return version.startsWith('v') ? version : `v${version}`;
  } catch {
    return 'v0.0.0';
  }
}

function getDefaultPayload() {
  return {
    updatedAt: new Date().toISOString(),
    versionTag: readPackageVersionTag(),
    branch: safeGitValue(['branch', '--show-current']),
    commit: safeGitValue(['rev-parse', '--short', 'HEAD']),
    reportPath: null,
    allApproved: false,
    signoffs: {
      qa: createEmptyEntry(),
      engineering: createEmptyEntry(),
      releaseManager: createEmptyEntry()
    }
  };
}

function readCurrentPayload() {
  if (!fs.existsSync(LATEST_SIGNOFF_PATH)) {
    return getDefaultPayload();
  }

  try {
    const raw = fs.readFileSync(LATEST_SIGNOFF_PATH, 'utf-8');
    const parsed = JSON.parse(raw);
    const payload = getDefaultPayload();
    payload.signoffs.qa = { ...payload.signoffs.qa, ...(parsed.signoffs?.qa ?? {}) };
    payload.signoffs.engineering = {
      ...payload.signoffs.engineering,
      ...(parsed.signoffs?.engineering ?? {})
    };
    payload.signoffs.releaseManager = {
      ...payload.signoffs.releaseManager,
      ...(parsed.signoffs?.releaseManager ?? {})
    };
    payload.reportPath = parsed.reportPath ?? payload.reportPath;
    payload.versionTag = parsed.versionTag ?? payload.versionTag;
    payload.branch = parsed.branch ?? payload.branch;
    payload.commit = parsed.commit ?? payload.commit;
    return payload;
  } catch {
    return getDefaultPayload();
  }
}

function ensureReportDir() {
  if (!fs.existsSync(REPORT_DIR)) {
    fs.mkdirSync(REPORT_DIR, { recursive: true });
  }
}

function calculateAllApproved(payload) {
  return (
    payload.signoffs.qa.approved &&
    payload.signoffs.engineering.approved &&
    payload.signoffs.releaseManager.approved
  );
}

function formatEntry(label, entry) {
  if (!entry.approved) {
    return `- ${label}: PENDING`;
  }
  const by = entry.signedBy ?? 'unknown';
  const at = entry.signedAt ?? 'unknown-time';
  const notes = entry.notes ? ` | notes: ${entry.notes}` : '';
  return `- ${label}: APPROVED by ${by} at ${at}${notes}`;
}

function printStatus(payload) {
  console.log('[release-signoff] status');
  console.log(`- version: ${payload.versionTag}`);
  console.log(`- branch: ${payload.branch}`);
  console.log(`- commit: ${payload.commit}`);
  console.log(`- reportPath: ${payload.reportPath ?? 'unlinked'}`);
  console.log(formatEntry('QA', payload.signoffs.qa));
  console.log(formatEntry('Engineering', payload.signoffs.engineering));
  console.log(formatEntry('Release manager', payload.signoffs.releaseManager));
  console.log(`- allApproved: ${payload.allApproved ? 'true' : 'false'}`);
}

function writePayload(payload) {
  ensureReportDir();
  fs.writeFileSync(
    LATEST_SIGNOFF_PATH,
    `${JSON.stringify(payload, null, 2)}\n`,
    'utf-8'
  );

  const stampedPath = path.join(
    REPORT_DIR,
    `release-signoff-${payload.updatedAt.replace(/[:.]/g, '-')}.json`
  );
  fs.writeFileSync(
    stampedPath,
    `${JSON.stringify(payload, null, 2)}\n`,
    'utf-8'
  );

  return stampedPath;
}

function main() {
  const payload = readCurrentPayload();
  const role = normalizeRole(readArg('--role'));
  const statusOnly = hasFlag('--status') || !role;
  const revoke = hasFlag('--revoke');
  const by = readArg('--by') ?? process.env.USER ?? process.env.USERNAME ?? 'unknown';
  const notes = readArg('--notes');
  const reportPath = readArg('--report');

  if (statusOnly) {
    if (!fs.existsSync(LATEST_SIGNOFF_PATH)) {
      payload.updatedAt = new Date().toISOString();
      writePayload(payload);
    }
    payload.allApproved = calculateAllApproved(payload);
    printStatus(payload);
    return;
  }

  if (!role) {
    console.error(
      '[release-signoff] invalid role. Use --role qa|engineering|release-manager'
    );
    process.exit(1);
    return;
  }

  if (reportPath) {
    payload.reportPath = reportPath;
  }

  payload.updatedAt = new Date().toISOString();
  payload.versionTag = readPackageVersionTag();
  payload.branch = safeGitValue(['branch', '--show-current']);
  payload.commit = safeGitValue(['rev-parse', '--short', 'HEAD']);
  payload.signoffs[role] = {
    approved: !revoke,
    signedBy: by,
    signedAt: payload.updatedAt,
    notes: notes ?? null
  };
  payload.allApproved = calculateAllApproved(payload);

  const stampedPath = writePayload(payload);

  console.log(
    `[release-signoff] updated ${role} => ${revoke ? 'PENDING' : 'APPROVED'}`
  );
  console.log(
    `[release-signoff] latest: ${path.relative(process.cwd(), LATEST_SIGNOFF_PATH)}`
  );
  console.log(
    `[release-signoff] snapshot: ${path.relative(process.cwd(), stampedPath)}`
  );
  printStatus(payload);
}

main();
