import {
  normalizeAiOpsLinearIssueStateType,
  readAiOpsLinearExportState,
  syncAiOpsLinearIssueStateEntry,
  writeAiOpsLinearExportState
} from '../dist/systems/aiOpsLinearExport.js';

const APPLY = process.argv.includes('--apply');
const DRY_RUN = process.argv.includes('--dry-run') || !APPLY;
const LINEAR_API_URL = 'https://api.linear.app/graphql';

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

async function fetchIssueSnapshot(token, issueId) {
  const data = await runLinearQuery(
    token,
    `
      query AiOpsIssueState($id: String!) {
        issue(id: $id) {
          id
          identifier
          url
          state {
            name
            type
          }
        }
      }
    `,
    { id: issueId }
  );

  const issue = data?.issue;
  if (!issue?.id) {
    throw new Error(`Linear issue not found: ${issueId}`);
  }

  return {
    issueId: issue.id,
    issueIdentifier: issue.identifier ?? null,
    issueUrl: issue.url ?? null,
    stateName: issue.state?.name ?? null,
    stateType: normalizeAiOpsLinearIssueStateType(issue.state?.type)
  };
}

async function main() {
  const state = readAiOpsLinearExportState();
  const candidates = state.entries.filter(entry => entry.linearIssueId);

  console.log(DRY_RUN ? '[ai-linear-sync] dry-run mode' : '[ai-linear-sync] apply mode');
  console.log(`- state entries: ${state.entries.length}`);
  console.log(`- sync candidates: ${candidates.length}`);

  if (candidates.length === 0) {
    return;
  }

  const token = process.env.LINEAR_API_KEY?.trim();
  if (!token) {
    throw new Error('LINEAR_API_KEY is required when synced issues exist');
  }

  let nextState = state;

  for (const entry of candidates) {
    const snapshot = await fetchIssueSnapshot(token, entry.linearIssueId);
    const syncedAtIso = new Date().toISOString();
    nextState = syncAiOpsLinearIssueStateEntry(nextState, entry.draftId, snapshot, syncedAtIso);
    console.log(`- ${entry.draftId}: ${snapshot.stateName ?? 'unknown'} (${snapshot.stateType})`);
  }

  if (DRY_RUN) {
    return;
  }

  writeAiOpsLinearExportState(nextState);
}

try {
  await main();
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`[ai-linear-sync] failed: ${message}`);
  process.exitCode = 1;
}
