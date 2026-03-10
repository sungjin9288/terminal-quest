import { syncAiState } from '../src/systems/aiDirector';
import { initializeQuestState } from '../src/systems/quest';
import { QuestStatus } from '../src/types/game';
import { createTestGameState } from './helpers/gameStateFactory';

function attachDefaultQuests(gameState: ReturnType<typeof createTestGameState>): void {
  gameState.quests = initializeQuestState();
}

describe('AI Director', () => {
  it('should seed a frontier intent for open progression in town', () => {
    const gameState = createTestGameState({
      playerOptions: {
        level: 3,
        currentLocation: 'bit-town',
        unlockedLocations: ['bit-town', 'memory-forest']
      }
    });

    const aiState = syncAiState(gameState, 1700000000000);

    expect(aiState.currentIntent?.kind).toBe('frontier');
    expect(aiState.currentIntent?.title).toBe('다음 공략');
    expect(aiState.currentIntent?.recommendedAction).toBe('travel');
    expect(aiState.currentIntent?.recommendedLocationId).toBe('memory-forest');
  });

  it('should keep a quest turn-in intent but switch the immediate action to inn when hp is low', () => {
    const gameState = createTestGameState({
      playerOptions: {
        level: 3,
        currentLocation: 'bit-town',
        gold: 200
      }
    });
    attachDefaultQuests(gameState);
    const quest = gameState.quests['forest-survey'];
    quest.status = QuestStatus.Active;
    quest.objectives[0].currentAmount = quest.objectives[0].requiredAmount;
    quest.objectives[0].completed = true;
    gameState.player.activeQuests = ['forest-survey'];
    gameState.player.stats.hp = Math.floor(gameState.player.stats.maxHp * 0.3);

    const aiState = syncAiState(gameState, 1700000000000);

    expect(aiState.currentIntent?.kind).toBe('quest-turn-in');
    expect(aiState.currentIntent?.title).toBe('완료 직전');
    expect(aiState.currentIntent?.recommendedAction).toBe('inn');
    expect(aiState.currentIntent?.reason).toContain('보상을 게시판에서 수령');
  });

  it('should preserve boss approach intent while steering low-resource dungeon states to rest', () => {
    const gameState = createTestGameState({
      playerOptions: {
        level: 4,
        currentLocation: 'memory-forest'
      }
    });
    gameState.position.locationId = 'memory-forest';
    gameState.position.stepsTaken = 8;
    gameState.player.stats.hp = Math.floor(gameState.player.stats.maxHp * 0.3);
    gameState.player.stats.mp = Math.floor(gameState.player.stats.maxMp * 0.2);

    const aiState = syncAiState(gameState, 1700000000000);

    expect(aiState.currentIntent?.kind).toBe('boss-approach');
    expect(aiState.currentIntent?.title).toBe('보스 추적');
    expect(aiState.currentIntent?.recommendedAction).toBe('rest');
    expect(aiState.currentIntent?.lines[0]).toContain('2회 남음');
  });
});
