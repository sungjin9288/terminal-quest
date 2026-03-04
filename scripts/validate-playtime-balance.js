import { getAllLocations } from '../dist/data/locations.js';
import { getDefaultQuests } from '../dist/data/quests.js';
import {
  estimateFirstClearPlaytime
} from '../dist/systems/playtimeBalance.js';

function round(value, digits = 1) {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function formatRange(label, range) {
  return `${label}: ${round(range.min)}-${round(range.max)}분`;
}

function main() {
  const locations = getAllLocations();
  const quests = Object.values(getDefaultQuests());

  const estimate = estimateFirstClearPlaytime(locations, quests);

  console.log('Playtime balance metrics:');
  console.log(`- ${formatRange('campaign', estimate.locationRange)}`);
  console.log(`- ${formatRange('mainQuest', estimate.mainQuestRange)}`);
  console.log(`- ${formatRange('recommendedSideQuest', estimate.recommendedSideQuestRange)}`);
  console.log(`- ${formatRange('branchExploration', estimate.branchExplorationRange)}`);
  console.log(`- ${formatRange('retryOverhead', estimate.retryOverheadRange)}`);
  console.log(`- ${formatRange('travelOverhead', estimate.travelOverheadRange)}`);
  console.log(`- ${formatRange('firstClearTotal', estimate.totalRange)}`);
  console.log(`- firstClearAverage=${round(estimate.averageMinutes)}분 (${round(estimate.averageHours, 2)}시간)`);
  console.log(`- target=${estimate.targetMinutes}분 (12시간)`);
  console.log(`- branchRoots=${estimate.branchRootCount}`);

  if (estimate.warnings.length > 0) {
    console.log(`\nPlaytime balance warnings: ${estimate.warnings.length}`);
    estimate.warnings.forEach(warning => console.log(`- [playtime] ${warning}`));
  }

  if (!estimate.meetsTarget) {
    console.error('\nPlaytime balance validation failed: 12-hour first clear target not met');
    console.error(
      `- [playtime] estimated average ${round(estimate.averageMinutes)}분 < target ${estimate.targetMinutes}분`
    );
    process.exitCode = 1;
    return;
  }

  console.log('Playtime balance validation passed.');
}

main();
