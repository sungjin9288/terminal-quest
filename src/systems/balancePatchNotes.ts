export interface BalanceValidationOutputs {
  questOutput: string;
  economyOutput: string;
  aiContractOutput: string;
  playtimeOutput: string;
}

export interface BalancePatchMetrics {
  questCount: number | null;
  branchRoots: number | null;
  multiObjectiveQuestCount: number | null;
  economyActSnapshots: string[];
  aiContractScenarioCount: number | null;
  firstClearAverageMinutes: number | null;
  firstClearAverageHours: number | null;
  warnings: {
    quest: number;
    economy: number;
    aiContracts: number;
    playtime: number;
  };
}

export interface BuildBalancePatchNotesInput {
  releaseDate: string;
  generatedAtIso: string;
  metrics: BalancePatchMetrics;
  outputs: BalanceValidationOutputs;
}

function parseInteger(output: string, pattern: RegExp): number | null {
  const match = output.match(pattern);
  if (!match) {
    return null;
  }

  const value = Number(match[1]);
  return Number.isFinite(value) ? Math.floor(value) : null;
}

function parseFloatNumber(output: string, pattern: RegExp): number | null {
  const match = output.match(pattern);
  if (!match) {
    return null;
  }

  const value = Number(match[1]);
  return Number.isFinite(value) ? value : null;
}

function parseWarningCount(output: string, label: string): number {
  const escapedLabel = label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return parseInteger(output, new RegExp(`${escapedLabel}:\\s*(\\d+)`)) ?? 0;
}

function parseEconomyActSnapshots(output: string): string[] {
  return output
    .split('\n')
    .map(line => line.trim())
    .filter(line => line.startsWith('- Act '))
    .map(line => line.slice(2));
}

function formatNumber(value: number | null, digits: number = 0): string {
  if (value === null) {
    return 'n/a';
  }

  if (digits <= 0) {
    return String(Math.round(value));
  }

  return value.toFixed(digits);
}

function toCodeBlock(value: string): string {
  const trimmed = value.trim();
  const body = trimmed.length > 0 ? trimmed : '(no output)';
  return `\`\`\`text\n${body}\n\`\`\``;
}

export function extractBalancePatchMetrics(
  outputs: BalanceValidationOutputs
): BalancePatchMetrics {
  return {
    questCount: parseInteger(outputs.questOutput, /- quests:\s*(\d+)/),
    branchRoots: parseInteger(outputs.questOutput, /- branch roots:\s*(\d+)/),
    multiObjectiveQuestCount: parseInteger(
      outputs.questOutput,
      /- multi-objective quests:\s*(\d+)/
    ),
    economyActSnapshots: parseEconomyActSnapshots(outputs.economyOutput),
    aiContractScenarioCount: parseInteger(outputs.aiContractOutput, /- scenarios:\s*(\d+)/),
    firstClearAverageMinutes: parseFloatNumber(
      outputs.playtimeOutput,
      /firstClearAverage=([0-9.]+)분/
    ),
    firstClearAverageHours: parseFloatNumber(
      outputs.playtimeOutput,
      /firstClearAverage=[0-9.]+분 \(([0-9.]+)시간\)/
    ),
    warnings: {
      quest: parseWarningCount(outputs.questOutput, 'Quest balance warnings'),
      economy: parseWarningCount(outputs.economyOutput, 'Economy balance warnings'),
      aiContracts: parseWarningCount(outputs.aiContractOutput, 'AI contract balance warnings'),
      playtime: parseWarningCount(outputs.playtimeOutput, 'Playtime balance warnings')
    }
  };
}

export function buildBalancePatchNotesContent(
  input: BuildBalancePatchNotesInput
): string {
  const { releaseDate, generatedAtIso, metrics, outputs } = input;
  const economySnapshotLines = metrics.economyActSnapshots.length > 0
    ? metrics.economyActSnapshots.map(line => `- ${line}`).join('\n')
    : '- n/a';

  return [
    `# Balance Patch Notes - ${releaseDate}`,
    '',
    `Generated at: ${generatedAtIso}`,
    '',
    '## Snapshot',
    `- Quests: ${formatNumber(metrics.questCount)}`,
    `- Branch roots: ${formatNumber(metrics.branchRoots)}`,
    `- Multi-objective quests: ${formatNumber(metrics.multiObjectiveQuestCount)}`,
    `- First clear average: ${formatNumber(metrics.firstClearAverageMinutes, 1)}분 ` +
      `(${formatNumber(metrics.firstClearAverageHours, 2)}시간)`,
    '- Economy per act:',
    economySnapshotLines,
    `- AI contract scenarios: ${formatNumber(metrics.aiContractScenarioCount)}`,
    `- Validation warnings: quest=${metrics.warnings.quest}, ` +
      `economy=${metrics.warnings.economy}, aiContracts=${metrics.warnings.aiContracts}, playtime=${metrics.warnings.playtime}`,
    '',
    '## Validation Commands',
    '- `node scripts/validate-quest-balance.js`',
    '- `node scripts/validate-economy-balance.js`',
    '- `node scripts/validate-ai-contract-balance.js`',
    '- `node scripts/validate-playtime-balance.js`',
    '',
    '## Raw Outputs',
    '### Quest Balance',
    toCodeBlock(outputs.questOutput),
    '',
    '### Economy Balance',
    toCodeBlock(outputs.economyOutput),
    '',
    '### AI Contract Balance',
    toCodeBlock(outputs.aiContractOutput),
    '',
    '### Playtime Balance',
    toCodeBlock(outputs.playtimeOutput),
    ''
  ].join('\n');
}
