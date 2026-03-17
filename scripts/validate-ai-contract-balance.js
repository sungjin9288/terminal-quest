import {
  collectAiContractBalanceReport,
  formatAiContractBalanceScenarioLine
} from '../dist/systems/aiContractBalance.js';

function main() {
  const report = collectAiContractBalanceReport();

  console.log('AI contract balance metrics:');
  console.log(`- scenarios: ${report.scenarioMetrics.length}`);
  for (const benchmark of report.benchmarksByAct) {
    console.log(
      `- Act ${benchmark.act} | Lv ${benchmark.minLevel}-${benchmark.maxLevel} | ` +
      `combatGold=${benchmark.averageCombatGold.toFixed(2)} | ` +
      `staticQuestGold=${benchmark.staticQuestAverageGold.toFixed(2)} | ` +
      `staticQuestExp=${benchmark.staticQuestAverageExp.toFixed(2)}`
    );
  }
  for (const metric of report.scenarioMetrics) {
    console.log(`- ${formatAiContractBalanceScenarioLine(metric)}`);
  }

  if (report.warnings.length > 0) {
    console.log(`\nAI contract balance warnings: ${report.warnings.length}`);
    for (const warning of report.warnings) {
      console.log(`- ${warning}`);
    }
  }

  if (report.errors.length > 0) {
    console.error(`\nAI contract balance validation failed: ${report.errors.length} issue(s)`);
    for (const error of report.errors) {
      console.error(`- ${error}`);
    }
    process.exitCode = 1;
    return;
  }

  console.log('AI contract balance validation passed.');
}

main();
