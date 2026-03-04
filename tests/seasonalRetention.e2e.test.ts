import {
  QuestObjectiveType
} from '../src/types/game';
import {
  ensureQuestState,
  getAvailableQuests,
  acceptQuest,
  completeQuest,
  updateQuestProgressOnKill,
  updateQuestProgressOnCollect,
  updateQuestProgressOnExplore,
  updateQuestProgressOnTalk
} from '../src/systems/quest';
import { refreshSeasonalEventState } from '../src/systems/seasonalEvents';
import { createQuestTestGameState } from './helpers/questFixtureFactory';

interface SeasonalQuestCase {
  date: string;
  questId: string;
  inventory: string[];
}

const SEASONAL_QUEST_CASES: SeasonalQuestCase[] = [
  {
    date: '2026-03-04T00:00:00Z',
    questId: 'spring-memory-festival-sweep',
    inventory: ['save-token']
  },
  {
    date: '2026-07-15T00:00:00Z',
    questId: 'summer-overclock-rush-suppression',
    inventory: []
  },
  {
    date: '2026-10-08T00:00:00Z',
    questId: 'autumn-harvest-hunt-pipeline',
    inventory: ['quantum-tonic']
  },
  {
    date: '2026-12-20T00:00:00Z',
    questId: 'winter-hardening-drive-frontline',
    inventory: ['stability-draught']
  }
];

const ALL_SEASONAL_QUEST_IDS = SEASONAL_QUEST_CASES.map(item => item.questId);

function fillQuestObjectives(gameState: ReturnType<typeof createQuestTestGameState>, questId: string): void {
  const quest = gameState.quests[questId];
  if (!quest) {
    throw new Error(`missing quest: ${questId}`);
  }

  for (const objective of quest.objectives) {
    if (objective.type === QuestObjectiveType.Kill) {
      updateQuestProgressOnKill(gameState, objective.targetId, objective.requiredAmount);
      continue;
    }

    if (objective.type === QuestObjectiveType.Collect) {
      updateQuestProgressOnCollect(gameState, objective.targetId, objective.requiredAmount);
      continue;
    }

    if (objective.type === QuestObjectiveType.Explore) {
      updateQuestProgressOnExplore(gameState, objective.targetId);
      continue;
    }

    if (objective.type === QuestObjectiveType.Talk) {
      updateQuestProgressOnTalk(gameState, objective.targetId);
      continue;
    }
  }
}

describe('Seasonal Retention E2E', () => {
  it('should rotate seasonal repeatable quest availability and allow immediate re-accept', () => {
    for (const testCase of SEASONAL_QUEST_CASES) {
      const gameState = createQuestTestGameState({
        playerOptions: {
          level: 30
        },
        inventory: testCase.inventory
      });
      gameState.player.completedQuests.push('final-purge');
      refreshSeasonalEventState(gameState, new Date(testCase.date));
      ensureQuestState(gameState);

      const availableQuestIds = getAvailableQuests(gameState).map(quest => quest.id);
      expect(availableQuestIds).toContain(testCase.questId);
      for (const seasonalQuestId of ALL_SEASONAL_QUEST_IDS) {
        if (seasonalQuestId !== testCase.questId) {
          expect(availableQuestIds).not.toContain(seasonalQuestId);
        }
      }

      const accepted = acceptQuest(gameState, testCase.questId);
      expect(accepted.success).toBe(true);

      fillQuestObjectives(gameState, testCase.questId);
      const completed = completeQuest(gameState, testCase.questId);

      expect(completed.success).toBe(true);
      expect(completed.repeatableReset).toBe(true);
      expect(completed.bonusExpGained).toBeGreaterThan(0);
      expect(completed.bonusGoldGained).toBeGreaterThan(0);
      expect(gameState.quests[testCase.questId]?.status).toBe('not-started');
      expect(gameState.player.completedQuests).toContain('final-purge');
      expect(gameState.player.completedQuests).not.toContain(testCase.questId);

      const acceptedAgain = acceptQuest(gameState, testCase.questId);
      expect(acceptedAgain.success).toBe(true);
    }
  });
});
