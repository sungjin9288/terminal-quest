import {
  AI_CONTRACT_BALANCE_TARGETS,
  collectAiContractBalanceReport,
  formatAiContractBalanceScenarioLine
} from '../src/systems/aiContractBalance';

describe('AI Contract Balance', () => {
  it('should validate frontier contract scenarios without hard errors', () => {
    const report = collectAiContractBalanceReport();

    expect(report.errors).toEqual([]);
    expect(report.benchmarksByAct.length).toBeGreaterThan(0);
    expect(report.scenarioMetrics.length).toBeGreaterThan(0);
    expect(report.scenarioMetrics.some(metric => metric.scenarioId === 'opening-push')).toBe(true);
    expect(report.scenarioMetrics.some(metric => metric.scenarioId === 'recovery-reset')).toBe(true);
    expect(report.scenarioMetrics.some(metric => metric.scenarioId === 'extended-supply')).toBe(true);
    expect(report.scenarioMetrics.some(metric => metric.adaptiveQuestId === 'ai-contract-frontier-cull')).toBe(true);
    expect(report.scenarioMetrics.some(metric => metric.adaptiveQuestId === 'ai-contract-frontier-recovery')).toBe(true);
    expect(report.scenarioMetrics.some(metric => metric.adaptiveQuestId === 'ai-contract-frontier-supply')).toBe(true);

    for (const metric of report.scenarioMetrics) {
      expect(metric.rewardItems).toBeLessThanOrEqual(AI_CONTRACT_BALANCE_TARGETS.maxRewardItems);
    }
  });

  it('should format a readable scenario line for reporting', () => {
    const report = collectAiContractBalanceReport();
    const line = formatAiContractBalanceScenarioLine(report.scenarioMetrics[0]);

    expect(line).toContain('Act ');
    expect(line).toContain('adaptive=');
    expect(line).toContain('directive=');
    expect(line).toContain('goldRatio=');
  });
});
