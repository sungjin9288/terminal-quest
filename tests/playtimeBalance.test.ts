import './helpers/moduleMocks';
import {
  estimateFirstClearPlaytime,
  EXTENDED_PLAYTIME_BALANCE_CONFIG,
  estimateQuestPlaytimeRange,
  parseTargetPlaytimeRange
} from '../src/systems/playtimeBalance';
import { getAllLocations } from '../src/data/locations';
import { getDefaultQuests } from '../src/data/quests';
import {
  Quest,
  QuestObjectiveType,
  QuestStatus
} from '../src/types/index';

function createQuest(requiredAmount: number): Quest {
  return {
    id: `test-quest-${requiredAmount}`,
    name: 'Test Quest',
    description: 'Test Quest Description',
    questGiver: 'quest-board',
    requiredLevel: 1,
    prerequisites: [],
    objectives: [
      {
        description: 'Defeat target',
        type: QuestObjectiveType.Kill,
        targetId: 'slime',
        requiredAmount,
        currentAmount: 0,
        completed: false
      }
    ],
    rewards: {
      exp: 10,
      gold: 10,
      items: []
    },
    status: QuestStatus.NotStarted,
    isMainQuest: false,
    repeatable: false
  };
}

describe('Playtime Balance', () => {
  it('should parse minute ranges from target playtime labels', () => {
    expect(parseTargetPlaytimeRange('15-20분')).toEqual({ min: 15, max: 20 });
    expect(parseTargetPlaytimeRange(' 45분 ')).toEqual({ min: 45, max: 45 });
    expect(parseTargetPlaytimeRange('invalid')).toBeNull();
  });

  it('should increase quest playtime estimate with required objective amount', () => {
    const shortQuest = createQuest(1);
    const longQuest = createQuest(5);

    const shortRange = estimateQuestPlaytimeRange(shortQuest);
    const longRange = estimateQuestPlaytimeRange(longQuest);

    expect(longRange.min).toBeGreaterThan(shortRange.min);
    expect(longRange.max).toBeGreaterThan(shortRange.max);
  });

  it('should estimate current content at or above 12-hour first clear average target', () => {
    const estimate = estimateFirstClearPlaytime(
      getAllLocations(),
      Object.values(getDefaultQuests())
    );

    expect(estimate.meetsTarget).toBe(true);
    expect(estimate.averageMinutes).toBeGreaterThanOrEqual(estimate.targetMinutes);
    expect(estimate.branchRootCount).toBeGreaterThanOrEqual(4);
  });

  it('should satisfy 25-30 hour extended profile target and guardrails', () => {
    const estimate = estimateFirstClearPlaytime(
      getAllLocations(),
      Object.values(getDefaultQuests()),
      EXTENDED_PLAYTIME_BALANCE_CONFIG
    );

    expect(estimate.fullCompletionTargetRange.min).toBe(25 * 60);
    expect(estimate.fullCompletionTargetRange.max).toBe(30 * 60);
    expect(estimate.guardrailViolations).toEqual([]);
    expect(estimate.meetsGuardrails).toBe(true);
    expect(estimate.meetsFullCompletionTarget).toBe(true);
    expect(estimate.fullCompletionAverageMinutes).toBeGreaterThanOrEqual(
      estimate.fullCompletionTargetRange.min
    );
    expect(estimate.fullCompletionAverageMinutes).toBeLessThanOrEqual(
      estimate.fullCompletionTargetRange.max
    );
  });
});
