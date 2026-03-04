import {
  extractBalancePatchMetrics,
  buildBalancePatchNotesContent
} from '../src/systems/balancePatchNotes';

describe('Balance Patch Notes', () => {
  it('should extract key metrics from validator outputs', () => {
    const metrics = extractBalancePatchMetrics({
      questOutput:
        'Quest balance validation passed.\n' +
        '- quests: 33\n' +
        '- branch roots: 4\n' +
        '- multi-objective quests: 24\n',
      economyOutput:
        'Economy balance metrics:\n' +
        '- Act 1 | Lv 1-12 | combatGold=57.52\n' +
        '- Act 2 | Lv 12-22 | combatGold=156\n',
      playtimeOutput:
        'Playtime balance metrics:\n' +
        '- firstClearAverage=778.5분 (12.97시간)\n'
    });

    expect(metrics.questCount).toBe(33);
    expect(metrics.branchRoots).toBe(4);
    expect(metrics.multiObjectiveQuestCount).toBe(24);
    expect(metrics.economyActSnapshots).toHaveLength(2);
    expect(metrics.firstClearAverageMinutes).toBeCloseTo(778.5, 3);
    expect(metrics.firstClearAverageHours).toBeCloseTo(12.97, 3);
    expect(metrics.warnings).toEqual({
      quest: 0,
      economy: 0,
      playtime: 0
    });
  });

  it('should build markdown content with snapshot and raw sections', () => {
    const content = buildBalancePatchNotesContent({
      releaseDate: '2026-03-04',
      generatedAtIso: '2026-03-04T02:00:00.000Z',
      metrics: {
        questCount: 33,
        branchRoots: 4,
        multiObjectiveQuestCount: 24,
        economyActSnapshots: ['Act 1 | Lv 1-12 | combatGold=57.52'],
        firstClearAverageMinutes: 778.5,
        firstClearAverageHours: 12.97,
        warnings: {
          quest: 1,
          economy: 2,
          playtime: 0
        }
      },
      outputs: {
        questOutput: 'quest output',
        economyOutput: 'economy output',
        playtimeOutput: 'playtime output'
      }
    });

    expect(content).toContain('# Balance Patch Notes - 2026-03-04');
    expect(content).toContain('Generated at: 2026-03-04T02:00:00.000Z');
    expect(content).toContain('- Quests: 33');
    expect(content).toContain('- Validation warnings: quest=1, economy=2, playtime=0');
    expect(content).toContain('### Quest Balance');
    expect(content).toContain('quest output');
    expect(content).toContain('### Economy Balance');
    expect(content).toContain('economy output');
    expect(content).toContain('### Playtime Balance');
    expect(content).toContain('playtime output');
  });
});
