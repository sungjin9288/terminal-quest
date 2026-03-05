import { getAllLocations } from '../dist/data/locations.js';
import { getDefaultQuests } from '../dist/data/quests.js';
import {
  estimateFirstClearPlaytime,
  DEFAULT_PLAYTIME_BALANCE_CONFIG,
  EXTENDED_PLAYTIME_BALANCE_CONFIG
} from '../dist/systems/playtimeBalance.js';

function readArg(flag) {
  const index = process.argv.indexOf(flag);
  if (index === -1) {
    return null;
  }
  return process.argv[index + 1] ?? null;
}

function round(value, digits = 1) {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function formatRange(label, range) {
  return `${label}: ${round(range.min)}-${round(range.max)}분`;
}

function resolveConfig() {
  const profile = (readArg('--profile') ?? 'baseline').toLowerCase();
  if (profile === 'extended') {
    return {
      profile,
      config: EXTENDED_PLAYTIME_BALANCE_CONFIG
    };
  }

  return {
    profile: 'baseline',
    config: DEFAULT_PLAYTIME_BALANCE_CONFIG
  };
}

function main() {
  const { profile, config } = resolveConfig();
  const locations = getAllLocations();
  const quests = Object.values(getDefaultQuests());

  const estimate = estimateFirstClearPlaytime(locations, quests, config);

  console.log('Playtime balance metrics:');
  console.log(`- profile=${profile}`);
  console.log(`- ${formatRange('campaign', estimate.locationRange)}`);
  console.log(`- ${formatRange('mainQuest', estimate.mainQuestRange)}`);
  console.log(`- ${formatRange('recommendedSideQuest', estimate.recommendedSideQuestRange)}`);
  console.log(`- ${formatRange('branchExploration', estimate.branchExplorationRange)}`);
  console.log(`- ${formatRange('retryOverhead', estimate.retryOverheadRange)}`);
  console.log(`- ${formatRange('travelOverhead', estimate.travelOverheadRange)}`);
  console.log(`- ${formatRange('firstClearTotal', estimate.totalRange)}`);
  console.log(`- firstClearAverage=${round(estimate.averageMinutes)}분 (${round(estimate.averageHours, 2)}시간)`);
  console.log(`- firstClearTarget>=${estimate.targetMinutes}분 (${round(estimate.targetMinutes / 60, 1)}시간)`);
  console.log(`- ${formatRange('postClearEndgame', estimate.postClearEndgameRange)}`);
  console.log(`- ${formatRange('postClearBuildExperiment', estimate.postClearBuildExperimentRange)}`);
  console.log(`- ${formatRange('postClearChallengeRoute', estimate.postClearChallengeRouteRange)}`);
  console.log(`- ${formatRange('fullCompletionTotal', estimate.fullCompletionRange)}`);
  console.log(
    `- fullCompletionAverage=${round(estimate.fullCompletionAverageMinutes)}분 (${round(estimate.fullCompletionAverageHours, 2)}시간)`
  );
  console.log(
    `- fullCompletionTarget=${estimate.fullCompletionTargetRange.min}-${estimate.fullCompletionTargetRange.max}분 (${round(estimate.fullCompletionTargetRange.min / 60, 1)}-${round(estimate.fullCompletionTargetRange.max / 60, 1)}시간)`
  );
  console.log(`- sideQuestShare=${round(estimate.sideQuestShare * 100, 1)}%`);
  console.log(`- repeatableShare=${round(estimate.repeatableShare * 100, 1)}%`);
  console.log(`- branchRoots=${estimate.branchRootCount}`);

  if (estimate.warnings.length > 0) {
    console.log(`\nPlaytime balance warnings: ${estimate.warnings.length}`);
    estimate.warnings.forEach(warning => console.log(`- [playtime] ${warning}`));
  }

  if (estimate.guardrailViolations.length > 0) {
    console.log(`\nPlaytime guardrail violations: ${estimate.guardrailViolations.length}`);
    estimate.guardrailViolations.forEach(violation =>
      console.log(`- [playtime-guard] ${violation}`)
    );
  }

  if (!estimate.meetsTarget) {
    console.error(`\nPlaytime balance validation failed: first clear target not met`);
    console.error(
      `- [playtime] estimated average ${round(estimate.averageMinutes)}분 < target ${estimate.targetMinutes}분`
    );
    process.exitCode = 1;
    return;
  }

  if (profile === 'extended') {
    if (!estimate.meetsFullCompletionTarget) {
      console.error('\nPlaytime balance validation failed: full completion target range not met');
      console.error(
        `- [playtime] estimated full completion average ${round(estimate.fullCompletionAverageMinutes)}분 not in ${estimate.fullCompletionTargetRange.min}-${estimate.fullCompletionTargetRange.max}분`
      );
      process.exitCode = 1;
      return;
    }

    if (!estimate.meetsGuardrails) {
      console.error('\nPlaytime balance validation failed: anti-loose guardrails not met');
      estimate.guardrailViolations.forEach(violation =>
        console.error(`- [playtime-guard] ${violation}`)
      );
      process.exitCode = 1;
      return;
    }
  }

  console.log('Playtime balance validation passed.');
}

main();
