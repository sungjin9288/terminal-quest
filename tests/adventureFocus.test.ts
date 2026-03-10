import {
  getAdventureFocusSummary,
  getLocationBossProgress,
  getRecommendedTravelDestination
} from '../src/systems/adventureFocus';
import { initializeQuestState } from '../src/systems/quest';
import { QuestStatus } from '../src/types/game';
import { createTestGameState } from './helpers/gameStateFactory';

function attachDefaultQuests(gameState: ReturnType<typeof createTestGameState>): void {
  gameState.quests = initializeQuestState();
}

describe('Adventure Focus', () => {
  it('should recommend the next frontier location from town when no quest is active', () => {
    const gameState = createTestGameState({
      playerOptions: {
        level: 3,
        currentLocation: 'bit-town',
        unlockedLocations: ['bit-town', 'memory-forest']
      }
    });

    const summary = getAdventureFocusSummary(gameState);

    expect(summary?.title).toBe('다음 공략');
    expect(summary?.recommendedLocationId).toBe('memory-forest');
    expect(summary?.lines[0]).toContain('메모리 숲');
    expect(summary?.lines[1]).toContain('첫 클리어 보상');
  });

  it('should point active explore quests to the destination location', () => {
    const gameState = createTestGameState({
      playerOptions: {
        level: 1,
        currentLocation: 'bit-town'
      }
    });
    attachDefaultQuests(gameState);
    gameState.quests['forest-survey'].status = QuestStatus.Active;
    gameState.player.activeQuests = ['forest-survey'];

    const summary = getAdventureFocusSummary(gameState);

    expect(summary?.title).toBe('다음 목표');
    expect(summary?.recommendedLocationId).toBe('memory-forest');
    expect(summary?.lines[0]).toContain('메모리 숲 도착');
    expect(summary?.lines[1]).toContain('메모리 숲');
    expect(getRecommendedTravelDestination(gameState)).toBe('memory-forest');
  });

  it('should recommend returning to town when a quest is ready to turn in', () => {
    const gameState = createTestGameState({
      playerOptions: {
        level: 2,
        currentLocation: 'memory-forest'
      }
    });
    attachDefaultQuests(gameState);
    const quest = gameState.quests['forest-survey'];
    quest.status = QuestStatus.Active;
    quest.objectives[0].currentAmount = quest.objectives[0].requiredAmount;
    quest.objectives[0].completed = true;
    gameState.player.activeQuests = ['forest-survey'];

    const summary = getAdventureFocusSummary(gameState);

    expect(summary?.title).toBe('완료 직전');
    expect(summary?.lines[0]).toContain('마을로 돌아가');
    expect(getRecommendedTravelDestination(gameState)).toBe('bit-town');
  });

  it('should expose boss approach progress inside uncleared dungeons', () => {
    const gameState = createTestGameState({
      playerOptions: {
        level: 4,
        currentLocation: 'memory-forest'
      }
    });
    gameState.position.locationId = 'memory-forest';
    gameState.position.stepsTaken = 7;

    const progress = getLocationBossProgress(gameState);
    const summary = getAdventureFocusSummary(gameState);

    expect(progress?.bossId).toBe('memory-leak-titan');
    expect(progress?.remainingSteps).toBe(3);
    expect(summary?.title).toBe('보스 추적');
    expect(summary?.lines[0]).toContain('3회 남음');

    gameState.position.stepsTaken = 10;
    const readySummary = getAdventureFocusSummary(gameState);

    expect(readySummary?.title).toBe('보스 경보');
    expect(readySummary?.lines[0]).toContain('출현할 수 있습니다');
  });
});
