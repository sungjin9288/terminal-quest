import {
  buildAiOpsLinearImpactBaseline,
  buildAiOpsLinearExportPlan,
  mergeAiOpsLinearExportStateEntry,
  readAiOpsLinearExportConfig,
  readAiOpsLinearExportState,
  writeAiOpsLinearExportState
} from '../dist/systems/aiOpsLinearExport.js';
import { deriveAiOpsLinearDrafts } from '../dist/systems/aiOpsLinearDraft.js';
import { deriveAiOpsBacklog } from '../dist/systems/aiOpsBacklog.js';
import {
  parseAiTelemetryEvents,
  summarizeAiOpsInsights
} from '../dist/systems/aiOpsInsights.js';
import { getTelemetryFilePath } from '../dist/systems/telemetry.js';
import { readPlaytestNotes, resolvePlaytestOpsInputs } from './playtest-common.js';
import fs from 'fs';
import path from 'path';

const APPLY = process.argv.includes('--apply');
const DRY_RUN = process.argv.includes('--dry-run') || !APPLY;
const inputArgIndex = process.argv.indexOf('--input');
const INPUT_PATH = inputArgIndex >= 0 ? process.argv[inputArgIndex + 1] : null;
const notesDirArgIndex = process.argv.indexOf('--notes-dir');
const NOTES_DIR_PATH = notesDirArgIndex >= 0 ? process.argv[notesDirArgIndex + 1] : null;
const reportJsonArgIndex = process.argv.indexOf('--report-json');
const REPORT_JSON_PATH = reportJsonArgIndex >= 0 ? process.argv[reportJsonArgIndex + 1] : null;
const scopeArgIndex = process.argv.indexOf('--scope');
const SCOPE_ARG = scopeArgIndex >= 0 ? process.argv[scopeArgIndex + 1] : null;
const draftIdArgIndex = process.argv.indexOf('--draft-id');
const DRAFT_ID = draftIdArgIndex >= 0 ? process.argv[draftIdArgIndex + 1] : null;
const LINEAR_API_URL = 'https://api.linear.app/graphql';

function readTelemetry(telemetryPath) {
  if (!fs.existsSync(telemetryPath)) {
    return '';
  }

  return fs.readFileSync(telemetryPath, 'utf-8');
}

function parseScope(config) {
  if (!SCOPE_ARG) {
    return config.defaultScope;
  }

  const scope = SCOPE_ARG
    .split(',')
    .map(value => value.trim().toUpperCase())
    .filter(value => value === 'P0' || value === 'P1' || value === 'P2');

  return scope.length > 0 ? scope : config.defaultScope;
}

async function runLinearQuery(token, query, variables = {}) {
  const response = await fetch(LINEAR_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: token
    },
    body: JSON.stringify({ query, variables })
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(`Linear API ${response.status}: ${JSON.stringify(data)}`);
  }
  if (Array.isArray(data.errors) && data.errors.length > 0) {
    throw new Error(data.errors.map(error => error.message).join('; '));
  }

  return data.data;
}

async function resolveLinearMetadata(token) {
  const data = await runLinearQuery(
    token,
    `
      query AiOpsLinearExportMetadata {
        teams {
          nodes {
            id
            name
            key
          }
        }
        projects {
          nodes {
            id
            name
            slugId
          }
        }
        issueLabels {
          nodes {
            id
            name
          }
        }
      }
    `
  );

  return {
    teams: data?.teams?.nodes ?? [],
    projects: data?.projects?.nodes ?? [],
    labels: data?.issueLabels?.nodes ?? []
  };
}

function getLinearTarget(config, metadata) {
  const team = metadata.teams.find(entry =>
    entry.name === config.teamName || entry.key === config.teamName
  );
  if (!team) {
    throw new Error(`Linear team not found: ${config.teamName}`);
  }

  const project = config.projectName
    ? metadata.projects.find(entry =>
        entry.name === config.projectName || entry.slugId === config.projectName
      ) ?? null
    : null;

  if (config.projectName && !project) {
    throw new Error(`Linear project not found: ${config.projectName}`);
  }

  return { team, project };
}

function resolveLabelIds(labels, metadata) {
  const byName = new Map(metadata.labels.map(label => [label.name, label.id]));
  const found = [];
  const missing = [];

  for (const label of labels) {
    const id = byName.get(label);
    if (id) {
      found.push(id);
    } else {
      missing.push(label);
    }
  }

  return { labelIds: found, missingLabels: missing };
}

async function createIssue(token, teamId, projectId, planItem, labelIds) {
  const input = {
    teamId,
    projectId,
    title: planItem.title,
    description: planItem.description,
    priority: planItem.linearPriority,
    labelIds
  };

  const data = await runLinearQuery(
    token,
    `
      mutation CreateAiOpsIssue($input: IssueCreateInput!) {
        issueCreate(input: $input) {
          success
          issue {
            id
            identifier
            url
            title
            state {
              name
              type
            }
          }
        }
      }
    `,
    {
      input: projectId ? input : {
        teamId: input.teamId,
        title: input.title,
        description: input.description,
        priority: input.priority,
        labelIds: input.labelIds
      }
    }
  );

  const issue = data?.issueCreate?.issue;
  if (!data?.issueCreate?.success || !issue?.id) {
    throw new Error(`Linear issueCreate failed for ${planItem.draftId}`);
  }

  return issue;
}

async function updateIssue(token, issueId, projectId, planItem, labelIds) {
  const input = {
    projectId,
    title: planItem.title,
    description: planItem.description,
    priority: planItem.linearPriority,
    labelIds
  };

  const data = await runLinearQuery(
    token,
    `
      mutation UpdateAiOpsIssue($id: String!, $input: IssueUpdateInput!) {
        issueUpdate(id: $id, input: $input) {
          success
          issue {
            id
            identifier
            url
            title
            state {
              name
              type
            }
          }
        }
      }
    `,
    {
      id: issueId,
      input: projectId ? input : {
        title: input.title,
        description: input.description,
        priority: input.priority,
        labelIds: input.labelIds
      }
    }
  );

  const issue = data?.issueUpdate?.issue;
  if (!data?.issueUpdate?.success || !issue?.id) {
    throw new Error(`Linear issueUpdate failed for ${planItem.draftId}`);
  }

  return issue;
}

function printPlan(plan, config, telemetryPath, notesDir, stateEntries, reportJsonPath) {
  console.log(DRY_RUN ? '[ai-linear-export] dry-run mode' : '[ai-linear-export] apply mode');
  if (reportJsonPath) {
    console.log(`- report-json: ${reportJsonPath}`);
  }
  console.log(`- telemetry: ${telemetryPath}`);
  console.log(`- notes: ${notesDir}`);
  console.log(`- team: ${config.teamName}`);
  console.log(`- project: ${config.projectName ?? 'none'}`);
  console.log(`- scope: ${config.defaultScope.join(', ')}`);
  console.log(`- state entries: ${stateEntries}`);
  console.log(`- selected drafts: ${plan.length}`);
  console.log('');

  for (const item of plan) {
    console.log(`- ${item.action.toUpperCase()} ${item.priority} ${item.title}`);
    console.log(`  labels: ${item.labels.join(', ')}`);
    console.log(`  status: ${item.exportStatus}`);
    if (item.issueIdentifier) {
      console.log(`  issue: ${item.issueIdentifier}`);
    }
  }
}

async function main() {
  const resolvedInputs = resolvePlaytestOpsInputs({
    rootDir: process.cwd(),
    reportJsonPath: REPORT_JSON_PATH,
    telemetryPath: INPUT_PATH ?? getTelemetryFilePath(),
    notesDir: NOTES_DIR_PATH
  });
  const telemetryPath = resolvedInputs.telemetryPath;
  const notesDir = resolvedInputs.notesDir;
  const config = readAiOpsLinearExportConfig();
  const scope = parseScope(config);
  const telemetryContent = readTelemetry(telemetryPath);
  const records = parseAiTelemetryEvents(telemetryContent);
  const notes = readPlaytestNotes({
    ...resolvedInputs.playtestPaths,
    notesDir
  });
  const summary = summarizeAiOpsInsights(records, notes);
  const backlog = deriveAiOpsBacklog(summary);
  const drafts = deriveAiOpsLinearDrafts(backlog);
  const state = readAiOpsLinearExportState();
  const plan = buildAiOpsLinearExportPlan(
    drafts.filter(draft => !DRAFT_ID || draft.id === DRAFT_ID),
    config,
    state,
    scope
  );

  printPlan(
    plan,
    { ...config, defaultScope: scope },
    telemetryPath,
    notesDir,
    state.entries.length,
    resolvedInputs.reportJsonPath
  );

  if (plan.length === 0) {
    return;
  }

  if (DRY_RUN) {
    return;
  }

  const token = process.env.LINEAR_API_KEY?.trim();
  if (!token) {
    throw new Error('LINEAR_API_KEY is required for --apply export');
  }

  const metadata = await resolveLinearMetadata(token);
  const target = getLinearTarget(config, metadata);
  let nextState = state;

  for (const item of plan) {
    if (item.action === 'skip') {
      continue;
    }

    const { labelIds, missingLabels } = resolveLabelIds(item.labels, metadata);
    if (missingLabels.length > 0) {
      console.log(`  missing labels for ${item.draftId}: ${missingLabels.join(', ')}`);
    }

    const issue = item.action === 'update' && item.stateEntry?.linearIssueId
      ? await updateIssue(token, item.stateEntry.linearIssueId, target.project?.id ?? null, item, labelIds)
      : await createIssue(token, target.team.id, target.project?.id ?? null, item, labelIds);

    const updatedAtIso = new Date().toISOString();
    nextState = mergeAiOpsLinearExportStateEntry(
      nextState,
      item,
      {
        status: 'exported',
        linearIssueId: issue.id,
        linearIssueIdentifier: issue.identifier ?? null,
        linearIssueUrl: issue.url ?? null
      },
      updatedAtIso,
      buildAiOpsLinearImpactBaseline(summary)
    );

    const latestEntry = nextState.entries.find(entry => entry.draftId === item.draftId);
    if (latestEntry) {
      latestEntry.linearStateName = issue.state?.name ?? null;
      latestEntry.linearStateType = issue.state?.type ?? 'unknown';
      latestEntry.lastSyncedAtIso = updatedAtIso;
    }

    console.log(`  exported ${item.draftId} -> ${issue.identifier ?? issue.id}`);
  }

  writeAiOpsLinearExportState(nextState);
}

try {
  await main();
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`[ai-linear-export] failed: ${message}`);
  process.exitCode = 1;
}
